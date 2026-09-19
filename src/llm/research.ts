import { anthropic, extractJson, MODELS } from "./anthropic";
import { validateCustomerModel } from "@/sim/validator";
import type { CustomerModel } from "@/sim/schema";
import { readCache, writeCache, type ResearchCacheKey } from "@/cache/research";

const SYSTEM_PROMPT = `You are a market-research analyst building a simulation-ready customer_model for a small, walk-in local business.

You will produce ONE JSON object that matches this schema exactly:

{
  "location": "<echo of the location given>",
  "segments": [
    {
      "id": "<snake_case short label, e.g. students | office_workers | locals | families | tourists | regulars>",
      "share": <number in [0,1]>,
      "fields": {
        "age_band":        { "dist": { "18-24": <p>, "25-44": <p>, "45-64": <p>, "65+": <p> }, "source": "<url|owner|estimate>", "confidence": "high|medium|low" },
        "budget_per_visit":{ "median": <n>, "min": <n>, "max": <n>, "source": "<url|owner|estimate>", "confidence": "high|medium|low" },
        "visit_purpose":   { "dist": { "grab_and_go": <p>, "study_or_work": <p>, "social": <p>, "treat": <p> }, "source": "<url|owner|estimate>", "confidence": "high|medium|low" },
        "price_sensitivity":{ "mean": <1..5>, "source": "<url|owner|estimate>", "confidence": "high|medium|low" },
        "visits_per_week": { "median": <n>, "min": <n>, "max": <n>, "source": "<url|owner|estimate>", "confidence": "high|medium|low" },
        "preferred_times": { "dist": { "morning": <p>, "midday": <p>, "afternoon": <p>, "evening": <p> }, "source": "<url|owner|estimate>", "confidence": "high|medium|low" }
      }
    }
  ]
}

Hard rules — enforced by the downstream validator:
- 3 to 5 segments. Their "share" values sum to 1.0 (±0.01).
- Every category "dist" sums to 1.0 (±0.01). Include all keys shown above (use 0 for absent categories).
- For "budget_per_visit" and "visits_per_week": min ≤ median ≤ max.
- Every field carries "source" AND "confidence". "source" is either a real URL you actually retrieved via web_search, or the literal string "owner" (only if the user gave that fact), or "estimate" (only if you have no supporting data).
- Never invent URLs. If web_search fails for a segment, mark that field's source "estimate" and confidence "low".
- Do not add fields, do not add commentary — return one JSON object only, in a \`\`\`json code block.

Research approach:
1. Use web_search to look up local census/demographic data (Statistics Canada, US Census ACS, etc.) for the given location/postal-area/ZIP.
2. Look up industry norms for this business type (visit frequency, typical spend, time-of-day patterns).
3. Look up nearby anchors (schools, offices, transit) if location context matters.
4. Combine into 3–5 believable customer segments with realistic distributions.
5. Return the JSON.`;

export interface ResearchInput {
  businessType: string;
  location: string;
  ownerNotes?: string;
  useCache?: boolean;
}

export interface ResearchResult {
  model: CustomerModel;
  cached: boolean;
  warnings: { path: string; message: string }[];
}

export async function research(input: ResearchInput): Promise<ResearchResult> {
  const key: ResearchCacheKey = {
    businessType: input.businessType,
    location: input.location,
    ownerNotes: input.ownerNotes,
  };
  if (input.useCache !== false) {
    const hit = await readCache(key);
    if (hit) {
      const v = validateCustomerModel(hit.model);
      if (v.ok) return { model: v.value, cached: true, warnings: v.warnings };
    }
  }

  const client = anthropic();
  const userMsg = [
    `Business type: ${input.businessType}`,
    `Location: ${input.location}`,
    input.ownerNotes ? `Owner notes: ${input.ownerNotes}` : "Owner notes: (none)",
    "",
    "Return the customer_model JSON now.",
  ].join("\n");

  const msg = await client.messages.create({
    model: MODELS.research,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        type: "web_search_20260318",
        name: "web_search",
        max_uses: 10,
      },
    ],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = msg.content
    .filter((b): b is { type: "text"; text: string } & typeof b => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const raw = extractJson<unknown>(text);
  const v = validateCustomerModel(raw);
  if (!v.ok) throw new Error(`research produced invalid customer_model: ${JSON.stringify(v.issues)}`);
  await writeCache(key, { model: v.value, created_at: new Date().toISOString() });
  return { model: v.value, cached: false, warnings: v.warnings };
}

// Fallback used when research fails or ANTHROPIC_API_KEY isn't set.
// Marks every field "estimate" / low so the report can flag it clearly.
export function fallbackCustomerModel(input: ResearchInput): CustomerModel {
  const cm: CustomerModel = {
    location: input.location,
    segments: [
      { id: "regulars", share: 0.5, fields: templateFields() },
      { id: "occasional", share: 0.35, fields: templateFields() },
      { id: "new_visitors", share: 0.15, fields: templateFields() },
    ],
  };
  return cm;
}

function templateFields() {
  return {
    age_band: {
      dist: { "18-24": 0.2, "25-44": 0.45, "45-64": 0.25, "65+": 0.1 },
      source: "estimate" as const,
      confidence: "low" as const,
    },
    budget_per_visit: { median: 8, min: 4, max: 18, source: "estimate", confidence: "low" as const },
    visit_purpose: {
      dist: { grab_and_go: 0.5, study_or_work: 0.2, social: 0.2, treat: 0.1 },
      source: "estimate",
      confidence: "low" as const,
    },
    price_sensitivity: { mean: 3.2, source: "estimate", confidence: "low" as const },
    visits_per_week: { median: 2, min: 0.5, max: 5, source: "estimate", confidence: "low" as const },
    preferred_times: {
      dist: { morning: 0.35, midday: 0.3, afternoon: 0.25, evening: 0.1 },
      source: "estimate",
      confidence: "low" as const,
    },
  };
}
