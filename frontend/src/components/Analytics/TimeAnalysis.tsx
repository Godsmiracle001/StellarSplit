import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimeDistribution } from "../../types/analytics";
import { useTheme } from "../ThemeContex";

interface TimeAnalysisProps {
  data: TimeDistribution[];
}

type ViewMode = "dayOfWeek" | "monthly";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function TimeAnalysis({ data }: TimeAnalysisProps) {
  const [view, setView] = useState<ViewMode>("dayOfWeek");
  const { resolvedTheme } = useTheme();

  const borderColor = cssVar("--color-border");
  const mutedColor = cssVar("--color-text-muted");
  const surfaceColor = cssVar("--color-surface");
  const cardColor = cssVar("--color-card");
  const textColor = cssVar("--color-text");

  const peakDay = data.reduce(
    (max, d) => (d.count > max.count ? d : max),
    data[0],
  );

  return (
    <div
      className="bg-card-theme rounded-lg shadow border border-theme p-6"
      id="time-analysis"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-theme">Time Analysis</h2>

        {/* Toggle pill */}
        <div className="flex bg-surface rounded-lg p-0.5 border border-theme">
          <button
            className="px-3 py-1 text-sm rounded-md transition"
            style={{
              backgroundColor: view === "dayOfWeek" ? cardColor : "transparent",
              color: view === "dayOfWeek" ? textColor : mutedColor,
              boxShadow:
                view === "dayOfWeek" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
            }}
            onClick={() => setView("dayOfWeek")}
          >
            Day of Week
          </button>
          <button
            className="px-3 py-1 text-sm rounded-md transition"
            style={{
              backgroundColor: view === "monthly" ? cardColor : "transparent",
              color: view === "monthly" ? textColor : mutedColor,
              boxShadow:
                view === "monthly" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
            }}
            onClick={() => setView("monthly")}
          >
            By Amount
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={borderColor}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: mutedColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />
          <YAxis
            tickFormatter={view === "monthly" ? formatCurrency : undefined}
            tick={{ fill: mutedColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              const v = Number(value ?? 0);
              return [
                name === "amount" ? formatCurrency(v) : v,
                name === "amount" ? "Amount" : "Transactions",
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
          <Bar
            dataKey={view === "monthly" ? "amount" : "count"}
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>

      {peakDay && (
        <p className="mt-3 text-sm text-muted-theme">
          Peak day:{" "}
          <span className="font-medium text-theme">{peakDay.label}</span> with{" "}
          {peakDay.count} transactions ({formatCurrency(peakDay.amount)})
        </p>
      )}
    </div>
  );
}
