import type { MetricsSummary } from "@/sim/schema";
import { colorForSegment } from "@/replay/mapLayout";

interface Props {
  baseline: MetricsSummary;
  whatIf: MetricsSummary;
}

export function SegmentBreakdown({ baseline, whatIf }: Props) {
  const ids = Array.from(
    new Set([...Object.keys(baseline.revenue_by_segment), ...Object.keys(whatIf.revenue_by_segment)]),
  );
  const maxVal = Math.max(
    1,
    ...ids.flatMap((id) => [baseline.revenue_by_segment[id] ?? 0, whatIf.revenue_by_segment[id] ?? 0]),
  );
  return (
    <div className="card p-5">
      <div className="space-y-3">
        {ids.map((id) => {
          const bv = baseline.revenue_by_segment[id] ?? 0;
          const wv = whatIf.revenue_by_segment[id] ?? 0;
          const d = wv - bv;
          const color = `#${colorForSegment(id).toString(16).padStart(6, "0")}`;
          return (
            <div key={id} className="grid grid-cols-[140px_1fr_100px] items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[var(--color-ink)]">{id.replace(/_/g, " ")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <BarRow label="baseline" value={bv} max={maxVal} color="var(--color-app-border-strong)" tone="muted" />
                <BarRow label="what if" value={wv} max={maxVal} color={color} tone="strong" />
              </div>
              <div className={`text-right text-sm font-medium tabular-nums ${d >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                {d >= 0 ? "+" : ""}${d.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color, tone }: { label: string; value: number; max: number; color: string; tone: "muted" | "strong" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="grid grid-cols-[52px_1fr_64px] items-center gap-2">
      <div className={`text-[10px] uppercase tracking-wider ${tone === "muted" ? "text-[var(--color-ink-subtle)]" : "text-[var(--color-ink-muted)]"}`}>{label}</div>
      <div className="h-2 rounded-full bg-[var(--color-app-bg)]">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-right text-xs text-[var(--color-ink-muted)] tabular-nums">${value.toFixed(2)}</div>
    </div>
  );
}
