import { useState, useEffect, useCallback } from "react";
import type { AnalyticsData, DateRange } from "../types/analytics";
import {
  fetchSpendingTrends,
  fetchCategoryBreakdown,
  fetchTopPartners,
  fetchDebtBalances,
  fetchHeatmapData,
  fetchTimeDistribution,
} from "../utils/analytics-api";

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  refetch: () => void;
}

function defaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function useAnalytics(): UseAnalyticsReturn {
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        spendingTrends,
        categoryBreakdown,
        topPartners,
        debtBalances,
        heatmapData,
        timeDistribution,
      ] = await Promise.all([
        fetchSpendingTrends(dateRange),
        fetchCategoryBreakdown(dateRange),
        fetchTopPartners(dateRange),
        fetchDebtBalances(),
        fetchHeatmapData(dateRange),
        fetchTimeDistribution(dateRange),
      ]);

      setData({
        spendingTrends,
        categoryBreakdown,
        topPartners,
        debtBalances,
        heatmapData,
        timeDistribution,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, dateRange, setDateRange, refetch: loadData };
}
