import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkAsReadDto {
    @ApiProperty({ description: 'Array of activity IDs to mark as read' })
    @IsArray()
    @IsUUID('4', { each: true })
    activityIds!: string[];
}
