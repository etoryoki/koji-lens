"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#60a5fa", // blue-400  — メイン
  "#93c5fd", // blue-300  — サブ
  "#818cf8", // indigo-400
  "#a78bfa", // violet-400
  "#38bdf8", // sky-400
];

const TOOLTIP_STYLE = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
};

export function CostLineChart({
  data,
  costLabel,
}: {
  data: Array<{ label: string; cost: number }>;
  costLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <YAxis
          stroke="#9ca3af"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`$${Number(v).toFixed(4)}`, costLabel]}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={{ r: 3, fill: "#60a5fa" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ToolPie({
  data,
  usageLabel,
}: {
  data: Array<{ name: string; value: number }>;
  usageLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
          innerRadius={50}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [String(v), usageLabel]}
        />
        <Legend wrapperStyle={{ color: "#e5e7eb", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

const MODEL_COLORS: Record<string, string> = {
  Opus: "#a78bfa", // violet-400 — 高単価
  Sonnet: "#60a5fa", // blue-400 — メイン
  Haiku: "#34d399", // emerald-400 — 低単価
};

const FALLBACK_COLORS = [
  "#38bdf8", // sky-400
  "#818cf8", // indigo-400
  "#f472b6", // pink-400
  "#94a3b8", // slate-400
];

export function WeeklyTrendChart({
  data,
  cacheLabel,
  latencyLabel,
}: {
  data: Array<{
    week: string;
    cacheHitRatePct: number;
    latencyP95Ms: number;
  }>;
  cacheLabel: string;
  latencyLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 12, right: 50, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="cache"
          orientation="left"
          stroke="#60a5fa"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${Math.round(Number(v))}%`}
          domain={[0, 100]}
        />
        <YAxis
          yAxisId="latency"
          orientation="right"
          stroke="#fbbf24"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${Math.round(Number(v))}ms`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => {
            const num = Number(v);
            if (name === cacheLabel) return [`${num.toFixed(1)}%`, name];
            return [`${Math.round(num)}ms`, name];
          }}
        />
        <Legend wrapperStyle={{ color: "#e5e7eb", fontSize: 12 }} />
        <Line
          yAxisId="cache"
          type="monotone"
          dataKey="cacheHitRatePct"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={{ r: 3, fill: "#60a5fa" }}
          name={cacheLabel}
        />
        <Line
          yAxisId="latency"
          type="monotone"
          dataKey="latencyP95Ms"
          stroke="#fbbf24"
          strokeWidth={2}
          dot={{ r: 3, fill: "#fbbf24" }}
          name={latencyLabel}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ModelCostStackedArea({
  data,
  keys,
}: {
  data: Array<Record<string, number | string>>;
  keys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <YAxis
          stroke="#9ca3af"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => `$${Number(v).toFixed(4)}`}
        />
        <Legend wrapperStyle={{ color: "#e5e7eb", fontSize: 12 }} />
        {keys.map((k, i) => {
          const color = MODEL_COLORS[k] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          return (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={color}
              fill={color}
              fillOpacity={0.65}
              name={k}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
