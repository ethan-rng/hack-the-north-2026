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
import type { Event, SimSpec } from "@/sim/schema";

interface Props {
  spec: SimSpec;
  events: Event[];
  currentTick: number;
  onAgentClick?: (agentId: string) => void;
}

export function PixiCanvas({ spec, events, currentTick, onAgentClick }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layerRefs = useRef<{ places: Container; agents: Container } | null>(null);
  const layout = useRef<PlaceLayout[]>([]);
  const traj = useRef(buildTrajectories(events));

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
        background: 0xffffff,
        antialias: true,
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
      const places = new Container();
      const agents = new Container();
      app.stage.addChild(places);
      app.stage.addChild(agents);
      layerRefs.current = { places, agents };
      drawPlaces(places, layout.current);
      drawAgents(agents, snapshotAt(traj.current, layout.current, currentTick), onAgentClick);
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
    drawAgents(layers.agents, snapshotAt(traj.current, layout.current, currentTick), onAgentClick);
  }, [currentTick, spec, events, onAgentClick]);

  return <div ref={hostRef} className="rounded-md border border-zinc-200 bg-white" style={{ width: CANVAS_W, height: CANVAS_H }} />;
}

function drawPlaces(container: Container, places: PlaceLayout[]): void {
  container.removeChildren();
  const labelStyle = new TextStyle({
    fontFamily: "system-ui",
    fontSize: 12,
    fill: 0x475569,
    fontWeight: "600",
  });
  for (const p of places) {
    const g = new Graphics();
    g.roundRect(p.center.x - p.w / 2, p.center.y - p.h / 2, p.w, p.h, 12).fill(p.color).stroke({
      color: 0x475569,
      width: 1,
    });
    container.addChild(g);
    const text = new Text({ text: p.label, style: labelStyle });
    text.position.set(p.center.x - p.w / 2 + 8, p.center.y - p.h / 2 + 6);
    container.addChild(text);
  }
}

function drawAgents(
  container: Container,
  agents: AgentSnapshot[],
  onAgentClick?: (agentId: string) => void,
): void {
  container.removeChildren();
  for (const a of agents) {
    const g = new Graphics();
    g.circle(a.x, a.y, a.state === "in_queue" ? 4.5 : 3.5)
      .fill(colorForSegment(a.segmentId))
      .stroke({ color: 0xffffff, width: 1 });
    g.eventMode = "static";
    g.cursor = "pointer";
    if (onAgentClick) g.on("pointertap", () => onAgentClick(a.agentId));
    container.addChild(g);
  }
}
