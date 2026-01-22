import { IsString, IsNumber, IsOptional, IsUUID, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
    @ApiProperty({ description: 'The ID of the split this item belongs to' })
    @IsUUID()
    splitId!: string;

    @ApiProperty({ description: 'Item description' })
    @IsString()
    name!: string;

    @ApiProperty({ description: 'Quantity of the item', minimum: 1 })
    @IsInt()
    @Min(1)
    quantity!: number;

    @ApiProperty({ description: 'Unit price of the item' })
    @IsNumber()
    unitPrice!: number;

    @ApiProperty({ description: 'Total price of the item' })
    @IsNumber()
    totalPrice!: number;

    @ApiPropertyOptional({ description: 'Category of the item' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ description: 'Array of participant IDs assigned to this item' })
    @IsArray()
    @IsUUID(undefined, { each: true })
    assignedToIds!: string[];
}
