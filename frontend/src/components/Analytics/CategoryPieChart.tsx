import { useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { CategoryBreakdown } from '../../types/analytics';

interface CategoryPieChartProps {
    data: CategoryBreakdown[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const total = data.reduce((s, d) => s + d.amount, 0);

    return (
        <div className="bg-white rounded-lg shadow p-6" id="category-pie-chart">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h2>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={activeIndex !== null ? 115 : 110}
                        paddingAngle={2}
                        animationDuration={800}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        {data.map((_, index) => (
                            <Cell
                                key={index}
                                fill={COLORS[index % COLORS.length]}
                                opacity={activeIndex !== null && activeIndex !== index ? 0.5 : 1}
                                style={{ transition: 'opacity 200ms ease' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                            const v = Number(value ?? 0);
                            return [
                                `${formatCurrency(v)} (${((v / total) * 100).toFixed(1)}%)`,
                                name,
                            ];
                        }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        formatter={(value: string) => (
                            <span className="text-sm text-gray-600">{value}</span>
                        )}
                    />

                    {/* Center label */}
                    <text
                        x="50%"
                        y="48%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-lg font-bold"
                        fill="#111827"
                    >
                        {formatCurrency(total)}
                    </text>
                    <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs"
                        fill="#6b7280"
                    >
                        Total
                    </text>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
