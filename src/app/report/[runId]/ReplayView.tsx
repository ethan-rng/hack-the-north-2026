"use client";

import { useMemo, useState } from "react";
import { PixiCanvas } from "@/replay/PixiCanvas";
import { ReplayControls } from "@/replay/controls";
import type { Event, RunResult } from "@/sim/schema";
import { totalTicks, tickToClock } from "@/sim/state";
import { colorForSegment } from "@/replay/mapLayout";

interface Props {
  run: RunResult;
}

export function ReplayView({ run }: Props) {
  const [tick, setTick] = useState(0);
  const [inspected, setInspected] = useState<string | null>(null);
  const total = useMemo(() => totalTicks(run.spec), [run.spec]);
  const clock = useMemo(() => tickToClock(run.spec, tick), [run.spec, tick]);

  const agentSegment = useMemo(() => {
    if (!inspected) return null;
    const spawn = run.what_if.events.find((e) => e.agentId === inspected && e.kind === "spawn");
    return spawn?.segmentId ?? null;
  }, [inspected, run.what_if.events]);

  const inspectedEvents = useMemo(() => {
    if (!inspected) return [];
    return run.what_if.events
      .filter((e) => e.agentId === inspected && e.kind !== "spawn" && (e.probs || e.chosen))
      .slice(0, 40);
  }, [inspected, run.what_if.events]);

  return (
    <div className="space-y-3">
      <div className="card px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-[var(--color-ink)] tabular-nums">
            Day {clock.day + 1} of {run.spec.days}
          </span>
          <span className="text-[var(--color-ink-subtle)]">·</span>
          <span className="text-[var(--color-ink-muted)] tabular-nums">
            {String(Math.floor(clock.hour)).padStart(2, "0")}:{String(clock.minute).padStart(2, "0")}
          </span>
        </div>
        <div className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
          seed {run.seed} · {run.spec.population} agents
        </div>
      </div>
      <div className={`grid gap-4 ${inspected ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-ink-subtle)]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">Baseline</span>
            </div>
            <PixiCanvas
              spec={run.spec}
              events={run.baseline.events}
              currentTick={tick}
              selectedAgentId={inspected}
              onAgentClick={setInspected}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink)]">
                What if — {run.spec.change.label}
              </span>
            </div>
            <PixiCanvas
              spec={run.spec}
              events={run.what_if.events}
              currentTick={tick}
              selectedAgentId={inspected}
              onAgentClick={setInspected}
            />
          </div>
        </div>
        {inspected && (
          <AgentSidePanel
            agentId={inspected}
            segmentId={agentSegment}
            events={inspectedEvents}
            onClose={() => setInspected(null)}
          />
        )}
      </div>
      <ReplayControls totalTicks={total} onTickChange={setTick} />
    </div>
  );
}

function AgentSidePanel({
  agentId,
  segmentId,
  events,
  onClose,
}: {
  agentId: string;
  segmentId: string | null;
  events: Event[];
  onClose: () => void;
}) {
  const color = segmentId ? `#${colorForSegment(segmentId).toString(16).padStart(6, "0")}` : "#71717a";
  return (
    <aside className="card p-4 h-fit lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow mb-1">Agent</div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium text-[var(--color-ink)]">{agentId}</span>
            {segmentId && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {segmentId.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--color-ink-subtle)] hover:bg-[var(--color-app-bg)] hover:text-[var(--color-ink)]"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mt-4">
        <div className="eyebrow mb-2">Decision timeline · what-if world</div>
        {events.length === 0 ? (
          <div className="text-xs text-[var(--color-ink-subtle)]">No decisions yet — this agent hasn&apos;t acted before this point in the replay.</div>
        ) : (
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {events.map((e, i) => (
              <li key={i} className="rounded-md border border-[var(--color-app-border)] bg-[color-mix(in_srgb,var(--color-app-bg)_50%,white)] p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--color-ink)]">{e.kind}</span>
                  <span className="text-[var(--color-ink-subtle)] tabular-nums">t{e.tick}</span>
                </div>
                {e.chosen !== undefined && (
                  <div className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    chose <span className="font-mono text-[var(--color-ink)]">{e.chosen}</span>
                  </div>
                )}
                {e.probs && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(e.probs)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([k, v]) => {
                        const isChosen = e.chosen === k;
                        return (
                          <div key={k} className="grid grid-cols-[1fr_36px] items-center gap-2 text-[11px]">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-[var(--color-app-border)]">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${Math.round(v * 100)}%`,
                                    background: isChosen ? "var(--color-accent)" : "var(--color-app-border-strong)",
                                  }}
                                />
                              </div>
                              <span className={`font-mono ${isChosen ? "text-[var(--color-ink)] font-medium" : "text-[var(--color-ink-muted)]"}`}>{k}</span>
                            </div>
                            <div className="text-right tabular-nums text-[var(--color-ink-muted)]">{(v * 100).toFixed(0)}%</div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
