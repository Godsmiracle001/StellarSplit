import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SplitParticipantResponseDto {
  @ApiProperty({ example: '6f0f6b90-07dc-42b7-bfca-a37b3db6e4c2' })
  id!: string;

  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  splitId!: string;

  @ApiProperty({ example: 'c65916df-0e49-4cfe-a3e8-a96c7da7c34a' })
  userId!: string;

  @ApiProperty({ example: 42.5 })
  amountOwed!: number;

  @ApiProperty({ example: 20 })
  amountPaid!: number;

  @ApiProperty({ enum: ['pending', 'paid', 'partial'], example: 'pending' })
  status!: 'pending' | 'paid' | 'partial';

  @ApiPropertyOptional({ example: 'GABCD1234WALLETADDRESS' })
  walletAddress?: string;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-20T10:15:00.000Z' })
  updatedAt!: Date;
}

export class SplitItemResponseDto {
  @ApiProperty({ example: '969af42c-f6b0-445f-b445-b51dbd12d629' })
  id!: string;

  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  splitId!: string;

  @ApiProperty({ example: 'Sashimi Platter' })
  name!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 120 })
  unitPrice!: number;

  @ApiProperty({ example: 120 })
  totalPrice!: number;

  @ApiPropertyOptional({ example: 'food' })
  category?: string;

  @ApiProperty({ type: [String], example: ['c65916df-0e49-4cfe-a3e8-a96c7da7c34a'] })
  assignedToIds!: string[];

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-20T10:15:00.000Z' })
  updatedAt!: Date;
}

export class SplitDetailResponseDto {
  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  id!: string;

  @ApiProperty({ example: 450 })
  totalAmount!: number;

  @ApiProperty({ example: 225 })
  amountPaid!: number;

  @ApiProperty({ enum: ['active', 'completed', 'partial'], example: 'active' })
  status!: 'active' | 'completed' | 'partial';

  @ApiProperty({ example: false })
  isFrozen!: boolean;

  @ApiPropertyOptional({ example: 'Dinner at Nobu' })
  description?: string;

  @ApiPropertyOptional({ example: 'USD' })
  preferredCurrency?: string;

  @ApiPropertyOptional({ example: 'GCREATORWALLETADDRESS' })
  creatorWalletAddress?: string;

  @ApiPropertyOptional({ example: '2026-04-01T18:00:00.000Z' })
  dueDate?: Date;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-20T10:15:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt!: Date | null;

  @ApiPropertyOptional({ example: '41eb7acc-81d4-4701-b92e-2816cbd9bd2b' })
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-04-07T18:00:00.000Z' })
  expiryDate?: Date;

  @ApiProperty({ type: () => [SplitItemResponseDto] })
  items!: SplitItemResponseDto[];

  @ApiProperty({ type: () => [SplitParticipantResponseDto] })
  participants!: SplitParticipantResponseDto[];
}
