import { useState, useMemo } from 'react';
import type { HeatmapCell } from '../../types/analytics';

interface PaymentHeatmapProps {
    data: HeatmapCell[];
}

const INTENSITY_COLORS = [
    '#f3f4f6', // 0
    '#dbeafe', // 1
    '#93c5fd', // 2
    '#3b82f6', // 3
    '#1d4ed8', // 4
    '#1e3a8a', // 5+
];

function getColor(count: number): string {
    if (count === 0) return INTENSITY_COLORS[0];
    if (count <= 1) return INTENSITY_COLORS[1];
    if (count <= 2) return INTENSITY_COLORS[2];
    if (count <= 3) return INTENSITY_COLORS[3];
    if (count <= 4) return INTENSITY_COLORS[4];
    return INTENSITY_COLORS[5];
}

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PaymentHeatmap({ data }: PaymentHeatmapProps) {
    const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Group data into weeks (columns) × days (rows)
    const { weeks, months } = useMemo(() => {
        if (!data.length) return { weeks: [], months: [] };

        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const firstDate = new Date(sorted[0].date);

        // Pad to start on Sunday
        const startDay = firstDate.getDay();
        const padded: (HeatmapCell | null)[] = Array(startDay).fill(null);
        const dateMap = new Map(sorted.map((c) => [c.date, c]));

        // Fill all days
        const current = new Date(firstDate);
        const end = new Date(sorted[sorted.length - 1].date);
        while (current <= end) {
            const key = current.toISOString().slice(0, 10);
            padded.push(dateMap.get(key) || { date: key, count: 0, total: 0 });
            current.setDate(current.getDate() + 1);
        }

        // Chunk into weeks of 7
        const wks: (HeatmapCell | null)[][] = [];
        for (let i = 0; i < padded.length; i += 7) {
            wks.push(padded.slice(i, i + 7));
        }

        // Extract month labels
        const mos: { label: string; col: number }[] = [];
        let lastMonth = '';
        wks.forEach((week, col) => {
            for (const cell of week) {
                if (cell) {
                    const m = new Date(cell.date).toLocaleDateString('en-US', { month: 'short' });
                    if (m !== lastMonth) {
                        mos.push({ label: m, col });
                        lastMonth = m;
                    }
                    break;
                }
            }
        });

        return { weeks: wks, months: mos };
    }, [data]);

    return (
        <div className="bg-white rounded-lg shadow p-6" id="payment-heatmap">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Activity</h2>

            <div className="overflow-x-auto">
                <div className="inline-block">
                    {/* Month labels */}
                    <div className="flex ml-10 mb-1">
                        {months.map((m, i) => (
                            <div
                                key={i}
                                className="text-xs text-gray-500"
                                style={{ position: 'relative', left: `${m.col * 14}px` }}
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>

                    <div className="flex">
                        {/* Day labels */}
                        <div className="flex flex-col mr-2 justify-between" style={{ height: 98 }}>
                            {DAYS.filter((_, i) => i % 2 === 1).map((d) => (
                                <span key={d} className="text-xs text-gray-500 leading-none">{d}</span>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex gap-[2px]">
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col gap-[2px]">
                                    {week.map((cell, di) => (
                                        <div
                                            key={di}
                                            className="rounded-sm cursor-pointer"
                                            style={{
                                                width: 12,
                                                height: 12,
                                                backgroundColor: cell ? getColor(cell.count) : 'transparent',
                                                transition: 'transform 150ms ease',
                                                transform: hoveredCell?.date === cell?.date ? 'scale(1.4)' : 'scale(1)',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (cell) {
                                                    setHoveredCell(cell);
                                                    setTooltipPos({ x: e.clientX, y: e.clientY });
                                                }
                                            }}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-1 mt-3 ml-10">
                        <span className="text-xs text-gray-500 mr-1">Less</span>
                        {INTENSITY_COLORS.map((c, i) => (
                            <div
                                key={i}
                                className="rounded-sm"
                                style={{ width: 12, height: 12, backgroundColor: c }}
                            />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">More</span>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredCell && (
                <div
                    className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 pointer-events-none"
                    style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}
                >
                    <p className="text-xs font-semibold text-gray-900">{hoveredCell.date}</p>
                    <p className="text-xs text-gray-500">
                        {hoveredCell.count} payment{hoveredCell.count !== 1 ? 's' : ''} · {formatCurrency(hoveredCell.total)}
                    </p>
                </div>
            )}
        </div>
    );
}
