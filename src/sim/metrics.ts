import type { Event, MetricsSummary, SimSpec } from "./schema";
import { ticksPerDay } from "./state";

export function emptyMetrics(spec: SimSpec): MetricsSummary {
  return {
    revenue: 0,
    visits: 0,
    walkouts: 0,
    avg_wait_min: 0,
    avg_satisfaction: 0,
    rival_visits: 0,
    orders_by_item: {},
    revenue_by_segment: {},
    visits_by_day: new Array(spec.days).fill(0),
    revenue_by_day: new Array(spec.days).fill(0),
  };
}

export function summarize(spec: SimSpec, events: Event[]): MetricsSummary {
  const m = emptyMetrics(spec);
  const perDay = ticksPerDay(spec);
  const waits: number[] = [];
  const sats: number[] = [];
  const segmentBySegment = new Map<string, string>();
  for (const e of events) {
    if (e.kind === "spawn") segmentBySegment.set(e.agentId, e.segmentId);
  }
  for (const e of events) {
    const day = Math.min(spec.days - 1, Math.floor(e.tick / perDay));
    switch (e.kind) {
      case "arrive":
        if (e.place_id) {
          if (isOurPlace(spec, e.place_id)) {
            m.visits += 1;
            m.visits_by_day[day] += 1;
          } else if (isRival(spec, e.place_id)) {
            m.rival_visits += 1;
          }
        }
        break;
      case "order":
        if (e.item_id && typeof e.amount === "number" && e.amount > 0) {
          m.orders_by_item[e.item_id] = (m.orders_by_item[e.item_id] ?? 0) + 1;
          m.revenue += e.amount;
          m.revenue_by_day[day] += e.amount;
          const seg = segmentBySegment.get(e.agentId) ?? "unknown";
          m.revenue_by_segment[seg] = (m.revenue_by_segment[seg] ?? 0) + e.amount;
        }
        if (typeof e.wait_min === "number") waits.push(e.wait_min);
        break;
      case "walkout":
        m.walkouts += 1;
        if (typeof e.wait_min === "number") waits.push(e.wait_min);
        break;
      case "leave":
        if (typeof e.satisfaction === "number") sats.push(e.satisfaction);
        break;
    }
  }
  m.avg_wait_min = waits.length ? avg(waits) : 0;
  m.avg_satisfaction = sats.length ? avg(sats) : 0;
  return m;
}

function isOurPlace(spec: SimSpec, id: string): boolean {
  return spec.places.some((p) => p.id === id && p.kind === "our_business");
}

function isRival(spec: SimSpec, id: string): boolean {
  return spec.places.some((p) => p.id === id && p.kind === "competitor");
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function diff(baseline: MetricsSummary, whatIf: MetricsSummary): Record<string, number> {
  const out: Record<string, number> = {
    revenue: whatIf.revenue - baseline.revenue,
    visits: whatIf.visits - baseline.visits,
    walkouts: whatIf.walkouts - baseline.walkouts,
    avg_wait_min: whatIf.avg_wait_min - baseline.avg_wait_min,
    avg_satisfaction: whatIf.avg_satisfaction - baseline.avg_satisfaction,
    rival_visits: whatIf.rival_visits - baseline.rival_visits,
  };
  return out;
}
