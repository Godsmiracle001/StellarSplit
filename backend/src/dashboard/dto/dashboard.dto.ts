import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuickAction {
  @ApiProperty({ example: 'new-split' })
  id!: string;

  @ApiProperty({ example: 'New Split' })
  label!: string;

  @ApiProperty({ example: '/splits/new' })
  route!: string;

  @ApiPropertyOptional({ example: 3 })
  badge?: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Total amount the user owes across all active splits', example: 125.5 })
  totalOwed!: number;

  @ApiProperty({
    description: 'Total amount owed to the user across all active splits',
    example: 320.75,
  })
  totalOwedToUser!: number;

  @ApiProperty({
    description: 'Number of active (non-completed) splits the user participates in',
    example: 4,
  })
  activeSplits!: number;

  @ApiProperty({
    description: 'Number of splits the user created that are still active',
    example: 2,
  })
  splitsCreated!: number;

  @ApiProperty({ description: 'Number of unread activity notifications', example: 5 })
  unreadNotifications!: number;

  @ApiProperty({ description: 'Quick-action metadata for the frontend', type: () => [QuickAction] })
  quickActions!: QuickAction[];
}

export class DashboardActivityItem {
  @ApiProperty({ example: 'f2d920f8-7037-4824-b860-7802c2d80577' })
  id!: string;

  @ApiProperty({ example: 'split_created' })
  activityType!: string;

  @ApiPropertyOptional({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  splitId?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { title: 'Weekend dinner', amount: 85 },
  })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z' })
  createdAt!: Date;
}

export class DashboardActivityDto {
  @ApiProperty({ type: () => [DashboardActivityItem] })
  data!: DashboardActivityItem[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;

  @ApiProperty({ example: 3 })
  unreadCount!: number;
}
