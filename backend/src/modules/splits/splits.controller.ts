import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query,
  ValidationPipe,
  BadRequestException,
  Logger
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SplitsService } from './splits.service';
import { 
  CreateSplitDto, 
  UpdateSplitDto, 
  CreateDraftSplitDto,
  FinalizeDraftSplitDto,
  SplitAllocationDto 
} from './dto/split.dto';
import { Split } from '../../entities/split.entity';
import { SplitDetailResponseDto } from './dto/split-response.dto';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';

@ApiTags('splits')
@Controller('splits')
export class SplitsController {
  private readonly logger = new Logger(SplitsController.name);

  constructor(private readonly splitsService: SplitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new split' })
  @ApiResponse({ status: 201, description: 'Split created successfully', type: Split })
  async createSplit(@Body(ValidationPipe) createSplitDto: CreateSplitDto): Promise<Split> {
    this.logger.log(`Creating split for creator: ${createSplitDto.creatorWalletAddress}`);
    return this.splitsService.createSplit(createSplitDto);
  }

  @Post('draft-from-receipt')
  @ApiOperation({ summary: 'Create a draft split from receipt OCR data' })
  @ApiResponse({ status: 201, description: 'Draft split created', type: Split })
  async createDraftSplitFromReceipt(
    @Body(ValidationPipe) createDraftDto: CreateDraftSplitDto
  ): Promise<Split> {
    this.logger.log(`Creating draft split from receipt: ${createDraftDto.receiptId}`);
    return this.splitsService.createDraftSplitFromReceipt(
      createDraftDto.receiptId, 
      createDraftDto.creatorId
    );
  }

  @Patch(':id/allocations')
  @ApiOperation({ summary: 'Update split allocations and item assignments' })
  @ApiResponse({ status: 200, description: 'Split allocations updated', type: Split })
  async updateSplitAllocations(
    @Param('id') splitId: string,
    @Body(ValidationPipe) allocationDto: SplitAllocationDto
  ): Promise<Split> {
    this.logger.log(`Updating allocations for split: ${splitId}`);
    return this.splitsService.updateSplitAllocations(splitId, allocationDto);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize a draft split with calculated amounts' })
  @ApiResponse({ status: 200, description: 'Split finalized', type: Split })
  async finalizeDraftSplit(
    @Param('id') splitId: string,
    @Body(ValidationPipe) finalizeDto: FinalizeDraftSplitDto
  ): Promise<Split> {
    this.logger.log(`Finalizing split: ${splitId}`);
    return this.splitsService.finalizeDraftSplit(splitId, finalizeDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a split by ID' })
  @ApiOkResponse({ description: 'Split retrieved', type: SplitDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Split not found', type: ApiErrorResponseDto })
  async getSplitById(@Param('id') splitId: string): Promise<Split> {
    return this.splitsService.getSplitById(splitId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all splits for a user' })
  @ApiResponse({ status: 200, description: 'Splits retrieved', type: [Split] })
  async getSplitsByUser(@Param('userId') userId: string): Promise<Split[]> {
    return this.splitsService.getSplitsByUser(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a split' })
  @ApiResponse({ status: 200, description: 'Split updated', type: Split })
  async updateSplit(
    @Param('id') splitId: string,
    @Body(ValidationPipe) updateSplitDto: UpdateSplitDto
  ): Promise<Split> {
    this.logger.log(`Updating split: ${splitId}`);
    return this.splitsService.updateSplit(splitId, updateSplitDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a split' })
  @ApiResponse({ status: 204, description: 'Split deleted' })
  async deleteSplit(@Param('id') splitId: string): Promise<void> {
    this.logger.log(`Deleting split: ${splitId}`);
    return this.splitsService.deleteSplit(splitId);
  }
}
