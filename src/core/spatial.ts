import type { Generated } from "./generation";
import type { Footprint, LayoutInfo, Point, Source, VenueKind } from "./types";

type Evidence = { sourceIds: string[]; quote: string };
const normalize = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();
/** Source IDs alone are not evidence. Require a verbatim excerpt in a retrieved record. */
export function supportedEvidence(
  evidence: Evidence | undefined,
  sources: Source[],
): string[] {
  if (!evidence || evidence.quote.trim().length < 12) return [];
  return evidence.sourceIds.filter((id) =>
    sources.some(
      (source) =>
        source.id === id &&
        normalize(source.excerpt).includes(normalize(evidence.quote)),
    ),
  );
}
export function inferVenue(description: string): VenueKind {
  if (/airport|terminal|concourse/i.test(description)) return "airport";
  if (/\bmall\b|shopping cent(?:er|re)/i.test(description)) return "mall";
  if (
    /neighbou?rhood|downtown|district|city block|high street/i.test(description)
  )
    return "neighborhood";
  if (/\bpark\b|fairground|resort/i.test(description)) return "park";
  if (/cafe|café|restaurant|barbershop|small shop|bakery/i.test(description))
    return "small_venue";
  return "generic";
}
const label = (place: Generated["places"][number]) =>
  [place.name, place.typeLabel, ...place.tags].join(" ");
