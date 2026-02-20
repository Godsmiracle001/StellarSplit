import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SpendingTrend } from "../../types/analytics";
import { useTheme } from "../ThemeContex";

interface SpendingChartProps {
  data: SpendingTrend[];
  onPeriodSelect?: (period: string) => void;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Read a CSS variable from :root at runtime — needed for Recharts inline styles */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function SpendingChart({ data, onPeriodSelect }: SpendingChartProps) {
  const { resolvedTheme } = useTheme();

  // Re-read CSS vars whenever the theme changes
  const borderColor = cssVar("--color-border");
  const mutedColor = cssVar("--color-text-muted");
  const surfaceColor = cssVar("--color-surface");
  const textColor = cssVar("--color-text");

  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.period),
  }));

  return (
    <div
      className="bg-card-theme rounded-lg shadow border border-theme p-6"
      id="spending-chart"
    >
      <h2 className="text-xl font-bold text-theme mb-4">Spending Trends</h2>

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
              <stop
                offset="5%"
                stopColor="#3b82f6"
                stopOpacity={resolvedTheme === "dark" ? 0.2 : 0.3}
              />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />

          <XAxis
            dataKey="label"
            tick={{ fill: mutedColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: mutedColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />

          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [
              formatCurrency(Number(value ?? 0)),
              "Total Spent",
            ]}
            contentStyle={{
              backgroundColor: surfaceColor,
              border: `1px solid ${borderColor}`,
              borderRadius: "0.5rem",
              boxShadow:
                resolvedTheme === "dark"
                  ? "0 1px 3px rgba(0,0,0,0.4)"
                  : "0 1px 3px rgba(0,0,0,0.1)",
              color: textColor,
            }}
            labelStyle={{ color: textColor }}
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

      {/* ── Summary Stats ── */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-muted-theme">Total</p>
          <p className="text-lg font-semibold text-theme">
            {formatCurrency(data.reduce((s, d) => s + d.totalSpent, 0))}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-theme">Transactions</p>
          <p className="text-lg font-semibold text-theme">
            {data.reduce((s, d) => s + d.transactionCount, 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-theme">Avg / Tx</p>
          <p className="text-lg font-semibold text-theme">
            {formatCurrency(
              data.length
                ? data.reduce((s, d) => s + d.avgTransactionAmount, 0) /
                    data.length
                : 0,
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
