import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getQueueToken } from '@nestjs/bull';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { Webhook } from './webhook.entity';
import { WebhookDelivery, DeliveryStatus } from './webhook-delivery.entity';
import { WebhookEventType } from './webhook.entity';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  let webhookRepository: Repository<Webhook>;
  let deliveryRepository: Repository<WebhookDelivery>;
  let webhookQueue: any;

  const mockWebhookRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDeliveryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockWebhookRepository,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: mockDeliveryRepository,
        },
        {
          provide: getQueueToken('webhook_queue'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<WebhookDeliveryService>(WebhookDeliveryService);
    webhookRepository = module.get<Repository<Webhook>>(
      getRepositoryToken(Webhook),
    );
    deliveryRepository = module.get<Repository<WebhookDelivery>>(
      getRepositoryToken(WebhookDelivery),
    );
    webhookQueue = module.get(getQueueToken('webhook_queue'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerEvent', () => {
    it('should queue delivery for active webhooks subscribed to event', async () => {
      const webhooks = [
        {
          id: 'webhook-1',
          userId: 'user-1',
          url: 'https://example.com/webhook',
          events: [WebhookEventType.SPLIT_CREATED],
          secret: 'secret-1',
          isActive: true,
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(webhooks),
      };

      mockWebhookRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockDeliveryRepository.create.mockReturnValue({
        id: 'delivery-1',
        webhookId: 'webhook-1',
        eventType: WebhookEventType.SPLIT_CREATED,
        payload: {},
        status: DeliveryStatus.PENDING,
      });
      mockDeliveryRepository.save.mockResolvedValue({
        id: 'delivery-1',
      });
      mockQueue.add.mockResolvedValue({});

      await service.triggerEvent(
        WebhookEventType.SPLIT_CREATED,
        { test: 'data' },
        'user-1',
      );

      expect(mockDeliveryRepository.create).toHaveBeenCalled();
      expect(mockDeliveryRepository.save).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('getDeliveryLogs', () => {
    it('should return delivery logs for a webhook', async () => {
      const deliveries = [
        {
          id: 'delivery-1',
          webhookId: 'webhook-1',
          status: DeliveryStatus.SUCCESS,
        },
        {
          id: 'delivery-2',
          webhookId: 'webhook-1',
          status: DeliveryStatus.FAILED,
        },
      ];

      mockDeliveryRepository.find.mockResolvedValue(deliveries);

      const result = await service.getDeliveryLogs('webhook-1', 50);

      expect(mockDeliveryRepository.find).toHaveBeenCalledWith({
        where: { webhookId: 'webhook-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(deliveries);
    });
  });

  describe('getDeliveryStats', () => {
    it('should calculate delivery statistics correctly', async () => {
      const deliveries = [
        {
          id: 'delivery-1',
          status: DeliveryStatus.SUCCESS,
        },
        {
          id: 'delivery-2',
          status: DeliveryStatus.SUCCESS,
        },
        {
          id: 'delivery-3',
          status: DeliveryStatus.FAILED,
        },
        {
          id: 'delivery-4',
          status: DeliveryStatus.PENDING,
        },
      ];

      mockDeliveryRepository.find.mockResolvedValue(deliveries);

      const result = await service.getDeliveryStats('webhook-1');

      expect(result.total).toBe(4);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.successRate).toBe(50);
    });
  });
});
