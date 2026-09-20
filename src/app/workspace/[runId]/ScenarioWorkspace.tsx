"use client";

import { useState, type FormEvent } from "react";
import type { RunResult } from "@/sim/schema";
import { PixiCanvas } from "@/replay/PixiCanvas";
import { ReplayControls } from "@/replay/controls";
import { tickToClock, totalTicks } from "@/sim/state";

const SUGGESTIONS = [
  "What if I raise prices by 10%?",
  "What if I add one more staff member?",
  "What if a competitor opens nearby?",
];

export function ScenarioWorkspace({ run }: { run: RunResult }) {
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [asks, setAsks] = useState<string[]>([]);
  const [activeAsk, setActiveAsk] = useState<number | null>(null);
  const baseline = run.baseline.metrics;
  const clock = tickToClock(run.spec, tick);

  function submitAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setAsks((current) => {
      const next = [...current, question];
      setActiveAsk(next.length - 1);
      return next;
    });
    setDraft("");
  }

  const selectedAsk = activeAsk === null ? null : asks[activeAsk];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="relative text-center">
        <a
          href="/"
          className="mb-6 inline-flex text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] sm:absolute sm:left-0 sm:top-1 sm:mb-0"
        >
          ← New baseline
        </a>
        <div className="eyebrow">Baseline</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
          {run.spec.business.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          The town before any changes · {run.spec.population} people over {run.spec.days} days
        </p>
      </header>

      <section className="mx-auto mt-7 max-w-4xl" aria-labelledby="baseline-heading">
        <h2 id="baseline-heading" className="sr-only">Baseline simulation</h2>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BaselineMetric label="Revenue" value={`$${baseline.revenue.toFixed(2)}`} />
          <BaselineMetric label="Visits" value={String(baseline.visits)} />
          <BaselineMetric label="Walkouts" value={String(baseline.walkouts)} />
          <BaselineMetric label="Avg. wait" value={`${baseline.avg_wait_min.toFixed(1)} min`} />
        </div>

        <div className="card-strong overflow-hidden p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs">
            <span className="font-medium text-[var(--color-ink)]">
              Day {clock.day + 1} · {String(Math.floor(clock.hour)).padStart(2, "0")}:
              {String(clock.minute).padStart(2, "0")}
            </span>
            <span className="text-[var(--color-ink-subtle)]">Current behaviour</span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="mx-auto w-fit">
              <PixiCanvas spec={run.spec} events={run.baseline.events} currentTick={tick} />
            </div>
          </div>
          <div className="mt-3">
            <ReplayControls totalTicks={totalTicks(run.spec)} onTickChange={setTick} />
          </div>
        </div>
      </section>

      <div className="mx-auto my-10 flex max-w-4xl items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--color-app-border)]" />
        <span className="rounded-full border border-[var(--color-app-border)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
          Change one thing
        </span>
        <span className="h-px flex-1 bg-[var(--color-app-border)]" />
      </div>

      <section className="mx-auto max-w-4xl" aria-labelledby="ask-heading">
        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="eyebrow">Your ask</div>
            <h2 id="ask-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              What should the town try next?
            </h2>
            <form onSubmit={submitAsk} className="mt-4 card-strong p-2">
              <label htmlFor="scenario-ask" className="sr-only">Ask a what-if question</label>
              <textarea
                id="scenario-ask"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                placeholder="e.g. What if I raise my latte price from $5.00 to $5.50?"
                className="w-full resize-none rounded-lg border-0 bg-transparent px-3 py-2 text-base leading-7 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-subtle)]"
              />
              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-app-border)] px-2 pt-2">
                <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                  Updates this workspace
                </span>
                <button type="submit" disabled={!draft.trim()} className="btn-primary">
                  Ask the town <span aria-hidden="true">↗</span>
                </button>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDraft(suggestion)}
                  className="rounded-full border border-[var(--color-app-border)] bg-white px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition hover:border-[var(--color-app-border-strong)] hover:text-[var(--color-ink)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-dashed border-[var(--color-app-border-strong)] p-4">
            <div className="eyebrow">Ask history</div>
            {asks.length === 0 ? (
              <p className="mt-3 text-xs leading-5 text-[var(--color-ink-subtle)]">
                Your scenarios will stay here so you can move between them without rebuilding the baseline.
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {asks.map((ask, index) => (
                  <li key={`${ask}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setActiveAsk(index)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs leading-5 transition ${
                        activeAsk === index
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                          : "border-[var(--color-app-border)] bg-white text-[var(--color-ink-muted)] hover:border-[var(--color-app-border-strong)]"
                      }`}
                    >
                      <span className="mr-2 font-mono opacity-55">{String(index + 1).padStart(2, "0")}</span>
                      {ask}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>

        <div className="mt-6" aria-live="polite">
          {selectedAsk ? (
            <section className="overflow-hidden rounded-xl border border-[var(--color-app-border-strong)] bg-[var(--color-app-panel)] shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-app-border)] bg-[var(--color-app-bg)] px-5 py-4">
                <div>
                  <div className="eyebrow">Scenario {String((activeAsk ?? 0) + 1).padStart(2, "0")}</div>
                  <h3 className="mt-1 max-w-2xl text-base font-semibold text-[var(--color-ink)]">{selectedAsk}</h3>
                </div>
                <span className="rounded-full bg-[var(--color-warning-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-warning)]">
                  Visual preview
                </span>
              </div>
              <div className="grid gap-px bg-[var(--color-app-border)] sm:grid-cols-4">
                {["Revenue change", "Visit change", "Walkout change", "Wait change"].map((label) => (
                  <div key={label} className="bg-white px-5 py-5">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">{label}</div>
                    <div className="mt-2 text-xl font-semibold text-[var(--color-ink-subtle)]">—</div>
                  </div>
                ))}
              </div>
              <p className="px-5 py-3 text-xs text-[var(--color-ink-subtle)]">
                Jev inference is not connected yet. The baseline stays fixed while each ask will update this scenario.
              </p>
            </section>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-app-border-strong)] px-5 py-8 text-center text-sm text-[var(--color-ink-subtle)]">
              Ask a question to open a scenario beneath the baseline.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function BaselineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3 text-center">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-ink)]">{value}</div>
    </div>
  );
}
