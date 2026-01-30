import { IsIn, IsISO8601, IsOptional, IsString } from "class-validator";

export class ExportRequestDto {
  @IsString()
  @IsIn([
    "spending-trends",
    "category-breakdown",
    "top-partners",
    "monthly-report",
  ])
  type!: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsString()
  month?: string; // YYYY-MM for monthly-report

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["csv", "pdf"])
  format?: "csv" | "pdf" = "csv";
}
