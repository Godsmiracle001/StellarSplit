import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhooksService } from './webhooks.service';
import { Webhook, WebhookEventType } from './webhook.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let repository: Repository<Webhook>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    repository = module.get<Repository<Webhook>>(getRepositoryToken(Webhook));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a webhook successfully', async () => {
      const createDto: CreateWebhookDto = {
        userId: 'user-123',
        url: 'https://example.com/webhook',
        events: [WebhookEventType.SPLIT_CREATED],
        secret: 'test-secret',
      };

      const webhook = {
        id: 'webhook-123',
        ...createDto,
        isActive: true,
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(webhook);
      mockRepository.save.mockResolvedValue(webhook);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        isActive: true,
        failureCount: 0,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(webhook);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const createDto: CreateWebhookDto = {
        userId: 'user-123',
        url: 'invalid-url',
        events: [WebhookEventType.SPLIT_CREATED],
        secret: 'test-secret',
      };

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all webhooks', async () => {
      const webhooks = [
        { id: 'webhook-1', userId: 'user-1' },
        { id: 'webhook-2', userId: 'user-2' },
      ];

      mockRepository.find.mockResolvedValue(webhooks);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        relations: ['deliveries'],
      });
      expect(result).toEqual(webhooks);
    });

    it('should filter by userId when provided', async () => {
      const webhooks = [{ id: 'webhook-1', userId: 'user-1' }];

      mockRepository.find.mockResolvedValue(webhooks);

      const result = await service.findAll('user-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        relations: ['deliveries'],
      });
      expect(result).toEqual(webhooks);
    });
  });

  describe('findOne', () => {
    it('should return a webhook by id', async () => {
      const webhook = { id: 'webhook-123', userId: 'user-1' };

      mockRepository.findOne.mockResolvedValue(webhook);

      const result = await service.findOne('webhook-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'webhook-123' },
        relations: ['deliveries'],
      });
      expect(result).toEqual(webhook);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a webhook successfully', async () => {
      const webhook = {
        id: 'webhook-123',
        userId: 'user-1',
        url: 'https://example.com/webhook',
        events: [WebhookEventType.SPLIT_CREATED],
        secret: 'old-secret',
        isActive: true,
      };

      const updateDto: UpdateWebhookDto = {
        url: 'https://newurl.com/webhook',
        isActive: false,
      };

      mockRepository.findOne.mockResolvedValue(webhook);
      mockRepository.save.mockResolvedValue({ ...webhook, ...updateDto });

      const result = await service.update('webhook-123', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.url).toBe(updateDto.url);
      expect(result.isActive).toBe(updateDto.isActive);
    });
  });

  describe('remove', () => {
    it('should delete a webhook', async () => {
      const webhook = { id: 'webhook-123' };

      mockRepository.findOne.mockResolvedValue(webhook);
      mockRepository.remove.mockResolvedValue(webhook);

      await service.remove('webhook-123');

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.remove).toHaveBeenCalledWith(webhook);
    });
  });

  describe('incrementFailureCount', () => {
    it('should increment failure count', async () => {
      const webhook = {
        id: 'webhook-123',
        failureCount: 5,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(webhook);
      mockRepository.save.mockResolvedValue({
        ...webhook,
        failureCount: 6,
      });

      await service.incrementFailureCount('webhook-123');

      expect(webhook.failureCount).toBe(6);
    });

    it('should deactivate webhook after 10 failures', async () => {
      const webhook = {
        id: 'webhook-123',
        failureCount: 9,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(webhook);
      mockRepository.save.mockResolvedValue({
        ...webhook,
        failureCount: 10,
        isActive: false,
      });

      await service.incrementFailureCount('webhook-123');

      expect(webhook.failureCount).toBe(10);
      expect(webhook.isActive).toBe(false);
    });
  });
});
