import { NextResponse } from "next/server";
import { plan, isClarify, type PlanInput } from "@/llm/planner";
import { validateCustomerModel } from "@/sim/validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: Partial<PlanInput> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.question || !body.businessDescription || !body.location || !body.customer_model) {
    return NextResponse.json(
      { error: "question, businessDescription, location, customer_model are required" },
      { status: 400 },
    );
  }
  const cmCheck = validateCustomerModel(body.customer_model);
  if (!cmCheck.ok) {
    return NextResponse.json({ error: "invalid customer_model", issues: cmCheck.issues }, { status: 400 });
  }
  try {
    const result = await plan({
      question: body.question,
      businessDescription: body.businessDescription,
      location: body.location,
      customer_model: cmCheck.value,
      seed: body.seed,
    });
    if (isClarify(result)) return NextResponse.json({ clarify: result.clarify });
    return NextResponse.json({
      spec: result.spec,
      template: result.template,
      warnings: result.warnings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
