import { describe, expect, it } from "vitest";
import {
  activateEvent,
  applyDecision,
  choicesFor,
  comparable,
  createTicket,
  difference,
  effectivePrice,
  newRun,
  resultFor,
  shortestPlacePath,
  tick,
} from "../src/core/engine";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import { extractSources } from "../cloudflare/ai";
import type {
  Effect,
  Environment,
  Event,
  Person,
  Run,
} from "../src/core/types";

function fixture() {
  const env = compileEnvironment(
    fallbackConfiguration("Test park"),
    "Test park",
    [],
    "unavailable",
    "setup-test",
  );
  return { env, run: newRun(env) };
}
function action(env: Environment, run: Run, p: Person, id: string) {
  p.nextDecisionAt = 0;
  const ticket = createTicket(env, run, p)!;
  expect(ticket).not.toBeNull();
  expect(applyDecision(env, run, ticket, id)).toBe(true);
}
function advance(env: Environment, run: Run, n: number) {
  for (let i = 0; i < n; i++) tick(env, run);
}
function addEvent(
  env: Environment,
  run: Run,
  effects: Effect[],
  options: Partial<Event> = {},
) {
  const event: Event = {
    id: crypto.randomUUID(),
    originalText: "Test intervention",
    title: "Test intervention",
    description: "Test",
    status: "interpreting",
    startTimeSeconds: run.time,
    durationSeconds: 30,
    position: { x: 0, z: 0 },
    effects,
    approximationNotes: [],
    visual: "marker",
    submittedAt: Date.now(),
    ...options,
  };
  run.events.push(event);
  activateEvent(env, run, event);
  return event;
}
const effect = (
  kind: Effect["kind"],
  targetId: string | null,
  value: number,
  subjectKey: string | null = null,
): Effect => ({ kind, targetId, value, subjectKey });

