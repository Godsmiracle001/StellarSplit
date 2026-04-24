/**
 * Route regression integration tests.
 *
 * These tests guard against prefix and registration regressions in the most
 * fragile controllers: analytics, receipts, compliance, short-links, and
 * reputation.  They verify that:
 *
 *  1. Every route declared in the manifest is present in the Swagger document.
 *  2. No double-prefixed routes leak into the document (e.g. /api/api/…).
 *  3. URI versioning produces the expected /api/v1/… paths.
 *  4. Representative request/response flows return the expected status codes.
 */

import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { GlobalHttpExceptionFilter } from '../common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from '../common/filters/typeorm-exception.filter';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { AuthorizationService } from '../auth/services/authorization.service';

/* Controllers */
import { AnalyticsController } from '../analytics/analytics.controller';
import { ReceiptsController } from '../receipts/receipts.controller';
import { ComplianceController } from '../compliance/compliance.controller';
import { ShortLinksController } from '../short-links/short-links.controller';
import { ReputationController } from '../reputation/reputation.controller';

/* Services (for mocking) */
import { AnalyticsService } from '../analytics/analytics.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ComplianceService } from '../compliance/compliance.service';
import { ShortLinksService } from '../short-links/short-links.service';
import { NfcPayloadService } from '../short-links/nfc-payload.service';
import { ShortLinkUrlBuilder } from '../short-links/short-link-url.builder';
import { ReputationService } from '../reputation/reputation.service';
import { ScoreCalculatorService } from '../reputation/score-calculator.service';

/* Fixtures */
import {
  ALL_MANIFESTS,
  buildCanonicalPaths,
  buildNonVersionedPaths,
  type ControllerRouteManifest,
} from './route-contract.fixture';

/* ================================================================== */
/*  Shared mock setup                                                  */
/* ================================================================== */

const allowAuthGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-user-id'];
    if (!userId) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }
    req.user = { id: userId, walletAddress: userId };
    return true;
  },
};

const allowAuthorizationGuard = {
  canActivate: () => true,
};

const authorizationServiceMock = {
  canAccessSplit: jest.fn().mockResolvedValue(true),
  canGenerateShortLink: jest.fn().mockResolvedValue(true),
  canViewShortLinkAnalytics: jest.fn().mockResolvedValue(true),
  canDeleteShortLink: jest.fn().mockResolvedValue(true),
  isParticipantInSplit: jest.fn().mockResolvedValue(true),
};

/* ---------- Analytics mocks ---------- */
const analyticsServiceMock = {
  getSpendingTrends: jest.fn().mockResolvedValue([
    { period: '2026-03-01', totalSpent: 150, transactionCount: 3, avgTransactionAmount: 50 },
  ]),
  getCategoryBreakdown: jest.fn().mockResolvedValue([
    { category: 'food', amount: 100 },
  ]),
  getTopPartners: jest.fn().mockResolvedValue([
    { partnerId: 'user-999', totalAmount: 200, interactions: 5 },
  ]),
  getMonthlyReport: jest.fn().mockResolvedValue({ trends: [], categories: [] }),
  enqueueExport: jest.fn().mockResolvedValue({ id: 'report-abc', status: 'pending' }),
  getReportStatus: jest.fn().mockResolvedValue({ id: 'report-abc', status: 'completed' }),
};

/* ---------- Receipts mocks ---------- */
const receiptsServiceMock = {
  uploadWithOcr: jest.fn().mockResolvedValue({ id: 'receipt-1', splitId: 'split-1' }),
  uploadStandalone: jest.fn().mockResolvedValue({ id: 'receipt-2' }),
  listBySplit: jest.fn().mockResolvedValue([{ id: 'receipt-1' }]),
  getSignedUrl: jest.fn().mockResolvedValue('https://storage.example.com/signed'),
  softDelete: jest.fn().mockResolvedValue(undefined),
  getOcrData: jest.fn().mockResolvedValue({ processed: true, data: {} }),
  reprocessOcr: jest.fn().mockResolvedValue(undefined),
};

/* ---------- Compliance mocks ---------- */
const complianceServiceMock = {
  requestExport: jest.fn().mockResolvedValue({ id: 'export-1', status: 'QUEUED' }),
  getExportStatus: jest.fn().mockResolvedValue({ id: 'export-1', status: 'QUEUED' }),
  getCategories: jest.fn().mockResolvedValue([{ id: 'cat-1', name: 'Travel' }]),
  createCategory: jest.fn().mockResolvedValue({ id: 'cat-2', name: 'Meals' }),
  assignCategoryToSplit: jest.fn().mockResolvedValue({ id: 'split-1', categoryId: 'cat-2' }),
  getSummary: jest.fn().mockResolvedValue({ Travel: { total: 500, deductible: 200 } }),
  downloadExport: jest.fn().mockResolvedValue({ fileName: 'export.csv', content: Buffer.from(''), mimeType: 'text/csv' }),
};

