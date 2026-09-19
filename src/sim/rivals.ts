import type { PlaceRuntime } from "./state";
import type { SimSpec } from "./schema";

// Fixed rival rules for the demo. Stretch: swap this for one Jev choice per day.
export function initRivalPrices(spec: SimSpec, place: PlaceRuntime): Record<string, number> {
  const prices = { ...(place.prices ?? {}) };
  for (const item of spec.business.menu) {
    if (!(item.id in prices)) prices[item.id] = Math.round(item.price * 0.95 * 100) / 100;
  }
  return prices;
}
