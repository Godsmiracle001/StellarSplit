import { IsString, IsUrl, IsArray, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from '../webhook.entity';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'User ID who owns this webhook',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://example.com/webhooks',
  })
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Array of event types to subscribe to',
    enum: WebhookEventType,
    isArray: true,
    example: [WebhookEventType.SPLIT_CREATED, WebhookEventType.PAYMENT_RECEIVED],
  })
  @IsArray()
  @ArrayNotEmpty()
  events!: WebhookEventType[];

  @ApiProperty({
    description: 'Secret key for HMAC signature verification',
    example: 'your-secret-key-here',
  })
  @IsString()
  @IsNotEmpty()
  secret!: string;
}
