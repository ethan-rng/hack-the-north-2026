import type { Template } from "./index";

export const competitionTemplate: Template = {
  id: "competition",
  label: "Competition",
  description:
    "The change adds or modifies a rival business — a new rival on the map, or rival prices moving. Our business is unchanged.",
  example_questions: [
    "A chain café is opening across the street. What happens?",
    "What if my rival cuts prices by 20%?",
    "What if a new bakery opens next door?",
  ],
  allowed_patch_prefixes: ["places"],
  required_decisions: ["go_out", "destination", "order"],
  headline_metrics: ["visits", "revenue", "rival_visits", "revenue_by_segment"],
};
