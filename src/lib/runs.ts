import type { RunResult } from "@/sim/schema";
import { loadRun as dbLoadRun, upsertRun } from "./db";
import { loadPersistedRun } from "./runPersistence";

// In-memory cache in front of the SQLite store — same-request reads never
// hit disk. globalThis-backed so Turbopack HMR doesn't fragment it.
declare global {
  var __htn_runs: Map<string, RunResult> | undefined;
}
const runs: Map<string, RunResult> = globalThis.__htn_runs ?? new Map<string, RunResult>();
globalThis.__htn_runs = runs;

export function saveRun(result: RunResult): void {
  runs.set(result.runId, result);
  try {
    upsertRun(result);
  } catch (e) {
    console.error("db upsert failed", (e as Error).message);
  }
}

export async function getRun(runId: string): Promise<RunResult | undefined> {
  const hit = runs.get(runId);
  if (hit) return hit;
  const fromDb = dbLoadRun(runId);
  if (fromDb) {
    runs.set(runId, fromDb);
    return fromDb;
  }
  // One-time migration for runs saved before the DB existed.
  const legacy = await loadPersistedRun(runId);
  if (legacy) {
    runs.set(runId, legacy);
    try {
      upsertRun(legacy);
    } catch {}
    return legacy;
  }
  return undefined;
}

export function newRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
