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
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Who changed their behaviour
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="py-1 font-normal">Segment</th>
            <th className="py-1 text-right font-normal">Baseline rev</th>
            <th className="py-1 text-right font-normal">What-if rev</th>
            <th className="py-1 text-right font-normal">Δ</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const b = baseline.revenue_by_segment[id] ?? 0;
            const w = whatIf.revenue_by_segment[id] ?? 0;
            const d = w - b;
            return (
              <tr key={id} className="border-t border-zinc-100">
                <td className="py-1.5">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: `#${colorForSegment(id).toString(16).padStart(6, "0")}` }} />
                  {id.replace(/_/g, " ")}
                </td>
                <td className="py-1.5 text-right tabular-nums">${b.toFixed(2)}</td>
                <td className="py-1.5 text-right tabular-nums">${w.toFixed(2)}</td>
                <td className={`py-1.5 text-right tabular-nums ${d >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {d >= 0 ? "+" : ""}${d.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
