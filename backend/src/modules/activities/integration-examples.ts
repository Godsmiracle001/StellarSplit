/**
 * Integration Examples for Activity Tracking
 *
 * This file demonstrates how to integrate activity tracking
 * into various services within the StellarSplit application.
 */

import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "../activities/activities.service";

/**
 * Example 1: Payment Service Integration
 * Track payment-related activities
 */
@Injectable()
export class PaymentServiceExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async processPayment(
    userId: string,
    splitId: string,
    amount: number,
    txHash: string,
    asset: string
  ) {
    try {
      // Process payment logic here...
      // const result = await this.stellarService.submitPayment(...);

      // Track the payment made activity
      await this.activitiesService.trackPaymentMade(
        userId,
        splitId,
        amount,
        txHash,
        {
          asset,
          timestamp: new Date().toISOString(),
          status: "confirmed",
        }
      );

      // Notify recipient(s) - they'll get payment_received activities
      // const recipients = await this.getRecipients(splitId);
      // for (const recipient of recipients) {
      //   await this.activitiesService.trackPaymentReceived(
      //     recipient.userId,
      //     splitId,
      //     amount,
      //     txHash,
      //     userId, // from address
      //     { asset }
      //   );
      // }
    } catch (error) {
      console.error("Payment processing failed:", error);
      throw error;
    }
  }
}
