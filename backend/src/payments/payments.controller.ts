import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import {
  Permissions,
  RequirePermissions,
} from "../auth/decorators/permissions.decorator";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IdempotencyInterceptor } from "../common/idempotency/idempotency.interceptor";
import { MultiCurrencyService } from "../multi-currency/multi-currency.service";
import { SubmitPaymentDto } from "./dto/submit-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly multiCurrencyService: MultiCurrencyService,
  ) {}

  @Post("/submit")
  @UseInterceptors(IdempotencyInterceptor)
  @RequirePermissions(Permissions.CAN_CREATE_PAYMENT)
  async submitPayment(
    @Body(ValidationPipe) submitPaymentDto: SubmitPaymentDto,
  ) {
    this.logger.log(
      `Received payment submission: ${JSON.stringify(submitPaymentDto)}`,
    );

    const {
      splitId,
      participantId,
      stellarTxHash,
      idempotencyKey,
      externalReference,
    } = submitPaymentDto;
    return await this.paymentsService.submitPayment(
      splitId,
      participantId,
      stellarTxHash,
      idempotencyKey,
      externalReference,
    );
  }

  @Get("/verify/:txHash")
  async verifyTransaction(@Param("txHash") txHash: string) {
    this.logger.log(`Verifying transaction: ${txHash}`);

    return await this.paymentsService.verifyTransaction(txHash);
  }

  @Get("/:txHash")
  async getPaymentByTxHash(@Param("txHash") txHash: string) {
    this.logger.log(`Getting payment for transaction: ${txHash}`);

    return await this.paymentsService.getPaymentByTxHash(txHash);
  }

  @Get("/split/:splitId")
  @RequirePermissions(Permissions.CAN_READ_SPLIT_PAYMENTS)
  async getPaymentsBySplitId(@Param("splitId") splitId: string) {
    this.logger.log(`Getting payments for split: ${splitId}`);

    return await this.paymentsService.getPaymentsBySplitId(splitId);
  }

  @Get("/participant/:participantId")
  @RequirePermissions(Permissions.CAN_READ_PARTICIPANT_PAYMENTS)
  async getPaymentsByParticipantId(
    @Param("participantId") participantId: string,
  ) {
    this.logger.log(`Getting payments for participant: ${participantId}`);

    return await this.paymentsService.getPaymentsByParticipantId(participantId);
  }

  @Get("/stats/:splitId")
  @RequirePermissions(Permissions.CAN_READ_SPLIT_PAYMENTS)
  async getPaymentStatsForSplit(@Param("splitId") splitId: string) {
    this.logger.log(`Getting payment stats for split: ${splitId}`);

    return await this.paymentsService.getPaymentStatsForSplit(splitId);
  }

  /**
   * Get path payment transaction for multi-currency conversion
   * Builds a path payment transaction that the client can sign and submit
   */
  @Get("/path-payment/:splitId/:participantId")
  @RequirePermissions(Permissions.CAN_CREATE_PAYMENT)
  async getPathPaymentTransaction(
    @Param("splitId") splitId: string,
    @Param("participantId") participantId: string,
    @Query("sourceAsset") sourceAsset: string,
    @Query("destinationAmount") destinationAmount: string,
    @Query("slippageTolerance") slippageTolerance?: string,
  ) {
    this.logger.log(
      `Getting path payment transaction for split ${splitId}, participant ${participantId}`,
    );

    return await this.multiCurrencyService.getPathPaymentTransaction(
      splitId,
      participantId,
      sourceAsset,
      parseFloat(destinationAmount),
      slippageTolerance ? parseFloat(slippageTolerance) : 0.01,
    );
  }

  /**
   * Get supported assets for multi-currency payments
   */
  @Get("/supported-assets")
  async getSupportedAssets() {
    this.logger.log("Getting supported assets");
    return {
      assets: this.multiCurrencyService.getSupportedAssets(),
    };
  }

  /**
   * Get multi-currency payment details
   */
  @Get("/multi-currency/:paymentId")
  async getMultiCurrencyPayment(@Param("paymentId") paymentId: string) {
    this.logger.log(`Getting multi-currency payment details for ${paymentId}`);
    return await this.multiCurrencyService.getMultiCurrencyPayment(paymentId);
  }
}
