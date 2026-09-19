import { NextResponse } from "next/server";
import { getPreset } from "@/presets";
import { getJevClient } from "@/jev";
import { runSpec } from "@/sim/runSpec";
import { newRunId, saveRun } from "@/lib/runs";
import { validateSimSpec } from "@/sim/validator";
import type { SimSpec } from "@/sim/schema";
import { report, fallbackReport } from "@/llm/report";
import { persistRun } from "@/lib/runPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    if (req.headers.get("content-length") !== "0") body = await req.json();
  } catch {
    body = null;
  }
  const b = (body ?? {}) as { spec?: SimSpec; preset?: string };
  const specInput: SimSpec | undefined = b.spec ?? getPreset(b.preset ?? "cafe");
  if (!specInput) return NextResponse.json({ error: `unknown preset '${b.preset}'` }, { status: 400 });
  const validation = validateSimSpec(specInput);
  if (!validation.ok) {
    return NextResponse.json({ error: "invalid spec", issues: validation.issues }, { status: 400 });
  }
  const seed = (body as { seed?: number } | null)?.seed ?? specInput.seed ?? 42;
  const runId = newRunId();
  const jev = getJevClient();
  const result = await runSpec(validation.value, { seed, jev, runId });
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
  saveRun(result);
  // Fire-and-forget persistence so the report survives dev restarts and can be
  // opened via a shareable link.
  persistRun(result).catch(() => {});
  return NextResponse.json({
    runId: result.runId,
    seed: result.seed,
    baseline: { metrics: result.baseline.metrics, event_count: result.baseline.events.length },
    what_if: { metrics: result.what_if.metrics, event_count: result.what_if.events.length },
    summary: result.summary,
    warnings: validation.warnings,
  });
}
