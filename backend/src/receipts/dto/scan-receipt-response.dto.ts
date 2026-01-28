import { ApiProperty } from "@nestjs/swagger";

export class ReceiptItemDto {
  @ApiProperty({ description: "Item name", example: "Burger" })
  name!: string;

  @ApiProperty({ description: "Quantity", example: 2 })
  quantity!: number;

  @ApiProperty({ description: "Price per item", example: 12.99 })
  price!: number;
}

export class ScanReceiptResponseDto {
  @ApiProperty({
    description: "List of items extracted from receipt",
    type: [ReceiptItemDto],
  })
  items!: ReceiptItemDto[];

  @ApiProperty({ description: "Subtotal amount", example: 25.98 })
  subtotal!: number;

  @ApiProperty({ description: "Tax amount", example: 2.08 })
  tax!: number;

  @ApiProperty({ description: "Tip amount", example: 5.0 })
  tip!: number;

  @ApiProperty({ description: "Total amount", example: 33.06 })
  total!: number;

  @ApiProperty({
    description: "Confidence score (0-1)",
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  confidence!: number;
}
