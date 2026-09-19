import type { SimSpec } from "./schema";

export type AgentState = "home" | "traveling" | "at_place" | "in_queue" | "being_served" | "done" | "left";

export interface Agent {
  id: string;
  segmentId: string;
  fields: {
    age_band: string;
    budget_per_visit: number;
    visit_purpose: string;
    price_sensitivity: number;
    visits_per_week: number;
    preferred_times: string;
  };
  state: AgentState;
  destinationId?: string;
  arriveTick?: number;
  queueEnterTick?: number;
  serviceRemainingMin?: number;
  visitedTicks: number[];
  lastSatisfaction?: number;
  noticedAd: boolean;
  itemOrdered?: string;
}

export interface QueueEntry {
  agentId: string;
  itemId?: string;
  enterTick: number;
}

export interface PlaceRuntime {
  id: string;
  kind: string;
  queue: QueueEntry[];
  // per-server current job progress (minutes remaining); length = staff count
  serversRemaining: number[];
  // rival prices, if any
  prices?: Record<string, number>;
  visits: number;
  revenue: number;
}

export interface WorldState {
  spec: SimSpec;
  worldLabel: "baseline" | "what_if";
  seed: number;
  tick: number;
  minute: number;
  day: number;
  agents: Agent[];
  places: Record<string, PlaceRuntime>;
  activePromoToday: boolean;
}

export function totalTicks(spec: SimSpec): number {
  const openH = hourOfHHMM(spec.business.hours.open);
  const closeH = hourOfHHMM(spec.business.hours.close);
  const perDay = Math.max(0, Math.round(((closeH - openH) * 60) / spec.tick_minutes));
  return perDay * spec.days;
}

export function ticksPerDay(spec: SimSpec): number {
  const openH = hourOfHHMM(spec.business.hours.open);
  const closeH = hourOfHHMM(spec.business.hours.close);
  return Math.max(0, Math.round(((closeH - openH) * 60) / spec.tick_minutes));
}

export function hourOfHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h + (m || 0) / 60;
}

export function tickToClock(spec: SimSpec, tick: number): { day: number; hour: number; minute: number } {
  const perDay = ticksPerDay(spec);
  const day = Math.floor(tick / perDay);
  const tickOfDay = tick % perDay;
  const openH = hourOfHHMM(spec.business.hours.open);
  const totalMinFromOpen = tickOfDay * spec.tick_minutes;
  const hour = openH + totalMinFromOpen / 60;
  const minute = Math.floor(totalMinFromOpen % 60);
  return { day, hour, minute };
}

export function slotOfHour(hour: number): "morning" | "midday" | "afternoon" | "evening" {
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  return "evening";
}
