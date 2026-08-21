import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { NotificationsSync } from "./NotificationsSync";
import { useNotificationsStore } from "../store/notifications";

const mockUseWallet = vi.fn();

vi.mock("../hooks/use-wallet", () => ({
  useWallet: () => mockUseWallet(),
}));

describe("NotificationsSync (issue #702)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseWallet.mockReset();
    useNotificationsStore.setState({
      notifications: [],
      typeFilter: "all",
      hasHydrated: false,
      isSyncing: false,
    });
  });

  it("renders nothing", () => {
    mockUseWallet.mockReturnValue({ activeUserId: null });
    const { container } = render(<NotificationsSync />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not sync before the store has hydrated from localStorage", async () => {
    mockUseWallet.mockReturnValue({ activeUserId: "GABC123" });
    const syncSpy = vi.fn().mockResolvedValue(undefined);
    useNotificationsStore.setState({ syncFromServer: syncSpy, hasHydrated: false });

    render(<NotificationsSync />);

    await new Promise((r) => setTimeout(r, 0));
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it("does not sync when there is no active user", async () => {
    mockUseWallet.mockReturnValue({ activeUserId: null });
    const syncSpy = vi.fn().mockResolvedValue(undefined);
    useNotificationsStore.setState({ syncFromServer: syncSpy, hasHydrated: true });

    render(<NotificationsSync />);

    await new Promise((r) => setTimeout(r, 0));
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it("syncs once hydration is done and a user is known", async () => {
    mockUseWallet.mockReturnValue({ activeUserId: "GABC123" });
    const syncSpy = vi.fn().mockResolvedValue(undefined);
    useNotificationsStore.setState({ syncFromServer: syncSpy, hasHydrated: true });

    render(<NotificationsSync />);

    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1));
  });

  it("does not re-sync on re-render for the same user", async () => {
    mockUseWallet.mockReturnValue({ activeUserId: "GABC123" });
    const syncSpy = vi.fn().mockResolvedValue(undefined);
    useNotificationsStore.setState({ syncFromServer: syncSpy, hasHydrated: true });

    const { rerender } = render(<NotificationsSync />);
    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1));

    rerender(<NotificationsSync />);
    await new Promise((r) => setTimeout(r, 0));
    expect(syncSpy).toHaveBeenCalledTimes(1);
  });
});
