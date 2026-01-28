import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

/**
 * Example 3: Reminder Service Integration
 * Track reminder notifications
 */
@Injectable()
export class ReminderServiceExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async sendPaymentReminder(
    senderId: string,
    recipientId: string,
    splitId: string,
    amountDue: number
  ) {
    // Send reminder logic (email, push notification, etc.)...

    // Track reminder sent for sender
    await this.activitiesService.trackReminderSent(
      senderId,
      splitId,
      recipientId,
      {
        amountDue,
        reminderType: "payment_due",
        sentAt: new Date().toISOString(),
      }
    );

    // Optionally track as a received reminder for recipient
    // This could use the same tracking or a different approach
    // depending on your UX requirements
  }
}
