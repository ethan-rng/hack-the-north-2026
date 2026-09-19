import type { JevClient, JevQuestion } from "@/jev/client";
import { batchAsk } from "./batcher";
import { hashSeed, mulberry32, pickByProbabilities } from "@/lib/rng";
import { affordableItems, sampleAgents } from "./sampling";
import type { Event, SimSpec } from "./schema";
import type { Agent, PlaceRuntime, WorldState } from "./state";
import { hourOfHHMM, slotOfHour, tickToClock, ticksPerDay, totalTicks } from "./state";
import {
  buildAgentInstructions,
  buildStateString,
  destinationOptions,
  hourToMinuteOfDay,
  patienceForPurpose,
} from "./prompts";
import { initRivalPrices } from "./rivals";

export interface RunWorldResult {
  events: Event[];
  finalState: WorldState;
}

export async function runWorld(
  spec: SimSpec,
  seed: number,
  worldLabel: "baseline" | "what_if",
  jev: JevClient,
): Promise<RunWorldResult> {
  const agents = sampleAgents(spec, seed);
  const places: Record<string, PlaceRuntime> = {};
  const staffCount = spec.business.staff.reduce((s, r) => s + r.count, 0);
  for (const p of spec.places) {
    const runtime: PlaceRuntime = {
      id: p.id,
      kind: p.kind,
      queue: [],
      serversRemaining: p.kind === "our_business" ? new Array(Math.max(1, staffCount)).fill(0) : [],
      visits: 0,
      revenue: 0,
    };
    if (p.kind === "competitor") runtime.prices = initRivalPrices(spec, { ...runtime, prices: p.prices });
    places[p.id] = runtime;
  }

  const events: Event[] = [];
  const total = totalTicks(spec);
  const openHour = hourOfHHMM(spec.business.hours.open);

  // Spawn events so downstream tools know each agent's segment.
  for (const a of agents) {
    events.push({
      tick: 0,
      minute: hourToMinuteOfDay(openHour),
      day: 0,
      agentId: a.id,
      segmentId: a.segmentId,
      kind: "spawn",
    });
  }

  for (let tick = 0; tick < total; tick++) {
    const { day, hour } = tickToClock(spec, tick);
    const minute = hourToMinuteOfDay(hour);
    const slot = slotOfHour(hour);
    const state = buildStateString(spec, worldLabel, tick, day, hour, places);

    await goOutPhase(spec, agents, tick, day, minute, slot, state, jev, events);
    await destinationPhase(spec, agents, tick, day, minute, state, jev, events);
    arrivalsPhase(agents, places, tick, day, minute, events);
    await waitOrLeavePhase(spec, agents, places, tick, day, minute, state, jev, events);
    await orderPhase(spec, agents, places, tick, day, minute, state, jev, events);
    advanceServersPhase(spec, agents, places);
    await satisfactionPhase(spec, agents, tick, day, minute, state, jev, events);
  }

  return {
    events,
    finalState: {
      spec,
      worldLabel,
      seed,
      tick: total,
      minute: 0,
      day: spec.days,
      agents,
      places,
      activePromoToday: false,
    },
  };
}

function sampleOption(
  probabilities: Record<string, number>,
  tick: number,
  agentId: string,
  key: string,
): string {
  const rng = mulberry32(hashSeed(`${tick}|${agentId}|${key}`));
  const entries = Object.entries(probabilities) as [string, number][];
  return pickByProbabilities(rng, entries);
}

function eligibleGoOut(a: Agent, slot: string, tick: number, spec: SimSpec): boolean {
  if (a.state !== "home") return false;
  if (a.fields.preferred_times !== slot) return false;
  const perDay = ticksPerDay(spec);
  const weekWindow = 7 * perDay;
  const visitsThisWeek = a.visitedTicks.filter((t) => t >= tick - weekWindow).length;
  if (visitsThisWeek >= Math.max(1, Math.ceil(a.fields.visits_per_week))) return false;
  return true;
}

async function goOutPhase(
  spec: SimSpec,
  agents: Agent[],
  tick: number,
  day: number,
  minute: number,
  slot: string,
  state: string,
  jev: JevClient,
  events: Event[],
): Promise<void> {
  if (!spec.decisions.includes("go_out")) return;
  const qs: JevQuestion[] = [];
  const eligible: Agent[] = [];
  for (const a of agents) {
    if (!eligibleGoOut(a, slot, tick, spec)) continue;
    qs.push({ agentId: a.id, type: "noul", instructions: buildAgentInstructions(a, "go_out") });
    eligible.push(a);
  }
  if (qs.length === 0) return;
  const answers = await batchAsk(jev, state, qs);
  for (const a of eligible) {
    const ans = answers.get(a.id);
    if (!ans) continue;
    const chosen = sampleOption(ans.probabilities, tick, a.id, "go_out");
    events.push({
      tick,
      minute,
      day,
      agentId: a.id,
      segmentId: a.segmentId,
      kind: "go_out",
      probs: ans.probabilities,
      chosen,
    });
    if (chosen === "yes") a.state = "traveling";
  }
}

