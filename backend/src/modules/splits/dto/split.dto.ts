import { Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { SplitType, TipDistributionType } from "./calculate-split.dto";

export class CreateSplitDto {
  @IsDefined()
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDefined()
  @IsString()
  creatorWalletAddress!: string;

  @IsOptional()
  @IsString()
  preferredCurrency?: string;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  participants?: CreateParticipantDto[];

  @IsOptional()
  @IsArray()
  items?: CreateItemDto[];
}

export class CreateParticipantDto {
  @IsDefined()
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountOwed?: number;

  @IsOptional()
  @IsString()
  walletAddress?: string;
}

export class CreateItemDto {
  @IsDefined()
  @IsString()
  name!: string;

  @IsDefined()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsDefined()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsDefined()
  @IsNumber()
  @Min(0)
  totalPrice!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  assignedToIds?: string[];
}

export class UpdateSplitDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  preferredCurrency?: string;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsEnum(["active", "completed", "partial"])
  status?: "active" | "completed" | "partial";
}

export class CreateDraftSplitDto {
  @IsDefined()
  @IsUUID()
  receiptId!: string;

  @IsDefined()
  @IsString()
  creatorId!: string;
}

export class ItemAssignmentDto {
  @IsDefined()
  @IsUUID()
  itemId!: string;

  @IsDefined()
  @IsArray()
  @IsUUID("4", { each: true })
  participantIds!: string[];
}

export class SplitAllocationDto {
  @IsOptional()
  @IsArray()
  itemAssignments?: ItemAssignmentDto[];

  @IsOptional()
  @IsArray()
  participants?: CreateParticipantDto[];
}

export class FinalizeDraftSplitDto {
  @IsDefined()
  @IsEnum(SplitType)
  splitType!: SplitType;

  @IsDefined()
  @IsArray()
  @IsUUID("4", { each: true })
  participantIds!: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;

  @IsOptional()
  @IsEnum(TipDistributionType)
  tipDistribution?: TipDistributionType;

  @IsOptional()
  @IsArray()
  percentages?: PercentageDto[];

  @IsOptional()
  @IsArray()
  customAmounts?: CustomAmountDto[];
}

export class PercentageDto {
  @IsDefined()
  @IsUUID()
  participantId!: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

export class CustomAmountDto {
  @IsDefined()
  @IsUUID()
  participantId!: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  amount!: number;
}
