import { NextResponse } from "next/server";
import { getRun } from "@/lib/runs";
import { saveAsCachedDemo } from "@/lib/runPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Freeze a specific run as public/demo/cached-run.json so /report/cached loads
// it deterministically during judging even if Jev/Claude are down.
export async function POST(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "run not found" }, { status: 404 });
  await saveAsCachedDemo(run);
  return NextResponse.json({ ok: true, cached: runId });
}
