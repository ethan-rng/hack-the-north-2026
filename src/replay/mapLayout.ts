import type { Event, SimSpec } from "@/sim/schema";

export interface Point {
  x: number;
  y: number;
}

export interface PlaceLayout {
  id: string;
  kind: string;
  label: string;
  center: Point;
  w: number;
  h: number;
  color: number;
}

export const CANVAS_W = 720;
export const CANVAS_H = 420;

// Segment colors — reused between baseline and what-if canvases.
export const SEGMENT_COLORS: Record<string, number> = {
  students: 0x2563eb,
  office_workers: 0x059669,
  locals: 0xd97706,
  families: 0xdb2777,
  tourists: 0x7c3aed,
  regulars: 0x0891b2,
  unknown: 0x64748b,
};

export function colorForSegment(id: string): number {
  return SEGMENT_COLORS[id] ?? SEGMENT_COLORS.unknown;
}

const KIND_COLORS: Record<string, number> = {
  residential: 0xe0e7ff,
  school: 0xfef3c7,
  office: 0xd1fae5,
  gym: 0xffedd5,
  transit: 0xe5e7eb,
  our_business: 0xdbeafe,
  competitor: 0xfee2e2,
};

// Deterministic grid layout so baseline and what-if line up.
export function layoutPlaces(spec: SimSpec): PlaceLayout[] {
  const cols = 3;
  const cellW = CANVAS_W / cols;
  const cellH = CANVAS_H / Math.ceil(spec.places.length / cols);
  return spec.places.map((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + cellW / 2;
    const cy = row * cellH + cellH / 2;
    return {
      id: p.id,
      kind: p.kind,
      label: labelFor(p.id),
      center: { x: cx, y: cy },
      w: cellW - 40,
      h: cellH - 40,
      color: KIND_COLORS[p.kind] ?? 0xe5e7eb,
    };
  });
}

function labelFor(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface AgentSnapshot {
  agentId: string;
  segmentId: string;
  x: number;
  y: number;
  state: "home" | "at_place" | "in_queue" | "left";
}

// Walk events once and produce, for every tick, the position of every agent.
// Ticks with no change reuse the previous snapshot lazily via getAt().
export interface Trajectory {
  segmentId: string;
  // Sorted by tick asc.
  frames: { tick: number; placeId: string | null; state: "home" | "at_place" | "in_queue" | "left" }[];
}

export function buildTrajectories(events: Event[]): Map<string, Trajectory> {
  const traj = new Map<string, Trajectory>();
  for (const e of events) {
    let t = traj.get(e.agentId);
    if (!t) {
      t = { segmentId: e.segmentId, frames: [] };
      traj.set(e.agentId, t);
    }
    if (e.kind === "spawn") t.frames.push({ tick: e.tick, placeId: null, state: "home" });
    else if (e.kind === "go_out")
      t.frames.push({ tick: e.tick, placeId: e.chosen === "yes" ? null : null, state: "home" });
    else if (e.kind === "arrive" && e.place_id)
      t.frames.push({ tick: e.tick, placeId: e.place_id, state: "at_place" });
    else if (e.kind === "queue" && e.place_id)
      t.frames.push({ tick: e.tick, placeId: e.place_id, state: "in_queue" });
    else if (e.kind === "order" && e.place_id)
      t.frames.push({ tick: e.tick, placeId: e.place_id, state: "at_place" });
    else if (e.kind === "walkout" || e.kind === "leave")
      t.frames.push({ tick: e.tick, placeId: null, state: "home" });
  }
  return traj;
}

export function snapshotAt(
  traj: Map<string, Trajectory>,
  places: PlaceLayout[],
  tick: number,
): AgentSnapshot[] {
  const placeById = new Map(places.map((p) => [p.id, p]));
  const homeAnchor =
    placeById.get("home_area") ??
    places.find((p) => p.kind === "residential") ??
    places[0];
  const out: AgentSnapshot[] = [];
  let agentIdx = 0;
  for (const [agentId, t] of traj) {
    let currentFrame = t.frames[0];
    for (const f of t.frames) {
      if (f.tick <= tick) currentFrame = f;
      else break;
    }
    const anchor =
      currentFrame && currentFrame.placeId
        ? placeById.get(currentFrame.placeId) ?? homeAnchor
        : homeAnchor;
    const pos = jitterAround(anchor, agentIdx);
    out.push({
      agentId,
      segmentId: t.segmentId,
      x: pos.x,
      y: pos.y,
      state: currentFrame?.state ?? "home",
    });
    agentIdx++;
  }
  return out;
}

function jitterAround(place: PlaceLayout, seed: number): Point {
  // Deterministic scatter within the place rectangle.
  const a = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const b = (Math.sin(seed * 78.233) * 43758.5453) % 1;
  const dx = (a - Math.floor(a) - 0.5) * (place.w - 16);
  const dy = (b - Math.floor(b) - 0.5) * (place.h - 16);
  return { x: place.center.x + dx, y: place.center.y + dy };
}
