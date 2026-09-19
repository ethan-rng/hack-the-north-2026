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
  strokeColor: number;
  labelColor: number;
  icon: string;
}

export const CANVAS_W = 720;
export const CANVAS_H = 420;

// Segment colors — reused between baseline and what-if canvases.
export const SEGMENT_COLORS: Record<string, number> = {
  students: 0x2563eb,
  office_workers: 0x059669,
  locals: 0xd97706,
  regulars: 0x0891b2,
  walk_ins: 0x7c3aed,
  premium_seekers: 0xdb2777,
  night_crowd: 0x9333ea,
  families: 0xdc2626,
  occasional: 0x0284c7,
  new_visitors: 0xea580c,
  unknown: 0x71717a,
};

export function colorForSegment(id: string): number {
  return SEGMENT_COLORS[id] ?? SEGMENT_COLORS.unknown;
}

const KIND_STYLE: Record<string, { fill: number; stroke: number; label: number; icon: string }> = {
  residential: { fill: 0xeef2ff, stroke: 0xa5b4fc, label: 0x3730a3, icon: "◉" },
  school: { fill: 0xfef3c7, stroke: 0xfcd34d, label: 0x92400e, icon: "▲" },
  office: { fill: 0xd1fae5, stroke: 0x6ee7b7, label: 0x065f46, icon: "◼" },
  gym: { fill: 0xffedd5, stroke: 0xfdba74, label: 0x9a3412, icon: "◆" },
  transit: { fill: 0xe5e7eb, stroke: 0x9ca3af, label: 0x374151, icon: "◎" },
  our_business: { fill: 0xdbeafe, stroke: 0x60a5fa, label: 0x1e40af, icon: "★" },
  competitor: { fill: 0xfee2e2, stroke: 0xfca5a5, label: 0x991b1b, icon: "×" },
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
    const style = KIND_STYLE[p.kind] ?? KIND_STYLE.residential;
    return {
      id: p.id,
      kind: p.kind,
      label: labelFor(p.id),
      center: { x: cx, y: cy },
      w: cellW - 28,
      h: cellH - 28,
      color: style.fill,
      strokeColor: style.stroke,
      labelColor: style.label,
      icon: style.icon,
    };
  });
}

function labelFor(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface AgentSnapshot {
  agentId: string;
  segmentId: string;
  x: number;
  y: number;
  state: "home" | "at_place" | "in_queue" | "left";
}

// Walk events once and produce, for every tick, the position of every agent.
export interface Trajectory {
  segmentId: string;
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
  const a = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const b = (Math.sin(seed * 78.233) * 43758.5453) % 1;
  const dx = (a - Math.floor(a) - 0.5) * (place.w - 24);
  const dy = (b - Math.floor(b) - 0.5) * (place.h - 24);
  return { x: place.center.x + dx, y: place.center.y + dy };
}
