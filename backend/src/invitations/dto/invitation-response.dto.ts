import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitDetailResponseDto, SplitParticipantResponseDto } from '../../modules/splits/dto/split-response.dto';

export class InvitationResponseDto {
  @ApiProperty({ example: 'a5d7d490-53ff-4ba8-ae28-bf74173b513d' })
  id!: string;

  @ApiProperty({ example: 'dd6b2269-0b70-46b9-946f-aadcf923d4a1' })
  token!: string;

  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  splitId!: string;

  @ApiProperty({ example: '2026-03-29T10:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: null, nullable: true })
  usedAt!: Date | null;

  @ApiProperty({ example: 1 })
  maxUses!: number;

  @ApiProperty({ example: 0 })
  usesCount!: number;

  @ApiProperty({ example: true })
  isUpgradeable!: boolean;

  @ApiPropertyOptional({ example: 'alice@example.com' })
  inviteeEmail?: string;

  @ApiProperty({ example: 1 })
  tokenVersion!: number;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z' })
  createdAt!: Date;
}

export class InvitationCreateResponseDto {
  @ApiProperty({ example: 'a5d7d490-53ff-4ba8-ae28-bf74173b513d' })
  id!: string;

  @ApiProperty({ example: 'dd6b2269-0b70-46b9-946f-aadcf923d4a1' })
  token!: string;

  @ApiProperty({ example: '91d71dcb-59f8-40c6-8e06-e3e408069e62' })
  splitId!: string;

  @ApiProperty({ example: '2026-03-29T10:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({
    example:
      'http://localhost:3000/invite/join/dd6b2269-0b70-46b9-946f-aadcf923d4a1',
  })
  link!: string;

  @ApiProperty({ example: 1 })
  maxUses!: number;

  @ApiProperty({ example: 0 })
  usesCount!: number;

  @ApiProperty({ example: true })
  isUpgradeable!: boolean;
}

export class InvitationJoinResponseDto {
  @ApiProperty({ type: () => SplitParticipantResponseDto })
  participant!: SplitParticipantResponseDto;

  @ApiProperty({ type: () => SplitDetailResponseDto })
  split!: SplitDetailResponseDto;

  @ApiProperty({ example: false })
  isNewUser!: boolean;
}

export class InvitationUpgradeResponseDto {
  @ApiProperty({ type: () => SplitParticipantResponseDto })
  participant!: SplitParticipantResponseDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { id: '2d2c06d0-5c23-4c13-914f-2d989a655d8d', email: 'alice@example.com' },
  })
  user!: Record<string, unknown>;

  @ApiProperty({ example: true })
  wasGuest!: boolean;
}
