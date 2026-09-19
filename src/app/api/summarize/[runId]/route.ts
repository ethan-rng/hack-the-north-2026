import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/runs";
import { report, fallbackReport } from "@/llm/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Generates the Claude summary for an existing run and persists it back.
// Split out from /api/run so the client stepper can show a separate step.
export async function POST(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "run not found" }, { status: 404 });
  const input = {
    spec: run.spec,
    baseline: run.baseline.metrics,
    whatIf: run.what_if.metrics,
  };
  let usedFallback = false;
  try {
    const r = await report(input);
    run.summary = r.summary;
  } catch {
    run.summary = fallbackReport(input).summary;
    usedFallback = true;
  }
  saveRun(run);
  return NextResponse.json({ runId, summary: run.summary, fallback: usedFallback });
}
