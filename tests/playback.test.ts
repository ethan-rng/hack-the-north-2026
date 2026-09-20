import { describe, expect, it } from "vitest";
import {
  activateEvent,
  applyDecision,
  createTicket,
  tick,
} from "../src/core/engine";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import {
  advanceSegment,
  captureFrame,
  mergeRecordings,
  newScenario,
  newSegment,
  sampleRecording,
  settlePopulation,
} from "../src/core/playback";
import type { Event, ReplayFrame } from "../src/core/types";

function fixture() {
  const raw = compileEnvironment(
    { ...fallbackConfiguration("Mall"), venueKind: "generic" },
    "Mall",
    [],
    "unavailable",
    "test",
  );
  const env = settlePopulation(raw),
    base = newScenario(env),
    segment = newSegment(base, "Announce 50% off food");
  const working = structuredClone(base);
  working.status = "running" as const;
  working.duration = 31;
  const event: Event = {
    id: segment.eventId,
    originalText: segment.originalText,
    title: "Food promotion",
    description: "Half-price food",
    status: "interpreting",
    startTimeSeconds: 0,
    durationSeconds: 20,
    position: { x: 0, z: 0 },
    effects: [
      {
        kind: "discount",
        targetId: env.products.find((p) => p.category === "food")!.id,
        value: 50,
        subjectKey: null,
      },
    ],
    approximationNotes: [],
    visual: "marker",
    submittedAt: Date.now(),
  };
  working.events.push(event);
  activateEvent(env, working, event);
  segment.status = "processing";
  return { raw, env, base, working, segment };
}
describe("event-driven recorded simulation", () => {
  it("places people at their goals without inference, arrival visits, or fake transactions", () => {
    const { raw, env, base } = fixture();
    expect(raw.population.every((p) => !p.placeId)).toBe(true);
    expect(base.people.every((p) => p.placeId)).toBe(true);
    const shopper = base.people.find((p) =>
      p.goals.some((g) => g.kind === "buy"),
    )!;
    expect(shopper.placeId).toBe(
      shopper.goals.find((g) => g.kind === "buy")!.targetId,
    );
    expect(shopper.currentAction?.type).toBe("browse");
    expect(base.jevAccepted).toBe(0);
    expect(base.transactions).toEqual([]);
    expect(Object.values(base.metrics).reduce((n, m) => n + m.visits, 0)).toBe(
      0,
    );
    for (const place of env.places)
      expect(
        base.people.filter((p) => p.placeId === place.id).length,
      ).toBeLessThanOrEqual(place.admissionCapacity);
  });
  it("leaves a paused scene unchanged and prevents creating decision tickets", () => {
    const { env, base } = fixture(),
      before = structuredClone(base);
    tick(env, base, 100);
    expect(base).toEqual(before);
    expect(createTicket(env, base, base.people[0])).toBeNull();
  });
  it("computes exactly 30 seconds, reserves bounded calls, then stays paused", () => {
    const { env, base, working, segment } = fixture();
    const frames = new Map<number, ReplayFrame>();
    frames.set(0, captureFrame(working));
    let attempts = 0;
    while (segment.status === "processing" && attempts < 300) {
      const tickets = advanceSegment(env, working, segment, (f) =>
        frames.set(f.time, f),
      );
      expect(tickets.length).toBeLessThanOrEqual(4);
      for (const ticket of tickets) {
        attempts++;
        expect(applyDecision(env, working, ticket, "wait")).toBe(true);
      }
      frames.set(working.time, captureFrame(working));
    }
    expect(segment.status).toBe("ready");
    expect(working.status).toBe("paused");
    expect(working.time).toBe(30);
    expect(frames.size).toBe(31);
    expect(segment.callsMade).toBe(attempts);
    expect(attempts).toBe(240);
    expect(base.time).toBe(0);
    expect(base.jevAccepted).toBe(0);
    const before = structuredClone(working);
    expect(advanceSegment(env, working, segment, () => {})).toEqual([]);
    tick(env, working);
    expect(working).toEqual(before);
  });
  it("gives every initially eligible person a choice before advancing virtual time", () => {
    const { env, working, segment } = fixture();
    const people = new Set<string>();
    for (let batch = 0; batch < 10; batch++) {
      const tickets = advanceSegment(env, working, segment, () => {});
      expect(working.time).toBe(0);
      for (const ticket of tickets) {
        people.add(ticket.personId);
        applyDecision(env, working, ticket, "wait");
      }
    }
    expect(people.size).toBe(40);
  });
  it("finishes the recorded duration using existing activities after a budget cap", () => {
    const { env, working, segment } = fixture();
    segment.callLimit = 3;
    const tickets = advanceSegment(env, working, segment, () => {});
    expect(tickets).toHaveLength(3);
    for (const ticket of tickets) applyDecision(env, working, ticket, "wait");
    expect(advanceSegment(env, working, segment, () => {})).toEqual([]);
    expect(segment.callsMade).toBe(3);
    expect(working.time).toBe(30);
    expect(segment.message).toContain("budget");
  });
  it("preserves behavior on failed choices and counts retries within the same budget", () => {
    const { env, working, segment } = fixture();
    segment.callLimit = 5;
    const ticket = advanceSegment(env, working, segment, () => {});
    const id = working.people[0].currentAction!.actionId;
    for (const t of ticket) applyDecision(env, working, t, undefined);
    expect(working.people[0].currentAction!.actionId).toBe(id);
    expect(working.jevFailed).toBe(4);
    const next = advanceSegment(env, working, segment, () => {});
    expect(next.length).toBe(1);
    applyDecision(env, working, next[0], "wait");
    advanceSegment(env, working, segment, () => {});
    expect(segment.callsMade).toBe(5);
  });
  it("recovers interrupted pending calls without dispatching duplicates", () => {
    const { env, working, segment } = fixture();
    segment.callLimit = 4;
    const tickets = advanceSegment(env, working, segment, () => {});
    expect(advanceSegment(env, working, segment, () => {})).toEqual([]);
    expect(working.time).toBe(0);
    for (const p of working.people)
      if (p.pending) p.pending.issuedAt = Date.now() - 26000;
    advanceSegment(env, working, segment, () => {});
    expect(segment.status).toBe("ready");
    expect(segment.callsMade).toBe(4);
    expect(working.jevFailed).toBe(4);
    expect(
      applyDecision(env, working, tickets[0], "invalid-choice"),
    ).toBe(false);
  });
  it("bounds wall time even when models are unavailable", () => {
    const { env, working, segment } = fixture();
    segment.startedAt = Date.now() - 181000;
    expect(advanceSegment(env, working, segment, () => {})).toEqual([]);
    expect(segment.status).toBe("ready");
    expect(segment.callsMade).toBe(0);
    expect(segment.message).toContain("time limit");
  });
  it("captures independent historical inspector state and omits pending network tickets", () => {
    const { env, working, segment } = fixture();
    advanceSegment(env, working, segment, () => {});
    const frame = captureFrame(working);
    working.products[0].stockUnits = 0;
    working.people[0].budgetRemainingCents = 0;
    expect(frame.products[0].stockUnits).toBeGreaterThan(0);
    expect(frame.people[0].budgetRemainingCents).toBeGreaterThan(0);
    expect(frame.people.every((p) => !p.pending)).toBe(true);
  });
  it("supports exact backward seeking and interpolates positions without future stock leaking", () => {
    const { base } = fixture();
    const a = captureFrame(base),
      b = structuredClone(a);
    b.time = 1;
    b.people[0].position.x += 2;
    b.products[0].stockUnits = 0;
    const between = sampleRecording([a, b], 0.5)!;
    expect(between.people[0].position.x).toBe(a.people[0].position.x + 1);
    expect(between.products[0].stockUnits).toBe(a.products[0].stockUnits);
    expect(sampleRecording([a, b], 1)?.products[0].stockUnits).toBe(0);
    expect(sampleRecording([a, b], 0)).toEqual(a);
    expect(a.products[0].stockUnits).toBeGreaterThan(0);
  });
  it("joins consecutive recordings into one timeline with the new event at the boundary", () => {
    const { base } = fixture();
    const first = captureFrame(base),
      last = structuredClone(first);
    last.time = 30;
    const next = structuredClone(last);
    next.revision = 100;
    const end = structuredClone(next);
    end.time = 60;
    const frames = mergeRecordings([
      { segmentId: "a", runId: base.runId, frames: [first, last] },
      { segmentId: "b", runId: base.runId, frames: [next, end] },
    ]);
    expect(frames.map((f) => f.time)).toEqual([0, 30, 60]);
    expect(frames[1].revision).toBe(100);
  });
});
