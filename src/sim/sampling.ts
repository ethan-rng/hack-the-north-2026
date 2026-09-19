import type { CustomerModel, Segment, SegmentFields, SimSpec } from "./schema";
import type { Agent } from "./state";
import { mulberry32, pickByProbabilities, sampleRange } from "@/lib/rng";
import type { Rng } from "@/lib/rng";

export function sampleAgents(spec: SimSpec, seed: number): Agent[] {
  const rng = mulberry32(seed);
  const agents: Agent[] = [];
  for (let i = 0; i < spec.population; i++) {
    const seg = pickSegment(rng, spec.customer_model);
    const fields = sampleSegmentFields(rng, seg.fields);
    agents.push({
      id: `a${i}`,
      segmentId: seg.id,
      fields,
      state: "home",
      visitedTicks: [],
      noticedAd: false,
    });
  }
  return agents;
}

function pickSegment(rng: Rng, cm: CustomerModel): Segment {
  const entries = cm.segments.map((s) => [s, s.share] as const);
  return pickByProbabilities(rng, entries);
}

function sampleSegmentFields(rng: Rng, fields: SegmentFields): Agent["fields"] {
  return {
    age_band: pickFromCategoryDist(rng, fields.age_band.dist),
    budget_per_visit: sampleRange(
      rng,
      fields.budget_per_visit.min,
      fields.budget_per_visit.median,
      fields.budget_per_visit.max,
    ),
    visit_purpose: pickFromCategoryDist(rng, fields.visit_purpose.dist),
    price_sensitivity: fields.price_sensitivity.mean + (rng() - 0.5) * 0.6,
    visits_per_week: sampleRange(
      rng,
      fields.visits_per_week.min,
      fields.visits_per_week.median,
      fields.visits_per_week.max,
    ),
    preferred_times: pickFromCategoryDist(rng, fields.preferred_times.dist),
  };
}

function pickFromCategoryDist(rng: Rng, dist: Record<string, number>): string {
  const entries = Object.entries(dist) as [string, number][];
  return pickByProbabilities(rng, entries);
}

export function affordableItems(
  spec: SimSpec,
  agent: Agent,
  effectivePrices: Record<string, number>,
): { id: string; price: number }[] {
  const budget = agent.fields.budget_per_visit;
  return spec.business.menu
    .map((m) => ({ id: m.id, price: effectivePrices[m.id] ?? m.price }))
    .filter((m) => m.price <= budget * 1.3);
}
