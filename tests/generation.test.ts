import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compileEnvironment,
  fallbackConfiguration,
  type Generated,
} from "../src/core/generation";
import {
  choicesFor,
  createTicket,
  movementPath,
  newRun,
  tick,
} from "../src/core/engine";
import { newScenario, settlePopulation } from "../src/core/playback";
import { inferVenue } from "../src/core/spatial";
import { researchEnvironment, type AIEnv } from "../cloudflare/ai";
import type { Source, VenueKind } from "../src/core/types";

const compile = (data: Generated, sources: Source[] = []) =>
  compileEnvironment(
    data,
    "Test venue",
    sources,
    sources.length ? "succeeded" : "unavailable",
    "test",
    42,
  );
function configuration(venueKind: VenueKind): Generated {
  const data = fallbackConfiguration("Test venue");
  data.venueKind = venueKind;
  if (venueKind === "airport") {
    data.places[0].name = "Gate A";
    data.places[5].name = "Gate B";
    data.places[3].name = "Security checkpoint";
  }
  return data;
}
const source = (id: string, excerpt: string): Source => ({
  id,
  url: `https://example.org/${id}`,
  title: "Venue directory",
  retrievedAt: "2026-01-01T00:00:00Z",
  excerpt,
});

describe("venue-aware generation", () => {
  it.each([
    ["An airport terminal", "airport"],
    ["A shopping mall", "mall"],
    ["A downtown neighborhood", "neighborhood"],
    ["An amusement park", "park"],
    ["A small cafe", "small_venue"],
  ] as const)("recognizes %s", (description, kind) =>
    expect(inferVenue(description)).toBe(kind),
  );

  it.each(["airport", "mall", "neighborhood", "park", "small_venue"] as const)(
    "creates deterministic %s footprints, entrances and corridor routes",
    (kind) => {
      const data = configuration(kind);
      const env = compile(data),
        again = compile(data);
      expect(env.places).toEqual(again.places);
      expect(env.population).toEqual(again.population);
      expect(env.layout?.basis).toBe("template");
      for (const place of env.places) {
        const f = place.footprint!;
        expect(
          Math.hypot(
            place.entry.x - place.position.x,
            place.entry.z - place.position.z,
          ),
        ).toBeCloseTo(f.depth / 2 + 0.7);
        expect(place.entry.x - place.position.x).toBeCloseTo(
          Math.sin(f.rotation) * (f.depth / 2 + 0.7),
        );
        expect(place.zone).toBeTruthy();
      }
      for (const connection of env.connections) {
        expect(connection.path![0]).toEqual(
          env.places.find((p) => p.id === connection.fromPlaceId)!.entry,
        );
        expect(connection.path!.at(-1)).toEqual(
          env.places.find((p) => p.id === connection.toPlaceId)!.entry,
        );
      }
      const path = movementPath(env, env.places[0].id, env.places[5].id);
      expect(path.at(-1)).toEqual(env.places[5].entry);
      expect(
        path.every((point) =>
          env.connections.some((c) =>
            c.path!.some((p) => p.x === point.x && p.z === point.z),
          ),
        ),
      ).toBe(true);
    },
  );

  it("keeps long neighborhood routes on the cross street between blocks", () => {
    const data = configuration("neighborhood");
    for (let i = 6; i < 18; i++)
      data.places.push({
        ...structuredClone(data.places[i % 6]),
        name: `Shop ${i}`,
      });
    const env = compile(data);
    expect(env.connections.length).toBeGreaterThanOrEqual(17);
    expect(env.connections.some((c) => (c.path?.length ?? 0) >= 5)).toBe(true);
  });

  it("retains source-supported relative geography and separates unlocated places", () => {
    const data = configuration("mall");
    const sources = [
      source("a", `${data.places[0].name}: latitude 43.65, longitude -79.38.`),
      source(
        "b",
        `${data.places[1].name}: latitude 43.651, longitude -79.378.`,
      ),
    ];
    data.places[0].geographic = {
      latitude: 43.65,
      longitude: -79.38,
      evidence: { sourceIds: ["a"], quote: sources[0].excerpt },
    };
    data.places[1].geographic = {
      latitude: 43.651,
      longitude: -79.378,
      evidence: { sourceIds: ["b"], quote: sources[1].excerpt },
    };
    const env = compile(data, sources);
    expect(env.layout?.basis).toBe("mixed");
    expect(env.places[1].position.x).toBeGreaterThan(env.places[0].position.x);
    expect(env.places[1].position.z).toBeLessThan(env.places[0].position.z);
    const eastMeters =
      (env.places[1].position.x - env.places[0].position.x) *
      env.layout!.metersPerUnit!;
    expect(eastMeters).toBeCloseTo(
      0.002 * 111320 * Math.cos((43.65 * Math.PI) / 180),
      3,
    );
    expect(env.places[2].position.x).toBeGreaterThan(env.places[1].position.x);
    expect(
      env.provenance.find((p) => p.targetPath === "places.place-1.position")
        ?.sourceIds,
    ).toEqual(["a"]);
  });

  it("rejects fabricated, wrong-place and missing-source coordinate evidence", () => {
    const data = configuration("mall");
    const sources = [
      source("a", "Different venue: latitude 43.65, longitude -79.38."),
    ];
    data.places[0].geographic = {
      latitude: 43.65,
      longitude: -79.38,
      evidence: { sourceIds: ["a"], quote: sources[0].excerpt },
    };
    data.places[1].geographic = {
      latitude: 43.65,
      longitude: -79.38,
      evidence: { sourceIds: ["missing"], quote: sources[0].excerpt },
    };
    data.places[2].geographic = {
      latitude: 43.65,
      longitude: -79.38,
      evidence: {
        sourceIds: ["a"],
        quote: "Invented quote with coordinates 43.65, -79.38",
      },
    };
    const env = compile(data, sources);
    expect(env.layout?.basis).toBe("template");
    expect(env.places.every((p) => !p.geographic)).toBe(true);
  });

  it("tracks evidence per field without promoting unrelated metadata", () => {
    const data = configuration("mall");
    const record = source("a", "Welcome point is inside the main entrance.");
    data.places[0].sourceIds = ["a"];
    data.places[0].operatingHours = "09:00-21:00 (assumed)";
    data.places[0].fieldEvidence = [
      { field: "name", evidence: { sourceIds: ["a"], quote: record.excerpt } },
    ];
    const env = compile(data, [record]);
    expect(
      env.provenance.find((p) => p.targetPath === "places.place-1.name")?.basis,
    ).toBe("researched");
    expect(
      env.provenance.find(
        (p) => p.targetPath === "places.place-1.details.operatingHours",
      )?.basis,
    ).toBe("assumed");
  });

  it("gives passenger groups shared flights, deadlines and correlated budgets", () => {
    const env = compile(configuration("airport"));
    const first = env.population[0];
    const group = env.population.filter((p) => p.groupId === first.groupId);
    expect(group.length).toBeGreaterThan(1);
    expect(new Set(group.map((p) => p.goals[0].targetId)).size).toBe(1);
    expect(new Set(group.map((p) => p.goals[0].subjectKey)).size).toBe(1);
    expect(new Set(group.map((p) => p.departureSeconds)).size).toBe(1);
    expect(new Set(env.population.map((p) => p.goals[0].subjectKey)).size).toBe(
      2,
    );
    expect(
      group.every(
        (p) =>
          p.budgetRemainingCents! >= 2975 && p.budgetRemainingCents! <= 4025,
      ),
    ).toBe(true);
    const run = newRun(env);
    const ticket = createTicket(env, run, run.people[0])!;
    expect(ticket.context.person).toMatchObject({
      groupId: first.groupId,
      purpose: first.purpose,
    });
  });

  it("keeps future groups absent until their scheduled arrival and preserves them on reset", () => {
    const env = settlePopulation(compile(configuration("park")));
    const run = newScenario(env);
    const pending = run.people.find((p) => p.presence === "not_arrived")!;
    expect(pending).toBeDefined();
    expect(pending.placeId).toBeUndefined();
    expect(pending.currentAction).toBeNull();
    expect(choicesFor(env, run, pending)).toEqual([]);
    run.status = "running";
    tick(env, run, pending.arrivalSeconds! - 1);
    expect(pending.presence).toBe("not_arrived");
    tick(env, run);
    expect(pending.presence).toBe("inside");
    expect(pending.position).toEqual(env.exit);
    const group = run.people.filter((p) => p.groupId === pending.groupId);
    expect(group.every((p) => p.presence === "inside")).toBe(true);
    expect(
      newScenario(env).people.find((p) => p.id === pending.id)?.presence,
    ).toBe("not_arrived");
    expect(run.transactions).toEqual([]);
  });
});

