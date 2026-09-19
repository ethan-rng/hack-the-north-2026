import type { DecisionType, MetricKey } from "@/sim/schema";

export type TemplateId = "pricing" | "customer_reaction" | "operations" | "competition";

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
  example_questions: string[];
  // Prefix strings — a patch path counts as allowed if it startsWith any prefix.
  allowed_patch_prefixes: string[];
  required_decisions: DecisionType[];
  headline_metrics: MetricKey[];
}

import { pricingTemplate } from "./pricing";
import { customerReactionTemplate } from "./customerReaction";
import { operationsTemplate } from "./ops";
import { competitionTemplate } from "./competition";

export const TEMPLATES: Record<TemplateId, Template> = {
  pricing: pricingTemplate,
  customer_reaction: customerReactionTemplate,
  operations: operationsTemplate,
  competition: competitionTemplate,
};

export function templateForPatch(patches: { path: string }[]): TemplateId | null {
  const paths = patches.map((p) => p.path);
  for (const t of Object.values(TEMPLATES)) {
    if (paths.every((p) => t.allowed_patch_prefixes.some((pref) => p.startsWith(pref)))) return t.id;
  }
  return null;
}
