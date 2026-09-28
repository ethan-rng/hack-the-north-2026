import { afterEach, describe, expect, it, vi } from "vitest";
import { decide, interpretEvent, type AIEnv } from "../cloudflare/ai";
import { mockBudgetBinding } from "./helpers/budget";
import { buildDemoEnvironment } from "../src/core/demoEnvironments";
import {
  activateEvent,
  applyDecision,
  createTicket,
  tick,
} from "../src/core/engine";
import { newScenario, settlePopulation } from "../src/core/playback";
import type { DemoKind, Effect, Event } from "../src/core/types";

function fixture(kind: DemoKind, text: string) {
  const environment = settlePopulation(
    buildDemoEnvironment(kind, kind, [], "succeeded", "event-processing"),
  );
  const run = newScenario(environment);
  run.status = "running";
  const event: Event = {
    id: "user-event",
    originalText: text,
    title: "Interpreting event…",
    description: "",
    status: "interpreting",
    startTimeSeconds: 0,
    durationSeconds: 300,
    position: { x: 0, z: 0 },
    effects: [],
    approximationNotes: [],
    visual: "marker",
    submittedAt: 0,
  };
  return { environment, run, event };
}

function mockInterpreter(effects: Effect[], title = "Interpreted user event") {
  const result = {
    title,
    description: "The submitted situation is known to everyone in the venue.",
    durationSeconds: 90,
    placeId: effects[0]?.targetId ?? null,
    effects,
    approximationNotes: [],
    visual: "marker",
  };
  const fetch = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
    );
  vi.stubGlobal("fetch", fetch);
  const jev = vi.fn();
  const bindings: AIEnv = {
    BASETEN_API_KEY: "test-key",
    BASETEN_MODEL: "test-model",
    AI_GATEWAY_ID: "test-gateway",
    AI: { run: jev } as unknown as Ai,
    AI_BUDGET: mockBudgetBinding(),
  };
  return { fetch, jev, bindings, result };
}

afterEach(() => vi.unstubAllGlobals());

describe("user event processing", () => {
  it.each([
    ["yorkdale", "Someone threw up into Yogen Fruz", "threat", 0.3],
    [
      "yorkdale",
      "Yogen Fruz is closed due to contamination",
      "availability",
      0,
    ],
    ["yorkdale", "There is no ice cream promotion today", "announcement", 0],
    ["yorkdale", "Ice cream at Yogen Fruz is 17% off", "discount", 17],
    ["yorkdale", "Levi jeans are 23% off", "discount", 23],
    ["yorkdale", "Zara underwear is 7% off", "discount", 7],
    [
      "mars",
      "Friendly aliens announce a scientific discovery",
      "announcement",
      0,
    ],
    ["mars", "Aliens attack the landing pad", "threat", 0.8],
  ] as const)(
    "sends %s event '%s' through the interpreter",
    async (demo, text, kind, value) => {
      const { environment, run, event } = fixture(demo, text);
      const storeName =
        demo === "mars"
          ? "Landing Pad"
          : text.includes("Levi")
            ? "Levi's"
            : text.includes("Zara")
              ? "Zara"
              : "Yogen Früz";
      const targetId =
        kind === "announcement"
          ? null
          : environment.places.find((place) => place.name === storeName)!.id;
      const effects: Effect[] = [{ kind, targetId, value, subjectKey: null }];
      const { fetch, bindings, result } = mockInterpreter(effects);

      await interpretEvent(bindings, environment, run, event);

      expect(fetch).toHaveBeenCalledOnce();
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(JSON.parse(body.messages[1].content).text).toBe(text);
      expect(event.originalText).toBe(text);
      expect(event.effects).toEqual(result.effects);
      expect(event.title).toBe(result.title);
      expect(event.durationSeconds).toBe(90);
      expect(event.visual).toBe("marker");
    },
  );

  it("fails rather than using a canned demo event when interpretation is unavailable", async () => {
    const { environment, run, event } = fixture(
      "yorkdale",
      "Yogen Fruz is closed",
    );
    const { fetch, bindings, jev } = mockInterpreter([]);
    fetch.mockRejectedValue(new Error("Interpreter unavailable"));
    jev.mockRejectedValue(new Error("Fallback unavailable"));
    await expect(
      interpretEvent(bindings, environment, run, event),
    ).rejects.toThrow(
      "Baseten and Workers AI could not produce a valid structured response",
    );
    expect(fetch).toHaveBeenCalledOnce();
    expect(jev).toHaveBeenCalledOnce();
    expect(event.effects).toEqual([]);
    expect(event.status).toBe("interpreting");
  });

  it("passes the original incident to Jev and applies each person's own choice", async () => {
    const text = "Someone threw up into Yogen Fruz";
    const { environment, run, event } = fixture("yorkdale", text);
    const store = environment.places.find(
      (place) => place.name === "Yogen Früz",
    )!;
    const destination = environment.places.find(
      (place) => place.id !== store.id,
    )!;
    const [leaver, stayer] = run.people;
    for (const person of [leaver, stayer]) {
      person.placeId = store.id;
      person.position = { ...store.entry };
      person.currentAction = null;
    }
    const goals = structuredClone(run.people.map((person) => person.goals));
    const { bindings, jev } = mockInterpreter(
      [{ kind: "threat", targetId: store.id, value: 0.3, subjectKey: null }],
      "Hygiene incident at Yogen Früz",
    );
    await interpretEvent(bindings, environment, run, event);
    run.events.push(event);
    activateEvent(environment, run, event);
    expect(run.people.map((person) => person.goals)).toEqual(goals);
    expect(leaver.placeId).toBe(store.id);
    expect(stayer.placeId).toBe(store.id);

    jev.mockResolvedValueOnce({
      answers: { action: `move:${destination.id}` },
    });
    jev.mockResolvedValueOnce({ answers: { action: "wait" } });
    for (const person of [leaver, stayer]) {
      const ticket = createTicket(environment, run, person)!;
      const chosen = await decide(bindings, ticket);
      expect(applyDecision(environment, run, ticket, chosen)).toBe(true);
    }
    expect(jev).toHaveBeenCalledTimes(2);
    for (const call of jev.mock.calls) {
      expect(call[0]).toBe("typesafe/jev");
      expect(call[1].state.perceivedEvents).toEqual([
        expect.objectContaining({ originalText: text, title: event.title }),
      ]);
    }
    expect(jev.mock.calls[0][1].state.person.name).toBe(leaver.displayName);
    expect(jev.mock.calls[1][1].state.person.name).toBe(stayer.displayName);
    tick(environment, run, 20);
    expect(leaver.placeId).toBe(destination.id);
    expect(stayer.placeId).toBe(store.id);
    expect(
      run.people.filter((person) => person.presence === "inside"),
    ).toHaveLength(100);
    expect(
      run.events[0].effects.some((effect) => effect.kind === "discount"),
    ).toBe(false);
  });
});
