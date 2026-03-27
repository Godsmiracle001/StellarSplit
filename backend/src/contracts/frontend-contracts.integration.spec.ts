import {
  BadRequestException,
  ConflictException,
  GoneException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { GlobalHttpExceptionFilter } from '../common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from '../common/filters/typeorm-exception.filter';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { ExportController } from '../export/export.controller';
import { ExportService } from '../export/export.service';
import { ExportFormat, ExportStatus, ReportType } from '../export/entities/export-job.entity';
import { InvitationsController } from '../invitations/invitations.controller';
import { InvitationsService } from '../invitations/invitations.service';
import { ActivitiesController } from '../modules/activities/activities.controller';
import { ActivitiesService } from '../modules/activities/activities.service';
import { SplitsController } from '../modules/splits/splits.controller';
import { SplitsService } from '../modules/splits/splits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { AuthorizationService } from '../auth/services/authorization.service';
import { SplitHistoryController } from '../split-history/split-history.controller';
import { SplitHistoryService } from '../split-history/split-history.service';
import { ActivityType } from '../entities/activity.entity';

describe('Frontend API contracts (integration)', () => {
  let app: INestApplication;
  let swaggerDocument: Record<string, any>;

  const splitDetail = {
    id: '91d71dcb-59f8-40c6-8e06-e3e408069e62',
    totalAmount: 170,
    amountPaid: 85,
    status: 'active',
    isFrozen: false,
    description: 'Weekend dinner',
    preferredCurrency: 'USD',
    creatorWalletAddress: 'user-123',
    dueDate: new Date('2026-03-30T18:00:00.000Z'),
    createdAt: new Date('2026-03-20T18:00:00.000Z'),
    updatedAt: new Date('2026-03-21T18:00:00.000Z'),
    deletedAt: null,
    categoryId: null,
    expiryDate: null,
    items: [
      {
        id: '8b1a3505-84ea-41ff-b4a4-92e0d96ef6d3',
        splitId: '91d71dcb-59f8-40c6-8e06-e3e408069e62',
        name: 'Pasta',
        quantity: 1,
        unitPrice: 85,
        totalPrice: 85,
        category: 'food',
        assignedToIds: ['c65916df-0e49-4cfe-a3e8-a96c7da7c34a'],
        createdAt: new Date('2026-03-20T18:00:00.000Z'),
        updatedAt: new Date('2026-03-21T18:00:00.000Z'),
      },
    ],
    participants: [
      {
        id: '6f0f6b90-07dc-42b7-bfca-a37b3db6e4c2',
        splitId: '91d71dcb-59f8-40c6-8e06-e3e408069e62',
        userId: 'c65916df-0e49-4cfe-a3e8-a96c7da7c34a',
        amountOwed: 85,
        amountPaid: 0,
        status: 'pending',
        walletAddress: 'GABCD1234WALLETADDRESS',
        createdAt: new Date('2026-03-20T18:00:00.000Z'),
        updatedAt: new Date('2026-03-21T18:00:00.000Z'),
      },
    ],
  };

  const dashboardSummary = {
    totalOwed: 125.5,
    totalOwedToUser: 320.75,
    activeSplits: 4,
    splitsCreated: 2,
    unreadNotifications: 5,
    quickActions: [
      { id: 'new-split', label: 'New Split', route: '/splits/new' },
      { id: 'activity', label: 'Activity', route: '/activity', badge: 5 },
    ],
  };

  const dashboardActivity = {
    data: [
      {
        id: 'f2d920f8-7037-4824-b860-7802c2d80577',
        activityType: 'split_created',
        splitId: splitDetail.id,
        metadata: { title: 'Weekend dinner', amount: 170 },
        isRead: false,
        createdAt: new Date('2026-03-25T09:30:00.000Z'),
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    hasMore: false,
    unreadCount: 1,
  };

  const historyResponse = {
    data: [
      {
        id: '9f77960d-1779-4a08-b5fe-5a1ac6a7fdf5',
        splitId: splitDetail.id,
        role: 'participant',
        finalAmount: -85,
        status: 'completed',
        description: 'Weekend dinner',
        preferredCurrency: 'USD',
        totalAmount: 170,
        completionTime: new Date('2026-03-24T20:15:00.000Z'),
        comment: 'Settled',
        isArchived: false,
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    hasMore: false,
    summary: {
      totalSplitsCreated: 0,
      totalSplitsParticipated: 1,
      totalAmountPaid: 85,
      totalAmountReceived: 0,
      netAmount: -85,
    },
    exportHint: {
      endpoint: '/api/export/create',
      supportedFormats: Object.values(ExportFormat),
    },
  };

  const activitiesResponse = {
    data: [
      {
        id: '1fa62d09-d8a5-4215-bf74-c8d5cfd68c2a',
        userId: 'user-123',
        activityType: ActivityType.SPLIT_CREATED,
        splitId: splitDetail.id,
        metadata: { title: 'Weekend dinner' },
        isRead: false,
        createdAt: new Date('2026-03-25T09:30:00.000Z'),
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasMore: false,
    unreadCount: 1,
  };

  const invitationRecord = {
    id: 'a5d7d490-53ff-4ba8-ae28-bf74173b513d',
    token: 'dd6b2269-0b70-46b9-946f-aadcf923d4a1',
    splitId: splitDetail.id,
    expiresAt: new Date('2026-03-29T10:00:00.000Z'),
    usedAt: null,
    maxUses: 1,
    usesCount: 0,
    isUpgradeable: true,
    inviteeEmail: 'alice@example.com',
    tokenVersion: 1,
    createdAt: new Date('2026-03-26T10:00:00.000Z'),
  };

  const invitationCreateResponse = {
    id: invitationRecord.id,
    token: invitationRecord.token,
    splitId: invitationRecord.splitId,
    expiresAt: invitationRecord.expiresAt,
    link: `http://localhost:3000/invite/join/${invitationRecord.token}`,
    maxUses: 1,
    usesCount: 0,
    isUpgradeable: true,
  };

  const invitationJoinResponse = {
    participant: splitDetail.participants[0],
    split: splitDetail,
    isNewUser: false,
  };

  const invitationUpgradeResponse = {
    participant: splitDetail.participants[0],
    user: { id: '2d2c06d0-5c23-4c13-914f-2d989a655d8d', email: 'alice@example.com' },
    wasGuest: true,
  };

  const exportJob = {
    id: '838a6a2d-b5a5-4965-b0d4-8f39aa708cc6',
    userId: 'user-123',
    format: ExportFormat.CSV,
    reportType: ReportType.MONTHLY_SUMMARY,
    status: ExportStatus.PENDING,
    filters: { startDate: '2026-03-01', endDate: '2026-03-31' },
    fileName: null,
    fileUrl: null,
    s3Key: null,
    fileSize: 0,
    recordCount: 0,
    summary: null,
    errorMessage: null,
    expiresAt: new Date('2026-04-02T10:00:00.000Z'),
    isScheduled: false,
    scheduleId: null,
    emailRecipient: 'user@example.com',
    emailSent: false,
    emailSentAt: null,
    createdAt: new Date('2026-03-26T10:00:00.000Z'),
    updatedAt: new Date('2026-03-26T10:00:00.000Z'),
    completedAt: null,
    isTaxCompliant: false,
    taxYear: null,
    metadata: {
      settings: { includeSummary: true },
      userTimezone: 'Africa/Lagos',
    },
  };

  const exportTemplate = {
    id: 'b9a3a686-9025-414e-b28b-e52765d9da7f',
    userId: 'user-123',
    name: 'Monthly Expense Report',
    description: 'Reusable export for month-end reporting',
    format: ExportFormat.CSV,
    reportType: ReportType.MONTHLY_SUMMARY,
    filters: { startDate: '2026-03-01', endDate: '2026-03-31' },
    settings: { includeSummary: true, includeReceipts: false },
    isDefault: false,
    isScheduled: false,
    scheduleCron: null,
    emailRecipients: null,
    emailSubjectTemplate: null,
    emailBodyTemplate: null,
    createdAt: new Date('2026-03-26T10:00:00.000Z'),
    updatedAt: new Date('2026-03-26T10:00:00.000Z'),
  };

  const dashboardServiceMock = {
    getSummary: jest.fn().mockResolvedValue(dashboardSummary),
    getActivity: jest.fn().mockResolvedValue(dashboardActivity),
  };

  const splitHistoryServiceMock = {
    getHistory: jest.fn().mockResolvedValue(historyResponse),
    getUserHistory: jest.fn().mockResolvedValue(historyResponse.data),
    getUserStats: jest.fn().mockResolvedValue({
      totalSplitsCreated: 2,
      totalSplitsParticipated: 5,
      averageSplitAmount: 42.5,
      totalAmount: 212.5,
      mostFrequentPartners: [{ partner: 'user-999', count: 3 }],
    }),
  };

  const splitsServiceMock = {
    getSplitById: jest.fn().mockImplementation(async (splitId: string) => {
      if (splitId === 'missing-split') {
        throw new NotFoundException(`Split ${splitId} not found`);
      }

      return splitDetail;
    }),
  };

  const activitiesServiceMock = {
    createActivity: jest.fn().mockImplementation(async (dto: Record<string, unknown>) => ({
      id: '1fa62d09-d8a5-4215-bf74-c8d5cfd68c2a',
      ...dto,
      isRead: false,
      createdAt: new Date('2026-03-25T09:30:00.000Z'),
    })),
    getActivities: jest.fn().mockResolvedValue(activitiesResponse),
    markAsRead: jest.fn().mockImplementation(async (_userId: string, body: { activityIds: string[] }) => {
      if (body.activityIds.includes('00000000-0000-4000-8000-000000000999')) {
        throw new NotFoundException('Some activities were not found or do not belong to the user');
      }

      return { updated: body.activityIds.length };
    }),
    markAllAsRead: jest.fn().mockResolvedValue({ updated: 1 }),
    getUnreadCount: jest.fn().mockResolvedValue({ count: 1 }),
    deleteActivity: jest.fn().mockImplementation(async (activityId: string) => {
      if (activityId === 'missing-activity') {
        throw new NotFoundException('Activity not found');
      }
    }),
  };

  const invitationsServiceMock = {
    create: jest.fn().mockResolvedValue(invitationCreateResponse),
    getByToken: jest.fn().mockImplementation(async (token: string) => {
      if (token === 'expired-token') {
        throw new GoneException({ message: 'This invitation has expired', code: 'INVITE_EXPIRED' });
      }

      return invitationRecord;
    }),
    joinByToken: jest.fn().mockImplementation(async (token: string) => {
      if (token === 'duplicate-token') {
        throw new ConflictException({
          message: 'A participant with this email already exists in the split',
          code: 'DUPLICATE_PARTICIPANT',
        });
      }

      return invitationJoinResponse;
    }),
    upgradeGuest: jest.fn().mockResolvedValue(invitationUpgradeResponse),
    getActiveInvitations: jest.fn().mockResolvedValue([invitationRecord]),
    invalidate: jest.fn().mockImplementation(async (id: string) => {
      if (id === 'missing-invitation') {
        throw new NotFoundException(`Invitation ${id} not found`);
      }
    }),
  };

  const exportServiceMock = {
    createExport: jest.fn().mockResolvedValue(exportJob),
    getExportStatus: jest.fn().mockImplementation(async (id: string) => {
      if (id === 'missing-export') {
        throw new NotFoundException(`Export job ${id} not found`);
      }

      return exportJob;
    }),
    downloadExport: jest.fn().mockImplementation(async (id: string) => {
      if (id === 'expired-export') {
        throw new BadRequestException('Export file has expired');
      }

      if (id === 'missing-export') {
        throw new NotFoundException('Export not found or not ready');
      }

      return {
        url: 'https://storage.example.com/export.csv',
        fileName: 'monthly-summary.csv',
      };
    }),
    listExports: jest.fn().mockResolvedValue({
      jobs: [exportJob],
      total: 1,
      page: 1,
      totalPages: 1,
    }),
    createTemplate: jest.fn().mockResolvedValue(exportTemplate),
    listTemplates: jest.fn().mockResolvedValue([exportTemplate]),
    deleteTemplate: jest.fn().mockImplementation(async (id: string) => {
      if (id === 'missing-template') {
        throw new NotFoundException('Template not found');
      }
    }),
    scheduleExport: jest.fn().mockResolvedValue({
      ...exportTemplate,
      isScheduled: true,
      scheduleCron: '0 9 1 * *',
    }),
    checkEligibility: jest.fn().mockResolvedValue({
      canExport: true,
      exportsThisMonth: 2,
      monthlyLimit: 10,
      remainingExports: 8,
    }),
  };

  const allowAuthGuard = {
    canActivate: (context: any) => {
      const request = context.switchToHttp().getRequest();
      const userId = request.headers['x-user-id'];
      if (!userId) {
        throw new UnauthorizedException('Missing or invalid authorization token');
      }
      request.user = { id: userId, walletAddress: userId };
      return true;
    },
  };

  const allowAuthorizationGuard = {
    canActivate: () => true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        DashboardController,
        SplitHistoryController,
        SplitsController,
        ActivitiesController,
        InvitationsController,
        ExportController,
      ],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: SplitHistoryService, useValue: splitHistoryServiceMock },
        { provide: SplitsService, useValue: splitsServiceMock },
        { provide: ActivitiesService, useValue: activitiesServiceMock },
        { provide: InvitationsService, useValue: invitationsServiceMock },
        { provide: ExportService, useValue: exportServiceMock },
        {
          provide: AuthorizationService,
          useValue: {
            canAccessSplit: jest.fn().mockResolvedValue(true),
            canCreatePayment: jest.fn().mockResolvedValue(true),
            canAddParticipant: jest.fn().mockResolvedValue(true),
            canRemoveParticipant: jest.fn().mockResolvedValue(true),
            canAccessReceipt: jest.fn().mockResolvedValue(true),
            canCreatePaymentForParticipant: jest.fn().mockResolvedValue(true),
            canAccessParticipantPayments: jest.fn().mockResolvedValue(true),
            canAccessDispute: jest.fn().mockResolvedValue(true),
            isAdmin: jest.fn().mockResolvedValue(true),
            canAccessGroup: jest.fn().mockResolvedValue(true),
            canManageGroupMembers: jest.fn().mockResolvedValue(true),
            canCreateGroupSplit: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAuthGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowAuthorizationGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter(), new TypeOrmExceptionFilter());
    app.setGlobalPrefix('api');

    await app.init();

    swaggerDocument = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Contract test').setVersion('1.0.0').addBearerAuth().build(),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('documents the frontend-critical endpoints and shared schemas in Swagger', () => {
    const paths = Object.keys(swaggerDocument.paths);
    const schemas = Object.keys(swaggerDocument.components.schemas);

    expect(paths).toContain('/api/dashboard/summary');
    expect(paths).toContain('/api/dashboard/activity');
    expect(paths).toContain('/api/splits/history');
    expect(paths).toContain('/api/split-history');
    expect(paths).toContain('/api/splits/{id}');
    expect(paths).toContain('/api/activities/{userId}');
    expect(paths).toContain('/api/invitations');
    expect(paths).toContain('/api/export/create');

    expect(schemas).toEqual(
      expect.arrayContaining([
        'DashboardSummaryDto',
        'DashboardActivityDto',
        'HistoryResponseDto',
        'SplitDetailResponseDto',
        'PaginatedActivitiesResponseDto',
        'InvitationCreateResponseDto',
        'InvitationResponseDto',
        'ExportJobResponseDto',
        'ExportTemplateResponseDto',
        'ApiErrorResponseDto',
      ]),
    );

    expect(swaggerDocument.paths['/api/export/create'].post.responses['400'].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/ApiErrorResponseDto');
    expect(swaggerDocument.paths['/api/invitations/{token}'].get.responses['410'].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/ApiErrorResponseDto');
  });

  it('serves dashboard summary and activity contracts', async () => {
    const summaryResponse = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('x-user-id', 'user-123')
      .expect(200);

    expect(summaryResponse.body).toMatchObject({
      totalOwed: 125.5,
      totalOwedToUser: 320.75,
      activeSplits: 4,
      splitsCreated: 2,
      unreadNotifications: 5,
    });
    expect(summaryResponse.body.quickActions[0]).toMatchObject({
      id: 'new-split',
      label: 'New Split',
      route: '/splits/new',
    });

    const activityResponse = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .expect(401);

    expect(activityResponse.body).toMatchObject({
      statusCode: 401,
      path: '/api/dashboard/summary',
    });
  });

  it('serves both history routes and validates bad filters', async () => {
    const historyByFrontendPath = await request(app.getHttpServer())
      .get('/api/splits/history')
      .set('x-user-id', 'user-123')
      .expect(200);

    expect(historyByFrontendPath.body).toMatchObject({
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    expect(historyByFrontendPath.body.data[0]).toMatchObject({
      splitId: splitDetail.id,
      role: 'participant',
      finalAmount: -85,
    });

    await request(app.getHttpServer())
      .get('/api/split-history')
      .set('x-user-id', 'user-123')
      .expect(200);

    const invalidHistoryResponse = await request(app.getHttpServer())
      .get('/api/splits/history?status=unknown')
      .set('x-user-id', 'user-123')
      .expect(400);

    expect(invalidHistoryResponse.body.message).toEqual(
      expect.objectContaining({
        message: expect.arrayContaining(['status must be one of the following values: active, completed, partial, archived, all']),
      }),
    );
  });

  it('serves split detail and returns a structured 404 when missing', async () => {
    const splitResponse = await request(app.getHttpServer())
      .get(`/api/splits/${splitDetail.id}`)
      .expect(200);

    expect(splitResponse.body).toMatchObject({
      id: splitDetail.id,
      description: 'Weekend dinner',
      preferredCurrency: 'USD',
    });
    expect(splitResponse.body.participants[0]).toMatchObject({
      userId: 'c65916df-0e49-4cfe-a3e8-a96c7da7c34a',
      amountOwed: 85,
      status: 'pending',
    });
    expect(splitResponse.body.items[0]).toMatchObject({
      name: 'Pasta',
      totalPrice: 85,
      assignedToIds: ['c65916df-0e49-4cfe-a3e8-a96c7da7c34a'],
    });

    const missingResponse = await request(app.getHttpServer())
      .get('/api/splits/missing-split')
      .expect(404);

    expect(missingResponse.body).toMatchObject({
      statusCode: 404,
      path: '/api/splits/missing-split',
    });
  });

  it('documents the notification feed contracts for success and failure', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/activities/user-123')
      .expect(200);

    expect(listResponse.body).toMatchObject({
      total: 1,
      unreadCount: 1,
      data: [
        expect.objectContaining({
          userId: 'user-123',
          activityType: ActivityType.SPLIT_CREATED,
        }),
      ],
    });

    const markReadResponse = await request(app.getHttpServer())
      .patch('/api/activities/user-123/mark-read')
      .send({
        activityIds: ['00000000-0000-4000-8000-000000000001'],
      })
      .expect(200);

    expect(markReadResponse.body).toEqual({ updated: 1 });

    const missingActivityResponse = await request(app.getHttpServer())
      .patch('/api/activities/user-123/mark-read')
      .send({
        activityIds: ['00000000-0000-4000-8000-000000000999'],
      })
      .expect(404);

    expect(missingActivityResponse.body).toMatchObject({
      statusCode: 404,
      path: '/api/activities/user-123/mark-read',
    });
  });

  it('documents invitation success and failure contracts', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/invitations')
      .set('x-user-id', 'user-123')
      .send({
        splitId: splitDetail.id,
        expiresInHours: 24,
        inviteeEmail: 'alice@example.com',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: invitationRecord.id,
      token: invitationRecord.token,
      splitId: splitDetail.id,
      maxUses: 1,
    });

    const getResponse = await request(app.getHttpServer())
      .get(`/api/invitations/${invitationRecord.token}`)
      .set('x-user-id', 'user-123')
      .expect(200);

    expect(getResponse.body).toMatchObject({
      id: invitationRecord.id,
      token: invitationRecord.token,
      splitId: splitDetail.id,
      usesCount: 0,
    });

    const expiredResponse = await request(app.getHttpServer())
      .get('/api/invitations/expired-token')
      .set('x-user-id', 'user-123')
      .expect(410);

    expect(expiredResponse.body).toMatchObject({
      statusCode: 410,
      path: '/api/invitations/expired-token',
    });
  });

  it('documents export success and failure contracts', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/export/create')
      .set('x-user-id', 'user-123')
      .send({
        format: ExportFormat.CSV,
        reportType: ReportType.MONTHLY_SUMMARY,
        filters: {
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        },
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: exportJob.id,
      format: ExportFormat.CSV,
      reportType: ReportType.MONTHLY_SUMMARY,
      status: ExportStatus.PENDING,
    });

    const invalidCreateResponse = await request(app.getHttpServer())
      .post('/api/export/create')
      .set('x-user-id', 'user-123')
      .send({
        format: 'TXT',
        reportType: ReportType.MONTHLY_SUMMARY,
      })
      .expect(400);

    expect(invalidCreateResponse.body).toMatchObject({
      statusCode: 400,
      path: '/api/export/create',
    });

    const statusResponse = await request(app.getHttpServer())
      .get(`/api/export/status/${exportJob.id}`)
      .set('x-user-id', 'user-123')
      .expect(200);

    expect(statusResponse.body).toMatchObject({
      id: exportJob.id,
      metadata: expect.objectContaining({
        userTimezone: 'Africa/Lagos',
      }),
    });

    const missingStatusResponse = await request(app.getHttpServer())
      .get('/api/export/status/missing-export')
      .set('x-user-id', 'user-123')
      .expect(404);

    expect(missingStatusResponse.body).toMatchObject({
      statusCode: 404,
      path: '/api/export/status/missing-export',
    });
  });
});
