import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { SpendingTrend } from '../../types/analytics';

interface SpendingChartProps {
    data: SpendingTrend[];
    onPeriodSelect?: (period: string) => void;
}

function formatMonth(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SpendingChart({ data, onPeriodSelect }: SpendingChartProps) {
    const chartData = data.map((d) => ({
        ...d,
        label: formatMonth(d.period),
    }));

    return (
        <div className="bg-white rounded-lg shadow p-6" id="spending-chart">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Spending Trends</h2>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                    data={chartData}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(e: any) => {
                        if (e?.activePayload?.[0] && onPeriodSelect) {
                            onPeriodSelect(e.activePayload[0].payload.period);
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        tickFormatter={formatCurrency}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [formatCurrency(Number(value ?? 0)), 'Total Spent']}
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="totalSpent"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#spendGradient)"
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(data.reduce((s, d) => s + d.totalSpent, 0))}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Transactions</p>
                    <p className="text-lg font-semibold text-gray-900">
                        {data.reduce((s, d) => s + d.transactionCount, 0)}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Avg / Tx</p>
                    <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(
                            data.length
                                ? data.reduce((s, d) => s + d.avgTransactionAmount, 0) / data.length
                                : 0,
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
