import { anthropic, MODELS } from "./anthropic";
import type { MetricsSummary, SimSpec } from "@/sim/schema";
import { diff } from "@/sim/metrics";

const SYSTEM_PROMPT = `You write a 4-6 sentence summary of a small-business simulation result.

You are given:
- The change tested (label)
- Computed baseline metrics
- Computed what-if metrics
- Their differences

STRICT RULES
- Use ONLY the numbers you are given. Never invent, average, or round beyond one decimal.
- Do not hedge with "about" or "roughly".
- Do not use confidence language ("likely", "probably"). The result is a simulation.
- Start with a one-line verdict of what happened.
- Follow with 3-5 short sentences: the two biggest metric moves, a possible cause, a segment-level note if segment_breakdown is provided.
- End without a call to action. Do not include headers or bullets. Return plain prose.`;

export interface ReportInput {
  spec: SimSpec;
  baseline: MetricsSummary;
  whatIf: MetricsSummary;
}

export interface ReportOutput {
  summary: string;
}

export async function report(input: ReportInput): Promise<ReportOutput> {
  const client = anthropic();
  const d = diff(input.baseline, input.whatIf);
  const segments = Object.keys(input.baseline.revenue_by_segment);
  const segBreakdown = segments.map((s) => ({
    segment: s,
    baseline_revenue: round2(input.baseline.revenue_by_segment[s] ?? 0),
    what_if_revenue: round2(input.whatIf.revenue_by_segment[s] ?? 0),
    delta: round2((input.whatIf.revenue_by_segment[s] ?? 0) - (input.baseline.revenue_by_segment[s] ?? 0)),
  }));
  const orderMoves = Object.keys({ ...input.baseline.orders_by_item, ...input.whatIf.orders_by_item }).map((id) => ({
    item: id,
    baseline_orders: input.baseline.orders_by_item[id] ?? 0,
    what_if_orders: input.whatIf.orders_by_item[id] ?? 0,
    delta: (input.whatIf.orders_by_item[id] ?? 0) - (input.baseline.orders_by_item[id] ?? 0),
  }));
  const payload = {
    change: input.spec.change.label,
    baseline: {
      revenue: round2(input.baseline.revenue),
      visits: input.baseline.visits,
      walkouts: input.baseline.walkouts,
      avg_wait_min: round2(input.baseline.avg_wait_min, 1),
      avg_satisfaction: round2(input.baseline.avg_satisfaction, 1),
      rival_visits: input.baseline.rival_visits,
    },
    what_if: {
      revenue: round2(input.whatIf.revenue),
      visits: input.whatIf.visits,
      walkouts: input.whatIf.walkouts,
      avg_wait_min: round2(input.whatIf.avg_wait_min, 1),
      avg_satisfaction: round2(input.whatIf.avg_satisfaction, 1),
      rival_visits: input.whatIf.rival_visits,
    },
    diff: {
      revenue: round2(d.revenue),
      visits: d.visits,
      walkouts: d.walkouts,
      avg_wait_min: round2(d.avg_wait_min, 1),
      avg_satisfaction: round2(d.avg_satisfaction, 1),
      rival_visits: d.rival_visits,
    },
    order_moves: orderMoves,
    segment_breakdown: segBreakdown,
  };

  const userMsg = [
    "Simulation numbers below. Write 4-6 sentences summarizing what happened. Numbers only from this JSON.",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");

  const msg = await client.messages.create({
    model: MODELS.report,
    max_tokens: 600,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = msg.content
    .filter((b): b is { type: "text"; text: string } & typeof b => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { summary: text };
}

// Fallback used when Claude is unavailable — clean, source-of-truth prose
// with no invented numbers.
export function fallbackReport(input: ReportInput): ReportOutput {
  const d = diff(input.baseline, input.whatIf);
  const sign = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "unchanged");
  const lines = [
    `${input.spec.change.label}: revenue went ${sign(d.revenue)} by $${Math.abs(d.revenue).toFixed(2)} over ${input.spec.days} days.`,
    `Visits ${d.visits >= 0 ? "rose" : "fell"} by ${Math.abs(d.visits)} and walkouts ${d.walkouts >= 0 ? "rose" : "fell"} by ${Math.abs(d.walkouts)}.`,
    `Average wait moved from ${input.baseline.avg_wait_min.toFixed(1)} to ${input.whatIf.avg_wait_min.toFixed(1)} minutes.`,
    `Satisfaction moved from ${input.baseline.avg_satisfaction.toFixed(1)} to ${input.whatIf.avg_satisfaction.toFixed(1)} out of 5.`,
    `Rival visits ${d.rival_visits >= 0 ? "rose" : "fell"} by ${Math.abs(d.rival_visits)}.`,
  ];
  return { summary: lines.join(" ") };
}

function round2(n: number, digits = 2): number {
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}