afterEach(() => vi.unstubAllGlobals());
describe("structured research", () => {
  it("resolves identity before topic searches, preserves partial results and field evidence", async () => {
    const requests: Record<string, any>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string);
        requests.push(body);
        if (body.response_format)
          return new Response(
            JSON.stringify({
              choices: [
                { message: { content: JSON.stringify(configuration("mall")) } },
              ],
            }),
          );
        const instructions = body.messages[0].content as string;
        if (instructions.includes("opening hours"))
          throw new Error("Unavailable");
        const identity = instructions.includes("Resolve the exact");
        if (!identity)
          expect(
            JSON.parse(body.messages[1].content).identitySources,
          ).toHaveLength(1);
        const topic = identity
          ? "identity"
          : instructions.includes("floor plans")
            ? "layout"
            : "roster";
        return new Response(
          JSON.stringify({
            baseten: {
              iterations: [
                {
                  server_tool_calls: [{ status: "succeeded" }],
                  continuation_messages: [
                    {
                      role: "tool",
                      content: `Title: Official ${topic}\nURL: https://example.org/${topic}\nOfficial venue evidence for ${topic}.`,
                    },
                  ],
                },
              ],
            },
          }),
        );
      }),
    );
    const stages: string[] = [];
    const env = await researchEnvironment(
      { BASETEN_API_KEY: "test", BASETEN_MODEL: "test" } as AIEnv,
      "Test mall",
      "test",
      (s) => stages.push(s),
    );
    expect(requests).toHaveLength(5);
    expect(env.researchStatus).toBe("partial");
    expect(env.sources.map((s) => s.topic)).toEqual([
      "identity",
      "roster",
      "layout",
    ]);
    expect(new Set(env.sources.map((s) => s.id)).size).toBe(3);
    expect(env.assumptions.some((s) => s.includes("operations research"))).toBe(
      true,
    );
    expect(stages.length).toBe(3);
  });
});
