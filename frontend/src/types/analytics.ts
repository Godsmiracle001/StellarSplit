export interface SpendingTrend {
  period: string;
  totalSpent: number;
  transactionCount: number;
  avgTransactionAmount: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export interface TopPartner {
  partnerId: string;
  totalAmount: number;
  interactions: number;
  name?: string;
}

export interface DebtBalance {
  userId: string;
  name: string;
  amount: number;
  direction: "owe" | "owed";
}

export interface HeatmapCell {
  date: string;
  count: number;
  total: number;
}

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export interface TimeDistribution {
  label: string;
  count: number;
  amount: number;
}

export interface AnalyticsData {
  spendingTrends: SpendingTrend[];
  categoryBreakdown: CategoryBreakdown[];
  topPartners: TopPartner[];
  debtBalances: DebtBalance[];
  heatmapData: HeatmapCell[];
  timeDistribution: TimeDistribution[];
}
