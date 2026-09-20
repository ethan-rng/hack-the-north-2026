"use client";

import { useEffect, useRef } from "react";
import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import {
  CANVAS_H,
  CANVAS_W,
  colorForSegment,
  layoutPlaces,
  snapshotAt,
  buildTrajectories,
  type PlaceLayout,
  type AgentSnapshot,
} from "./mapLayout";
import { daylightBackgroundAt } from "./dayNight";
import type { Event, SimSpec } from "@/sim/schema";

interface Props {
  spec: SimSpec;
  events: Event[];
  currentTick: number;
  selectedAgentId?: string | null;
  onAgentClick?: (agentId: string) => void;
}

export function PixiCanvas({ spec, events, currentTick, selectedAgentId, onAgentClick }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layerRefs = useRef<{ bg: Container; places: Container; agents: Container } | null>(null);
  const layout = useRef<PlaceLayout[]>([]);
  const traj = useRef(buildTrajectories(events));
  const daylight = daylightBackgroundAt(spec, currentTick);

  useEffect(() => {
    traj.current = buildTrajectories(events);
  }, [events]);

  useEffect(() => {
    layout.current = layoutPlaces(spec);
  }, [spec]);

  useEffect(() => {
    let cancelled = false;
    let app: Application | null = null;
    (async () => {
      app = new Application();
      await app.init({
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      appRef.current = app;
      const host = hostRef.current;
      if (host) {
        host.innerHTML = "";
        host.appendChild(app.canvas);
      }
      const bg = new Container();
      const places = new Container();
      const agents = new Container();
      app.stage.addChild(bg);
      app.stage.addChild(places);
      app.stage.addChild(agents);
      layerRefs.current = { bg, places, agents };
      drawGrid(bg);
      drawPlaces(places, layout.current);
      drawAgents(agents, snapshotAt(traj.current, layout.current, currentTick), selectedAgentId ?? null, onAgentClick);
    })();
    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layers = layerRefs.current;
    if (!layers) return;
    drawPlaces(layers.places, layout.current);
    drawAgents(
      layers.agents,
      snapshotAt(traj.current, layout.current, currentTick),
      selectedAgentId ?? null,
      onAgentClick,
    );
  }, [currentTick, spec, events, selectedAgentId, onAgentClick]);

  return (
    <div
      ref={hostRef}
      className="rounded-[10px] border border-[var(--color-app-border)] overflow-hidden"
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        boxShadow: "var(--shadow-flat)",
        backgroundColor: daylight.bottom,
        backgroundImage: `linear-gradient(180deg, ${daylight.top}, ${daylight.bottom})`,
        transition: "background-color 400ms linear, background-image 400ms linear",
      }}
    />
  );
}

function drawGrid(container: Container): void {
  container.removeChildren();
  const g = new Graphics();
  const step = 24;
  for (let x = 0; x < CANVAS_W; x += step) g.moveTo(x, 0).lineTo(x, CANVAS_H);
  for (let y = 0; y < CANVAS_H; y += step) g.moveTo(0, y).lineTo(CANVAS_W, y);
  g.stroke({ color: 0xe6e4dd, width: 0.5, alpha: 0.5 });
  container.addChild(g);
}

function drawPlaces(container: Container, places: PlaceLayout[]): void {
  container.removeChildren();
  const labelStyle = new TextStyle({
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  });
  const iconStyle = new TextStyle({
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 14,
    fontWeight: "500",
  });
  for (const p of places) {
    // Soft shadow via a slightly-offset darker rect underneath
    const shadow = new Graphics();
    shadow
      .roundRect(p.center.x - p.w / 2 + 1, p.center.y - p.h / 2 + 2, p.w, p.h, 12)
      .fill({ color: 0x000000, alpha: 0.04 });
    container.addChild(shadow);

    const g = new Graphics();
    g.roundRect(p.center.x - p.w / 2, p.center.y - p.h / 2, p.w, p.h, 12)
      .fill(p.color)
      .stroke({ color: p.strokeColor, width: 1 });
    container.addChild(g);

    const icon = new Text({ text: p.icon, style: { ...iconStyle, fill: p.labelColor } });
    icon.position.set(p.center.x - p.w / 2 + 10, p.center.y - p.h / 2 + 6);
    container.addChild(icon);

    const label = new Text({ text: p.label, style: { ...labelStyle, fill: p.labelColor } });
    label.position.set(p.center.x - p.w / 2 + 28, p.center.y - p.h / 2 + 8);
    container.addChild(label);
  }
}

function drawAgents(
  container: Container,
  agents: AgentSnapshot[],
  selectedId: string | null,
  onAgentClick?: (agentId: string) => void,
): void {
  container.removeChildren();
  for (const a of agents) {
    const g = new Graphics();
    const color = colorForSegment(a.segmentId);
    const isSelected = selectedId === a.agentId;
    const baseRadius = a.state === "in_queue" ? 4.5 : 3.5;

    if (isSelected) {
      // Outer ring for the selected agent
      g.circle(a.x, a.y, baseRadius + 5).fill({ color, alpha: 0.2 });
      g.circle(a.x, a.y, baseRadius + 3).stroke({ color, width: 1.5 });
    }
    g.circle(a.x, a.y, baseRadius).fill(color).stroke({ color: 0xffffff, width: 1 });
    g.eventMode = "static";
    g.cursor = "pointer";
    if (onAgentClick) g.on("pointertap", () => onAgentClick(a.agentId));
    container.addChild(g);
  }
}
