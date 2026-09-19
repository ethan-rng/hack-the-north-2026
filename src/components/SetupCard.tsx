import type { CustomerModel, SegmentFields } from "@/sim/schema";
import { colorForSegment } from "@/replay/mapLayout";

interface Props {
  cm: CustomerModel;
}

export function SetupCard({ cm }: Props) {
  return (
    <details className="rounded-md border border-zinc-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-zinc-500">
        Setup card — {cm.segments.length} segments · {cm.location}
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {cm.segments.map((s) => (
          <div key={s.id} className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: `#${colorForSegment(s.id).toString(16).padStart(6, "0")}` }} />
                {s.id.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-zinc-500 tabular-nums">{(s.share * 100).toFixed(0)}%</div>
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
    <table className="mt-2 w-full text-xs">
      <tbody>
        <Row name="age" value={distSummary(fields.age_band.dist)} src={fields.age_band.source} conf={fields.age_band.confidence} />
        <Row name="budget" value={`$${fields.budget_per_visit.median} (${fields.budget_per_visit.min}-${fields.budget_per_visit.max})`} src={fields.budget_per_visit.source} conf={fields.budget_per_visit.confidence} />
        <Row name="purpose" value={distSummary(fields.visit_purpose.dist)} src={fields.visit_purpose.source} conf={fields.visit_purpose.confidence} />
        <Row name="price sens" value={`${fields.price_sensitivity.mean.toFixed(1)}/5`} src={fields.price_sensitivity.source} conf={fields.price_sensitivity.confidence} />
        <Row name="visits/wk" value={`${fields.visits_per_week.median} (${fields.visits_per_week.min}-${fields.visits_per_week.max})`} src={fields.visits_per_week.source} conf={fields.visits_per_week.confidence} />
        <Row name="times" value={distSummary(fields.preferred_times.dist)} src={fields.preferred_times.source} conf={fields.preferred_times.confidence} />
      </tbody>
    </table>
  );
}

function Row({ name, value, src, conf }: { name: string; value: string; src: string; conf: "high" | "medium" | "low" }) {
  return (
    <tr className="border-t border-zinc-200">
      <td className="w-20 py-1 text-zinc-500">{name}</td>
      <td className="py-1 text-zinc-800">{value}</td>
      <td className="w-16 py-1 text-right">
        <SourceBadge src={src} />
      </td>
      <td className="w-14 py-1 text-right">
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
    ? "bg-blue-50 text-blue-700"
    : src === "owner"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-zinc-100 text-zinc-600";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

function ConfBadge({ conf }: { conf: "high" | "medium" | "low" }) {
  const cls = conf === "high" ? "bg-emerald-50 text-emerald-700" : conf === "medium" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{conf}</span>;
}
