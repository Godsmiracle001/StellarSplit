import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook, WebhookEventType } from './webhook.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepository: Repository<Webhook>,
  ) {}

  async create(createWebhookDto: CreateWebhookDto): Promise<Webhook> {
    // Validate URL is reachable (basic check)
    if (!this.isValidUrl(createWebhookDto.url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    const webhook = this.webhookRepository.create({
      ...createWebhookDto,
      isActive: true,
      failureCount: 0,
    });

    return await this.webhookRepository.save(webhook);
  }

  async findAll(userId?: string): Promise<Webhook[]> {
    const where = userId ? { userId } : {};
    return await this.webhookRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['deliveries'],
    });
  }

  async findOne(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id },
      relations: ['deliveries'],
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return webhook;
  }

  async findByUserId(userId: string): Promise<Webhook[]> {
    return await this.webhookRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByEventType(eventType: WebhookEventType): Promise<Webhook[]> {
    return await this.webhookRepository
      .createQueryBuilder('webhook')
      .where('webhook.isActive = :isActive', { isActive: true })
      .andWhere('webhook.events @> :event', {
        event: JSON.stringify([eventType]),
      })
      .getMany();
  }

  async update(id: string, updateWebhookDto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.findOne(id);

    if (updateWebhookDto.url && !this.isValidUrl(updateWebhookDto.url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    Object.assign(webhook, updateWebhookDto);
    return await this.webhookRepository.save(webhook);
  }

  async remove(id: string): Promise<void> {
    const webhook = await this.findOne(id);
    await this.webhookRepository.remove(webhook);
  }

  async incrementFailureCount(id: string): Promise<void> {
    const webhook = await this.findOne(id);
    webhook.failureCount += 1;

    // Deactivate if failure count exceeds threshold (e.g., 10 failures)
    if (webhook.failureCount >= 10) {
      webhook.isActive = false;
      this.logger.warn(`Webhook ${id} deactivated due to excessive failures`);
    }

    await this.webhookRepository.save(webhook);
  }

  async resetFailureCount(id: string): Promise<void> {
    const webhook = await this.findOne(id);
    webhook.failureCount = 0;
    await this.webhookRepository.save(webhook);
  }

  async updateLastTriggered(id: string): Promise<void> {
    const webhook = await this.findOne(id);
    webhook.lastTriggeredAt = new Date();
    await this.webhookRepository.save(webhook);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
