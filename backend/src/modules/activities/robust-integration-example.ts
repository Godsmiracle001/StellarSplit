import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

/**
 * Example 6: Error Handling and Graceful Degradation
 * Activity tracking should not break core functionality
 */
@Injectable()
export class RobustIntegrationExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async processPaymentWithGracefulTracking(
    userId: string,
    splitId: string,
    amount: number,
    txHash: string
  ) {
    // Core payment processing
    // const paymentResult = await this.stellarService.submitPayment(...);

    // Track activity, but don't let tracking failures affect payment
    try {
      await this.activitiesService.trackPaymentMade(
        userId,
        splitId,
        amount,
        txHash,
        { timestamp: new Date().toISOString() }
      );
    } catch (error) {
      // Log the error but don't throw
      console.error("Failed to track activity:", error);
      // Optionally send to error monitoring service
      // await this.errorMonitoring.captureException(error);
    }

    // Return payment result regardless of tracking status
    return { success: true, txHash };
  }
}
