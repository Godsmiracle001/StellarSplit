import { describe, it, expect } from "vitest";
import { activityToNotification, activitiesToNotifications } from "./activityToNotification";
import type { ApiActivityRecord } from "./api-client";

function makeActivity(overrides: Partial<ApiActivityRecord> = {}): ApiActivityRecord {
  return {
    id: "activity-1",
    userId: "GABC123",
    activityType: "payment_received",
    splitId: "split-9",
    metadata: {},
    isRead: false,
    createdAt: "2026-04-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("activityToNotification (issue #702)", () => {
  it("preserves the activity id as the notification id", () => {
    const notification = activityToNotification(makeActivity({ id: "abc-123" }));
    expect(notification.id).toBe("abc-123");
  });

  it("carries the read state through unchanged", () => {
    expect(activityToNotification(makeActivity({ isRead: true })).read).toBe(true);
    expect(activityToNotification(makeActivity({ isRead: false })).read).toBe(false);
  });

  it("builds an actionUrl from splitId when present", () => {
    const notification = activityToNotification(makeActivity({ splitId: "split-42" }));
    expect(notification.actionUrl).toBe("/split/split-42");
  });

  it("omits actionUrl when there is no splitId", () => {
    const notification = activityToNotification(makeActivity({ splitId: undefined }));
    expect(notification.actionUrl).toBeUndefined();
  });

  it("maps known activity types to a sensible notification type", () => {
    expect(activityToNotification(makeActivity({ activityType: "payment_received" })).type).toBe(
      "payment_received",
    );
    expect(activityToNotification(makeActivity({ activityType: "split_completed" })).type).toBe(
      "split_completed",
    );
  });

  it("falls back to system_announcement for an unrecognized activity type", () => {
    const notification = activityToNotification(
      makeActivity({ activityType: "some_future_activity_type" }),
    );
    expect(notification.type).toBe("system_announcement");
  });

  it("uses the metadata title in the message when available", () => {
    const notification = activityToNotification(
      makeActivity({ activityType: "split_completed", metadata: { title: "Beach Trip" } }),
    );
    expect(notification.message).toContain("Beach Trip");
  });

  it("maps a full list of activities in order", () => {
    const notifications = activitiesToNotifications([
      makeActivity({ id: "a1" }),
      makeActivity({ id: "a2" }),
    ]);
    expect(notifications.map((n) => n.id)).toEqual(["a1", "a2"]);
  });
});
