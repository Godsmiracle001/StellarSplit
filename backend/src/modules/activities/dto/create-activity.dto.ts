import { IsEnum, IsOptional, IsUUID, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../../../entities/activity.entity';

export class CreateActivityDto {
    @ApiProperty({ description: 'Wallet address of the user' })
    @IsString()
    userId!: string;

    @ApiProperty({ enum: ActivityType, description: 'Type of activity' })
    @IsEnum(ActivityType)
    activityType!: ActivityType;

    @ApiProperty({ description: 'Split ID if activity is related to a split', required: false })
    @IsOptional()
    @IsUUID()
    splitId?: string;

    @ApiProperty({ description: 'Additional metadata for the activity', required: false })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
