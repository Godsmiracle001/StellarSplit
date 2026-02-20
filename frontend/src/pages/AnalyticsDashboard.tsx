import { useAnalytics } from '../hooks/useAnalytics';
import {
    SpendingChart,
    CategoryPieChart,
    DebtTracker,
    PaymentHeatmap,
    TimeAnalysis,
    ChartExportButton,
    DateRangePicker,
} from '../components/Analytics';
import { BarChart3, RefreshCw } from 'lucide-react';

export default function AnalyticsDashboard() {
    const { data, loading, error, dateRange, setDateRange, refetch } = useAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                        <p className="text-gray-600 mt-1">Loading your insights…</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                                <div className="h-64 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={refetch}
                            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500 p-3 rounded-lg">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                                <p className="text-gray-600 mt-1">
                                    Your spending insights and patterns
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                        <button
                            onClick={refetch}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            title="Refresh data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Charts grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Spending trends – full width */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <div className="absolute top-6 right-6 z-10">
                                <ChartExportButton targetId="spending-chart" filename="spending-trends" />
                            </div>
                            <SpendingChart data={data.spendingTrends} />
                        </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="relative">
                        <div className="absolute top-6 right-6 z-10">
                            <ChartExportButton targetId="category-pie-chart" filename="category-breakdown" />
                        </div>
                        <CategoryPieChart data={data.categoryBreakdown} />
                    </div>

                    {/* Debt tracker */}
                    <div className="relative">
                        <div className="absolute top-6 right-6 z-10">
                            <ChartExportButton targetId="debt-tracker" filename="debt-tracker" />
                        </div>
                        <DebtTracker data={data.debtBalances} />
                    </div>

                    {/* Payment heatmap – full width */}
                    <div className="lg:col-span-2 relative">
                        <div className="absolute top-6 right-6 z-10">
                            <ChartExportButton targetId="payment-heatmap" filename="payment-activity" />
                        </div>
                        <PaymentHeatmap data={data.heatmapData} />
                    </div>

                    {/* Time analysis */}
                    <div className="lg:col-span-2 relative">
                        <div className="absolute top-6 right-6 z-10">
                            <ChartExportButton targetId="time-analysis" filename="time-analysis" />
                        </div>
                        <TimeAnalysis data={data.timeDistribution} />
                    </div>
                </div>
            </div>
        </div>
    );
}
