import { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { TimeDistribution } from '../../types/analytics';

interface TimeAnalysisProps {
    data: TimeDistribution[];
}

type ViewMode = 'dayOfWeek' | 'monthly';

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TimeAnalysis({ data }: TimeAnalysisProps) {
    const [view, setView] = useState<ViewMode>('dayOfWeek');

    const peakDay = data.reduce((max, d) => (d.count > max.count ? d : max), data[0]);

    return (
        <div className="bg-white rounded-lg shadow p-6" id="time-analysis">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Time Analysis</h2>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                        className={`px-3 py-1 text-sm rounded-md transition ${view === 'dayOfWeek'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setView('dayOfWeek')}
                    >
                        Day of Week
                    </button>
                    <button
                        className={`px-3 py-1 text-sm rounded-md transition ${view === 'monthly'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setView('monthly')}
                    >
                        By Amount
                    </button>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        tickFormatter={view === 'monthly' ? formatCurrency : undefined}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                            const v = Number(value ?? 0);
                            return [
                                name === 'amount' ? formatCurrency(v) : v,
                                name === 'amount' ? 'Amount' : 'Transactions',
                            ];
                        }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Bar
                        dataKey={view === 'monthly' ? 'amount' : 'count'}
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                    />
                </BarChart>
            </ResponsiveContainer>

            {peakDay && (
                <p className="mt-3 text-sm text-gray-500">
                    Peak day: <span className="font-medium text-gray-900">{peakDay.label}</span> with{' '}
                    {peakDay.count} transactions ({formatCurrency(peakDay.amount)})
                </p>
            )}
        </div>
    );
}
