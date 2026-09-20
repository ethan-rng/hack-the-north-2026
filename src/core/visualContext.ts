import { z } from "zod";
import type { Environment, VenueKind } from "./types";

export const visualContextSchema = z.object({
  setting: z.enum([
    "urban",
    "suburban",
    "rural",
    "coastal",
    "airport",
    "interior",
    "park",
  ]),
  architecture: z.enum([
    "contemporary",
    "historic",
    "industrial",
    "timber",
    "mediterranean",
  ]),
  vegetation: z.enum(["deciduous", "conifer", "palm", "sparse", "planters"]),
  // This is model-authored scene context, not a storage boundary. Keep a
  // generous ceiling so a useful Claude description is not rejected merely
  // because it includes materials, climate, and setting details.
  description: z.string().max(1200),
});
export type VisualContext = z.infer<typeof visualContextSchema>;
export interface ScenePalette {
  wall: string;
  roof: string;
  trim: string;
  glass: string;
  ground: string;
  paving: string;
  foliage: string;
}
export function resolveVisualContext(
  description: string,
  venue?: VenueKind,
  supplied?: VisualContext,
): VisualContext {
  if (supplied) return supplied;
  const text = description.toLowerCase();
  const setting: VisualContext["setting"] =
    /\bbeach\b|coastal|seaside|waterfront|harbou?r/.test(text)
      ? "coastal"
      : venue === "airport"
        ? "airport"
        : venue === "mall" || venue === "small_venue" || /\bindoor\b/.test(text)
          ? "interior"
          : venue === "park"
            ? "park"
            : /\brural\b|village|countryside|farm/.test(text)
              ? "rural"
              : /suburb|residential/.test(text)
                ? "suburban"
                : "urban";
  const architecture: VisualContext["architecture"] =
    /historic|victorian|heritage|old town|brick/.test(text)
      ? "historic"
      : /industrial|warehouse|factory/.test(text)
        ? "industrial"
        : /alpine|timber|wooden|log cabin/.test(text)
          ? "timber"
          : /mediterranean|terracotta|whitewashed/.test(text)
            ? "mediterranean"
            : "contemporary";
  const vegetation: VisualContext["vegetation"] =
    setting === "interior"
      ? "planters"
      : /tropical|palm/.test(text)
        ? "palm"
        : /alpine|pine|conifer/.test(text)
          ? "conifer"
          : setting === "airport" ||
              architecture === "industrial" ||
              /desert|arid/.test(text)
            ? "sparse"
            : "deciduous";
  return {
    setting,
    architecture,
    vegetation,
    description:
      "Illustrative architectural treatment inferred from the requested setting; not a surveyed reconstruction.",
  };
}
export function scenePalette(context: VisualContext): ScenePalette {
  const architecture = {
    contemporary: {
      wall: "#c7c5ba",
      roof: "#48535b",
      trim: "#e7e5dc",
      glass: "#88aab6",
    },
    historic: {
      wall: "#a1745c",
      roof: "#4b4746",
      trim: "#d7c8ac",
      glass: "#7d969a",
    },
    industrial: {
      wall: "#8f9695",
      roof: "#485153",
      trim: "#b9bbb4",
      glass: "#8aa6ad",
    },
    timber: {
      wall: "#987758",
      roof: "#46574e",
      trim: "#d4c3a1",
      glass: "#90acb0",
    },
    mediterranean: {
      wall: "#e4d7bb",
      roof: "#ae6850",
      trim: "#f0e6cc",
      glass: "#819ea1",
    },
  }[context.architecture];
  const surfaces = {
    urban: { ground: "#b6b4ab", paving: "#d6d2c7" },
    suburban: { ground: "#a9b59b", paving: "#d5cdbb" },
    rural: { ground: "#a8b48b", paving: "#ccbea1" },
    coastal: { ground: "#d9c9aa", paving: "#e8dcc8" },
    airport: { ground: "#a4a8a6", paving: "#d5d8d3" },
    interior: { ground: "#d8d5cb", paving: "#f0ece1" },
    park: { ground: "#9cac84", paving: "#d8c9aa" },
  }[context.setting];
  return {
    ...architecture,
    ...surfaces,
    foliage:
      context.vegetation === "palm"
        ? "#64866c"
        : context.vegetation === "conifer"
          ? "#496a5b"
          : "#748d68",
  };
}
export function facadeColor(context: VisualContext, index: number): string {
  const base = scenePalette(context).wall;
  const delta = [-9, 0, 7, -3, 12][index % 5];
  return (
    "#" +
    [1, 3, 5]
      .map((offset) =>
        Math.max(
          0,
          Math.min(255, parseInt(base.slice(offset, offset + 2), 16) + delta),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
/** The same contextual input forms the request and cache key; a beach kiosk and airport kiosk must not share geometry. */
export function buildingDesignContext(
  environment: Environment,
  placeId: string,
) {
  const place = environment.places.find((p) => p.id === placeId);
  return {
    version: 2,
    setting:
      environment.visualContext ??
      resolveVisualContext(
        environment.description,
        environment.layout?.venueKind,
      ),
    venue: environment.name,
    scenario: environment.description.slice(0, 1200),
    place: place
      ? {
          name: place.name,
          type: place.typeLabel,
          description: place.description,
          zone: place.zone,
          footprint: place.footprint,
        }
      : undefined,
    evidence: environment.provenance
      .filter(
        (p) =>
          p.basis === "researched" &&
          p.targetPath.startsWith(`places.${placeId}.`),
      )
      .slice(0, 4)
      .map((p) => p.note),
  };
}
export type BuildingDesignContext = ReturnType<typeof buildingDesignContext>;
