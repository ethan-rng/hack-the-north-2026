import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { RunResult } from "@/sim/schema";

// The cached demo lives as a shipped artifact under public/ so /report/cached
// can render offline without hitting the DB. Per-run persistence is now in
// SQLite (see src/lib/db.ts); loadPersistedRun stays around only for the
// one-time migration path in src/lib/runs.ts.

const LEGACY_RUNS_DIR = path.join(process.cwd(), "public", "runs");
const CACHED_DEMO_PATH = path.join(process.cwd(), "public", "demo", "cached-run.json");

export async function loadPersistedRun(runId: string): Promise<RunResult | null> {
  const file = path.join(LEGACY_RUNS_DIR, `${runId}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, "utf8")) as RunResult;
  } catch {
    return null;
  }
}

export async function loadCachedDemoRun(): Promise<RunResult | null> {
  if (!existsSync(CACHED_DEMO_PATH)) return null;
  try {
    return JSON.parse(await readFile(CACHED_DEMO_PATH, "utf8")) as RunResult;
  } catch {
    return null;
  }
}

export async function saveAsCachedDemo(result: RunResult): Promise<void> {
  await mkdir(path.dirname(CACHED_DEMO_PATH), { recursive: true });
  await writeFile(CACHED_DEMO_PATH, JSON.stringify(result), "utf8");
}
