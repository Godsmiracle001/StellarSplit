import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class SplitDataDto {
  @IsString()
  split_id!: string;

  @IsString()
  creator_id!: string;

  @IsNumber()
  total_amount!: number;

  @IsNumber()
  participant_count!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  preferred_currency?: string;

  @IsOptional()
  @IsString()
  creator_wallet_address?: string;

  @IsDate()
  @Type(() => Date)
  created_at!: Date;

  @IsOptional()
  @IsArray()
  items?: Record<string, any>[];

  @IsOptional()
  @IsArray()
  participants?: Record<string, any>[];
}

export class UserHistoryDto {
  @IsString()
  user_id!: string;

  @IsOptional()
  @IsNumber()
  total_splits_created?: number;

  @IsOptional()
  @IsNumber()
  total_splits_completed?: number;

  @IsOptional()
  @IsNumber()
  average_split_amount?: number;

  @IsOptional()
  @IsNumber()
  total_payments_made?: number;

  @IsOptional()
  @IsNumber()
  total_payments_received?: number;

  @IsOptional()
  @IsNumber()
  account_age_days?: number;

  @IsOptional()
  @IsString()
  wallet_address?: string;
}

export class PaymentDataDto {
  @IsString()
  payment_id!: string;

  @IsString()
  split_id!: string;

  @IsString()
  participant_id!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  asset!: string;

  @IsString()
  tx_hash!: string;

  @IsString()
  sender_address!: string;

  @IsString()
  receiver_address!: string;

  @IsDate()
  @Type(() => Date)
  timestamp!: Date;
}

export class SplitContextDto {
  @IsString()
  split_id!: string;

  @IsNumber()
  total_amount!: number;

  @IsNumber()
  amount_paid!: number;

  @IsString()
  status!: string;

  @IsOptional()
  @IsArray()
  participants?: Record<string, any>[];
}

export class AnalysisResponseDto {
  risk_score!: number;
  risk_level!: string;
  anomaly_score!: number;
  pattern_match_score!: number;
  flags!: string[];
  model_version!: string;
  processing_time_ms!: number;
}

export class AnalyzeSplitRequestDto {
  @ValidateNested()
  @Type(() => SplitDataDto)
  split_data!: SplitDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserHistoryDto)
  user_history?: UserHistoryDto;
}

export class AnalyzePaymentRequestDto {
  @ValidateNested()
  @Type(() => PaymentDataDto)
  payment_data!: PaymentDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SplitContextDto)
  split_context?: SplitContextDto;
}

export enum FeedbackType {
  TRUE_POSITIVE = "true_positive",
  FALSE_POSITIVE = "false_positive",
  FALSE_NEGATIVE = "false_negative",
  TRUE_NEGATIVE = "true_negative",
}

export class FeedbackRequestDto {
  @IsString()
  alert_id!: string;

  @IsBoolean()
  is_fraud!: boolean;

  @IsEnum(FeedbackType)
  feedback_type!: FeedbackType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  reviewed_by!: string;
}

export class ResolveAlertDto {
  @IsEnum(["confirmed_fraud", "false_positive", "legitimate"])
  resolution!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_true_positive?: boolean;
}
