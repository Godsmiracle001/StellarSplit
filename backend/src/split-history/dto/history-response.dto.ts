import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitRole } from '../entities/split-history.entity';

export class HistoryItemDto {
  @ApiProperty({ example: '9f77960d-1779-4a08-b5fe-5a1ac6a7fdf5' })
  id!: string;

  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  splitId!: string;

  @ApiProperty({ enum: SplitRole, example: SplitRole.PARTICIPANT })
  role!: SplitRole;

  @ApiProperty({ description: 'Positive = received, negative = paid out', example: -42.5 })
  finalAmount!: number;

  @ApiProperty({ example: 'completed' })
  status!: string;

  @ApiPropertyOptional({ example: 'Dinner at Nobu' })
  description?: string;

  @ApiPropertyOptional({ example: 'USD' })
  preferredCurrency?: string;

  @ApiProperty({ example: 170 })
  totalAmount!: number;

  @ApiProperty({ example: '2026-03-24T20:15:00.000Z' })
  completionTime!: Date;

  @ApiPropertyOptional({ example: 'Archived due to expiry' })
  comment?: string;

  @ApiProperty({ example: false })
  isArchived!: boolean;
}

export class HistorySummaryDto {
  @ApiProperty({ example: 4 })
  totalSplitsCreated!: number;

  @ApiProperty({ example: 8 })
  totalSplitsParticipated!: number;

  @ApiProperty({ example: 240 })
  totalAmountPaid!: number;

  @ApiProperty({ example: 525 })
  totalAmountReceived!: number;

  @ApiProperty({ example: 285 })
  netAmount!: number;
}

export class HistoryExportHintDto {
  @ApiProperty({ example: '/api/export/create' })
  endpoint!: string;

  @ApiProperty({ type: [String], example: ['CSV', 'PDF', 'JSON'] })
  supportedFormats!: string[];
}

export class HistoryResponseDto {
  @ApiProperty({ type: () => [HistoryItemDto] })
  data!: HistoryItemDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;

  @ApiProperty({ type: () => HistorySummaryDto })
  summary!: HistorySummaryDto;

  @ApiProperty({ description: 'Opaque export metadata for the current result set', type: () => HistoryExportHintDto })
  exportHint!: HistoryExportHintDto;
}
