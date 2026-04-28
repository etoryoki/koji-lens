"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

export function CostBarChart({
  data,
}: {
  data: Array<{ label: string; cost: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <YAxis
          stroke="#9ca3af"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`$${Number(v).toFixed(4)}`, "cost"]}
        />
        <Bar dataKey="cost" fill="#60a5fa" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ToolPie({
  data,
}: {
  data: Array<{ name: string; value: number }>;
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
          formatter={(v) => [String(v), "calls"]}
        />
        <Legend wrapperStyle={{ color: "#e5e7eb", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TokensStackedBar({
  data,
}: {
  data: Array<{
    label: string;
    input: number;
    output: number;
    cacheRead: number;
    cacheCreate: number;
  }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <YAxis
          stroke="#9ca3af"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => Number(v).toLocaleString()}
        />
        <Legend wrapperStyle={{ color: "#e5e7eb", fontSize: 12 }} />
        <Bar dataKey="cacheRead" stackId="a" fill="#60a5fa" name="cache read" />
        <Bar
          dataKey="cacheCreate"
          stackId="a"
          fill="#818cf8"
          name="cache create"
        />
        <Bar dataKey="output" stackId="a" fill="#38bdf8" name="output" />
        <Bar dataKey="input" stackId="a" fill="#94a3b8" name="input" />
      </BarChart>
    </ResponsiveContainer>
  );
}