describe("authoritative simulation mechanics", () => {
  it("commits only one purchase for the last unit across simultaneous checkouts", () => {
    const { env, run } = fixture(),
      product = run.products[0],
      service = env.services.find((s) => s.placeId === product.placeId)!;
    product.stockUnits = 1;
    service.slotCount = 2;
    service.durationSeconds = 2;
    for (const p of run.people.slice(0, 2)) {
      p.placeId = product.placeId;
      action(env, run, p, `buy:${product.id}`);
    }
    const budgets = run.people.slice(0, 2).map((p) => p.budgetRemainingCents!);
    advance(env, run, 4);
    expect(run.transactions).toHaveLength(1);
    expect(product.stockUnits).toBe(0);
    expect(run.metrics[product.placeId].purchases).toBe(1);
    expect(
      budgets.reduce((a, b) => a + b) -
        run.people.slice(0, 2).reduce((a, p) => a + p.budgetRemainingCents!, 0),
    ).toBe(product.basePriceCents);
    advance(env, run, 5);
    expect(run.transactions).toHaveLength(1);
  });
  it("revalidates an expired discount and budget at checkout completion", () => {
    const { env, run } = fixture(),
      product = run.products[0],
      p = run.people[0];
    p.placeId = product.placeId;
    p.budgetRemainingCents = 300;
    addEvent(env, run, [effect("discount", product.id, 50)], {
      durationSeconds: 2,
    });
    action(env, run, p, `buy:${product.id}`);
    advance(env, run, 12);
    expect(run.transactions).toHaveLength(0);
    expect(p.budgetRemainingCents).toBe(300);
    expect(p.recentExperiences.join()).toContain("Purchase unavailable");
  });
  it("releases reusable capacity without inventing revenue or consuming stock", () => {
    const { env, run } = fixture(),
      service = env.services.find((s) => s.kind === "timed")!;
    service.slotCount = 1;
    service.durationSeconds = 2;
    const inventory = structuredClone(run.products);
    for (const p of run.people.slice(0, 2)) {
      p.placeId = service.placeId;
      action(env, run, p, `service:${service.id}`);
    }
    advance(env, run, 6);
    expect(run.metrics[service.placeId].serviceCompletions).toBe(2);
    expect(run.services[service.id].active).toHaveLength(0);
    expect(run.services[service.id].queue).toHaveLength(0);
    expect(run.metrics[service.placeId].revenue).toBe(0);
    expect(run.products).toEqual(inventory);
  });
  it("drains a noninterruptible service during closure, abandons its queue exactly once", () => {
    const { env, run } = fixture(),
      service = env.services.find((s) => s.kind === "timed")!;
    service.slotCount = 1;
    service.durationSeconds = 5;
    for (const p of run.people.slice(0, 2)) {
      p.placeId = service.placeId;
      action(env, run, p, `service:${service.id}`);
    }
    tick(env, run);
    addEvent(env, run, [
      effect("availability", service.placeId, 0),
      effect("threat", service.placeId, 1),
    ]);
    expect(choicesFor(env, run, run.people[0])).toHaveLength(0);
    tick(env, run);
    expect(run.services[service.id].active).toHaveLength(1);
    expect(run.metrics[service.placeId].abandonment).toBe(1);
    advance(env, run, 5);
    expect(run.metrics[service.placeId].serviceCompletions).toBe(1);
    expect(run.metrics[service.placeId].abandonment).toBe(1);
  });
  it("releases an interrupted checkout and does not count it as queue abandonment", () => {
    const { env, run } = fixture(),
      product = run.products[0],
      p = run.people[0],
      service = env.services.find((s) => s.placeId === product.placeId)!;
    p.placeId = product.placeId;
    action(env, run, p, `buy:${product.id}`);
    tick(env, run);
    addEvent(env, run, [effect("threat", product.placeId, 1)]);
    action(env, run, p, "flee");
    expect(run.services[service.id].active).toHaveLength(0);
    expect(run.metrics[product.placeId].interrupted).toBe(1);
    expect(run.metrics[product.placeId].abandonment).toBe(0);
    advance(env, run, 15);
    expect(run.transactions).toHaveLength(0);
  });
  it("abandons a queue when patience expires and releases membership", () => {
    const { env, run } = fixture(),
      service = env.services.find((s) => s.kind === "timed")!;
    service.slotCount = 1;
    service.durationSeconds = 15;
    for (const p of run.people.slice(0, 2)) {
      p.placeId = service.placeId;
      p.maxQueueWaitSeconds = 3;
      action(env, run, p, `service:${service.id}`);
    }
    advance(env, run, 4);
    expect(run.services[service.id].queue).toHaveLength(0);
    expect(run.metrics[service.placeId].abandonment).toBe(1);
  });
  it("uses the best discount without stacking and expiry preserves completed transactions", () => {
    const { env, run } = fixture(),
      product = run.products[0],
      p = run.people[0];
    addEvent(env, run, [effect("discount", product.placeId, 20)], {
      durationSeconds: 15,
    });
    addEvent(env, run, [effect("discount", product.id, 50)], {
      durationSeconds: 12,
    });
    expect(effectivePrice(run, product.id)).toBe(250);
    p.placeId = product.placeId;
    action(env, run, p, `buy:${product.id}`);
    advance(env, run, 11);
    expect(run.transactions[0].totalCents).toBe(250);
    advance(env, run, 2);
    expect(effectivePrice(run, product.id)).toBe(400);
    advance(env, run, 3);
    expect(effectivePrice(run, product.id)).toBe(500);
    expect(run.transactions).toHaveLength(1);
    expect(run.events.every((e) => e.status === "completed")).toBe(true);
  });
  it("requires an explicit food purchase and eating activity to satisfy hunger", () => {
    const { env, run } = fixture(),
      food = run.products.find((p) => p.category === "food")!,
      p = run.people[2];
    p.placeId = food.placeId;
    p.hunger = 0.9;
    action(env, run, p, `buy:${food.id}`);
    advance(env, run, 11);
    expect(p.hunger).toBeGreaterThan(0.89);
    expect(p.foodHeld).toBe(1);
    action(env, run, p, "eat");
    advance(env, run, 8);
    expect(p.hunger).toBeLessThan(0.3);
    expect(p.foodHeld).toBe(0);
  });
});
describe("perception, inference and baseline boundaries", () => {
  it.each(["announcement", "attraction", "threat", "discount"] as const)(
    "delivers a distant %s event to everyone and includes it in Jev context",
    (kind) => {
      const { env, run } = fixture();
      const exited = run.people.at(-1)!;
      exited.presence = "exited";
      const event = addEvent(
        env,
        run,
        [effect(kind, kind === "discount" ? run.products[0].id : null, 1)],
        { position: { x: 1000, z: 1000 } },
      );
      for (const p of run.people.filter((p) => p !== exited)) {
        expect(p.knownEventIds).toContain(event.id);
        const ticket = createTicket(env, run, p)!;
        expect(ticket.context).toMatchObject({
          perceivedEvents: [expect.objectContaining({ title: event.title })],
        });
        if (kind === "threat")
          expect(ticket.choices.some((choice) => choice.id === "flee")).toBe(
            true,
          );
      }
      expect(exited.knownEventIds).not.toContain(event.id);
      tick(env, run);
      expect(
        run.people[0].knownEventIds.filter((id) => id === event.id),
      ).toHaveLength(1);
    },
  );
  it("ignores legacy local visibility fields when resuming stored active events", () => {
    const { env, run } = fixture();
    const event = addEvent(env, run, [effect("threat", null, 1)]);
    const p = run.people[0];
    p.knownEventIds = [];
    Object.assign(event, {
      awareness: "local",
      radius: 1,
      position: { x: 1000, z: 1000 },
    });
    tick(env, run);
    expect(p.knownEventIds).toContain(event.id);
    expect(choicesFor(env, run, p).some((choice) => choice.id === "flee")).toBe(
      true,
    );
  });
  it("broadcasts gate changes globally while updating only matching passenger goals", () => {
    const { env, run } = fixture();
    const [near, far, unrelated] = run.people;
    near.position = { x: 0, z: 0 };
    far.position = { x: 23, z: 0 };
    unrelated.position = { x: 0, z: 0 };
    for (const p of [near, far])
      p.goals = [
        {
          id: `gate-${p.id}`,
          kind: "reach",
          description: "Reach assigned gate",
          targetId: env.places[0].id,
          subjectKey: "CC101",
          priority: 1,
          status: "pending",
        },
      ];
    const unrelatedGoals = structuredClone(unrelated.goals);
    const event = addEvent(env, run, [
      effect("goal_update", env.places[1].id, 60, "CC101"),
    ]);
    expect(near.goals[0].targetId).toBe(env.places[1].id);
    for (const p of run.people) expect(p.knownEventIds).toContain(event.id);
    expect(unrelated.knownFacts).toHaveLength(0);
    expect(unrelated.goals).toEqual(unrelatedGoals);
    expect(far.goals[0].targetId).toBe(env.places[1].id);
    expect(far.goals[0].deadlineSeconds).toBe(near.goals[0].deadlineSeconds);
  });
  it("rejects pre-event decisions but preserves ongoing action during inference failure", () => {
    const { env, run } = fixture(),
      p = run.people[0];
    action(env, run, p, `move:${env.places[0].id}`);
    p.nextDecisionAt = 0;
    const before = createTicket(env, run, p)!;
    addEvent(env, run, [effect("threat", null, 1)]);
    expect(applyDecision(env, run, before, "leave")).toBe(false);
    const pending = createTicket(env, run, p)!;
    const actionId = p.currentAction!.actionId;
    expect(applyDecision(env, run, pending)).toBe(false);
    expect(p.currentAction?.actionId).toBe(actionId);
    expect(p.decisionError).toContain("preserved");
    expect(run.jevFailed).toBe(1);
  });
  it("rejects unavailable choices without invalidating decisions for unrelated ticks", () => {
    const { env, run } = fixture(),
      p = run.people[0],
      ticket = createTicket(env, run, p)!;
    tick(env, run);
    expect(applyDecision(env, run, ticket, `move:${env.places[0].id}`)).toBe(
      true,
    );
    p.nextDecisionAt = 0;
    const late = createTicket(env, run, p)!;
    addEvent(env, run, [effect("availability", env.places[1].id, 0)], {
      position: { x: 100, z: 100 },
    });
    expect(applyDecision(env, run, late, `move:${env.places[1].id}`)).toBe(
      false,
    );
  });
  it("restores the exact population and inventory and rejects old run replies", () => {
    const { env, run } = fixture(),
      ticket = createTicket(env, run, run.people[0])!;
    run.products[0].stockUnits = 0;
    run.people[0].budgetRemainingCents = 0;
    const reset = newRun(env);
    expect(reset.runId).not.toBe(run.runId);
    expect(reset.people).toEqual(env.population);
    expect(reset.products).toEqual(env.products);
    expect(applyDecision(env, reset, ticket, "leave")).toBe(false);
    expect(reset.time).toBe(0);
  });
  it("retains exited person records and computes equal-duration comparisons", () => {
    const { env, run } = fixture(),
      p = run.people[0];
    action(env, run, p, "leave");
    advance(env, run, 30);
    expect(p.presence).toBe("exited");
    expect(run.people).toHaveLength(40);
    const a = resultFor(run, "A"),
      b = resultFor(newRun(env), "B");
    expect(comparable(a, b)).toBe(false);
    b.duration = a.duration;
    expect(comparable(a, b)).toBe(true);
    expect(difference(0, 10)).toEqual({ absolute: 10, percent: null });
  });
  it("builds a connected weighted layout and uses it only for animated travel", () => {
    const { env, run } = fixture();
    expect(env.connections.length).toBeGreaterThanOrEqual(
      env.places.length - 1,
    );
    const physicalLength = (weight: number) => {
      const lengths = env.connections
        .filter((connection) => connection.weight === weight)
        .map((connection) => {
          const from = env.places.find(
            (place) => place.id === connection.fromPlaceId,
          )!;
          const to = env.places.find(
            (place) => place.id === connection.toPlaceId,
          )!;
          return Math.hypot(
            from.position.x - to.position.x,
            from.position.z - to.position.z,
          );
        });
      return lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    };
    expect(physicalLength(3)).toBeGreaterThan(physicalLength(1));
    const p = run.people[0];
    const from = env.places[0];
    const to = env.places.at(-1)!;
    p.placeId = from.id;
    p.position = { ...from.entry };
    const route = shortestPlacePath(env, from.id, to.id);
    expect(route.at(-1)).toBe(to.id);
    action(env, run, p, `move:${to.id}`);
    expect(p.currentAction?.path).toEqual(
      route.map((placeId) => ({
        ...env.places.find((place) => place.id === placeId)!.entry,
      })),
    );
    const contextRun = newRun(env);
    const ticket = createTicket(env, contextRun, contextRun.people[0])!;
    const contextPlaces = ticket.context.places as Record<string, unknown>[];
    expect(contextPlaces.every((place) => !("distance" in place))).toBe(true);
    advance(env, run, 90);
    expect(p.placeId).toBe(to.id);
  });
  it("accepts and lays out up to twelve researched points of interest", () => {
    const generated = fallbackConfiguration("Large venue");
    for (let index = 6; index < 12; index++) {
      generated.places.push({
        ...structuredClone(generated.places[index % 6]),
        name: `Additional POI ${index + 1}`,
      });
      generated.connections.push({
        fromPlace: index,
        toPlace: index + 1,
        weight: ((index % 3) + 1) as 1 | 2 | 3,
      });
    }
    const env = compileEnvironment(
      generated,
      "Large venue",
      [],
      "unavailable",
      "twelve",
    );
    expect(env.places).toHaveLength(12);
    expect(
      shortestPlacePath(env, env.places[0].id, env.places[11].id).at(-1),
    ).toBe(env.places[11].id);
  });
  it("rejects unknown references and retains unsupported event history", () => {
    const { env, run } = fixture();
    const event = addEvent(env, run, [effect("discount", "invented-id", 100)]);
    expect(event.status).toBe("unsupported");
    expect(run.events).toContain(event);
  });
  it("keeps capabilities and goals independent of missing or swapped assets", () => {
    const generated = fallbackConfiguration("A place with gates");
    generated.places[0].name = "Gate A";
    const first = compileEnvironment(
      generated,
      "Gates",
      [],
      "unavailable",
      "same",
    );
    for (const place of generated.places) place.asset = "open";
    const second = compileEnvironment(
      generated,
      "Gates",
      [],
      "unavailable",
      "same",
    );
    expect(first.population).toEqual(second.population);
    expect(first.places).toEqual(second.places);
    expect(first.services).toEqual(second.services);
    second.presentation = {};
    const run = newRun(second);
    expect(choicesFor(second, run, run.people[0])).toEqual(
      choicesFor(first, newRun(first), first.population[0]),
    );
  });
  it("takes citations only from successful search tool results, never model prose", () => {
    expect(
      extractSources({
        choices: [
          {
            message: {
              content: "Title: Invented\nURL: https://invented.example",
            },
          },
        ],
      }),
    ).toEqual([]);
    const sources = extractSources({
      baseten: {
        iterations: [
          {
            server_tool_calls: [{ status: "succeeded" }],
            continuation_messages: [
              {
                role: "tool",
                content:
                  "Title: Official venue\nURL: https://example.com/venue\nHighlights:\nA gift shop and cafe",
              },
            ],
          },
        ],
      },
    });
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe("https://example.com/venue");
    expect(sources[0].retrievedAt).toBeTruthy();
  });
});
