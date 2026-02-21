import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { FraudDetectionService } from "./fraud-detection.service";
import { FraudAlert, AlertStatus } from "./entities/fraud-alert.entity";
import {
  AnalyzeSplitRequestDto,
  AnalyzePaymentRequestDto,
  FeedbackRequestDto,
  ResolveAlertDto,
} from "./dto/analyze-split.dto";

@Controller("fraud")
export class FraudDetectionController {
  constructor(
    private readonly fraudDetectionService: FraudDetectionService,
    @InjectRepository(FraudAlert)
    private fraudAlertRepository: Repository<FraudAlert>,
  ) {}

  /**
   * Get all fraud alerts
   */
  @Get("alerts")
  async getAlerts(
    @Query("status") status?: AlertStatus,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50,
  ) {
    return this.fraudDetectionService.getAlerts(status, page, limit);
  }

  /**
   * Get a single alert
   */
  @Get("alerts/:id")
  async getAlert(@Param("id") id: string) {
    const alert = await this.fraudDetectionService.getAlert(id);
    if (!alert) {
      return { error: "Alert not found" };
    }
    return alert;
  }

  /**
   * Resolve a fraud alert
   */
  @Post("alerts/:id/resolve")
  @HttpCode(HttpStatus.OK)
  async resolveAlert(
    @Param("id") id: string,
    @Body() resolveData: ResolveAlertDto,
    @Query("resolvedBy") resolvedBy: string,
  ) {
    return this.fraudDetectionService.resolveAlert(id, resolveData, resolvedBy);
  }

  /**
   * Get analysis for a specific split
   */
  @Get("splits/:id/analysis")
  async getSplitAnalysis(@Param("id") id: string) {
    return this.fraudDetectionService.getSplitAnalysis(id);
  }

  /**
   * Get fraud detection statistics
   */
  @Get("stats")
  async getStats() {
    return this.fraudDetectionService.getStats();
  }

  /**
   * Submit feedback on an alert
   */
  @Post("feedback")
  @HttpCode(HttpStatus.OK)
  async submitFeedback(@Body() feedback: FeedbackRequestDto) {
    await this.fraudDetectionService.submitFeedback(feedback);
    return { success: true };
  }

  /**
   * Analyze a split (admin/debug endpoint)
   */
  @Post("analyze/split")
  @HttpCode(HttpStatus.OK)
  async analyzeSplit(@Body() request: AnalyzeSplitRequestDto) {
    return this.fraudDetectionService.analyzeSplit(request);
  }

  /**
   * Analyze a payment (admin/debug endpoint)
   */
  @Post("analyze/payment")
  @HttpCode(HttpStatus.OK)
  async analyzePayment(@Body() request: AnalyzePaymentRequestDto) {
    return this.fraudDetectionService.analyzePayment(request);
  }
}
