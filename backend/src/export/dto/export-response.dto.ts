import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat, ExportStatus, ReportType } from '../entities/export-job.entity';

export class ExportSummaryResponseDto {
  @ApiProperty({ example: 450 })
  totalAmount!: number;

  @ApiProperty({ example: 6 })
  totalExpenses!: number;

  @ApiProperty({ example: 2 })
  totalSettlements!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { USD: 450, XLM: 125 },
  })
  currencyBreakdown!: Record<string, number>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { food: 300, travel: 150 },
  })
  categoryBreakdown!: Record<string, number>;
}

export class ExportJobResponseDto {
  @ApiProperty({ example: '838a6a2d-b5a5-4965-b0d4-8f39aa708cc6' })
  id!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ enum: ExportFormat, example: ExportFormat.CSV })
  format!: ExportFormat;

  @ApiProperty({ enum: ReportType, example: ReportType.MONTHLY_SUMMARY })
  reportType!: ReportType;

  @ApiProperty({ enum: ExportStatus, example: ExportStatus.PENDING })
  status!: ExportStatus;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { startDate: '2026-01-01', endDate: '2026-01-31' },
  })
  filters!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'monthly-summary-20260326.csv' })
  fileName!: string | null;

  @ApiPropertyOptional({ example: 'https://storage.example.com/exports/123' })
  fileUrl!: string | null;

  @ApiPropertyOptional({ example: 'exports/user-123/monthly-summary-20260326.csv' })
  s3Key!: string | null;

  @ApiProperty({ example: 1024 })
  fileSize!: number;

  @ApiProperty({ example: 42 })
  recordCount!: number;

  @ApiPropertyOptional({ type: () => ExportSummaryResponseDto, nullable: true })
  summary!: ExportSummaryResponseDto | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ example: '2026-04-02T10:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: false })
  isScheduled!: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  scheduleId!: string | null;

  @ApiPropertyOptional({ example: 'user@example.com', nullable: true })
  emailRecipient!: string | null;

  @ApiProperty({ example: false })
  emailSent!: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  emailSentAt!: Date | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-26T10:05:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ example: false })
  isTaxCompliant!: boolean;

  @ApiPropertyOptional({ example: 2026, nullable: true })
  taxYear!: number | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { settings: { includeSummary: true }, userTimezone: 'Africa/Lagos' },
  })
  metadata!: Record<string, unknown>;
}

export class ExportTemplateResponseDto {
  @ApiProperty({ example: 'b9a3a686-9025-414e-b28b-e52765d9da7f' })
  id!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ example: 'Monthly Expense Report' })
  name!: string;

  @ApiPropertyOptional({ example: 'Reusable export for month-end reporting', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ExportFormat, example: ExportFormat.CSV })
  format!: ExportFormat;

  @ApiProperty({ enum: ReportType, example: ReportType.MONTHLY_SUMMARY })
  reportType!: ReportType;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { startDate: '2026-03-01', endDate: '2026-03-31' },
  })
  filters!: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { includeSummary: true, includeReceipts: false },
    nullable: true,
  })
  settings!: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ example: false })
  isScheduled!: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  scheduleCron!: string | null;

  @ApiPropertyOptional({ type: [String], example: ['user@example.com'], nullable: true })
  emailRecipients!: string[] | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  emailSubjectTemplate!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  emailBodyTemplate!: string | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-26T10:05:00.000Z' })
  updatedAt!: Date;
}

export class ExportJobListResponseDto {
  @ApiProperty({ type: () => [ExportJobResponseDto] })
  jobs!: ExportJobResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class ExportFormatOptionDto {
  @ApiProperty({ enum: ExportFormat, example: ExportFormat.CSV })
  value!: ExportFormat;

  @ApiProperty({ example: 'CSV' })
  label!: string;

  @ApiProperty({ example: 'Comma-separated values, compatible with Excel' })
  description!: string;

  @ApiProperty({ example: 'text/csv' })
  mimeType!: string;
}

export class ExportFormatsResponseDto {
  @ApiProperty({ type: () => [ExportFormatOptionDto] })
  formats!: ExportFormatOptionDto[];
}

export class ReportTypeOptionDto {
  @ApiProperty({ enum: ReportType, example: ReportType.MONTHLY_SUMMARY })
  value!: ReportType;

  @ApiProperty({ example: 'Monthly Summary' })
  label!: string;

  @ApiProperty({ example: 'Monthly breakdown of expenses and settlements' })
  description!: string;
}

export class ReportTypesResponseDto {
  @ApiProperty({ type: () => [ReportTypeOptionDto] })
  reportTypes!: ReportTypeOptionDto[];
}

export class ExportEligibilityResponseDto {
  @ApiProperty({ example: true })
  canExport!: boolean;

  @ApiProperty({ example: 2 })
  exportsThisMonth!: number;

  @ApiProperty({ example: 10 })
  monthlyLimit!: number;

  @ApiProperty({ example: 8 })
  remainingExports!: number;
}

export class ExportStatsResponseDto {
  @ApiProperty({ example: 12 })
  totalExports!: number;

  @ApiProperty({ example: 8 })
  completedExports!: number;

  @ApiProperty({ example: 1 })
  failedExports!: number;

  @ApiProperty({ example: 3 })
  pendingExports!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { CSV: 6, PDF: 3, JSON: 3 },
  })
  formatDistribution!: Record<string, number>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { MONTHLY_SUMMARY: 5, PAYMENT_HISTORY: 7 },
  })
  reportTypeDistribution!: Record<string, number>;
}