function zoneFor(place: Generated["places"][number], venue: VenueKind) {
  if (place.zone) return place.zone;
  const text = label(place);
  if (/parking|car park/i.test(text)) return "Arrival area";
  if (venue === "airport")
    return /gate|concourse/i.test(text)
      ? "Concourse"
      : /security|checkpoint/i.test(text)
        ? "Checkpoint"
        : "Terminal hall";
  if (venue === "mall")
    return /food|cafe|restaurant/i.test(text)
      ? "Food court"
      : /anchor|department/i.test(text)
        ? "Anchor stores"
        : "Shopping corridor";
  if (venue === "park")
    return /ride|attraction/i.test(text)
      ? "Attractions"
      : /rest|garden/i.test(text)
        ? "Gardens"
        : "Visitor plaza";
  if (venue === "small_venue")
    return place.capabilities.includes("receive_service")
      ? "Service area"
      : "Customer area";
  return /house|residen/i.test(text) ? "Residential block" : "Commercial block";
}
export function spatialLayout(
  data: Generated,
  description: string,
  sources: Source[],
  fallback: Point[],
) {
  const venueKind = data.venueKind ?? inferVenue(description);
  const count = data.places.length;
  const notes = [
    "Building footprints, entrances and circulation paths are illustrative. Security boundaries and indoor floors are not simulated.",
  ];
  const order = data.places
    .map((_, index) => index)
    .sort((a, b) => {
      const priority = (index: number) => {
        const text = label(data.places[index]);
        if (/parking|entrance|welcome|check.in/i.test(text)) return 0;
        if (/security|checkpoint/i.test(text)) return 1;
        if (/gate|concourse|anchor|department/i.test(text)) return 3;
        return 2;
      };
      return (
        priority(a) - priority(b) ||
        zoneFor(data.places[a], venueKind).localeCompare(
          zoneFor(data.places[b], venueKind),
        ) ||
        a - b
      );
    });
  const maxWidth = Math.max(
    12,
    ...data.places.map((p) => p.footprint?.width ?? 10),
  );
  const maxDepth = Math.max(
    8,
    ...data.places.map((p) => p.footprint?.depth ?? 8),
  );
  const pitch = maxWidth + 8;
  const aisle = venueKind === "small_venue" ? 5 : 10;
  const rowPitch = 2 * maxDepth + aisle + 12;
  const radius = Math.max(24, (count * (maxWidth + 8)) / (2 * Math.PI));
  const gateSlots = order.filter((index) =>
    /\bgate\b|concourse/i.test(label(data.places[index])),
  );
  const hallSlots = order.filter((index) => !gateSlots.includes(index));
  const concourseZ = maxWidth + aisle;
  const accesses: Point[] = [];
  const places = data.places.map((place, index) => {
    const slot = order.indexOf(index);
    const footprint: Footprint = {
      width:
        place.footprint?.width ??
        (/parking|anchor|terminal/i.test(label(place)) ? 12 : 8),
      depth: place.footprint?.depth ?? 6,
      rotation: 0,
    };
    let position: Point;
    let access: Point;
    if (venueKind === "park") {
      const angle = (slot * 2 * Math.PI) / count;
      position = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
      access = {
        x: Math.cos(angle) * (radius - maxDepth - 4),
        z: Math.sin(angle) * (radius - maxDepth - 4),
      };
    } else if (venueKind === "airport") {
      const gateSlot = gateSlots.indexOf(index);
      if (gateSlot >= 0) {
        access = {
          x: (gateSlot - (gateSlots.length - 1) / 2) * pitch,
          z: concourseZ,
        };
        position = {
          x: access.x,
          z: access.z + aisle / 2 + footprint.depth / 2,
        };
      } else {
        const hallSlot = hallSlots.indexOf(index);
        access = {
          x: 0,
          z:
            (Math.floor(hallSlot / 2) - Math.ceil(hallSlots.length / 2) + 1) *
            pitch,
        };
        position = {
          x: (hallSlot % 2 ? 1 : -1) * (aisle / 2 + footprint.depth / 2),
          z: access.z,
        };
      }
    } else if (venueKind === "generic") {
      position = fallback[index];
      access = { x: 0, z: 0 };
    } else {
      const columns = venueKind === "neighborhood" ? 4 : Math.ceil(count / 2);
      const row = Math.floor(slot / (columns * 2));
      const column = Math.floor((slot % (columns * 2)) / 2);
      const side = slot % 2 ? 1 : -1;
      access = { x: (column - (columns - 1) / 2) * pitch, z: row * rowPitch };
      position = {
        x: access.x,
        z: access.z + side * (aisle / 2 + footprint.depth / 2),
      };
    }
    footprint.rotation = Math.atan2(
      access.x - position.x,
      access.z - position.z,
    );
    const entry = {
      x:
        position.x + Math.sin(footprint.rotation) * (footprint.depth / 2 + 0.7),
      z:
        position.z + Math.cos(footprint.rotation) * (footprint.depth / 2 + 0.7),
    };
    accesses[index] = venueKind === "generic" ? entry : access;
    return {
      position,
      entry,
      footprint,
      zone: zoneFor(place, venueKind),
      geographic: undefined as
        | { latitude: number; longitude: number; sourceIds: string[] }
        | undefined,
    };
  });
  // Never treat model-invented coordinates as measured geometry. Both numbers must occur
  // in the same quoted retrieval excerpt, with matching source IDs.
  const anchors = data.places.flatMap((place, index) => {
    const geo = place.geographic;
    const sourceIds = supportedEvidence(geo?.evidence, sources);
    const numbers =
      geo?.evidence.quote.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    if (
      !geo ||
      !sourceIds.length ||
      !normalize(geo.evidence.quote).includes(normalize(place.name)) ||
      !numbers.includes(geo.latitude) ||
      !numbers.includes(geo.longitude)
    )
      return [];
    return [
      { index, latitude: geo.latitude, longitude: geo.longitude, sourceIds },
    ];
  });
  const info: LayoutInfo = { venueKind, basis: "template", notes };
  if (anchors.length) {
    const origin = {
      latitude: anchors[0].latitude,
      longitude: anchors[0].longitude,
    };
    const projected = anchors
      .map((anchor) => ({
        ...anchor,
        x:
          (((anchor.longitude - origin.longitude + 540) % 360) - 180) *
          111320 *
          Math.cos((origin.latitude * Math.PI) / 180),
        z: -(anchor.latitude - origin.latitude) * 111320,
      }))
      .filter((anchor) => Math.hypot(anchor.x, anchor.z) <= 100000);
    const unique = projected.filter(
      (anchor, i) =>
        !projected
          .slice(0, i)
          .some(
            (prior) => Math.hypot(anchor.x - prior.x, anchor.z - prior.z) < 1,
          ),
    );
    if (unique.length !== anchors.length)
      notes.push(
        "Duplicate or out-of-area coordinates were excluded; those places use illustrative placement.",
      );
    const xs = unique.map((p) => p.x),
      zs = unique.map((p) => p.z);
    const center = {
      x: (Math.max(...xs) + Math.min(...xs)) / 2,
      z: (Math.max(...zs) + Math.min(...zs)) / 2,
    };
    const metersPerUnit = Math.max(
      1,
      (Math.max(...xs) - Math.min(...xs)) / 140,
      (Math.max(...zs) - Math.min(...zs)) / 140,
    );
    info.origin = {
      latitude: origin.latitude - center.z / 111320,
      longitude:
        ((origin.longitude +
          center.x / (111320 * Math.cos((origin.latitude * Math.PI) / 180)) +
          540) %
          360) -
        180,
    };
    info.metersPerUnit = metersPerUnit;
    info.basis = unique.length === count ? "geographic" : "mixed";
    const anchoredIds = new Set(unique.map((p) => p.index));
    const right = (Math.max(...xs) - center.x) / metersPerUnit + 25;
    let unknown = 0;
    for (const [index, place] of places.entries()) {
      if (anchoredIds.has(index)) continue;
      place.position = {
        x: right + (unknown % 4) * pitch,
        z: Math.floor(unknown / 4) * rowPitch,
      };
      unknown++;
    }
    for (const anchor of unique) {
      const place = places[anchor.index];
      place.position = {
        x: (anchor.x - center.x) / metersPerUnit,
        z: (anchor.z - center.z) / metersPerUnit,
      };
      place.geographic = {
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        sourceIds: anchor.sourceIds,
      };
      const nearest = Math.min(
        ...unique
          .filter((p) => p.index !== anchor.index)
          .map(
            (p) => Math.hypot(p.x - anchor.x, p.z - anchor.z) / metersPerUnit,
          ),
      );
      place.footprint.width = Math.min(place.footprint.width, nearest * 0.4);
      place.footprint.depth = Math.min(place.footprint.depth, nearest * 0.4);
    }
    for (const [index, place] of places.entries()) {
      place.footprint.rotation = 0;
      place.entry = {
        x: place.position.x,
        z: place.position.z + place.footprint.depth / 2 + 0.7,
      };
      accesses[index] = place.entry;
    }
    notes.push(
      `${unique.length}/${count} place positions use source-supported coordinates; unlocated places are in a separate illustrative area. Paths and travel speeds are not surveyed or calibrated to geographic distance.`,
    );
  } else
    notes.push(
      `Uses the ${venueKind.replaceAll("_", " ")} layout template; no usable source-supported coordinates were retrieved.`,
    );
  const west =
    Math.min(...places.map((p) => p.position.x - p.footprint.width / 2)) - 8;
  const route = (from: number, to: number): Point[] => {
    const a = places[from],
      b = places[to];
    if (info.basis !== "template" || venueKind === "generic")
      return [a.entry, b.entry].map((p) => ({ ...p }));
    const middle: Point[] = [];
    if (venueKind === "park") {
      const start = order.indexOf(from),
        end = order.indexOf(to);
      const forward = (end - start + count) % count;
      const step = forward <= count / 2 ? 1 : -1;
      for (let i = start; i !== end; i = (i + step + count) % count)
        middle.push(accesses[order[i]]);
      middle.push(accesses[to]);
    } else if (venueKind === "airport") {
      middle.push(accesses[from]);
      const fromGate = gateSlots.includes(from),
        toGate = gateSlots.includes(to);
      if (fromGate !== toGate) middle.push({ x: 0, z: concourseZ });
      middle.push(accesses[to]);
    } else {
      middle.push(accesses[from]);
      if (accesses[from].z !== accesses[to].z)
        middle.push(
          { x: west, z: accesses[from].z },
          { x: west, z: accesses[to].z },
        );
      middle.push(accesses[to]);
    }
    return [a.entry, ...middle, b.entry]
      .filter(
        (point, index, all) =>
          index === 0 ||
          Math.hypot(point.x - all[index - 1].x, point.z - all[index - 1].z) >
            0.01,
      )
      .map((p) => ({ ...p }));
  };
  return {
    places,
    info,
    route,
    exit: info.basis !== "template" || venueKind === "generic"
      ? { x: west, z: places[order[0]].entry.z }
      : venueKind === "airport"
        ? { x: 0, z: Math.min(...accesses.map((p) => p.z)) - 10 }
        : venueKind === "park"
          ? { x: -(radius - maxDepth - 4), z: 0 }
          : { x: Math.min(...accesses.map((p) => p.x)) - pitch / 2, z: 0 },
  };
}