async function destinationPhase(
  spec: SimSpec,
  agents: Agent[],
  tick: number,
  day: number,
  minute: number,
  state: string,
  jev: JevClient,
  events: Event[],
): Promise<void> {
  if (!spec.decisions.includes("destination")) return;
  const options = destinationOptions(spec).slice(0, 20);
  const qs: JevQuestion[] = [];
  const eligible: Agent[] = [];
  for (const a of agents) {
    if (a.state === "traveling" && !a.destinationId) {
      qs.push({
        agentId: a.id,
        type: "choice",
        options,
        instructions: buildAgentInstructions(a, "destination"),
      });
      eligible.push(a);
    }
  }
  if (qs.length === 0) return;
  const answers = await batchAsk(jev, state, qs);
  for (const a of eligible) {
    const ans = answers.get(a.id);
    if (!ans) {
      a.state = "home";
      continue;
    }
    const chosen = sampleOption(ans.probabilities, tick, a.id, "destination");
    events.push({
      tick,
      minute,
      day,
      agentId: a.id,
      segmentId: a.segmentId,
      kind: "arrive",
      probs: ans.probabilities,
      chosen,
    });
    if (chosen === "somewhere_else") {
      a.state = "home";
    } else {
      a.destinationId = chosen;
      a.arriveTick = tick + 1;
    }
  }
}

function arrivalsPhase(
  agents: Agent[],
  places: Record<string, PlaceRuntime>,
  tick: number,
  day: number,
  minute: number,
  events: Event[],
): void {
  for (const a of agents) {
    if (a.state !== "traveling" || !a.destinationId || a.arriveTick !== tick) continue;
    const place = places[a.destinationId];
    if (!place) {
      a.state = "home";
      a.destinationId = undefined;
      continue;
    }
    events.push({
      tick,
      minute,
      day,
      agentId: a.id,
      segmentId: a.segmentId,
      kind: "arrive",
      place_id: place.id,
    });
    if (place.kind === "our_business") {
      a.state = "in_queue";
      a.queueEnterTick = tick;
      place.queue.push({ agentId: a.id, enterTick: tick });
    } else if (place.kind === "competitor") {
      place.visits += 1;
      a.visitedTicks.push(tick);
      a.state = "home";
      a.destinationId = undefined;
    } else {
      a.state = "home";
      a.destinationId = undefined;
    }
  }
}

async function waitOrLeavePhase(
  spec: SimSpec,
  agents: Agent[],
  places: Record<string, PlaceRuntime>,
  tick: number,
  day: number,
  minute: number,
  state: string,
  jev: JevClient,
  events: Event[],
): Promise<void> {
  if (!spec.decisions.includes("wait_or_leave")) return;
  const qs: JevQuestion[] = [];
  const eligible: Agent[] = [];
  for (const a of agents) {
    if (a.state !== "in_queue" || a.queueEnterTick === undefined) continue;
    const waited = (tick - a.queueEnterTick) * spec.tick_minutes;
    if (waited < patienceForPurpose(a.fields.visit_purpose) / 2) continue;
    qs.push({
      agentId: a.id,
      type: "noul",
      instructions: buildAgentInstructions(a, "wait_or_leave"),
    });
    eligible.push(a);
  }
  if (qs.length === 0) return;
  const answers = await batchAsk(jev, state, qs);
  for (const a of eligible) {
    const ans = answers.get(a.id);
    if (!ans) continue;
    // "yes" = stay, "no" = leave
    const chosen = sampleOption(ans.probabilities, tick, a.id, "wait_or_leave");
    const waited = (tick - (a.queueEnterTick ?? tick)) * spec.tick_minutes;
    if (chosen === "no") {
      const place = a.destinationId ? places[a.destinationId] : undefined;
      if (place) place.queue = place.queue.filter((q) => q.agentId !== a.id);
      events.push({
        tick,
        minute,
        day,
        agentId: a.id,
        segmentId: a.segmentId,
        kind: "walkout",
        probs: ans.probabilities,
        chosen,
        wait_min: waited,
      });
      a.state = "home";
      a.destinationId = undefined;
      a.queueEnterTick = undefined;
    } else {
      events.push({
        tick,
        minute,
        day,
        agentId: a.id,
        segmentId: a.segmentId,
        kind: "queue",
        probs: ans.probabilities,
        chosen,
        wait_min: waited,
      });
    }
  }
}

