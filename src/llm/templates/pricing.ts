import type { Template } from "./index";

export const pricingTemplate: Template = {
  id: "pricing",
  label: "Pricing and demand",
  description:
    "The change alters menu prices or adds a promo rule. Everything else stays the same as the baseline business.",
  example_questions: [
    "Should I raise my latte from $5.00 to $5.50?",
    "What if I run a 2-for-1 on Tuesdays?",
    "What happens if I cut all pastry prices by 10%?",
  ],
  allowed_patch_prefixes: ["business.menu.", "business.promo"],
  required_decisions: ["go_out", "destination", "order", "wait_or_leave"],
  headline_metrics: ["revenue", "orders_by_item", "visits", "rival_visits"],
};
