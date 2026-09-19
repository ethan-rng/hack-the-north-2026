import type { CustomerModel, SegmentFields } from "@/sim/schema";
import { colorForSegment } from "@/replay/mapLayout";

interface Props {
  cm: CustomerModel;
}

export function SetupCard({ cm }: Props) {
  return (
    <details className="card p-5 group" open>
      <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-[var(--color-ink)] list-none">
        <div className="flex items-center gap-2">
          <span>{cm.segments.length} customer segments</span>
          <span className="text-[var(--color-ink-subtle)]">·</span>
          <span className="text-[var(--color-ink-muted)]">{cm.location}</span>
        </div>
        <svg className="h-4 w-4 text-[var(--color-ink-subtle)] transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {cm.segments.map((s) => (
          <div key={s.id} className="rounded-[10px] border border-[var(--color-app-border)] bg-[color-mix(in_srgb,var(--color-app-bg)_50%,white)] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hexOf(s.id) }} />
                {s.id.replace(/_/g, " ")}
              </div>
              <div className="text-xs font-medium text-[var(--color-ink-muted)] tabular-nums">{(s.share * 100).toFixed(0)}%</div>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-[var(--color-app-border)]">
              <div className="h-1 rounded-full" style={{ width: `${s.share * 100}%`, backgroundColor: hexOf(s.id) }} />
            </div>
            <FieldTable fields={s.fields} />
          </div>
        ))}
      </div>
    </details>
  );
}

function FieldTable({ fields }: { fields: SegmentFields }) {
  return (
    <table className="mt-3 w-full text-xs">
      <tbody>
        <Row name="age" value={distSummary(fields.age_band.dist)} src={fields.age_band.source} conf={fields.age_band.confidence} />
        <Row name="budget" value={`$${fields.budget_per_visit.median} (${fields.budget_per_visit.min}–${fields.budget_per_visit.max})`} src={fields.budget_per_visit.source} conf={fields.budget_per_visit.confidence} />
        <Row name="purpose" value={distSummary(fields.visit_purpose.dist)} src={fields.visit_purpose.source} conf={fields.visit_purpose.confidence} />
        <Row name="price sens" value={`${fields.price_sensitivity.mean.toFixed(1)}/5`} src={fields.price_sensitivity.source} conf={fields.price_sensitivity.confidence} />
        <Row name="visits/wk" value={`${fields.visits_per_week.median} (${fields.visits_per_week.min}–${fields.visits_per_week.max})`} src={fields.visits_per_week.source} conf={fields.visits_per_week.confidence} />
        <Row name="times" value={distSummary(fields.preferred_times.dist)} src={fields.preferred_times.source} conf={fields.preferred_times.confidence} />
      </tbody>
    </table>
  );
}

function Row({ name, value, src, conf }: { name: string; value: string; src: string; conf: "high" | "medium" | "low" }) {
  return (
    <tr className="border-t border-[var(--color-app-border)]">
      <td className="w-16 py-1.5 text-[var(--color-ink-subtle)]">{name}</td>
      <td className="py-1.5 text-[var(--color-ink)]">{value}</td>
      <td className="w-14 py-1.5 text-right">
        <SourceBadge src={src} />
      </td>
      <td className="w-14 py-1.5 text-right">
        <ConfBadge conf={conf} />
      </td>
    </tr>
  );
}

function distSummary(d: Record<string, number>): string {
  const parts = Object.entries(d)
    .filter(([, v]) => v > 0.01)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${k} ${Math.round(v * 100)}%`);
  return parts.join(" · ");
}

function SourceBadge({ src }: { src: string }) {
  const label = src.startsWith("http") ? "web" : src;
  const cls = src.startsWith("http")
    ? "bg-[var(--color-info-soft)] text-[var(--color-info)]"
    : src === "owner"
      ? "bg-[var(--color-positive-soft)] text-[var(--color-positive)]"
      : "bg-[var(--color-app-bg)] text-[var(--color-ink-subtle)]";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

function ConfBadge({ conf }: { conf: "high" | "medium" | "low" }) {
  const cls =
    conf === "high"
      ? "bg-[var(--color-positive-soft)] text-[var(--color-positive)]"
      : conf === "medium"
        ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
        : "bg-[var(--color-negative-soft)] text-[var(--color-negative)]";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{conf}</span>;
}

function hexOf(id: string): string {
  return `#${colorForSegment(id).toString(16).padStart(6, "0")}`;
}