/* ---------- Short-links mocks ---------- */
const shortLinksServiceMock = {
  generate: jest.fn().mockResolvedValue({
    shortCode: 'abc123',
    url: 'http://localhost:3000/l/abc123',
    sep0007: 'web+stellar:pay?memo=split%3Asplit-1',
    expiresAt: new Date('2026-04-30'),
  }),
  resolve: jest.fn().mockResolvedValue({
    redirectUrl: 'http://localhost:3000/splits/split-1',
    linkType: 'payment',
  }),
  analytics: jest.fn().mockResolvedValue({ totalAccess: 10, uniqueIPs: 5, lastAccess: null }),
  validateNfcAccess: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
};

const nfcPayloadServiceMock = {
  generateNdefPayload: jest.fn().mockResolvedValue({
    ndefMessage: { tnf: 1, type: 'U', payload: 'deadbeef' },
  }),
};

const shortLinkUrlBuilderMock = {
  buildNfcUrl: jest.fn().mockReturnValue('http://localhost:3000/splits/split-1'),
};

/* ---------- Reputation mocks ---------- */
const reputationServiceMock = {
  getReputation: jest.fn().mockResolvedValue({
    userId: 'wallet-abc',
    trustScore: 72,
    totalSplitsParticipated: 8,
  }),
  getHistory: jest.fn().mockResolvedValue([
    { userId: 'wallet-abc', eventType: 'PAID_ON_TIME', scoreImpact: 5, createdAt: new Date() },
  ]),
  getBadge: jest.fn().mockResolvedValue({ badge: 'Gold' }),
  leaderboard: jest.fn().mockResolvedValue([
    { userId: 'wallet-abc', trustScore: 95, totalSplitsParticipated: 20 },
  ]),
};

/* ================================================================== */
/*  Test suite                                                         */
/* ================================================================== */

