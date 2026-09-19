"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrthographicCamera } from "@react-three/drei";
import { useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import {
  CANVAS_H,
  CANVAS_W,
  buildTrajectories,
  colorForSegment,
  layoutPlaces,
  snapshotAt,
  type AgentSnapshot,
  type PlaceLayout,
} from "./mapLayout";
import type { Event, SimSpec } from "@/sim/schema";

interface Props {
  spec: SimSpec;
  events: Event[];
  currentTick: number;
  selectedAgentId?: string | null;
  onAgentClick?: (agentId: string) => void;
}

// Height per place kind — gives visual weight to important places.
const KIND_HEIGHT: Record<string, number> = {
  residential: 0.9,
  school: 1.2,
  office: 1.6,
  gym: 1.0,
  transit: 0.6,
  our_business: 2.0,
  competitor: 1.5,
};

// Roof accent color per kind (slightly deeper than base for the low-poly look).
const KIND_ROOF: Record<string, number> = {
  residential: 0xc7d2fe,
  school: 0xfde68a,
  office: 0xa7f3d0,
  gym: 0xfed7aa,
  transit: 0xd1d5db,
  our_business: 0x93c5fd,
  competitor: 0xfca5a5,
};

const PIXEL_TO_WORLD = 1 / 40;
function toWorldX(px: number): number {
  return (px - CANVAS_W / 2) * PIXEL_TO_WORLD;
}
function toWorldZ(py: number): number {
  return (py - CANVAS_H / 2) * PIXEL_TO_WORLD;
}

export function LowPolyScene({ spec, events, currentTick, selectedAgentId, onAgentClick }: Props) {
  const places = useMemo(() => layoutPlaces(spec), [spec]);
  const traj = useMemo(() => buildTrajectories(events), [events]);
  const agents = useMemo(() => snapshotAt(traj, places, currentTick), [traj, places, currentTick]);

  return (
    <div
      className="rounded-[10px] border border-[var(--color-app-border)] overflow-hidden"
      style={{ width: CANVAS_W, height: CANVAS_H, boxShadow: "var(--shadow-flat)" }}
    >
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }} style={{ background: "#f4f1ea" }}>
        <Suspense fallback={null}>
          <SceneCamera />
          <Lights />
          <Ground width={CANVAS_W * PIXEL_TO_WORLD} depth={CANVAS_H * PIXEL_TO_WORLD} />
          {places.map((p) => (
            <Place key={p.id} place={p} />
          ))}
          {agents.map((a) => (
            <Agent
              key={a.agentId}
              agent={a}
              selected={selectedAgentId === a.agentId}
              onClick={() => onAgentClick?.(a.agentId)}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}

function SceneCamera() {
  return (
    <OrthographicCamera
      makeDefault
      position={[10, 10, 10]}
      zoom={42}
      near={-50}
      far={100}
    />
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.9} color={0xffffff} />
      <directionalLight position={[8, 14, 6]} intensity={0.75} color={0xfff8ee} />
      <directionalLight position={[-6, 8, -4]} intensity={0.25} color={0xd6e4ff} />
    </>
  );
}

function Ground({ width, depth }: { width: number; depth: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 4, depth + 4]} />
        <meshLambertMaterial color={0xebe6dc} />
      </mesh>
      {/* subtle grid lines painted onto the ground */}
      <gridHelper args={[Math.max(width, depth) + 4, Math.ceil(width) + 4, 0xd6d1c6, 0xd6d1c6]} position={[0, 0, 0]} />
    </group>
  );
}

function Place({ place }: { place: PlaceLayout }) {
  const [hovered, setHovered] = useState(false);
  const height = KIND_HEIGHT[place.kind] ?? 1;
  const w = place.w * PIXEL_TO_WORLD;
  const d = place.h * PIXEL_TO_WORLD;
  const cx = toWorldX(place.center.x);
  const cz = toWorldZ(place.center.y);
  const bodyColor = hexColor(place.color);
  const roofColor = hexColor(KIND_ROOF[place.kind] ?? place.color);
  const strokeColor = hexColor(place.strokeColor);

  return (
    <group position={[cx, 0, cz]}>
      {/* Body */}
      <mesh
        position={[0, height / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w * 0.9, height, d * 0.9]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>
      {/* Roof accent slab — thin flat tile so the roof reads as a distinct plane */}
      <mesh position={[0, height + 0.02, 0]}>
        <boxGeometry args={[w * 0.92, 0.06, d * 0.92]} />
        <meshLambertMaterial color={roofColor} />
      </mesh>
      {/* Outline via wireframe (soft) */}
      <lineSegments position={[0, height / 2, 0]}>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(w * 0.9, height, d * 0.9)]} />
        <lineBasicMaterial attach="material" color={strokeColor} transparent opacity={0.35} />
      </lineSegments>

      <Html
        position={[0, height + 0.35, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <span className="mr-1">{place.icon}</span>
          {place.label}
        </div>
      </Html>
    </group>
  );
}

function Agent({
  agent,
  selected,
  onClick,
}: {
  agent: AgentSnapshot;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const color = hexColor(colorForSegment(agent.segmentId));
  const size = agent.state === "in_queue" ? 0.18 : 0.14;
  const height = 0.28;

  // Selected agent gently bobs to draw the eye without becoming a full animation loop.
  useFrame((state) => {
    if (!ref.current) return;
    if (selected) {
      const t = state.clock.getElapsedTime();
      ref.current.position.y = height / 2 + Math.sin(t * 2.5) * 0.06 + 0.06;
    } else {
      ref.current.position.y = height / 2;
    }
  });

  return (
    <group position={[toWorldX(agent.x), height / 2, toWorldZ(agent.y)]}>
      {selected && (
        <mesh position={[0, -height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.6, size * 2.2, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group ref={ref}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <boxGeometry args={[size, height, size]} />
          <meshLambertMaterial color={color} emissive={selected ? color : 0x000000} emissiveIntensity={selected ? 0.3 : 0} />
        </mesh>
      </group>
    </group>
  );
}

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}
