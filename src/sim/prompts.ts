import type { Agent, PlaceRuntime } from "./state";
import type { SimSpec } from "./schema";

export function buildStateString(
  spec: SimSpec,
  worldLabel: "baseline" | "what_if",
  tick: number,
  day: number,
  hour: number,
  places: Record<string, PlaceRuntime>,
): string {
  const clock = `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`;
  const ourPlace = spec.places.find((p) => p.kind === "our_business");
  const our = ourPlace ? places[ourPlace.id] : undefined;
  const rivals = spec.places.filter((p) => p.kind === "competitor");

  const pricesLine = spec.business.menu.map((m) => `${m.id}=$${m.price.toFixed(2)}`).join(", ");
  const rivalLines = rivals
    .map((r) => {
      const rp = places[r.id]?.prices ?? r.prices ?? {};
      const parts = Object.entries(rp)
        .map(([k, v]) => `${k}=$${v.toFixed(2)}`)
        .join(", ");
      return `${r.id}: ${parts || "n/a"}`;
    })
    .join("; ");

  const promo = spec.business.promo;
  const promoLine = promo ? `active promo: ${promo.description}` : "no promo";

  return [
    `world=${worldLabel}`,
    `day=${day + 1}/${spec.days} time=${clock}`,
    `our_business=${spec.business.name} (${spec.business.type}) hours=${spec.business.hours.open}-${spec.business.hours.close}`,
    `our_menu: ${pricesLine}`,
    `queue_len=${our?.queue.length ?? 0}, servers_busy=${our?.serversRemaining.filter((r) => r > 0).length ?? 0}/${our?.serversRemaining.length ?? 0}`,
    `rivals: ${rivalLines || "none"}`,
    promoLine,
    `change: ${spec.change.label}`,
  ].join(" | ");
}

export function buildAgentInstructions(
  agent: Agent,
  decision: "go_out" | "destination" | "order" | "wait_or_leave" | "satisfaction" | "notice_ad",
): string {
  const psLabel = ["insensitive", "casual", "average", "picky", "very price-sensitive"][
    Math.min(4, Math.max(0, Math.round(agent.fields.price_sensitivity) - 1))
  ];
  const base = `${agent.fields.age_band}, ${agent.fields.visit_purpose.replace(/_/g, " ")}, usually spends about $${Math.round(agent.fields.budget_per_visit)}, ${psLabel} (${agent.fields.price_sensitivity.toFixed(1)} of 5), prefers ${agent.fields.preferred_times}`;
  const recent = agent.lastSatisfaction ? `last visit satisfaction ${agent.lastSatisfaction}/5.` : "no recent visit.";
  const question = questionFor(decision);
  return `${base}. ${recent} ${question}`;
}

function questionFor(decision: string): string {
  switch (decision) {
    case "go_out":
      return "Right now, would this customer leave home/work to visit a cafe?";
    case "destination":
      return "Which place would this customer choose to visit?";
    case "order":
      return "Which item would this customer order at the counter?";
    case "wait_or_leave":
      return "The line is long. Would this customer stay in line or leave?";
    case "satisfaction":
      return "How satisfied is this customer with the visit (1 poor, 5 great)?";
    case "notice_ad":
      return "Would this customer notice the ad on their way past?";
    default:
      return "";
  }
}

export function destinationOptions(spec: SimSpec): string[] {
  const ours = spec.places.filter((p) => p.kind === "our_business").map((p) => p.id);
  const rivals = spec.places.filter((p) => p.kind === "competitor").map((p) => p.id);
  return [...ours, ...rivals, "somewhere_else"];
}

export function patienceForPurpose(purpose: string): number {
  switch (purpose) {
    case "grab_and_go":
      return 5;
    case "study_or_work":
      return 12;
    case "social":
      return 10;
    case "treat":
      return 8;
    default:
      return 8;
  }
}

export function hourToMinuteOfDay(hour: number): number {
  return Math.round(hour * 60);
}
