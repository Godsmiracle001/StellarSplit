import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Processor('webhook_queue')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  @Process('deliver')
  async handleDelivery(job: Job<any>) {
    this.logger.log(`Processing webhook delivery job ${job.id}`);
    
    try {
      await this.deliveryService.processDelivery(job.data);
      this.logger.log(`Webhook delivery job ${job.id} completed successfully`);
    } catch (error: any) {
      this.logger.error(
        `Webhook delivery job ${job.id} failed: ${error.message}`,
      );
      throw error; // Re-throw to trigger retry
    }
  }
}
