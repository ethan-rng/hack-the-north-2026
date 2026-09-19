import { NextResponse } from "next/server";
import { research, fallbackCustomerModel } from "@/llm/research";
import { plan, isClarify } from "@/llm/planner";
import { runSpec } from "@/sim/runSpec";
import { report, fallbackReport } from "@/llm/report";
import { getJevClient } from "@/jev";
import { newRunId, saveRun } from "@/lib/runs";
import { persistRun } from "@/lib/runPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

interface AskBody {
  question: string;
  businessDescription: string;
  location: string;
  businessType: string;
  ownerNotes?: string;
  seed?: number;
}

export async function POST(req: Request) {
  let body: Partial<AskBody> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const required: (keyof AskBody)[] = ["question", "businessDescription", "location", "businessType"];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 });
  }

  const seed = body.seed ?? 42;
  const startedAt = Date.now();

  // 1. Research (cached).
  const timings: Record<string, number> = {};
  let customerModel;
  let researchFallback = false;
  try {
    const r = await research({
      businessType: body.businessType!,
      location: body.location!,
      ownerNotes: body.ownerNotes,
      useCache: true,
    });
    customerModel = r.model;
  } catch (e) {
    researchFallback = true;
    customerModel = fallbackCustomerModel({
      businessType: body.businessType!,
      location: body.location!,
      ownerNotes: body.ownerNotes,
    });
  }
  timings.research_ms = Date.now() - startedAt;

  // 2. Plan.
  const t1 = Date.now();
  let planResult;
  try {
    planResult = await plan({
      question: body.question!,
      businessDescription: body.businessDescription!,
      location: body.location!,
      customer_model: customerModel,
      seed,
    });
  } catch (e) {
    return NextResponse.json({ error: `planner failed: ${(e as Error).message}` }, { status: 502 });
  }
  timings.plan_ms = Date.now() - t1;

  if (isClarify(planResult)) {
    return NextResponse.json({ clarify: planResult.clarify, customer_model: customerModel, researchFallback });
  }

  // 3. Run.
  const t2 = Date.now();
  const runId = newRunId();
  const jev = getJevClient();
  const result = await runSpec(planResult.spec, { seed, jev, runId });
  timings.run_ms = Date.now() - t2;

  // 4. Report.
  const t3 = Date.now();
  try {
    const r = await report({
      spec: result.spec,
      baseline: result.baseline.metrics,
      whatIf: result.what_if.metrics,
    });
    result.summary = r.summary;
  } catch {
    result.summary = fallbackReport({
      spec: result.spec,
      baseline: result.baseline.metrics,
      whatIf: result.what_if.metrics,
    }).summary;
  }
  timings.report_ms = Date.now() - t3;

  saveRun(result);
  persistRun(result).catch(() => {});
  return NextResponse.json({
    runId: result.runId,
    template: planResult.template,
    summary: result.summary,
    baseline_metrics: result.baseline.metrics,
    what_if_metrics: result.what_if.metrics,
    researchFallback,
    warnings: planResult.warnings,
    timings,
  });
}
