import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  ValidationPipe,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReceiptsService } from '../../receipts/receipts.service';
import { SplitsService } from '../splits/splits.service';
import { CreateDraftSplitDto, SplitAllocationDto, FinalizeDraftSplitDto } from '../splits/dto/split.dto';
import { Split } from '../../entities/split.entity';
import { Receipt } from '../../receipts/entities/receipt.entity';

@ApiTags('receipt-to-split')
@Controller('api/receipt-to-split')
export class ReceiptToSplitController {
  private readonly logger = new Logger(ReceiptToSplitController.name);

  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly splitsService: SplitsService,
  ) {}

  @Post('upload-and-create-draft')
  @ApiOperation({ summary: 'Upload receipt and create draft split in one step' })
  @ApiResponse({ status: 201, description: 'Receipt uploaded and draft split created' })
  async uploadAndCreateDraft(
    @Body() body: { creatorId: string },
    @Query('receiptId') receiptId: string,
  ) {
    this.logger.log(`Creating draft split from uploaded receipt: ${receiptId}`);
    return this.splitsService.createDraftSplitFromReceipt(receiptId, body.creatorId);
  }

  @Get('receipts/:receiptId/ocr-preview')
  @ApiOperation({ summary: 'Get OCR preview for a receipt' })
  @ApiResponse({ status: 200, description: 'OCR data retrieved' })
  async getOcrPreview(@Param('receiptId') receiptId: string) {
    const ocrData = await this.receiptsService.getOcrData(receiptId);
    if (!ocrData.processed) {
      throw new NotFoundException('OCR data not available for this receipt');
    }
    return ocrData;
  }

  @Post('splits/:splitId/allocate-items')
  @ApiOperation({ summary: 'Allocate items to participants' })
  @ApiResponse({ status: 200, description: 'Items allocated successfully', type: Split })
  async allocateItems(
    @Param('splitId') splitId: string,
    @Body(ValidationPipe) allocationDto: SplitAllocationDto,
  ): Promise<Split> {
    this.logger.log(`Allocating items for split: ${splitId}`);
    return this.splitsService.updateSplitAllocations(splitId, allocationDto);
  }

  @Post('splits/:splitId/finalize')
  @ApiOperation({ summary: 'Finalize split with calculated amounts' })
  @ApiResponse({ status: 200, description: 'Split finalized successfully', type: Split })
  async finalizeSplit(
    @Param('splitId') splitId: string,
    @Body(ValidationPipe) finalizeDto: FinalizeDraftSplitDto,
  ): Promise<Split> {
    this.logger.log(`Finalizing split: ${splitId}`);
    return this.splitsService.finalizeDraftSplit(splitId, finalizeDto);
  }

  @Get('splits/:splitId/workflow-status')
  @ApiOperation({ summary: 'Get workflow status for a split' })
  @ApiResponse({ status: 200, description: 'Workflow status retrieved' })
  async getWorkflowStatus(@Param('splitId') splitId: string) {
    const split = await this.splitsService.getSplitById(splitId);
    const receipts = await this.receiptsService.listBySplit(splitId);
    
    return {
      splitId,
      status: split.status,
      hasReceipts: receipts.length > 0,
      receiptsProcessed: receipts.filter(r => r.ocrProcessed).length,
      itemsCount: split.items?.length || 0,
      participantsCount: split.participants?.length || 0,
      totalAmount: split.totalAmount,
      isFinalized: split.status === 'completed',
    };
  }

  @Get('receipts/unprocessed')
  @ApiOperation({ summary: 'Get receipts that need OCR processing' })
  @ApiResponse({ status: 200, description: 'Unprocessed receipts retrieved' })
  async getUnprocessedReceipts() {
    // This would need to be implemented in receipts service
    // For now, return empty array
    return [];
  }
}