async function orderPhase(
  spec: SimSpec,
  agents: Agent[],
  places: Record<string, PlaceRuntime>,
  tick: number,
  day: number,
  minute: number,
  state: string,
  jev: JevClient,
  events: Event[],
): Promise<void> {
  const ourPlace = spec.places.find((p) => p.kind === "our_business");
  if (!ourPlace) return;
  const our = places[ourPlace.id];
  const effectivePrices: Record<string, number> = {};
  for (const m of spec.business.menu) effectivePrices[m.id] = m.price;

  const qs: JevQuestion[] = [];
  const eligible: Agent[] = [];
  const claimedServer = new Set<number>();

  for (let s = 0; s < our.serversRemaining.length; s++) {
    if (our.serversRemaining[s] > 0) continue;
    const next = our.queue.shift();
    if (!next) break;
    const agent = agents.find((a) => a.id === next.agentId);
    if (!agent) continue;
    agent.state = "being_served";
    agent.serviceRemainingMin = 0;
    const opts = affordableItems(spec, agent, effectivePrices)
      .map((x) => x.id)
      .concat(["nothing"])
      .slice(0, 20);
    qs.push({
      agentId: agent.id,
      type: "choice",
      options: opts,
      instructions: buildAgentInstructions(agent, "order"),
    });
    eligible.push(agent);
    claimedServer.add(s);
  }
  if (qs.length === 0) return;
  const answers = await batchAsk(jev, state, qs);
  for (const a of eligible) {
    const ans = answers.get(a.id);
    if (!ans) continue;
    const chosen = sampleOption(ans.probabilities, tick, a.id, "order");
    const waited = (tick - (a.queueEnterTick ?? tick)) * spec.tick_minutes;
    if (chosen === "nothing") {
      events.push({
        tick,
        minute,
        day,
        agentId: a.id,
        segmentId: a.segmentId,
        kind: "walkout",
        probs: ans.probabilities,
        chosen,
        wait_min: waited,
      });
      a.state = "home";
      a.destinationId = undefined;
      a.queueEnterTick = undefined;
      continue;
    }
    const item = spec.business.menu.find((m) => m.id === chosen);
    const price = item?.price ?? 0;
    a.itemOrdered = chosen;
    events.push({
      tick,
      minute,
      day,
      agentId: a.id,
      segmentId: a.segmentId,
      kind: "order",
      probs: ans.probabilities,
      chosen,
      amount: price,
      item_id: chosen,
      wait_min: waited,
      place_id: ourPlace.id,
    });
    our.revenue += price;
    our.visits += 1;
    a.serviceRemainingMin = Math.max(1, item?.prep_min ?? 3);
    const freeIdx = our.serversRemaining.findIndex((r) => r <= 0);
    if (freeIdx >= 0) our.serversRemaining[freeIdx] = a.serviceRemainingMin;
  }
}

function advanceServersPhase(
  spec: SimSpec,
  agents: Agent[],
  places: Record<string, PlaceRuntime>,
): void {
  const ourPlace = spec.places.find((p) => p.kind === "our_business");
  if (!ourPlace) return;
  const our = places[ourPlace.id];
  for (let s = 0; s < our.serversRemaining.length; s++) {
    if (our.serversRemaining[s] > 0) {
      our.serversRemaining[s] = Math.max(0, our.serversRemaining[s] - spec.tick_minutes);
    }
  }
  for (const a of agents) {
    if (a.state !== "being_served") continue;
    a.serviceRemainingMin = Math.max(0, (a.serviceRemainingMin ?? 0) - spec.tick_minutes);
    if (a.serviceRemainingMin <= 0) a.state = "done";
  }
}

async function satisfactionPhase(
  spec: SimSpec,
  agents: Agent[],
  tick: number,
  day: number,
  minute: number,
  state: string,
  jev: JevClient,
  events: Event[],
): Promise<void> {
  const qs: JevQuestion[] = [];
  const eligible: Agent[] = [];
  for (const a of agents) {
    if (a.state === "done") {
      qs.push({ agentId: a.id, type: "score", instructions: buildAgentInstructions(a, "satisfaction") });
      eligible.push(a);
    }
  }
  if (qs.length === 0) return;
  const includeSat = spec.decisions.includes("satisfaction");
  const answers = includeSat ? await batchAsk(jev, state, qs) : new Map();
  for (const a of eligible) {
    const ans = answers.get(a.id);
    let sat = 3;
    let probs: Record<string, number> | undefined;
    let chosen: string | undefined;
    if (ans) {
      chosen = sampleOption(ans.probabilities, tick, a.id, "satisfaction");
      sat = Number(chosen) || 3;
      probs = ans.probabilities;
    }
    a.lastSatisfaction = sat;
    events.push({
      tick,
      minute,
      day,
      agentId: a.id,
      segmentId: a.segmentId,
      kind: "leave",
      probs,
      chosen,
      satisfaction: sat,
    });
    a.state = "home";
    a.destinationId = undefined;
    a.queueEnterTick = undefined;
    a.visitedTicks.push(tick);
  }
}
