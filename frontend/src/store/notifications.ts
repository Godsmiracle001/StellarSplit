import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Notification, NotificationType } from "../types/notifications";
import { notificationPersistence } from "../utils/notificationPersistence";
import {
  fetchUserActivities,
  markActivitiesAsRead,
  markAllActivitiesAsRead,
} from "../utils/api-client";
import { activitiesToNotifications } from "../utils/activityToNotification";
import { getStoredActiveUserId } from "../utils/session";

interface NotificationsState {
  notifications: Notification[];
  typeFilter: NotificationType | "all";
  hasHydrated: boolean;
  isSyncing: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => Promise<void>;
  setTypeFilter: (type: NotificationType | "all") => void;
  clearAll: () => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  addServerNotifications: (notifications: Notification[]) => void;
  removeNotification: (id: string) => void;
  setHasHydrated: (value: boolean) => void;
  /**
   * Reconciles local notifications with the backend Activity feed (issue
   * #702). Call this once on app load, after a wallet/user is known. This is
   * what stops localStorage from being trusted as the sole source of truth —
   * clearing it no longer resurrects already-read items as unread, because
   * the server's `isRead` wins for any notification not already known
   * locally.
   */
  syncFromServer: () => Promise<void>;
}

export const selectUnreadCount = (state: NotificationsState): number =>
  state.notifications.filter((n) => !n.read).length;

function createNotification(
  input: Omit<Notification, "id" | "read" | "createdAt">
): Notification {
  return {
    ...input,
    id: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      typeFilter: "all",
      hasHydrated: false,
      isSyncing: false,

      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),

      markAsRead: async (id) => {
        const previous = get().notifications;
        const target = previous.find((n) => n.id === id);
        if (!target || target.read) return;

        // Optimistic update first, synchronously, so the UI reflects the
        // change immediately regardless of network latency.
        set({
          notifications: previous.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });

        const userId = getStoredActiveUserId();
        if (!userId) return; // No signed-in user — local-only, nothing to sync.

        try {
          await markActivitiesAsRead(userId, [id]);
        } catch (error) {
          console.error("Failed to persist read state for notification", id, error);
          // Roll back to the pre-optimistic state on failure.
          set({ notifications: previous });
        }
      },

      // Note: the backend Activity API has no "mark unread" endpoint (only
      // mark-read / mark-all-read), so this intentionally stays local-only.
      // It won't survive a syncFromServer() call or a cleared localStorage.
      markAsUnread: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: false } : n
          ),
        })),

      markAllAsRead: async () => {
        const previous = get().notifications;
        if (previous.every((n) => n.read)) return;

        set({
          notifications: previous.map((n) => ({ ...n, read: true })),
        });

        const userId = getStoredActiveUserId();
        if (!userId) return;

        try {
          await markAllActivitiesAsRead(userId);
        } catch (error) {
          console.error("Failed to persist mark-all-read", error);
          set({ notifications: previous });
        }
      },

      setTypeFilter: (typeFilter) => set({ typeFilter }),

      // Local-only dismissal (clears the dropdown/list from view). There is
      // no bulk-delete endpoint on the backend, so this does not delete the
      // underlying Activity rows — a subsequent syncFromServer() call (e.g.
      // on the next app load) will bring them back. This mirrors "dismiss"
      // rather than "delete forever" semantics, which is intentional and
      // out of scope for issue #702's read-state acceptance criteria.
      clearAll: () => set({ notifications: [] }),

      addNotification: (input) =>
        set((state) => {
          const newNotif = createNotification(input);
          return {
            notifications: [newNotif, ...state.notifications],
          };
        }),

      addServerNotifications: (serverNotifications) =>
        set((state) => ({
          notifications: notificationPersistence.merge(
            state.notifications,
            serverNotifications
          ),
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      syncFromServer: async () => {
        const userId = getStoredActiveUserId();
        if (!userId) return;

        set({ isSyncing: true });
        try {
          const response = await fetchUserActivities(userId, { limit: 50 });
          const serverNotifications = activitiesToNotifications(response.data);
          get().addServerNotifications(serverNotifications);
        } catch (error) {
          console.error("Failed to sync notifications from server", error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "stellarsplit.notifications-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        typeFilter: state.typeFilter,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);