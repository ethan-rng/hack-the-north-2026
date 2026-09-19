import { NextResponse } from "next/server";
import { getRun } from "@/lib/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const result = await getRun(runId);
  if (!result) return NextResponse.json({ error: "run not found" }, { status: 404 });
  return NextResponse.json(result);
}
