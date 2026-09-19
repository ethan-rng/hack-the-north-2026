interface Props {
  label: string;
  baseline: string;
  whatIf: string;
  delta: string;
  good: boolean;
  neutral?: boolean;
}

export function MetricCard({ label, baseline, whatIf, delta, good, neutral }: Props) {
  const trendColor = neutral
    ? "text-[var(--color-ink-subtle)] bg-[var(--color-app-bg)]"
    : good
      ? "text-[var(--color-positive)] bg-[var(--color-positive-soft)]"
      : "text-[var(--color-negative)] bg-[var(--color-negative-soft)]";
  const arrow = neutral ? "→" : good ? "↑" : "↓";
  return (
    <div className="card p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tabular-nums text-[var(--color-ink)]">{whatIf}</div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${trendColor}`}>
          <span>{arrow}</span>
          <span>{delta}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-[var(--color-ink-subtle)] tabular-nums">
        <span className="mr-1">was</span>
        <span>{baseline}</span>
      </div>
    </div>
  );
}
