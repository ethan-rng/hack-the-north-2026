import { NextResponse } from "next/server";
import { getPreset } from "@/presets";
import { getJevClient } from "@/jev";
import { runSpec } from "@/sim/runSpec";
import { newRunId, saveRun } from "@/lib/runs";
import { validateSimSpec } from "@/sim/validator";
import type { SimSpec } from "@/sim/schema";
import { report, fallbackReport } from "@/llm/report";

function hintFromError(msg: string): string | undefined {
  if (/Insufficient AI Gateway credits/i.test(msg))
    return "Your Cloudflare Workers AI account is out of credits for typesafe/jev. Add billing on the CF dashboard, or set USE_MOCK_JEV=true in .env.local to continue with the mock.";
  if (/ANTHROPIC_API_KEY/i.test(msg))
    return "Set ANTHROPIC_API_KEY in .env.local.";
  if (/worker jev 502/i.test(msg))
    return "The Cloudflare Worker returned an error. Check `npm run worker:tail` for details.";
  return undefined;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    if (req.headers.get("content-length") !== "0") body = await req.json();
  } catch {
    body = null;
  }
  const b = (body ?? {}) as { spec?: SimSpec; preset?: string; seed?: number; generateSummary?: boolean };
  const specInput: SimSpec | undefined = b.spec ?? getPreset(b.preset ?? "cafe");
  if (!specInput) return NextResponse.json({ error: `unknown preset '${b.preset}'` }, { status: 400 });
  const validation = validateSimSpec(specInput);
  if (!validation.ok) {
    return NextResponse.json({ error: "invalid spec", issues: validation.issues }, { status: 400 });
  }
  const seed = b.seed ?? specInput.seed ?? 42;
  const generateSummary = b.generateSummary !== false;
  const runId = newRunId();
  const jev = getJevClient();
  let result;
  try {
    result = await runSpec(validation.value, { seed, jev, runId });
  } catch (e) {
    return NextResponse.json(
      {
        error: "sim run failed",
        detail: (e as Error).message,
        hint: hintFromError((e as Error).message),
      },
      { status: 502 },
    );
  }
  if (generateSummary) {
    try {
      const r = await report({ spec: result.spec, baseline: result.baseline.metrics, whatIf: result.what_if.metrics });
      result.summary = r.summary;
    } catch {
      result.summary = fallbackReport({
        spec: result.spec,
        baseline: result.baseline.metrics,
        whatIf: result.what_if.metrics,
      }).summary;
    }
  }
  saveRun(result);
  return NextResponse.json({
    runId: result.runId,
    seed: result.seed,
    baseline: { metrics: result.baseline.metrics, event_count: result.baseline.events.length },
    what_if: { metrics: result.what_if.metrics, event_count: result.what_if.events.length },
    summary: result.summary,
    warnings: validation.warnings,
  });
}
