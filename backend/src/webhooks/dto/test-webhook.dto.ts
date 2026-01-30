import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from '../webhook.entity';

export class TestWebhookDto {
  @ApiProperty({
    description: 'Event type to test',
    enum: WebhookEventType,
    example: WebhookEventType.SPLIT_CREATED,
  })
  @IsString()
  @IsNotEmpty()
  eventType!: WebhookEventType;

  @ApiProperty({
    description: 'Optional custom payload to send',
    required: false,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;
}
