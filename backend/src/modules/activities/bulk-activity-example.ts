import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

/**
 * Example 4: Bulk Activity Tracking
 * Useful for batch operations or migrations
 */
@Injectable()
export class BulkActivityExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async trackBulkActivities(
    activities: Array<{
      userId: string;
      type: "payment_made" | "payment_received";
      splitId: string;
      amount: number;
      txHash: string;
    }>
  ) {
    // Process activities in parallel for better performance
    await Promise.all(
      activities.map(async (activity) => {
        if (activity.type === "payment_made") {
          await this.activitiesService.trackPaymentMade(
            activity.userId,
            activity.splitId,
            activity.amount,
            activity.txHash
          );
        } else {
          await this.activitiesService.trackPaymentReceived(
            activity.userId,
            activity.splitId,
            activity.amount,
            activity.txHash,
            "unknown" // sender address if available
          );
        }
      })
    );
  }
}
