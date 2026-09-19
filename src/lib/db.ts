import Database from "better-sqlite3";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import type { RunResult } from "@/sim/schema";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "runs.db");

// Cache the connection on globalThis so Turbopack HMR doesn't leak handles.
declare global {
  var __htn_db: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (globalThis.__htn_db) return globalThis.__htn_db;
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      business_name TEXT NOT NULL,
      business_type TEXT NOT NULL,
      location TEXT NOT NULL,
      change_label TEXT NOT NULL,
      seed INTEGER NOT NULL,
      population INTEGER NOT NULL,
      days INTEGER NOT NULL,
      baseline_revenue REAL,
      what_if_revenue REAL,
      baseline_visits INTEGER,
      what_if_visits INTEGER,
      baseline_walkouts INTEGER,
      what_if_walkouts INTEGER,
      avg_wait_min REAL,
      summary TEXT,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_runs_created ON runs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_business ON runs (business_type, location);
  `);
  globalThis.__htn_db = db;
  return db;
}

const INSERT_SQL = `
  INSERT INTO runs (
    run_id, created_at, business_name, business_type, location, change_label,
    seed, population, days,
    baseline_revenue, what_if_revenue, baseline_visits, what_if_visits,
    baseline_walkouts, what_if_walkouts, avg_wait_min, summary, payload
  ) VALUES (
    @run_id, @created_at, @business_name, @business_type, @location, @change_label,
    @seed, @population, @days,
    @baseline_revenue, @what_if_revenue, @baseline_visits, @what_if_visits,
    @baseline_walkouts, @what_if_walkouts, @avg_wait_min, @summary, @payload
  )
  ON CONFLICT(run_id) DO UPDATE SET
    summary = excluded.summary,
    payload = excluded.payload,
    baseline_revenue = excluded.baseline_revenue,
    what_if_revenue = excluded.what_if_revenue,
    baseline_visits = excluded.baseline_visits,
    what_if_visits = excluded.what_if_visits,
    baseline_walkouts = excluded.baseline_walkouts,
    what_if_walkouts = excluded.what_if_walkouts,
    avg_wait_min = excluded.avg_wait_min
`;

export interface RunMeta {
  run_id: string;
  created_at: number;
  business_name: string;
  business_type: string;
  location: string;
  change_label: string;
  seed: number;
  population: number;
  days: number;
  baseline_revenue: number | null;
  what_if_revenue: number | null;
  baseline_visits: number | null;
  what_if_visits: number | null;
  baseline_walkouts: number | null;
  what_if_walkouts: number | null;
  avg_wait_min: number | null;
  summary: string | null;
}

export function upsertRun(result: RunResult): void {
  const stmt = getDb().prepare(INSERT_SQL);
  stmt.run({
    run_id: result.runId,
    created_at: Date.now(),
    business_name: result.spec.business.name,
    business_type: result.spec.business.type,
    location: result.spec.business.location,
    change_label: result.spec.change.label,
    seed: result.seed,
    population: result.spec.population,
    days: result.spec.days,
    baseline_revenue: result.baseline.metrics.revenue,
    what_if_revenue: result.what_if.metrics.revenue,
    baseline_visits: result.baseline.metrics.visits,
    what_if_visits: result.what_if.metrics.visits,
    baseline_walkouts: result.baseline.metrics.walkouts,
    what_if_walkouts: result.what_if.metrics.walkouts,
    avg_wait_min: result.what_if.metrics.avg_wait_min,
    summary: result.summary ?? null,
    payload: JSON.stringify(result),
  });
}

export function loadRun(runId: string): RunResult | null {
  const row = getDb()
    .prepare("SELECT payload FROM runs WHERE run_id = ?")
    .get(runId) as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as RunResult;
  } catch {
    return null;
  }
}

export function deleteRun(runId: string): boolean {
  const info = getDb().prepare("DELETE FROM runs WHERE run_id = ?").run(runId);
  return info.changes > 0;
}

export function listRuns(limit = 100): RunMeta[] {
  return getDb()
    .prepare(
      `SELECT run_id, created_at, business_name, business_type, location, change_label,
              seed, population, days,
              baseline_revenue, what_if_revenue, baseline_visits, what_if_visits,
              baseline_walkouts, what_if_walkouts, avg_wait_min, summary
       FROM runs ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as RunMeta[];
}

export function runsCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) as n FROM runs").get() as { n: number };
  return row.n;
}
