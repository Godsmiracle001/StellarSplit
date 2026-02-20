import { useState, useMemo } from "react";
import type { HeatmapCell } from "../../types/analytics";
import { useTheme } from "../ThemeContex";

interface PaymentHeatmapProps {
  data: HeatmapCell[];
}

// Light mode intensity scale (blue-based)
const INTENSITY_LIGHT = [
  "#e5e7eb", // 0 – empty
  "#dbeafe", // 1
  "#93c5fd", // 2
  "#3b82f6", // 3
  "#1d4ed8", // 4
  "#1e3a8a", // 5+
];

// Dark mode intensity scale (slightly brighter to pop on dark bg)
const INTENSITY_DARK = [
  "#374151", // 0 – empty
  "#1e3a8a", // 1
  "#1d4ed8", // 2
  "#3b82f6", // 3
  "#60a5fa", // 4
  "#93c5fd", // 5+
];

function getColor(count: number, isDark: boolean): string {
  const scale = isDark ? INTENSITY_DARK : INTENSITY_LIGHT;
  if (count === 0) return scale[0];
  if (count <= 1) return scale[1];
  if (count <= 2) return scale[2];
  if (count <= 3) return scale[3];
  if (count <= 4) return scale[4];
  return scale[5];
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PaymentHeatmap({ data }: PaymentHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { weeks, months } = useMemo(() => {
    if (!data.length) return { weeks: [], months: [] };

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = new Date(sorted[0].date);

    const startDay = firstDate.getDay();
    const padded: (HeatmapCell | null)[] = Array(startDay).fill(null);
    const dateMap = new Map(sorted.map((c) => [c.date, c]));

    const current = new Date(firstDate);
    const end = new Date(sorted[sorted.length - 1].date);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      padded.push(dateMap.get(key) || { date: key, count: 0, total: 0 });
      current.setDate(current.getDate() + 1);
    }

    const wks: (HeatmapCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      wks.push(padded.slice(i, i + 7));
    }

    const mos: { label: string; col: number }[] = [];
    let lastMonth = "";
    wks.forEach((week, col) => {
      for (const cell of week) {
        if (cell) {
          const m = new Date(cell.date).toLocaleDateString("en-US", {
            month: "short",
          });
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
    <div
      className="bg-card-theme rounded-lg shadow border border-theme p-6"
      id="payment-heatmap"
    >
      <h2 className="text-xl font-bold text-theme mb-4">Payment Activity</h2>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex ml-10 mb-1">
            {months.map((m, i) => (
              <div
                key={i}
                className="text-xs text-muted-theme"
                style={{ position: "relative", left: `${m.col * 14}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div
              className="flex flex-col mr-2 justify-between"
              style={{ height: 98 }}
            >
              {DAYS.filter((_, i) => i % 2 === 1).map((d) => (
                <span key={d} className="text-xs text-muted-theme leading-none">
                  {d}
                </span>
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
                        backgroundColor: cell
                          ? getColor(cell.count, isDark)
                          : "transparent",
                        transition: "transform 150ms ease",
                        transform:
                          hoveredCell?.date === cell?.date
                            ? "scale(1.4)"
                            : "scale(1)",
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
            <span className="text-xs text-muted-theme mr-1">Less</span>
            {(isDark ? INTENSITY_DARK : INTENSITY_LIGHT).map((c, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ width: 12, height: 12, backgroundColor: c }}
              />
            ))}
            <span className="text-xs text-muted-theme ml-1">More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-card-theme border border-theme rounded-lg shadow-lg px-3 py-2 pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}
        >
          <p className="text-xs font-semibold text-theme">{hoveredCell.date}</p>
          <p className="text-xs text-muted-theme">
            {hoveredCell.count} payment{hoveredCell.count !== 1 ? "s" : ""} ·{" "}
            {formatCurrency(hoveredCell.total)}
          </p>
        </div>
      )}
    </div>
  );
}
