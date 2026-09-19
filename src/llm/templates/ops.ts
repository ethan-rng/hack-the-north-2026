import type { Template } from "./index";

export const operationsTemplate: Template = {
  id: "operations",
  label: "Operations",
  description:
    "The change alters opening hours, staff count per shift, or per-item prep time. Prices and menu are unchanged.",
  example_questions: [
    "What if I open at 6:30 instead of 7:00?",
    "Do I need a second barista on Saturday mornings?",
    "What if I halve latte prep time by getting a better espresso machine?",
  ],
  allowed_patch_prefixes: ["business.hours", "business.staff", "business.menu."],
  required_decisions: ["go_out", "destination", "order", "wait_or_leave", "satisfaction"],
  headline_metrics: ["avg_wait_min", "walkouts", "revenue", "visits"],
};
