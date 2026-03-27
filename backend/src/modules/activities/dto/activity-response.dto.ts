import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../../../entities/activity.entity';

export class ActivityResponseDto {
  @ApiProperty({ example: 'f2d920f8-7037-4824-b860-7802c2d80577' })
  id!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ enum: ActivityType, example: ActivityType.SPLIT_CREATED })
  activityType!: ActivityType;

  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62', nullable: true })
  splitId?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { title: 'Weekend dinner', amount: 85 },
  })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z' })
  createdAt!: Date;
}

export class PaginatedActivitiesResponseDto {
  @ApiProperty({ type: () => [ActivityResponseDto] })
  data!: ActivityResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;

  @ApiProperty({ example: 3 })
  unreadCount!: number;
}
