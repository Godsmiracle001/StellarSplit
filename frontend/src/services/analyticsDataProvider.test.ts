import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAnalyticsData } from "./analyticsDataProvider";
import { apiClient } from "../utils/api-client";

vi.mock("../utils/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

const LIVE_RESPONSES: Record<string, unknown> = {
  "/api/analytics/spending-trends": [{ period: "2026-01-01", totalSpent: 100, transactionCount: 2, avgTransactionAmount: 50 }],
  "/api/analytics/category-breakdown": [{ category: "Food", amount: 100 }],
  "/api/analytics/top-partners": [{ partnerId: "u1", totalAmount: 100, interactions: 2 }],
  "/api/analytics/payment-heatmap": [{ date: "2026-01-05", count: 3, total: 66 }],
  "/api/analytics/time-distribution": [{ label: "Mon", count: 3, amount: 66 }],
};

function mockLiveEndpoints() {
  mockGet.mockImplementation((path: string) =>
    Promise.resolve({ data: LIVE_RESPONSES[path] ?? [] }),
  );
}

describe("analyticsDataProvider — heatmap & time-distribution live wiring (issue #699 / BE-201)", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches heatmapData and timeDistribution from the real endpoints in live mode", async () => {
    mockLiveEndpoints();

    const result = await getAnalyticsData(
      { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
      "live-only",
    );

    expect(result.source).toBe("live");
    expect(result.data.heatmapData).toEqual([{ date: "2026-01-05", count: 3, total: 66 }]);
    expect(result.data.timeDistribution).toEqual([{ label: "Mon", count: 3, amount: 66 }]);

    expect(mockGet).toHaveBeenCalledWith(
      "/api/analytics/payment-heatmap",
      { params: { dateFrom: "2026-01-01", dateTo: "2026-01-31" } },
    );
    expect(mockGet).toHaveBeenCalledWith(
      "/api/analytics/time-distribution",
      { params: { dateFrom: "2026-01-01", dateTo: "2026-01-31" } },
    );
  });

  it("passes the date-range filter through to the heatmap and time-distribution calls", async () => {
    mockLiveEndpoints();

    await getAnalyticsData({ dateFrom: "2026-02-01", dateTo: "2026-02-28" }, "live-only");

    const heatmapCall = mockGet.mock.calls.find(
      ([path]) => path === "/api/analytics/payment-heatmap",
    );
    const timeCall = mockGet.mock.calls.find(
      ([path]) => path === "/api/analytics/time-distribution",
    );

    expect(heatmapCall?.[1]).toEqual({
      params: { dateFrom: "2026-02-01", dateTo: "2026-02-28" },
    });
    expect(timeCall?.[1]).toEqual({
      params: { dateFrom: "2026-02-01", dateTo: "2026-02-28" },
    });
  });

  it("omits mock heatmap/time-distribution data from a successful live fetch", async () => {
    mockLiveEndpoints();

    const result = await getAnalyticsData(undefined, "live-only");

    // The mock fixture heatmap is always 30 entries; a real, small live
    // response should pass through untouched rather than being padded or
    // replaced with mock data.
    expect(result.data.heatmapData).toHaveLength(1);
    expect(result.data.timeDistribution).toHaveLength(1);
  });

  it("falls back to fixture data (including heatmap/time-distribution) only when the live call fails, in hybrid mode", async () => {
    mockGet.mockRejectedValue(new Error("network error"));

    const result = await getAnalyticsData(undefined, "hybrid");

    expect(result.source).toBe("fixture");
    expect(result.data.heatmapData.length).toBeGreaterThan(0);
    expect(result.data.timeDistribution.length).toBeGreaterThan(0);
  });

  it("fixture-only mode never calls the live endpoints", async () => {
    const result = await getAnalyticsData(undefined, "fixture-only");

    expect(result.source).toBe("fixture");
    expect(mockGet).not.toHaveBeenCalled();
  });
});
