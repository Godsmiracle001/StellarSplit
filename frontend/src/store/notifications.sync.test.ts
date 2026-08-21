import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotificationsStore } from "./notifications";
import * as apiClient from "../utils/api-client";
import * as session from "../utils/session";
import type { Notification } from "../types/notifications";

const USER_ID = "GABC123DEF456";

function seedNotifications(notifications: Notification[]) {
  useNotificationsStore.setState({
    notifications,
    typeFilter: "all",
    hasHydrated: true,
    isSyncing: false,
  });
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "activity-1",
    type: "payment_received",
    title: "Payment received",
    message: "Jordan paid $15.00",
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("useNotificationsStore — backend-synced actions (issue #702)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedNotifications([]);
  });

  describe("markAsRead", () => {
    it("optimistically marks read locally, then persists to the backend", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      const markSpy = vi
        .spyOn(apiClient, "markActivitiesAsRead")
        .mockResolvedValue({ updated: 1 });

      seedNotifications([makeNotification({ id: "a1", read: false })]);

      await useNotificationsStore.getState().markAsRead("a1");

      expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
      expect(markSpy).toHaveBeenCalledWith(USER_ID, ["a1"]);
    });

    it("rolls back the optimistic update if the backend call fails", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      vi.spyOn(apiClient, "markActivitiesAsRead").mockRejectedValue(new Error("network down"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      seedNotifications([makeNotification({ id: "a1", read: false })]);

      await useNotificationsStore.getState().markAsRead("a1");

      expect(useNotificationsStore.getState().notifications[0].read).toBe(false);
    });

    it("stays local-only (no API call) when there is no signed-in user", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(null);
      const markSpy = vi.spyOn(apiClient, "markActivitiesAsRead");

      seedNotifications([makeNotification({ id: "a1", read: false })]);

      await useNotificationsStore.getState().markAsRead("a1");

      expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
      expect(markSpy).not.toHaveBeenCalled();
    });

    it("is a no-op for an already-read notification", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      const markSpy = vi.spyOn(apiClient, "markActivitiesAsRead");

      seedNotifications([makeNotification({ id: "a1", read: true })]);

      await useNotificationsStore.getState().markAsRead("a1");

      expect(markSpy).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("optimistically marks all read locally, then persists to the backend", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      const markAllSpy = vi
        .spyOn(apiClient, "markAllActivitiesAsRead")
        .mockResolvedValue({ updated: 2 });

      seedNotifications([
        makeNotification({ id: "a1", read: false }),
        makeNotification({ id: "a2", read: false }),
      ]);

      await useNotificationsStore.getState().markAllAsRead();

      expect(useNotificationsStore.getState().notifications.every((n) => n.read)).toBe(true);
      expect(markAllSpy).toHaveBeenCalledWith(USER_ID);
    });

    it("rolls back all notifications if the backend call fails", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      vi.spyOn(apiClient, "markAllActivitiesAsRead").mockRejectedValue(new Error("500"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      seedNotifications([
        makeNotification({ id: "a1", read: false }),
        makeNotification({ id: "a2", read: true }),
      ]);

      await useNotificationsStore.getState().markAllAsRead();

      const notifications = useNotificationsStore.getState().notifications;
      expect(notifications.find((n) => n.id === "a1")?.read).toBe(false);
      expect(notifications.find((n) => n.id === "a2")?.read).toBe(true);
    });
  });

  describe("syncFromServer", () => {
    it("does nothing when there is no signed-in user", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(null);
      const fetchSpy = vi.spyOn(apiClient, "fetchUserActivities");

      await useNotificationsStore.getState().syncFromServer();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("merges server activities in, preferring server read-state for items not known locally", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      vi.spyOn(apiClient, "fetchUserActivities").mockResolvedValue({
        data: [
          {
            id: "srv-1",
            userId: USER_ID,
            activityType: "payment_received",
            splitId: "split-9",
            metadata: {},
            isRead: true,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasMore: false,
        unreadCount: 0,
      });

      // localStorage was cleared — store starts empty.
      seedNotifications([]);

      await useNotificationsStore.getState().syncFromServer();

      const notifications = useNotificationsStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      // Previously-read item does NOT come back as unread after a
      // localStorage clear — this is the core issue #702 acceptance
      // criterion.
      expect(notifications[0].read).toBe(true);
      expect(notifications[0].id).toBe("srv-1");
    });

    it("preserves a locally-read notification even if the server briefly reports it unread", async () => {
      vi.spyOn(session, "getStoredActiveUserId").mockReturnValue(USER_ID);
      vi.spyOn(apiClient, "fetchUserActivities").mockResolvedValue({
        data: [
          {
            id: "a1",
            userId: USER_ID,
            activityType: "payment_received",
            metadata: {},
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasMore: false,
        unreadCount: 1,
      });

      seedNotifications([makeNotification({ id: "a1", read: true })]);

      await useNotificationsStore.getState().syncFromServer();

      const notifications = useNotificationsStore.getState().notifications;
      expect(notifications.find((n) => n.id === "a1")?.read).toBe(true);
    });
  });
});
