import { describe, expect, it } from "vitest";
import {
  generatedBuildingSchema,
  reasonableBuilding,
} from "../src/core/buildingSchema";

const ok = {
  primitives: [
    { kind: "box", position: [0, 0.1, 0], scale: [4, 0.2, 3], color: "#a58269" },
    { kind: "box", position: [0, 1.2, 0], scale: [3.5, 2, 2.4], color: "#c9b478" },
    {
      kind: "cone",
      position: [0, 2.8, 0],
      radius: 2.2,
      height: 1.4,
      color: "#5b3f2f",
    },
    {
      kind: "cyl",
      position: [0, 0.6, 1.3],
      radiusTop: 0.4,
      radiusBottom: 0.4,
      height: 1.2,
      color: "#385965",
    },
  ],
} as const;

describe("dynamic building schema", () => {
  it("accepts a plausible little house", () => {
    const parsed = generatedBuildingSchema.parse(ok);
    expect(parsed.primitives).toHaveLength(4);
    expect(reasonableBuilding(parsed)).toBe(true);
  });

  it("rejects floating buildings", () => {
    const floating = {
      primitives: [
        {
          kind: "box",
          position: [0, 3.2, 0],
          scale: [3, 1, 3],
          color: "#a58269",
        },
        {
          kind: "box",
          position: [0, 5, 0],
          scale: [3, 1, 3],
          color: "#a58269",
        },
        {
          kind: "box",
          position: [0, 6.5, 0],
          scale: [3, 1, 3],
          color: "#a58269",
        },
      ],
    };
    const parsed = generatedBuildingSchema.parse(floating);
    expect(reasonableBuilding(parsed)).toBe(false);
  });

  it("marks primitives drifted outside the footprint as unreasonable", () => {
    const drift = {
      primitives: [
        {
          kind: "box" as const,
          position: [0, 0.1, 0] as [number, number, number],
          scale: [3, 0.2, 3] as [number, number, number],
        },
        {
          kind: "box" as const,
          position: [12, 1, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        {
          kind: "box" as const,
          position: [0, 1, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
      ],
    };
    const parsed = generatedBuildingSchema.parse(drift);
    expect(reasonableBuilding(parsed)).toBe(false);
  });

  it("rejects malformed colors and non-hex garbage", () => {
    const bad = {
      primitives: [
        {
          kind: "box",
          position: [0, 0.1, 0],
          scale: [3, 0.2, 3],
          color: "rebeccapurple",
        },
        { kind: "box", position: [0, 1, 0], scale: [1, 1, 1] },
        { kind: "box", position: [0, 2, 0], scale: [1, 1, 1] },
      ],
    };
    expect(() => generatedBuildingSchema.parse(bad)).toThrow();
  });

  it("caps primitive count", () => {
    const wide = {
      primitives: Array.from({ length: 61 }, (_, i) => ({
        kind: "box" as const,
        position: [0, 0.1, 0] as [number, number, number],
        scale: [1, 0.1, 1] as [number, number, number],
      })),
    };
    expect(() => generatedBuildingSchema.parse(wide)).toThrow();
  });
});
