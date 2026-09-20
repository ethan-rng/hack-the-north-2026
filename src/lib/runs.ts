import type { RunResult } from "@/sim/schema";
import { loadPersistedRun } from "./runPersistence";

// In-memory run store, backed by globalThis so it survives Turbopack HMR
// module reloads in dev. getRun falls through to disk (public/runs/) for
// shareable-run-by-link.
declare global {
  var __htn_runs: Map<string, RunResult> | undefined;
}
const runs: Map<string, RunResult> = globalThis.__htn_runs ?? new Map<string, RunResult>();
globalThis.__htn_runs = runs;

export function saveRun(result: RunResult): void {
  runs.set(result.runId, result);
}

export async function getRun(runId: string): Promise<RunResult | undefined> {
  const hit = runs.get(runId);
  if (hit) return hit;
  const disk = await loadPersistedRun(runId);
  if (disk) {
    runs.set(runId, disk);
    return disk;
  }
  return undefined;
}

export function newRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
