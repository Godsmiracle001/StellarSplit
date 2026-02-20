import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DebtBalance } from "../../types/analytics";
import { useTheme } from "../ThemeContex";

interface DebtTrackerProps {
  data: DebtBalance[];
}

function formatCurrency(value: number): string {
  return `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function DebtTracker({ data }: DebtTrackerProps) {
  const { resolvedTheme } = useTheme();

  const borderColor = cssVar("--color-border");
  const mutedColor = cssVar("--color-text-muted");
  const surfaceColor = cssVar("--color-surface");
  const textColor = cssVar("--color-text");

  const chartData = data.map((d) => ({
    ...d,
    value: d.direction === "owe" ? -d.amount : d.amount,
  }));

  const totalOwed = data
    .filter((d) => d.direction === "owed")
    .reduce((s, d) => s + d.amount, 0);

  const totalOwe = data
    .filter((d) => d.direction === "owe")
    .reduce((s, d) => s + d.amount, 0);

  const netBalance = totalOwed - totalOwe;

  return (
    <div
      className="bg-card-theme rounded-lg shadow border border-theme p-6"
      id="debt-tracker"
    >
      <h2 className="text-xl font-bold text-theme mb-4">Debt Tracker</h2>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-theme">Owed to You</p>
          <p className="text-lg font-semibold text-green-500">
            {formatCurrency(totalOwed)}
          </p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-theme">You Owe</p>
          <p className="text-lg font-semibold text-red-500">
            {formatCurrency(totalOwe)}
          </p>
        </div>
        <div
          className={`rounded-lg p-3 text-center ${netBalance >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
        >
          <p className="text-xs text-muted-theme">Net Balance</p>
          <p
            className={`text-lg font-semibold ${netBalance >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {netBalance >= 0 ? "+" : "-"}
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={borderColor}
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `$${Math.abs(v)}`}
            tick={{ fill: mutedColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: mutedColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
            width={70}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => {
              const v = Number(value ?? 0);
              return [
                `${v > 0 ? "+" : ""}${formatCurrency(v)}`,
                v > 0 ? "Owed to you" : "You owe",
              ];
            }}
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
          <Bar dataKey="value" animationDuration={800} radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value >= 0 ? "#10b981" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
