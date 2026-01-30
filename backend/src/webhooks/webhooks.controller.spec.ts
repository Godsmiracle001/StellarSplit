import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { TestWebhookDto } from './dto/test-webhook.dto';
import { WebhookEventType } from './webhook.entity';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: WebhooksService;
  let deliveryService: WebhookDeliveryService;

  const mockWebhooksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockDeliveryService = {
    triggerEvent: jest.fn(),
    getDeliveryLogs: jest.fn(),
    getDeliveryStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
        {
          provide: WebhookDeliveryService,
          useValue: mockDeliveryService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    webhooksService = module.get<WebhooksService>(WebhooksService);
    deliveryService = module.get<WebhookDeliveryService>(
      WebhookDeliveryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a webhook', async () => {
      const createDto: CreateWebhookDto = {
        userId: 'user-123',
        url: 'https://example.com/webhook',
        events: [WebhookEventType.SPLIT_CREATED],
        secret: 'test-secret',
      };

      const webhook = { id: 'webhook-123', ...createDto };

      mockWebhooksService.create.mockResolvedValue(webhook);

      const result = await controller.create(createDto);

      expect(mockWebhooksService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(webhook);
    });
  });

  describe('findAll', () => {
    it('should return all webhooks', async () => {
      const webhooks = [{ id: 'webhook-1' }, { id: 'webhook-2' }];

      mockWebhooksService.findAll.mockResolvedValue(webhooks);

      const result = await controller.findAll();

      expect(mockWebhooksService.findAll).toHaveBeenCalled();
      expect(result).toEqual(webhooks);
    });

    it('should filter by userId when provided', async () => {
      const webhooks = [{ id: 'webhook-1', userId: 'user-1' }];

      mockWebhooksService.findAll.mockResolvedValue(webhooks);

      const result = await controller.findAll('user-1');

      expect(mockWebhooksService.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(webhooks);
    });
  });

  describe('findOne', () => {
    it('should return a webhook by id', async () => {
      const webhook = { id: 'webhook-123' };

      mockWebhooksService.findOne.mockResolvedValue(webhook);

      const result = await controller.findOne('webhook-123');

      expect(mockWebhooksService.findOne).toHaveBeenCalledWith('webhook-123');
      expect(result).toEqual(webhook);
    });
  });

  describe('update', () => {
    it('should update a webhook', async () => {
      const updateDto: UpdateWebhookDto = {
        url: 'https://newurl.com/webhook',
      };

      const webhook = { id: 'webhook-123', ...updateDto };

      mockWebhooksService.update.mockResolvedValue(webhook);

      const result = await controller.update('webhook-123', updateDto);

      expect(mockWebhooksService.update).toHaveBeenCalledWith(
        'webhook-123',
        updateDto,
      );
      expect(result).toEqual(webhook);
    });
  });

  describe('remove', () => {
    it('should delete a webhook', async () => {
      mockWebhooksService.remove.mockResolvedValue(undefined);

      await controller.remove('webhook-123');

      expect(mockWebhooksService.remove).toHaveBeenCalledWith('webhook-123');
    });
  });

  describe('testWebhook', () => {
    it('should trigger a test webhook', async () => {
      const testDto: TestWebhookDto = {
        eventType: WebhookEventType.SPLIT_CREATED,
        payload: { test: true },
      };

      const webhook = {
        id: 'webhook-123',
        userId: 'user-1',
      };

      mockWebhooksService.findOne.mockResolvedValue(webhook);
      mockDeliveryService.triggerEvent.mockResolvedValue(undefined);

      const result = await controller.testWebhook('webhook-123', testDto);

      expect(mockWebhooksService.findOne).toHaveBeenCalledWith('webhook-123');
      expect(mockDeliveryService.triggerEvent).toHaveBeenCalled();
      expect(result.message).toBe('Test webhook triggered');
    });
  });

  describe('getDeliveries', () => {
    it('should return delivery logs', async () => {
      const deliveries = [{ id: 'delivery-1' }, { id: 'delivery-2' }];

      mockWebhooksService.findOne.mockResolvedValue({ id: 'webhook-123' });
      mockDeliveryService.getDeliveryLogs.mockResolvedValue(deliveries);

      const result = await controller.getDeliveries('webhook-123', 50);

      expect(mockDeliveryService.getDeliveryLogs).toHaveBeenCalledWith(
        'webhook-123',
        50,
      );
      expect(result).toEqual(deliveries);
    });
  });

  describe('getStats', () => {
    it('should return delivery statistics', async () => {
      const stats = {
        total: 100,
        success: 95,
        failed: 5,
        pending: 0,
        successRate: 95.0,
      };

      mockWebhooksService.findOne.mockResolvedValue({ id: 'webhook-123' });
      mockDeliveryService.getDeliveryStats.mockResolvedValue(stats);

      const result = await controller.getStats('webhook-123');

      expect(mockDeliveryService.getDeliveryStats).toHaveBeenCalledWith(
        'webhook-123',
      );
      expect(result).toEqual(stats);
    });
  });
});
