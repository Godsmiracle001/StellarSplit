import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

/**
 * Example 7: Conditional Activity Tracking
 * Track activities based on user preferences
 */
@Injectable()
export class ConditionalTrackingExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async trackActivityIfEnabled(
    userId: string,
    activityType: string,
    splitId: string,
    metadata: any
  ) {
    // Check user preferences (this would come from a user settings service)
    const userPreferences = await this.getUserPreferences(userId);

    if (!userPreferences.activityFeedEnabled) {
      return; // Skip tracking
    }

    // Check if this specific activity type is enabled
    if (userPreferences.disabledActivityTypes?.includes(activityType)) {
      return; // Skip tracking
    }

    // Track the activity
    switch (activityType) {
      case "payment_made":
        await this.activitiesService.trackPaymentMade(
          userId,
          splitId,
          metadata.amount,
          metadata.txHash,
          metadata
        );
        break;
      // ... other cases
    }
  }

  private async getUserPreferences(userId: string): Promise<{
    activityFeedEnabled: boolean;
    disabledActivityTypes: string[];
  }> {
    return {
      activityFeedEnabled: true,
      disabledActivityTypes: [], // now string[]
    };
  }
}
