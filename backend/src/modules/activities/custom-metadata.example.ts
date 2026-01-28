import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

/**
 * Example 5: Custom Metadata Usage
 * Leverage the flexible metadata field for rich activity data
 */
@Injectable()
export class CustomMetadataExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async trackPaymentWithCustomData(
    userId: string,
    splitId: string,
    amount: number,
    txHash: string
  ) {
    await this.activitiesService.trackPaymentMade(
      userId,
      splitId,
      amount,
      txHash,
      {
        // Payment details
        asset: "USDC",
        network: "stellar",

        // User context
        deviceType: "mobile",
        appVersion: "1.2.3",

        // Split context
        splitName: "Dinner at Restaurant",
        category: "food",

        // Timing
        processedAt: new Date().toISOString(),

        // Additional data
        isFirstPayment: true,
        completionPercentage: 50,

        // You can add any JSON-serializable data
        customFields: {
          referenceNumber: "REF-12345",
          notes: "Paid via mobile app",
        },
      }
    );
  }
}
