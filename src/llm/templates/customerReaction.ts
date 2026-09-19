import type { Template } from "./index";

export const customerReactionTemplate: Template = {
  id: "customer_reaction",
  label: "Customer reaction",
  description:
    "The change introduces a new menu item, or an ad placed on the map. Existing menu/prices/hours are unchanged.",
  example_questions: [
    "Will people buy a $9 matcha bowl?",
    "Does a student discount sign bring in more students?",
    "What if we add a $6 breakfast wrap?",
  ],
  allowed_patch_prefixes: ["business.menu", "business.promo"],
  required_decisions: ["go_out", "destination", "order", "satisfaction", "notice_ad"],
  headline_metrics: ["orders_by_item", "visits", "avg_satisfaction", "revenue_by_segment"],
};
