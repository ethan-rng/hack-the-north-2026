import { NextResponse } from "next/server";
import { fallbackCustomerModel, research, type ResearchInput } from "@/llm/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Research needs the web-search-driven Claude call — allow up to 60 s.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: Partial<ResearchInput> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.businessType || !body.location) {
    return NextResponse.json({ error: "businessType and location are required" }, { status: 400 });
  }
  const input: ResearchInput = {
    businessType: body.businessType,
    location: body.location,
    ownerNotes: body.ownerNotes,
    useCache: body.useCache !== false,
  };
  try {
    const result = await research(input);
    return NextResponse.json({
      customer_model: result.model,
      cached: result.cached,
      warnings: result.warnings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Fall back so the demo keeps working — flag the failure to the client.
    const fallback = fallbackCustomerModel(input);
    return NextResponse.json(
      {
        customer_model: fallback,
        cached: false,
        warnings: [],
        fallback: true,
        error: message,
      },
      { status: 200 },
    );
  }
}
