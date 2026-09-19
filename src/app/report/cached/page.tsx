import { notFound } from "next/navigation";
import { loadCachedDemoRun } from "@/lib/runPersistence";
import { ReplayView } from "../[runId]/ReplayView";
import { MetricCard } from "@/components/MetricCard";
import { OrdersByItemChart, PerDayRevenueChart } from "@/components/ReportCharts";
import { SegmentBreakdown } from "@/components/SegmentBreakdown";
import { SetupCard } from "@/components/SetupCard";

export const dynamic = "force-dynamic";

export default async function CachedReportPage() {
  const run = await loadCachedDemoRun();
  if (!run) return notFound();
  const b = run.baseline.metrics;
  const w = run.what_if.metrics;
  const deltaRevenue = w.revenue - b.revenue;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-3 py-2 text-xs text-[var(--color-warning)]">
        <span className="font-medium">CACHED</span>
        <span>·</span>
        <span>Loaded from <code>public/demo/cached-run.json</code> — independent of live Jev / Anthropic.</span>
      </div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Report</div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{run.spec.business.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-info-soft)] px-3 py-1 text-xs font-medium text-[var(--color-info)]">
              {run.spec.change.label}
            </span>
            <span className="text-xs text-[var(--color-ink-subtle)]">·</span>
            <span className="text-xs text-[var(--color-ink-subtle)]">
              {run.spec.days} days · {run.spec.population} agents · seed {run.seed}
            </span>
          </div>
        </div>
        <a href="/" className="btn-secondary">← New question</a>
      </div>
      {run.summary && (
        <section className="mb-8 card p-5">
          <div className="eyebrow mb-2">Summary</div>
          <p className="text-[15px] leading-7 text-[var(--color-ink)]">{run.summary}</p>
        </section>
      )}
      <section className="mb-8">
        <div className="eyebrow mb-3">Headline metrics</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Revenue" baseline={`$${b.revenue.toFixed(2)}`} whatIf={`$${w.revenue.toFixed(2)}`} delta={signedDollars(deltaRevenue)} good={deltaRevenue >= 0} neutral={deltaRevenue === 0} />
          <MetricCard label="Visits" baseline={String(b.visits)} whatIf={String(w.visits)} delta={signed(w.visits - b.visits)} good={w.visits >= b.visits} neutral={w.visits === b.visits} />
          <MetricCard label="Walkouts" baseline={String(b.walkouts)} whatIf={String(w.walkouts)} delta={signed(w.walkouts - b.walkouts)} good={w.walkouts <= b.walkouts} neutral={w.walkouts === b.walkouts} />
          <MetricCard label="Avg wait" baseline={`${b.avg_wait_min.toFixed(1)} min`} whatIf={`${w.avg_wait_min.toFixed(1)} min`} delta={`${signed(w.avg_wait_min - b.avg_wait_min, 1)} min`} good={w.avg_wait_min <= b.avg_wait_min} neutral={w.avg_wait_min === b.avg_wait_min} />
        </div>
      </section>
      <section className="mb-8">
        <div className="eyebrow mb-3">Trends</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PerDayRevenueChart baseline={b} whatIf={w} />
          <OrdersByItemChart baseline={b} whatIf={w} />
        </div>
      </section>
      <section className="mb-8">
        <div className="eyebrow mb-3">Who changed their behaviour</div>
        <SegmentBreakdown baseline={b} whatIf={w} />
      </section>
      <section className="mb-8">
        <div className="eyebrow mb-3">How the world was set up</div>
        <SetupCard cm={run.spec.customer_model} />
      </section>
      <section className="mb-8">
        <div className="eyebrow mb-3">Replay</div>
        <ReplayView run={run} />
      </section>
    </main>
  );
}

function signed(n: number, digits = 0): string {
  const s = Math.abs(n).toFixed(digits);
  if (n === 0) return "0";
  return n >= 0 ? `+${s}` : `-${s}`;
}
function signedDollars(n: number): string {
  const s = `$${Math.abs(n).toFixed(2)}`;
  if (n === 0) return "$0.00";
  return n >= 0 ? `+${s}` : `-${s}`;
}
