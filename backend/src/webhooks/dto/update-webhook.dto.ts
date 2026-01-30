import { IsString, IsUrl, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from '../webhook.entity';

export class UpdateWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://example.com/webhooks',
    required: false,
  })
  @IsUrl({ require_protocol: true })
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Array of event types to subscribe to',
    enum: WebhookEventType,
    isArray: true,
    required: false,
  })
  @IsArray()
  @IsOptional()
  events?: WebhookEventType[];

  @ApiProperty({
    description: 'Secret key for HMAC signature verification',
    required: false,
  })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiProperty({
    description: 'Whether the webhook is active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
