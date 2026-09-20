interface Props {
  label: string;
  baseline: string;
  whatIf: string;
  delta: string;
  good: boolean;
}

export function MetricCard({ label, baseline, whatIf, delta, good }: Props) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <div>
          <div className="text-xs text-zinc-400">baseline</div>
          <div className="text-sm font-medium tabular-nums">{baseline}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">what if</div>
          <div className="text-sm font-medium tabular-nums">{whatIf}</div>
        </div>
      </div>
      <div
        className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
          good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}
      >
        {delta}
      </div>
    </div>
  );
}
