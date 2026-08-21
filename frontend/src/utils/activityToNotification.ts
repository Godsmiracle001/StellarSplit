import i18n from "../i18n/config";
import type { ApiActivityRecord } from "./api-client";
import type { Notification, NotificationType } from "../types/notifications";

/**
 * Maps a backend `ActivityType` (see `backend/src/entities/activity.entity.ts`)
 * to the closest frontend `NotificationType`. The two enums aren't 1:1 —
 * `split_invitation`, `split_cancelled`, and `friend_request` currently have
 * no backend Activity counterpart — so anything without a clean match falls
 * back to `system_announcement`. This only affects which icon/label is
 * shown; it has no bearing on read-state, which is what issue #702 is
 * actually about.
 */
const ACTIVITY_TYPE_TO_NOTIFICATION_TYPE: Record<string, NotificationType> = {
  split_created: "system_announcement",
  participant_added: "split_invitation",
  payment_made: "system_announcement",
  payment_received: "payment_received",
  split_completed: "split_completed",
  reminder_sent: "payment_reminder",
  split_edited: "system_announcement",
};

function describeActivity(activity: ApiActivityRecord): { title: string; message: string } {
  const titleFromMetadata =
    typeof activity.metadata.title === "string" ? activity.metadata.title : undefined;

  switch (activity.activityType) {
    case "split_created":
      return {
        title: i18n.t("dashboard.activity.generic"),
        message: titleFromMetadata
          ? i18n.t("dashboard.activity.createdWithTitle", { title: titleFromMetadata })
          : i18n.t("dashboard.activity.created"),
      };
    case "payment_made":
      return {
        title: i18n.t("dashboard.activity.generic"),
        message: titleFromMetadata
          ? i18n.t("dashboard.activity.paidToward", { title: titleFromMetadata })
          : i18n.t("dashboard.activity.paymentSent"),
      };
    case "payment_received":
      return {
        title: i18n.t("dashboard.activity.paymentReceived"),
        message: titleFromMetadata
          ? i18n.t("dashboard.activity.receivedFor", { title: titleFromMetadata })
          : i18n.t("dashboard.activity.paymentReceived"),
      };
    case "split_completed":
      return {
        title: i18n.t("dashboard.activity.splitCompleted"),
        message: titleFromMetadata
          ? i18n.t("dashboard.activity.completedWithTitle", { title: titleFromMetadata })
          : i18n.t("dashboard.activity.splitCompleted"),
      };
    case "split_edited":
      return {
        title: i18n.t("dashboard.activity.generic"),
        message: titleFromMetadata
          ? i18n.t("dashboard.activity.updatedWithTitle", { title: titleFromMetadata })
          : i18n.t("dashboard.activity.splitUpdated"),
      };
    default:
      return {
        title: i18n.t("dashboard.activity.generic"),
        message: titleFromMetadata ?? i18n.t("dashboard.activity.generic"),
      };
  }
}

/**
 * Converts a backend Activity record into the shape the notifications store
 * expects. The Activity's own `id` is preserved as the Notification `id` —
 * this is what lets `markAsRead` target the right backend row later, and
 * what lets `notificationPersistence.merge` correctly reconcile local vs.
 * server read-state by identity rather than by guessing.
 */
export function activityToNotification(activity: ApiActivityRecord): Notification {
  const { title, message } = describeActivity(activity);
  return {
    id: activity.id,
    type: ACTIVITY_TYPE_TO_NOTIFICATION_TYPE[activity.activityType] ?? "system_announcement",
    title,
    message,
    read: activity.isRead,
    createdAt: activity.createdAt,
    actionUrl: activity.splitId ? `/split/${activity.splitId}` : undefined,
    metadata: activity.metadata,
  };
}

export function activitiesToNotifications(activities: ApiActivityRecord[]): Notification[] {
  return activities.map(activityToNotification);
}
