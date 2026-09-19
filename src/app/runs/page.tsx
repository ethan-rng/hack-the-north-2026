import { listRuns } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = listRuns(200);
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">History</div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">Past runs</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            {runs.length === 0 ? "No runs yet." : `${runs.length} run${runs.length === 1 ? "" : "s"} saved to \`.data/runs.db\`.`}
          </p>
        </div>
        <a href="/" className="btn-secondary">
          ← New question
        </a>
      </div>

      {runs.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--color-ink-muted)]">
          Ask a question or run a preset from the{" "}
          <a href="/" className="underline">
            landing page
          </a>{" "}
          — completed runs will show up here.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[color-mix(in_srgb,var(--color-app-bg)_60%,white)] text-left">
              <tr className="border-b border-[var(--color-app-border)]">
                <Th>When</Th>
                <Th>Business</Th>
                <Th>Question / change</Th>
                <Th className="text-right">Δ revenue</Th>
                <Th className="text-right">Δ visits</Th>
                <Th className="text-right">Wait</Th>
                <Th className="text-right"> </Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const dRev = (r.what_if_revenue ?? 0) - (r.baseline_revenue ?? 0);
                const dVis = (r.what_if_visits ?? 0) - (r.baseline_visits ?? 0);
                return (
                  <tr key={r.run_id} className="border-b border-[var(--color-app-border)] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--color-app-bg)_40%,white)]">
                    <Td className="text-[var(--color-ink-subtle)] tabular-nums">
                      {relative(r.created_at)}
                    </Td>
                    <Td>
                      <div className="font-medium text-[var(--color-ink)]">{r.business_name}</div>
                      <div className="text-[11px] text-[var(--color-ink-subtle)]">
                        {r.business_type} · {r.location}
                      </div>
                    </Td>
                    <Td>
                      <span className="rounded-full bg-[var(--color-info-soft)] px-2 py-0.5 text-xs text-[var(--color-info)]">
                        {r.change_label}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">
                      <Delta v={dRev} format={(n) => `${n >= 0 ? "+" : ""}$${n.toFixed(2)}`} goodIfPositive />
                    </Td>
                    <Td className="text-right tabular-nums">
                      <Delta v={dVis} format={(n) => `${n >= 0 ? "+" : ""}${n}`} goodIfPositive />
                    </Td>
                    <Td className="text-right text-[var(--color-ink-muted)] tabular-nums">
                      {r.avg_wait_min !== null ? `${r.avg_wait_min.toFixed(1)}m` : "—"}
                    </Td>
                    <Td className="text-right">
                      <a
                        href={`/report/${r.run_id}`}
                        className="text-xs font-medium text-[var(--color-ink)] underline decoration-[var(--color-app-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]"
                      >
                        Open →
                      </a>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)] ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function Delta({ v, format, goodIfPositive }: { v: number; format: (n: number) => string; goodIfPositive: boolean }) {
  if (v === 0) return <span className="text-[var(--color-ink-subtle)]">{format(0)}</span>;
  const good = goodIfPositive ? v > 0 : v < 0;
  const cls = good ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
  return <span className={cls}>{format(v)}</span>;
}

function relative(ts: number): string {
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