describe('Route regression coverage (integration)', () => {
  let app: INestApplication;
  let swaggerDocument: Record<string, any>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AnalyticsController,
        ReceiptsController,
        ComplianceController,
        ShortLinksController,
        ReputationController,
      ],
      providers: [
        { provide: AnalyticsService, useValue: analyticsServiceMock },
        { provide: ReceiptsService, useValue: receiptsServiceMock },
        { provide: ComplianceService, useValue: complianceServiceMock },
        { provide: ShortLinksService, useValue: shortLinksServiceMock },
        { provide: NfcPayloadService, useValue: nfcPayloadServiceMock },
        { provide: ShortLinkUrlBuilder, useValue: shortLinkUrlBuilderMock },
        { provide: ReputationService, useValue: reputationServiceMock },
        { provide: ScoreCalculatorService, useValue: {} },
        { provide: AuthorizationService, useValue: authorizationServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAuthGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowAuthorizationGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter(), new TypeOrmExceptionFilter());

    // Match production: global prefix + URI versioning
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    await app.init();
    await app.listen(0, '127.0.0.1');

    swaggerDocument = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Route regression').setVersion('1.0.0').addBearerAuth().build(),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  /* ---------------------------------------------------------------- */
  /*  1. Swagger route-manifest assertions                             */
  /* ---------------------------------------------------------------- */

  describe('Swagger route manifest', () => {
    it('registers every expected versioned route from all manifests', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);
      const expectedPaths = buildCanonicalPaths('api', 'v1');

      for (const expected of expectedPaths) {
        expect(registeredPaths).toContain(expected);
      }
    });

    it('contains no double-prefixed routes (e.g. /api/api/…)', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      for (const path of registeredPaths) {
        // Match paths that have /api/ appearing twice as separate segments
        const doublePrefixPattern = /\/api\/.*\/api\//;
        expect(doublePrefixPattern.test(path)).toBe(false);
      }
    });

    it('contains no unversioned routes when versioning is enabled', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);
      const unversionedExpected = buildNonVersionedPaths('api');

      // With versioning on, none of the unversioned paths should exist
      for (const unversioned of unversionedExpected) {
        // Only check routes that belong to our manifests
        const relevantPrefixes = ALL_MANIFESTS.map(m => m.prefix);
        const matchesOurPrefix = relevantPrefixes.some(p => unversioned.includes(`/${p}/`) || unversioned.endsWith(`/${p}`));
        if (matchesOurPrefix) {
          expect(registeredPaths).not.toContain(unversioned);
        }
      }
    });

    it('has the correct number of routes across all manifests', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      // Use unique canonical paths (not raw route count) because multiple HTTP
      // methods on the same path (e.g. GET + POST /compliance/categories) produce
      // one Swagger path entry but count as two in the manifest routes array.
      const expectedTotal = new Set(buildCanonicalPaths('api', 'v1')).size;

      // Filter to only our manifest paths (versioned)
      const ourPaths = registeredPaths.filter(p => {
        const prefixes = ALL_MANIFESTS.map(m => m.prefix);
        return prefixes.some(prefix => p.includes(`/${prefix}/`) || p.endsWith(`/${prefix}`));
      });

      expect(ourPaths.length).toBeGreaterThanOrEqual(expectedTotal);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  2. Per-controller prefix regression tests                        */
  /* ---------------------------------------------------------------- */

  describe('Analytics controller prefix regression', () => {
    const manifest = ALL_MANIFESTS.find(m => m.prefix === 'analytics')!;

    it('registers all analytics routes under /api/v1/analytics/', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      for (const route of manifest.routes) {
        const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
        const expectedPath = `/api/v1/analytics/${openApiPath}`;
        expect(registeredPaths).toContain(expectedPath);
      }
    });

    it('does not register analytics routes under a different prefix', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      // Should NOT appear under /api/v1/analytics/analytics/ (double prefix)
      const doublePrefixed = registeredPaths.filter(p =>
        p.includes('/analytics/analytics/'),
      );
      expect(doublePrefixed).toHaveLength(0);
    });
  });

  describe('Receipts controller prefix regression', () => {
    const manifest = ALL_MANIFESTS.find(m => m.prefix === 'receipts')!;

    it('registers all receipts routes under /api/v1/receipts/', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      for (const route of manifest.routes) {
        const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
        const expectedPath = `/api/v1/receipts/${openApiPath}`;
        expect(registeredPaths).toContain(expectedPath);
      }
    });

    it('does not register receipts routes under a different prefix', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      const doublePrefixed = registeredPaths.filter(p =>
        p.includes('/receipts/receipts/'),
      );
      expect(doublePrefixed).toHaveLength(0);
    });
  });

  describe('Compliance controller prefix regression', () => {
    const manifest = ALL_MANIFESTS.find(m => m.prefix === 'compliance')!;

    it('registers all compliance routes under /api/v1/compliance/', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      for (const route of manifest.routes) {
        const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
        const expectedPath = `/api/v1/compliance/${openApiPath}`;
        expect(registeredPaths).toContain(expectedPath);
      }
    });

    it('does not register compliance routes under a double prefix', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      const doublePrefixed = registeredPaths.filter(p =>
        p.includes('/compliance/compliance/'),
      );
      expect(doublePrefixed).toHaveLength(0);
    });
  });

  describe('Short-links controller prefix regression', () => {
    const manifest = ALL_MANIFESTS.find(m => m.prefix === 'short-links')!;

    it('registers all short-links routes under /api/v1/short-links/', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      for (const route of manifest.routes) {
        const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
        const expectedPath = `/api/v1/short-links/${openApiPath}`;
        expect(registeredPaths).toContain(expectedPath);
      }
    });

    it('does not register short-links routes under a double prefix', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      const doublePrefixed = registeredPaths.filter(p =>
        p.includes('/short-links/short-links/'),
      );
      expect(doublePrefixed).toHaveLength(0);
    });
  });

  describe('Reputation controller prefix regression', () => {
    const manifest = ALL_MANIFESTS.find(m => m.prefix === 'reputation')!;

    it('registers all reputation routes under /api/v1/reputation/', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      for (const route of manifest.routes) {
        const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
        const expectedPath = `/api/v1/reputation/${openApiPath}`;
        expect(registeredPaths).toContain(expectedPath);
      }
    });

    it('does not register reputation routes under a double prefix', () => {
      const registeredPaths = Object.keys(swaggerDocument.paths);

      const doublePrefixed = registeredPaths.filter(p =>
        p.includes('/reputation/reputation/'),
      );
      expect(doublePrefixed).toHaveLength(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  3. Representative request/response flows                         */
  /* ---------------------------------------------------------------- */

  describe('Analytics request/response flows', () => {
    it('GET /api/v1/analytics/spending-trends returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/spending-trends')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toMatchObject({
          totalSpent: expect.any(Number),
          transactionCount: expect.any(Number),
        });
      }
    });

    it('GET /api/v1/analytics/category-breakdown returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/category-breakdown')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/analytics/top-partners returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/top-partners')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/v1/analytics/export returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/analytics/export')
        .send({ userId: 'user-1', type: 'spending-trends', dateFrom: '2026-01-01', dateTo: '2026-03-31' })
        .expect(201);

      expect(res.body).toMatchObject({ id: 'report-abc', status: 'pending' });
    });

    it('GET /api/v1/analytics/reports/{id} returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/reports/report-abc')
        .expect(200);

      expect(res.body).toMatchObject({ id: 'report-abc' });
    });
  });

  describe('Receipts request/response flows', () => {
    it('GET /api/v1/receipts/split/{splitId} returns 200 with auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/receipts/split/split-1')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/receipts/split/{splitId} returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/receipts/split/split-1')
        .expect(401);
    });

    it('GET /api/v1/receipts/{receiptId}/signed-url returns 200 with auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/receipts/receipt-1/signed-url')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('GET /api/v1/receipts/{receiptId}/ocr-data returns 200 with auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/receipts/receipt-1/ocr-data')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(res.body).toMatchObject({ processed: true });
    });
  });

  describe('Compliance request/response flows', () => {
    it('POST /api/v1/compliance/export/request returns 201 with auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/compliance/export/request')
        .set('x-user-id', 'user-1')
        .send({ exportFormat: 'CSV', periodStart: '2026-01-01', periodEnd: '2026-03-31' })
        .expect(201);

      expect(res.body).toMatchObject({ id: 'export-1' });
    });

    it('GET /api/v1/compliance/categories returns 200 with auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/compliance/categories')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/compliance/summary returns 200 with auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/compliance/summary?year=2026')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('GET /api/v1/compliance/categories returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/categories')
        .expect(401);
    });
  });

  describe('Short-links request/response flows', () => {
    it('POST /api/v1/short-links/generate returns 201 with auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/short-links/generate')
        .set('x-user-id', 'user-1')
        .send({ splitId: '550e8400-e29b-41d4-a716-446655440000', linkType: 'view_split' })
        .expect(201);

      expect(res.body).toMatchObject({ shortCode: 'abc123' });
    });

    it('GET /api/v1/short-links/{shortCode}/resolve returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/short-links/abc123/resolve')
        .expect(200);

      expect(res.body).toMatchObject({ redirectUrl: expect.any(String) });
    });

    it('GET /api/v1/short-links/{shortCode}/analytics returns 200 with auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/short-links/abc123/analytics')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(res.body).toMatchObject({ totalAccess: expect.any(Number) });
    });

    it('DELETE /api/v1/short-links/{shortCode} returns 200 with auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/short-links/abc123')
        .set('x-user-id', 'user-1')
        .expect(200);
    });
  });

  describe('Reputation request/response flows', () => {
    it('GET /api/v1/reputation/{walletAddress} returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reputation/wallet-abc')
        .expect(200);

      expect(res.body).toMatchObject({ trustScore: 72 });
    });

    it('GET /api/v1/reputation/leaderboard/trusted-payers returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reputation/leaderboard/trusted-payers')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/reputation/badge/{walletAddress} returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reputation/badge/wallet-abc')
        .expect(200);

      expect(res.body).toMatchObject({ badge: expect.any(String) });
    });

    it('GET /api/v1/reputation/{walletAddress}/history returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reputation/wallet-abc/history')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  4. Versioning-specific regression tests                          */
  /* ---------------------------------------------------------------- */

  describe('URI versioning regression', () => {
    it('serves analytics on /api/v1/analytics/spending-trends', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/spending-trends')
        .expect(200);
    });

    it('returns 404 on unversioned /api/analytics/spending-trends', async () => {
      // With versioning enabled, the unversioned path should NOT match
      await request(app.getHttpServer())
        .get('/api/analytics/spending-trends')
        .expect(404);
    });

    it('serves compliance on /api/v1/compliance/categories', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/categories')
        .set('x-user-id', 'user-1')
        .expect(200);
    });

    it('returns 404 on unversioned /api/compliance/categories', async () => {
      await request(app.getHttpServer())
        .get('/api/compliance/categories')
        .set('x-user-id', 'user-1')
        .expect(404);
    });

    it('serves reputation on /api/v1/reputation/leaderboard/trusted-payers', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reputation/leaderboard/trusted-payers')
        .expect(200);
    });

    it('returns 404 on unversioned /api/reputation/leaderboard/trusted-payers', async () => {
      await request(app.getHttpServer())
        .get('/api/reputation/leaderboard/trusted-payers')
        .expect(404);
    });
  });
});
