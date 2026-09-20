import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveVisualContext,
  scenePalette,
  buildingDesignContext,
} from "../src/core/visualContext";
import { pickStyleId } from "../src/core/styleCatalog";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import { contextualPrimitives } from "../src/ui/buildings/contextual";
import { B, palette } from "../src/ui/buildings/primitives";
import { generateBuilding, type AIEnv } from "../cloudflare/ai";

afterEach(() => vi.unstubAllGlobals());
describe("setting-aware rendering", () => {
  it("distinguishes indoor, airside, historic and coastal settings without inventing tropical vegetation", () => {
    expect(resolveVisualContext("A shopping mall", "mall")).toMatchObject({
      setting: "interior",
      vegetation: "planters",
    });
    expect(
      resolveVisualContext("An airport terminal", "airport"),
    ).toMatchObject({ setting: "airport", vegetation: "sparse" });
    expect(
      resolveVisualContext("Historic brick streets", "neighborhood")
        .architecture,
    ).toBe("historic");
    expect(
      resolveVisualContext("An alpine timber village", "neighborhood"),
    ).toMatchObject({ architecture: "timber", vegetation: "conifer" });
    expect(
      resolveVisualContext("A waterfront district", "neighborhood").vegetation,
    ).toBe("deciduous");
    expect(
      resolveVisualContext("A tropical beach town", "neighborhood"),
    ).toMatchObject({ setting: "coastal", vegetation: "palm" });
  });
  it("uses coherent material palettes and preserves supplied visual direction", () => {
    const context = resolveVisualContext("A district", "neighborhood", {
      setting: "urban",
      architecture: "historic",
      vegetation: "deciduous",
      description: "Brick facades and stone trim",
    });
    expect(scenePalette(context).wall).not.toBe(
      scenePalette(resolveVisualContext("Airport", "airport")).wall,
    );
    const data = fallbackConfiguration("Historic neighborhood");
    data.visualContext = context;
    expect(
      compileEnvironment(
        data,
        "Historic neighborhood",
        [],
        "unavailable",
        "test",
      ).visualContext,
    ).toEqual(context);
  });
  it("keeps repeated cafes as cafes, rejects unrelated preferred models and preserves surface parking", () => {
    const used = new Set<string>();
    for (let i = 0; i < 15; i++) {
      const style = pickStyleId("building", 42, i, `Coffee shop ${i}`, used, {
        preferred: "space-launch",
        setting: "urban",
      });
      expect(style).toBe("cafe");
      used.add(style);
    }
    expect(pickStyleId("parking_lot", 42, 0, "Surface parking", used)).toBe("");
    expect(
      pickStyleId("building", 42, 1, "Customs hall", used, {
        preferred: "castle",
        setting: "airport",
      }),
    ).toMatch(/terminal/);
    expect(pickStyleId("building", 42, 2, "Industrial factory", used)).toMatch(
      /factory|warehouse/,
    );
  });
  it("replaces indoor shop roofs with shopfronts, assigns glass and preserves custom designs", () => {
    const base = [B([0, 1, 0], [5, 2, 4], palette.glass)];
    const indoor = resolveVisualContext("Mall", "mall");
    const storefront = contextualPrimitives(base, indoor, "#c7c5ba", "cafe");
    expect(storefront.length).toBeGreaterThan(8);
    expect(storefront.some((p) => p.material === "glass")).toBe(true);
    expect(storefront.every((p) => p.kind === "box")).toBe(true);
    expect(contextualPrimitives(base, indoor, "#c7c5ba", "cafe", true)).toEqual(
      base,
    );
    const outdoor = contextualPrimitives(
      base,
      resolveVisualContext("City", "neighborhood"),
      "#c7c5ba",
      "cafe",
    );
    expect(outdoor[0].material).toBe("glass");
    expect(outdoor).toHaveLength(1);
  });
  it("includes scene, footprint and evidence in custom-building context so cached briefs stay contextual", () => {
    const data = fallbackConfiguration("Small cafe");
    const env = compileEnvironment(
      data,
      "Small cafe",
      [],
      "unavailable",
      "test",
    );
    const first = buildingDesignContext(env, env.places[0].id);
    env.visualContext = resolveVisualContext(
      "Tropical coastal kiosk",
      "neighborhood",
    );
    const second = buildingDesignContext(env, env.places[0].id);
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
    expect(second.place?.footprint).toEqual(env.places[0].footprint);
    expect(second.evidence).toEqual([]);
  });
  it("sends contextual data to custom generation and accepts material-tagged output", async () => {
    const data = fallbackConfiguration("Historic street");
    const env = compileEnvironment(
      data,
      "Historic street",
      [],
      "unavailable",
      "test",
    );
    const context = buildingDesignContext(env, env.places[0].id);
    const primitives = [
      {
        kind: "box",
        position: [0, 0.1, 0],
        scale: [8, 0.2, 6],
        material: "masonry",
      },
      {
        kind: "box",
        position: [0, 1.5, 0],
        scale: [7, 3, 5],
        material: "masonry",
      },
      {
        kind: "box",
        position: [0, 1.3, 2.6],
        scale: [2, 2, 0.1],
        material: "glass",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, request) => {
        const body = JSON.parse(request.body);
        expect(JSON.parse(body.messages[1].content)).toEqual({
          brief: "A small masonry cafe",
          context,
        });
        expect(body.messages[0].content).toContain("local +z");
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ primitives }) } }],
          }),
        );
      }),
    );
    const result = await generateBuilding(
      { BASETEN_API_KEY: "test", BASETEN_MODEL: "test" } as AIEnv,
      "A small masonry cafe",
      ["#a1745c"],
      context,
    );
    expect(result?.primitives[2].material).toBe("glass");
  });
});
