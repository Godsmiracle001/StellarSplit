import { apiClient } from "./api-client";
import type {
  SpendingTrend,
  CategoryBreakdown,
  TopPartner,
  DebtBalance,
  HeatmapCell,
  TimeDistribution,
  DateRange,
} from "../types/analytics";

// ── Mock / seed data used when the backend is unavailable ──────────────

const MOCK_SPENDING_TRENDS: SpendingTrend[] = [
  {
    period: "2025-09-01",
    totalSpent: 420,
    transactionCount: 8,
    avgTransactionAmount: 52.5,
  },
  {
    period: "2025-10-01",
    totalSpent: 580,
    transactionCount: 12,
    avgTransactionAmount: 48.33,
  },
  {
    period: "2025-11-01",
    totalSpent: 340,
    transactionCount: 6,
    avgTransactionAmount: 56.67,
  },
  {
    period: "2025-12-01",
    totalSpent: 710,
    transactionCount: 14,
    avgTransactionAmount: 50.71,
  },
  {
    period: "2026-01-01",
    totalSpent: 490,
    transactionCount: 10,
    avgTransactionAmount: 49.0,
  },
  {
    period: "2026-02-01",
    totalSpent: 620,
    transactionCount: 11,
    avgTransactionAmount: 56.36,
  },
];

const MOCK_CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  { category: "Food & Dining", amount: 890 },
  { category: "Entertainment", amount: 420 },
  { category: "Transport", amount: 310 },
  { category: "Groceries", amount: 540 },
  { category: "Utilities", amount: 260 },
  { category: "Other", amount: 180 },
];

const MOCK_TOP_PARTNERS: TopPartner[] = [
  { partnerId: "u1", name: "Alice", totalAmount: 650, interactions: 14 },
  { partnerId: "u2", name: "Bob", totalAmount: 420, interactions: 9 },
  { partnerId: "u3", name: "Carol", totalAmount: 380, interactions: 7 },
  { partnerId: "u4", name: "Dave", totalAmount: 290, interactions: 5 },
  { partnerId: "u5", name: "Eve", totalAmount: 180, interactions: 3 },
];

const MOCK_DEBT_BALANCES: DebtBalance[] = [
  { userId: "u1", name: "Alice", amount: 45.0, direction: "owe" },
  { userId: "u2", name: "Bob", amount: 120.5, direction: "owed" },
  { userId: "u3", name: "Carol", amount: 30.0, direction: "owe" },
  { userId: "u4", name: "Dave", amount: 85.0, direction: "owed" },
];

function generateHeatmapMock(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const now = new Date();
  for (let i = 180; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = Math.floor(Math.random() * 6);
    cells.push({
      date: d.toISOString().slice(0, 10),
      count,
      total: count * (15 + Math.random() * 40),
    });
  }
  return cells;
}

const MOCK_HEATMAP: HeatmapCell[] = generateHeatmapMock();

const MOCK_TIME_DISTRIBUTION: TimeDistribution[] = [
  { label: "Mon", count: 12, amount: 340 },
  { label: "Tue", count: 8, amount: 210 },
  { label: "Wed", count: 15, amount: 480 },
  { label: "Thu", count: 10, amount: 290 },
  { label: "Fri", count: 18, amount: 620 },
  { label: "Sat", count: 22, amount: 780 },
  { label: "Sun", count: 14, amount: 410 },
];

// ── API helpers (fall back to mock data on failure) ────────────────────

async function safeFetch<T>(
  url: string,
  params: Record<string, string>,
  fallback: T,
): Promise<T> {
  try {
    const res = await apiClient.get<T>(url, { params });
    return res.data;
  } catch {
    return fallback;
  }
}

export async function fetchSpendingTrends(
  range?: DateRange,
): Promise<SpendingTrend[]> {
  return safeFetch(
    "/api/analytics/spending-trends",
    {
      ...(range?.dateFrom && { dateFrom: range.dateFrom }),
      ...(range?.dateTo && { dateTo: range.dateTo }),
    },
    MOCK_SPENDING_TRENDS,
  );
}

export async function fetchCategoryBreakdown(
  range?: DateRange,
): Promise<CategoryBreakdown[]> {
  return safeFetch(
    "/api/analytics/category-breakdown",
    {
      ...(range?.dateFrom && { dateFrom: range.dateFrom }),
      ...(range?.dateTo && { dateTo: range.dateTo }),
    },
    MOCK_CATEGORY_BREAKDOWN,
  );
}

export async function fetchTopPartners(
  range?: DateRange,
): Promise<TopPartner[]> {
  return safeFetch(
    "/api/analytics/top-partners",
    {
      ...(range?.dateFrom && { dateFrom: range.dateFrom }),
      ...(range?.dateTo && { dateTo: range.dateTo }),
    },
    MOCK_TOP_PARTNERS,
  );
}

export async function fetchDebtBalances(): Promise<DebtBalance[]> {
  // No backend endpoint for this yet – always use mock data
  return MOCK_DEBT_BALANCES;
}

export async function fetchHeatmapData(
  range?: DateRange,
): Promise<HeatmapCell[]> {
  // Derived from spending-trends in a real app; using mock for now
  void range;
  return MOCK_HEATMAP;
}

export async function fetchTimeDistribution(
  range?: DateRange,
): Promise<TimeDistribution[]> {
  // Derived from spending-trends in a real app; using mock for now
  void range;
  return MOCK_TIME_DISTRIBUTION;
}
