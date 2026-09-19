import { notFound } from "next/navigation";
import { getRun } from "@/lib/runs";
import { ReplayView } from "./ReplayView";
import { MetricCard } from "@/components/MetricCard";
import { OrdersByItemChart, PerDayRevenueChart } from "@/components/ReportCharts";
import { SegmentBreakdown } from "@/components/SegmentBreakdown";
import { SetupCard } from "@/components/SetupCard";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) return notFound();
  const b = run.baseline.metrics;
  const w = run.what_if.metrics;
  const deltaRevenue = w.revenue - b.revenue;
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {run.spec.business.name} — {run.spec.change.label}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {run.spec.days} days · {run.spec.population} agents · seed {run.seed}
        </p>
      </div>

      {run.summary && (
        <div className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Summary</div>
          <p className="text-sm leading-6 text-zinc-800">{run.summary}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Revenue" baseline={`$${b.revenue.toFixed(2)}`} whatIf={`$${w.revenue.toFixed(2)}`} delta={`${deltaRevenue >= 0 ? "+" : ""}$${deltaRevenue.toFixed(2)}`} good={deltaRevenue >= 0} />
        <MetricCard label="Visits" baseline={String(b.visits)} whatIf={String(w.visits)} delta={signed(w.visits - b.visits)} good={w.visits >= b.visits} />
        <MetricCard label="Walkouts" baseline={String(b.walkouts)} whatIf={String(w.walkouts)} delta={signed(w.walkouts - b.walkouts)} good={w.walkouts <= b.walkouts} />
        <MetricCard label="Avg wait (min)" baseline={b.avg_wait_min.toFixed(1)} whatIf={w.avg_wait_min.toFixed(1)} delta={signed(w.avg_wait_min - b.avg_wait_min, 1)} good={w.avg_wait_min <= b.avg_wait_min} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <PerDayRevenueChart baseline={b} whatIf={w} />
        <OrdersByItemChart baseline={b} whatIf={w} />
      </div>

      <div className="mb-6">
        <SegmentBreakdown baseline={b} whatIf={w} />
      </div>

      <div className="mb-6">
        <SetupCard cm={run.spec.customer_model} />
      </div>

      <ReplayView run={run} />

      <p className="mt-6 text-xs text-zinc-500">
        Simulated outcome from synthetic customers. Use it to think through a decision, not as a forecast.
      </p>
    </main>
  );
}

function signed(n: number, digits = 0): string {
  const s = n.toFixed(digits);
  return n >= 0 ? `+${s}` : s;
}
