import { useEffect, useRef } from "react";
import { useWallet } from "../hooks/use-wallet";
import { useNotificationsStore } from "../store/notifications";

/**
 * Reconciles local (localStorage-persisted) notifications with the backend
 * Activity feed once a user is known (issue #702). Renders nothing.
 *
 * This is what stops localStorage from being trusted as the sole source of
 * truth: previously, clearing it reset every notification back to
 * "unread" even for things the user had already seen elsewhere, and the
 * dropdown's local-only read state never reached the backend at all.
 */
export function NotificationsSync() {
  const { activeUserId } = useWallet();
  const syncFromServer = useNotificationsStore((state) => state.syncFromServer);
  const hasHydrated = useNotificationsStore((state) => state.hasHydrated);
  const syncedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || !activeUserId) return;
    // Avoid re-syncing on every re-render for the same user.
    if (syncedForUserRef.current === activeUserId) return;
    syncedForUserRef.current = activeUserId;
    void syncFromServer();
  }, [hasHydrated, activeUserId, syncFromServer]);

  return null;
}
