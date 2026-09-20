import { describe, expect, it } from "vitest";
import {
  applyCuratedDemoEvent,
  buildDemoEnvironment,
  demoKindForDescription,
} from "../src/core/demoEnvironments";
import { newRun } from "../src/core/engine";
import type { Event } from "../src/core/types";

function event(text: string): Event {
  return {
    id: "demo-event",
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
}

describe("curated demo environments", () => {
  it("detects natural-language Yorkdale and Mars base prompts", () => {
    expect(demoKindForDescription("Model crowd flow at Yorkdale this afternoon")).toBe(
      "yorkdale",
    );
    expect(demoKindForDescription("Create a Mars base with astronauts")).toBe(
      "mars",
    );
    expect(demoKindForDescription("A downtown shopping district")).toBeUndefined();
  });

  it("keeps verified Yorkdale tenants and promotion products in the stable mall", () => {
    const environment = buildDemoEnvironment(
      "yorkdale",
      "Yorkdale Saturday shopping",
      [],
      "succeeded",
      "yorkdale-test",
    );
    expect(environment.demo?.kind).toBe("yorkdale");
    expect(environment.sources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://yorkdale.com/store/levis",
        "https://yorkdale.com/store/zara",
        "https://yorkdale.com/store/yogen-fruz",
      ]),
    );
    const run = newRun(environment);
    const offer = event("50% off ice cream at Yogen Früz in the food court");
    expect(applyCuratedDemoEvent(environment, run, offer)).toBe(true);
    expect(offer.effects).toEqual([
      expect.objectContaining({ kind: "discount", value: 50 }),
    ]);
    expect(
      run.products.find((product) => product.id === offer.effects[0].targetId)
        ?.name,
    ).toBe("Ice cream");
  });

  it("prepares a 30-astronaut Mars base and a reliable alien landing sequence", () => {
    const environment = buildDemoEnvironment(
      "mars",
      "Mars base mission control",
      [],
      "unavailable",
      "mars-test",
    );
    expect(environment.population).toHaveLength(30);
    expect(environment.population.every((person) => person.displayName.startsWith("Astronaut"))).toBe(
      true,
    );
    expect(environment.demo?.safePlaceId).toBeTruthy();
    const run = newRun(environment);
    const arrival = event("aliens land on Mars");
    expect(applyCuratedDemoEvent(environment, run, arrival)).toBe(true);
    expect(arrival.visual).toBe("ufo");
    expect(arrival.effects).toEqual([
      expect.objectContaining({ kind: "threat", value: 1 }),
    ]);
    expect(
      environment.places.find((place) => place.id === arrival.effects[0].targetId)
        ?.name,
    ).toBe("Landing Pad");
  });
});
