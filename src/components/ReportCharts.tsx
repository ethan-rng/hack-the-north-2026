"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricsSummary } from "@/sim/schema";

interface PerDayProps {
  baseline: MetricsSummary;
  whatIf: MetricsSummary;
}

export function PerDayRevenueChart({ baseline, whatIf }: PerDayProps) {
  const rows = baseline.revenue_by_day.map((v, i) => ({
    day: `Day ${i + 1}`,
    baseline: Number(v.toFixed(2)),
    what_if: Number((whatIf.revenue_by_day[i] ?? 0).toFixed(2)),
  }));
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Revenue per day</div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="baseline" fill="#94a3b8" />
            <Bar dataKey="what_if" fill="#0f172a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface OrdersProps {
  baseline: MetricsSummary;
  whatIf: MetricsSummary;
}

export function OrdersByItemChart({ baseline, whatIf }: OrdersProps) {
  const ids = Array.from(new Set([...Object.keys(baseline.orders_by_item), ...Object.keys(whatIf.orders_by_item)]));
  const rows = ids.map((id) => ({
    item: id,
    baseline: baseline.orders_by_item[id] ?? 0,
    what_if: whatIf.orders_by_item[id] ?? 0,
  }));
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Orders by item</div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="item" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="baseline" fill="#94a3b8" />
            <Bar dataKey="what_if" fill="#0f172a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
