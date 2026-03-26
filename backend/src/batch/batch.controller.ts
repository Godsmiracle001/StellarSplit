import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  Permissions,
  RequirePermissions,
} from "../auth/decorators/permissions.decorator";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BatchService } from "./batch.service";
import {
  CreateBatchPaymentsDto,
  CreateBatchSplitsDto,
  RetryBatchDto,
} from "./dto/create-batch.dto";
import { BatchJobStatus } from "./entities/batch-job.entity";

@Controller("batch")
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  /**
   * Create a batch of splits
   */
  @Post("splits")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.CAN_CREATE_SPLIT)
  async createBatchSplits(@Body() dto: CreateBatchSplitsDto) {
    return this.batchService.createBatchSplits(dto);
  }

  /**
   * Create a batch of payments
   */
  @Post("payments")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.CAN_CREATE_PAYMENT)
  async createBatchPayments(@Body() dto: CreateBatchPaymentsDto) {
    return this.batchService.createBatchPayments(dto);
  }

  /**
   * Get batch status by ID
   */
  @Get(":batchId/status")
  async getBatchStatus(@Param("batchId") batchId: string) {
    return this.batchService.getBatchStatus(batchId);
  }

  /**
   * List all batches with pagination
   */
  @Get()
  async listBatches(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50,
    @Query("status") status?: BatchJobStatus,
  ) {
    return this.batchService.listBatches(page, limit, status);
  }

  /**
   * Retry failed operations in a batch
   */
  @Post(":batchId/retry")
  @HttpCode(HttpStatus.OK)
  async retryBatch(
    @Param("batchId") batchId: string,
    @Body() dto: RetryBatchDto,
  ) {
    return this.batchService.retryFailedOperations(batchId, dto.operationIds);
  }

  /**
   * Cancel a pending or processing batch
   */
  @Delete(":batchId/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelBatch(@Param("batchId") batchId: string) {
    return this.batchService.cancelBatch(batchId);
  }

  /**
   * Get operations for a batch
   */
  @Get(":batchId/operations")
  async getBatchOperations(
    @Param("batchId") batchId: string,
    @Query("status") status?: string,
  ) {
    return this.batchService.getBatchOperations(batchId, status as any);
  }
}
