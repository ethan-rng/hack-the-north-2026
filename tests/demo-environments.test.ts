import { describe, expect, it } from "vitest";
import {
  buildDemoEnvironment,
  demoKindForDescription,
} from "../src/core/demoEnvironments";
import {
  activateEvent,
  applyDecision,
  newRun,
} from "../src/core/engine";
import {
  advanceSegment,
  captureFrame,
  newScenario,
  newSegment,
  settlePopulation,
} from "../src/core/playback";
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
  it("detects natural-language Yorkdale, Mars base, and Mars rover prompts", () => {
    expect(demoKindForDescription("Model crowd flow at Yorkdale this afternoon")).toBe(
      "yorkdale",
    );
    expect(demoKindForDescription("Create a Mars base with astronauts")).toBe(
      "mars",
    );
    expect(demoKindForDescription("Inspect a Mars rover crew")).toBe("mars");
    expect(demoKindForDescription("A downtown shopping district")).toBeUndefined();
  });

  it("keeps verified Yorkdale tenants and products in the stable mall", () => {
    const environment = buildDemoEnvironment(
      "yorkdale",
      "Yorkdale Saturday shopping",
      [],
      "succeeded",
      "yorkdale-test",
    );
    expect(environment.demo?.kind).toBe("yorkdale");
    expect(environment.population).toHaveLength(100);
    expect(
      environment.population.every((person) => person.presence === "inside"),
    ).toBe(true);
    expect(
      new Set(environment.places.map((place) => place.position.z)).size,
    ).toBeGreaterThan(4);
    expect(environment.exit).toEqual({ x: -35, z: -28 });
    expect(environment.sources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://yorkdale.com/store/levis",
        "https://yorkdale.com/store/zara",
        "https://yorkdale.com/store/yogen-fruz",
      ]),
    );
    expect(environment.products.map((product) => product.name)).toEqual(
      expect.arrayContaining(["Ice cream", "Jeans", "Underwear"]),
    );
  });

  it("keeps the same 100 Yorkdale residents in every frame across promotions and threats", () => {
    const environment = settlePopulation(
      buildDemoEnvironment(
        "yorkdale",
        "Yorkdale",
        [],
        "succeeded",
        "fixed-population",
      ),
    );
    const run = newScenario(environment);
    const ids = run.people.map((person) => person.id);
    let recordedFrames = 0;
    for (const kind of ["discount", "threat"] as const) {
      run.status = "running";
      const segment = newSegment(run, kind);
      segment.status = "processing";
      const change = event(kind);
      change.id = segment.eventId;
      change.startTimeSeconds = run.time;
      change.effects = [
        {
          kind,
          targetId: environment.places[0].id,
          value: kind === "discount" ? 50 : 1,
          subjectKey: null,
        },
      ];
      run.events.push(change);
      activateEvent(environment, run, change);
      expect(
        captureFrame(run).people.filter(
          (person) => person.presence === "inside",
        ),
      ).toHaveLength(100);
      while (segment.status === "processing") {
        const tickets = advanceSegment(environment, run, segment, (frame) => {
          expect(frame.people.map((person) => person.id)).toEqual(ids);
          expect(
            frame.people.every((person) => person.presence === "inside"),
          ).toBe(true);
          recordedFrames++;
        });
        for (const ticket of tickets) {
          const choice =
            ticket.choices.find((candidate) => candidate.type === "flee") ??
            ticket.choices[0];
          applyDecision(environment, run, ticket, choice.id);
        }
      }
      expect(segment.status).toBe("ready");
    }
    expect(recordedFrames).toBeGreaterThanOrEqual(60);
    expect(run.time).toBe(60);
  });

  it("resets a saved 120-person Yorkdale environment to 100 residents without altering its source", () => {
    const legacy = buildDemoEnvironment(
      "yorkdale",
      "Yorkdale",
      [],
      "succeeded",
      "legacy-population",
    );
    legacy.population.push(
      ...structuredClone(legacy.population.slice(0, 20)).map(
        (person, index) => ({ ...person, id: `legacy-extra-${index}` }),
      ),
    );
    legacy.population[0].presence = "not_arrived";
    legacy.population[0].arrivalSeconds = 20;
    legacy.population[0].departureSeconds = 120;
    legacy.population[1].presence = "exited";
    const settled = settlePopulation(legacy);
    const reset = newScenario(settled);
    expect(settled.population).toHaveLength(100);
    expect(reset.people).toHaveLength(100);
    expect(
      reset.people.every(
        (person) =>
          person.presence === "inside" &&
          person.placeId &&
          person.arrivalSeconds === undefined &&
          person.departureSeconds === undefined,
      ),
    ).toBe(true);
    expect(
      newRun(legacy).people.filter((person) => person.presence === "inside"),
    ).toHaveLength(100);
    expect(legacy.population).toHaveLength(120);
    expect(legacy.population[0].presence).toBe("not_arrived");
  });

  it("prepares a 30-astronaut Mars base with a bunker", () => {
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
    expect(environment.sources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://science.nasa.gov/mars/facts/",
        "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
        "https://science.nasa.gov/mission/mars-2020-perseverance/",
      ]),
    );
  });
});
