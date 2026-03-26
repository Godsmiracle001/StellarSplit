import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Receipt } from '../src/receipts/entities/receipt.entity';
import { Split } from '../src/entities/split.entity';
import { Item } from '../src/entities/item.entity';
import { Participant } from '../src/entities/participant.entity';

describe('Receipt-to-Split Workflow (e2e)', () => {
  let app: INestApplication;
  let receiptId: string;
  let splitId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forFeature([Receipt, Split, Item, Participant]),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Receipt-to-Split Flow', () => {
    it('should upload a standalone receipt', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/receipts/upload-standalone')
        .attach('file', Buffer.from('fake receipt image'), 'receipt.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('uploadedBy');
      receiptId = response.body.id;
    });

    it('should get OCR data for the receipt', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/receipts/${receiptId}/ocr-data`)
        .expect(200);

      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('data');
    });

    it('should create a draft split from receipt', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/splits/draft-from-receipt')
        .send({
          receiptId: receiptId,
          creatorId: 'test-user-123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('items');
      splitId = response.body.id;
    });

    it('should get the split with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/splits/${splitId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', splitId);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should update split allocations', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/splits/${splitId}/allocations`)
        .send({
          participants: [
            {
              userId: 'user-1',
              amountOwed: 25,
              walletAddress: 'GADDRESS1',
            },
            {
              userId: 'user-2', 
              amountOwed: 25,
              walletAddress: 'GADDRESS2',
            },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('participants');
      expect(response.body.participants).toHaveLength(2);
    });

    it('should finalize the split', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/splits/${splitId}/finalize`)
        .send({
          splitType: 'EQUAL',
          participantIds: ['user-1', 'user-2'],
          tax: 5,
          tip: 3,
        })
        .expect(200);

      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('participants');
      expect(response.body.participants[0]).toHaveProperty('amountOwed');
    });

    it('should get user splits', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/splits/user/test-user-123')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id', splitId);
    });
  });

  describe('Direct Split Creation', () => {
    it('should create a split directly', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/splits')
        .send({
          totalAmount: 100,
          description: 'Test split',
          creatorWalletAddress: 'test-creator',
          participants: [
            {
              userId: 'user-1',
              amountOwed: 50,
              walletAddress: 'GADDRESS1',
            },
            {
              userId: 'user-2',
              amountOwed: 50,
              walletAddress: 'GADDRESS2',
            },
          ],
          items: [
            {
              name: 'Item 1',
              quantity: 1,
              unitPrice: 50,
              totalPrice: 50,
              assignedToIds: ['user-1'],
            },
            {
              name: 'Item 2',
              quantity: 1,
              unitPrice: 50,
              totalPrice: 50,
              assignedToIds: ['user-2'],
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('totalAmount', 100);
      expect(response.body).toHaveProperty('participants');
      expect(response.body).toHaveProperty('items');
    });
  });

  describe('Receipt Management', () => {
    it('should list receipts by split', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/receipts/split/${splitId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get signed URL for receipt', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/receipts/${receiptId}/signed-url`)
        .expect(200);

      expect(response.body).toHaveProperty('url');
    });
  });
});
