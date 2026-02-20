import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import type { DebtBalance } from '../../types/analytics';

interface DebtTrackerProps {
    data: DebtBalance[];
}

function formatCurrency(value: number): string {
    return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DebtTracker({ data }: DebtTrackerProps) {
    const chartData = data.map((d) => ({
        ...d,
        value: d.direction === 'owe' ? -d.amount : d.amount,
    }));

    const totalOwed = data
        .filter((d) => d.direction === 'owed')
        .reduce((s, d) => s + d.amount, 0);

    const totalOwe = data
        .filter((d) => d.direction === 'owe')
        .reduce((s, d) => s + d.amount, 0);

    const netBalance = totalOwed - totalOwe;

    return (
        <div className="bg-white rounded-lg shadow p-6" id="debt-tracker">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Debt Tracker</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Owed to You</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(totalOwed)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">You Owe</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(totalOwe)}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${netBalance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-gray-500">Net Balance</p>
                    <p className={`text-lg font-semibold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netBalance >= 0 ? '+' : '-'}{formatCurrency(netBalance)}
                    </p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis
                        type="number"
                        tickFormatter={(v: number) => `$${Math.abs(v)}`}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        width={70}
                    />
                    <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => {
                            const v = Number(value ?? 0);
                            return [
                                `${v > 0 ? '+' : ''}${formatCurrency(v)}`,
                                v > 0 ? 'Owed to you' : 'You owe',
                            ];
                        }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Bar dataKey="value" animationDuration={800} radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell
                                key={index}
                                fill={entry.value >= 0 ? '#10b981' : '#ef4444'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
