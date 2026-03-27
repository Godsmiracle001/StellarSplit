import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsString,
  IsEmail,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ExportFormat, ReportType } from "../entities/export-job.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ExportFilterDto {
  @ApiPropertyOptional({
    description: "Start date for filtering (ISO format)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for filtering (ISO format)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: "Filter by expense categories",
    type: [String],
    example: ["food", "transportation", "entertainment"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: "Filter by participant user IDs",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];

  @ApiPropertyOptional({
    description: "Minimum amount filter",
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: "Maximum amount filter",
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: "Filter by currency",
    example: "XLM",
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: "Only include expenses paid by me",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  paidByMe?: boolean;

  @ApiPropertyOptional({
    description: "Only include expenses owed to me",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  owedToMe?: boolean;

  @ApiPropertyOptional({
    description: "Filter by settlement status",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  settled?: boolean;
}

export class ExportSettingsDto {
  @ApiPropertyOptional({
    description: "Include tax-related fields in export",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeTaxFields?: boolean = false;

  @ApiPropertyOptional({
    description: "Include receipt URLs/attachments",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeReceipts?: boolean = false;

  @ApiPropertyOptional({
    description: "Group results by category",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  groupByCategory?: boolean = false;

  @ApiPropertyOptional({
    description: "Group results by month",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  groupByMonth?: boolean = false;

  @ApiPropertyOptional({
    description: "Include charts in PDF reports",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeChart?: boolean = true;

  @ApiPropertyOptional({
    description: "Include summary section",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean = true;

  @ApiPropertyOptional({
    description: "Logo URL for PDF header",
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: "Company name for tax reports",
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: "Tax ID for reporting",
  })
  @IsOptional()
  @IsString()
  taxId?: string;
}

export class CreateExportDto {
  @ApiProperty({
    enum: ExportFormat,
    description: "Export file format",
    example: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @ApiProperty({
    enum: ReportType,
    description: "Type of report to generate",
    example: ReportType.MONTHLY_SUMMARY,
  })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiPropertyOptional({
    description: "Filters to apply to the export",
    type: ExportFilterDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportFilterDto)
  filters?: ExportFilterDto;

  @ApiPropertyOptional({
    description: "Export settings and options",
    type: ExportSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportSettingsDto)
  settings?: ExportSettingsDto;

  @ApiPropertyOptional({
    description: "Email address to send the export to",
    example: "user@example.com",
  })
  @IsOptional()
  @IsEmail()
  emailRecipient?: string;

  @ApiPropertyOptional({
    description: "Whether this is for tax compliance",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTaxCompliant?: boolean = false;

  @ApiPropertyOptional({
    description: "Tax year for compliance reports",
    example: 2024,
  })
  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2100)
  taxYear?: number;
}

export class ScheduleExportDto extends CreateExportDto {
  @ApiProperty({
    description: "Cron expression for scheduling",
    example: "0 9 1 * *", // 9 AM on 1st of every month
  })
  @IsString()
  scheduleCron!: string;

  @ApiPropertyOptional({
    description: "Name for the scheduled export",
    example: "Monthly Tax Report",
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateExportTemplateDto {
  @ApiProperty({
    description: "Template name",
    example: "Monthly Expense Report",
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: "Template description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Whether this template should run on a schedule",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean = false;

  @ApiPropertyOptional({
    description: "Cron expression for scheduled templates",
    example: "0 9 1 * *",
  })
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiProperty({
    enum: ExportFormat,
    description: "Export file format",
  })
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @ApiProperty({
    enum: ReportType,
    description: "Type of report",
  })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiProperty({
    description: "Filters to apply",
    type: ExportFilterDto,
  })
  @ValidateNested()
  @Type(() => ExportFilterDto)
  filters!: ExportFilterDto;

  @ApiPropertyOptional({
    description: "Export settings",
    type: ExportSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportSettingsDto)
  settings?: ExportSettingsDto;

  @ApiPropertyOptional({
    description: "Set as default template",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
