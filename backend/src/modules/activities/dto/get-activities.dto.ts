import { IsOptional, IsEnum, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../../../entities/activity.entity';

export class GetActivitiesDto {
    @ApiProperty({ description: 'Wallet address of the user' })
    @IsUUID()
    userId!: string;

    @ApiProperty({ description: 'Page number (1-indexed)', default: 1, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ description: 'Number of items per page', default: 20, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiProperty({ enum: ActivityType, description: 'Filter by activity type', required: false })
    @IsOptional()
    @IsEnum(ActivityType)
    activityType?: ActivityType;

    @ApiProperty({ description: 'Filter by split ID', required: false })
    @IsOptional()
    @IsUUID()
    splitId?: string;

    @ApiProperty({ description: 'Filter by read status', required: false })
    @IsOptional()
    @Type(() => Boolean)
    isRead?: boolean;
}
