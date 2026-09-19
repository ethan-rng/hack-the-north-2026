"use client";

import { useMemo, useState } from "react";
import { PixiCanvas } from "@/replay/PixiCanvas";
import { ReplayControls } from "@/replay/controls";
import type { RunResult } from "@/sim/schema";
import { totalTicks, tickToClock } from "@/sim/state";

interface Props {
  run: RunResult;
}

export function ReplayView({ run }: Props) {
  const [tick, setTick] = useState(0);
  const [inspected, setInspected] = useState<string | null>(null);
  const total = useMemo(() => totalTicks(run.spec), [run.spec]);
  const clock = useMemo(() => tickToClock(run.spec, tick), [run.spec, tick]);

  const inspectedEvents = useMemo(() => {
    if (!inspected) return [];
    return run.what_if.events.filter((e) => e.agentId === inspected).slice(0, 40);
  }, [inspected, run.what_if.events]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-zinc-600">
        <div>
          Day {clock.day + 1} / {run.spec.days} · {String(Math.floor(clock.hour)).padStart(2, "0")}:
          {String(clock.minute).padStart(2, "0")}
        </div>
        <div>Seed {run.seed}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Baseline</div>
          <PixiCanvas
            spec={run.spec}
            events={run.baseline.events}
            currentTick={tick}
            onAgentClick={setInspected}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            What if — {run.spec.change.label}
          </div>
          <PixiCanvas
            spec={run.spec}
            events={run.what_if.events}
            currentTick={tick}
            onAgentClick={setInspected}
          />
        </div>
      </div>
      <ReplayControls totalTicks={total} onTickChange={setTick} />
      {inspected && (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">Agent {inspected} — decisions in what-if</div>
            <button
              onClick={() => setInspected(null)}
              className="text-zinc-500 hover:text-zinc-900"
            >
              close
            </button>
          </div>
          <ul className="space-y-1">
            {inspectedEvents.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-16 tabular-nums text-zinc-500">t{e.tick}</span>
                <span className="w-24 text-zinc-700">{e.kind}</span>
                {e.chosen && <span className="text-zinc-900">→ {e.chosen}</span>}
                {e.probs && (
                  <span className="text-zinc-500">
                    {Object.entries(e.probs)
                      .map(([k, v]) => `${k}:${(v * 100).toFixed(0)}%`)
                      .join(" ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
