import { Injectable } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

/**
 * Example 2: Split Creation Service Integration
 * Track split lifecycle events
 */
@Injectable()
export class SplitServiceExample {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async createSplit(
    creatorId: string,
    totalAmount: number,
    description: string,
    participants: string[]
  ) {
    // Create split logic...
    const splitId = "generated-uuid";

    // Track split creation
    await this.activitiesService.trackSplitCreated(creatorId, splitId, {
      totalAmount,
      description,
      participantCount: participants.length,
      currency: "USDC",
    });

    // Track participants added
    for (const participantAddress of participants) {
      // Creator gets notified about each participant
      await this.activitiesService.trackParticipantAdded(
        creatorId,
        splitId,
        participantAddress,
        { role: "participant" }
      );

      // Each participant also gets notified they were added
      // (You might want to avoid this for the creator)
      if (participantAddress !== creatorId) {
        await this.activitiesService.trackParticipantAdded(
          participantAddress,
          splitId,
          participantAddress,
          {
            role: "participant",
            addedBy: creatorId,
          }
        );
      }
    }

    return splitId;
  }

  async updateSplit(
    userId: string,
    splitId: string,
    changes: { totalAmount?: number; description?: string }
  ) {
    // Update split logic...

    // Track the edit
    await this.activitiesService.trackSplitEdited(userId, splitId, changes, {
      editedAt: new Date().toISOString(),
    });

    // Optionally notify other participants about the change
    // const participants = await this.getParticipants(splitId);
    // for (const participant of participants) {
    //   if (participant.userId !== userId) {
    //     await this.activitiesService.trackSplitEdited(
    //       participant.userId,
    //       splitId,
    //       changes,
    //       { editedBy: userId }
    //     );
    //   }
    // }
  }

  async completeSplit(splitId: string, participants: string[]) {
    // Complete split logic...

    // Notify all participants
    for (const userId of participants) {
      await this.activitiesService.trackSplitCompleted(userId, splitId, {
        completedAt: new Date().toISOString(),
        status: "fully_paid",
      });
    }
  }
}
