import { anthropic, extractJson, MODELS } from "./anthropic";
import { validateSimSpec } from "@/sim/validator";
import type { CustomerModel, SimSpec } from "@/sim/schema";
import { TEMPLATES, type TemplateId } from "./templates";

const SYSTEM_PROMPT = buildSystemPrompt();

function buildSystemPrompt(): string {
  const templates = Object.values(TEMPLATES)
    .map(
      (t) =>
        `- ${t.id} (${t.label}) — ${t.description}\n  patch may only touch paths starting with: ${t.allowed_patch_prefixes.join(", ")}\n  required decisions: ${t.required_decisions.join(", ")}\n  headline metrics: ${t.headline_metrics.join(", ")}\n  examples: ${t.example_questions.map((q) => `"${q}"`).join(" · ")}`,
    )
    .join("\n\n");
  return `You are the planner for a small-business simulation ("What If Town"). You turn a business description, a customer_model, and one plain-English question into ONE JSON object matching the SimSpec schema below.

TEMPLATES — classify the question into exactly one. If the question fits none well, do NOT guess; respond with { "clarify": "one short question you would ask the owner" } and STOP.

${templates}

SimSpec schema (return exactly this shape, no extra fields):

{
  "business": {
    "name": "<short label>",
    "type": "<cafe|barbershop|taco_shop|bakery|restaurant|bike_shop>",
    "location": "<echo of location>",
    "hours": { "open": "HH:MM", "close": "HH:MM" },
    "menu": [ { "id": "<snake_case>", "name": "<display>", "price": <number>, "prep_min": <number> } ],
    "staff": [ { "role": "<label>", "count": <int> } ],
    "promo": { "description": "<optional>" }
  },
  "places": [ { "id": "<snake_case>", "kind": "residential|school|office|gym|transit|competitor|our_business", "menu_ref"?: "<id>", "prices"?: { "<menu_id>": <number> } } ],
  "customer_model": <exact copy of the customer_model provided — do not modify>,
  "population": <int, ≤ 100>,
  "days": <int, ≤ 5>,
  "tick_minutes": <int, 5..60>,
  "change": {
    "label": "<one-line human summary of the change>",
    "patch": [ { "path": "<dot.path>", "value": <any> } ]
  },
  "decisions": [ ... ],
  "metrics": [ ... ],
  "seed": <int>,
  "template": "<templateId — echo which template you used>"
}

HARD RULES
- Return one JSON object in a \`\`\`json code block. No prose, no commentary.
- Do not modify customer_model. Copy it verbatim from the user message.
- Every "change.patch" entry's "path" MUST start with one of the chosen template's allowed_patch_prefixes.
- "decisions" MUST be a superset of the template's required_decisions.
- "metrics" MUST include every one of the template's headline_metrics.
- Exactly one place must have kind "our_business".
- The baseline must reflect the business AS DESCRIBED — the change is only applied via the patch. Never write the "what if" version into the baseline.
- Population: default 60, cap at 100.
- Days: default 3, cap at 5.
- tick_minutes: default 15.
- Menu ids and place ids: snake_case, unique.
- If pricing template: menu must include the item whose price is being changed, with the ORIGINAL price. The patch then updates that item.
- Never invent customer segments. Never invent field distributions.
- Never say "about" or add commentary — return JSON only.`;
}

export interface PlanInput {
  question: string;
  businessDescription: string;
  location: string;
  customer_model: CustomerModel;
  seed?: number;
}

export interface PlanClarify {
  clarify: string;
}

export interface PlanOk {
  spec: SimSpec;
  template: TemplateId;
  warnings: { path: string; message: string }[];
}

export type PlanResult = PlanClarify | PlanOk;

export function isClarify(r: PlanResult): r is PlanClarify {
  return (r as PlanClarify).clarify !== undefined;
}

export async function plan(input: PlanInput): Promise<PlanResult> {
  const client = anthropic();
  const userMsg = [
    `Business description: ${input.businessDescription}`,
    `Location: ${input.location}`,
    `Question: ${input.question}`,
    "",
    "Customer model (copy VERBATIM into the spec — do not modify):",
    "```json",
    JSON.stringify(input.customer_model, null, 2),
    "```",
    "",
    "Return the SimSpec JSON now.",
  ].join("\n");

  const msg = await client.messages.create({
    model: MODELS.planner,
    max_tokens: 6000,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = msg.content
    .filter((b): b is { type: "text"; text: string } & typeof b => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const raw = extractJson<Record<string, unknown>>(text);
  if (typeof raw.clarify === "string" && raw.clarify.length > 0) {
    return { clarify: raw.clarify };
  }

  // Ensure customer_model was not silently modified by the planner.
  const specInput: Record<string, unknown> = { ...raw, customer_model: input.customer_model };
  if (input.seed !== undefined) specInput.seed = input.seed;

  const v = validateSimSpec(specInput);
  if (!v.ok) {
    throw new Error(`planner produced invalid spec: ${JSON.stringify(v.issues)}`);
  }

  const template = (raw.template as TemplateId) ?? "pricing";
  const t = TEMPLATES[template];
  const warnings = [...v.warnings];
  if (t) {
    for (const p of v.value.change.patch) {
      if (!t.allowed_patch_prefixes.some((pref) => p.path.startsWith(pref))) {
        warnings.push({
          path: `change.patch`,
          message: `path "${p.path}" is outside template ${template}'s allowed prefixes`,
        });
      }
    }
    for (const d of t.required_decisions) {
      if (!v.value.decisions.includes(d)) {
        warnings.push({ path: "decisions", message: `template ${template} requires "${d}"` });
      }
    }
    for (const m of t.headline_metrics) {
      if (!v.value.metrics.includes(m)) {
        warnings.push({ path: "metrics", message: `template ${template} requires "${m}"` });
      }
    }
  }

  return { spec: v.value, template, warnings };
}
