import type { JevClient } from "@/jev/client";
import { applyPatches } from "@/lib/patch";
import { runWorld } from "./engine";
import { summarize } from "./metrics";
import type { RunResult, SimSpec } from "./schema";

export interface RunSpecOptions {
  seed?: number;
  jev: JevClient;
  runId: string;
}

export async function runSpec(spec: SimSpec, opts: RunSpecOptions): Promise<RunResult> {
  const seed = opts.seed ?? spec.seed ?? 42;
  const baselineSpec: SimSpec = { ...spec, seed };
  const whatIfSpec: SimSpec = applyPatches(baselineSpec, spec.change.patch);

  const [baseline, whatIf] = await Promise.all([
    runWorld(baselineSpec, seed, "baseline", opts.jev),
    runWorld(whatIfSpec, seed, "what_if", opts.jev),
  ]);

  return {
    runId: opts.runId,
    seed,
    spec: baselineSpec,
    baseline: {
      metrics: summarize(baselineSpec, baseline.events),
      events: baseline.events,
    },
    what_if: {
      metrics: summarize(whatIfSpec, whatIf.events),
      events: whatIf.events,
    },
  };
}
