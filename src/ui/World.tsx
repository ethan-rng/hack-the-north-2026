"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  OrthographicCamera,
  Stars,
} from "@react-three/drei";
import { Component, useMemo, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import {
  BatteryLow,
  Frown,
  MessageCircle,
  Smile,
  TriangleAlert,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Environment, Person, Place, Run } from "@/core/types";

const DEFAULT_ZOOM_PERCENT = 175;
import { placeOpen, occupancy } from "@/core/engine";
import { BuildingModel, footprintBounds } from "@/ui/buildings/primitives";
import { stylesById } from "@/ui/buildings/styles";
import { daylightBackgroundForProgress } from "@/ui/daylight";

export type HeatMode = "off" | "traffic" | "occupancy" | "revenue" | "wait";
type Props = {
  environment: Environment;
  run?: Run;
  selected?: string;
  onSelect: (id: string) => void;
  preview?: boolean;
  heatMode?: HeatMode;
};
function HeatLayer({
  environment,
  run,
  mode,
}: {
  environment: Environment;
  run: Run;
  mode: HeatMode;
}) {
  if (mode === "off") return null;
  const values = environment.places.map((p) => {
    const m = run.metrics[p.id];
    if (mode === "traffic") return m?.visits ?? 0;
    if (mode === "occupancy") return occupancy(run, p.id);
    if (mode === "revenue") return m?.revenue ?? 0;
    if (mode === "wait")
      return m && m.waitSamples ? m.waitTotal / m.waitSamples : 0;
    return 0;
  });
  const max = Math.max(1, ...values);
  return (
    <>
      {environment.places.map((p, i) => {
        const intensity = values[i] / max;
        if (intensity < 0.03) return null;
        const hue = 240 - intensity * 220;
        const color = `hsl(${Math.round(hue)}, 85%, ${Math.round(50 + intensity * 6)}%)`;
        return (
          <mesh
            key={p.id}
            position={[p.position.x, 0.03, p.position.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[5.4, 40]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.3 + intensity * 0.45}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}
function Camera({
  preview,
  center,
  width,
  depth,
  onZoomChange,
}: {
  preview?: boolean;
  center: [number, number];
  width: number;
  depth: number;
  onZoomChange: (percent: number) => void;
}) {
  const { size } = useThree();
  const fittedZoom = Math.max(
    3,
    Math.min(
      preview ? 12 : 14,
      size.width / (width + 18),
      size.height / (depth + 12),
    ),
  );
  const lastPercent = useRef<number | undefined>(undefined);
  useFrame(({ camera }) => {
    const percent = Math.round((100 * camera.zoom) / fittedZoom);
    if (percent !== lastPercent.current) {
      lastPercent.current = percent;
      onZoomChange(percent);
    }
  });
  return (
    <OrthographicCamera
      makeDefault
      position={[center[0] + 42, 42, center[1] + 48]}
      zoom={fittedZoom * (DEFAULT_ZOOM_PERCENT / 100)}
      near={0.1}
      far={300}
    />
  );
}
function Box({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box position={[0, 0.6, 0]} scale={[0.25, 1.2, 0.25]} color="#96785f" />
      <mesh castShadow position={[0, 1.8, 0]}>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color="#659484" />
      </mesh>
    </group>
  );
}
function Road({
  from,
  to,
  weight = 1,
  mars = false,
}: {
  from: [number, number];
  to: [number, number];
  weight?: number;
  mars?: boolean;
}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  return (
    <group
      position={[(from[0] + to[0]) / 2, -0.04, (from[1] + to[1]) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
    >
      <Box
        position={[0, 0, 0]}
        scale={[length, 0.1, 1.25 - weight * 0.08]}
        color={mars ? (weight === 3 ? "#9b7867" : "#c39176") : weight === 3 ? "#e8dec9" : "#f7eedc"}
      />
    </group>
  );
}
function Building({
  place,
  appearance,
  selected,
  closed,
  onSelect,
}: {
  place: Place;
  appearance: { color: string; asset: string; styleId?: string };
  selected: boolean;
  closed: boolean;
  onSelect: () => void;
}) {
  const rotation =
    place.footprint?.rotation ??
    Math.atan2(
      place.entry.x - place.position.x,
      place.entry.z - place.position.z,
    );
  const style = appearance.styleId ? stylesById[appearance.styleId] : undefined;
  const primitives = useMemo(
    () =>
      style?.build({ color: closed ? "#a9aaa3" : appearance.color, closed }),
    [style, closed, appearance.color],
  );
  const bounds = useMemo(
    () =>
      primitives
        ? footprintBounds(primitives)
        : { width: 9, depth: 7, x: 0, z: 0 },
    [primitives],
  );
  const width = place.footprint?.width ?? 9;
  const depth = place.footprint?.depth ?? 7;
  return (
    <group
      position={[place.position.x, 0, place.position.z]}
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Box
        position={[0, 0.12, 0]}
        scale={[width, 0.24, depth]}
        color={selected ? "#203e48" : "#d7dac9"}
      />
      <group scale={[width / bounds.width, 1, depth / bounds.depth]}>
        <group position={[-bounds.x, 0, -bounds.z]}>
          {primitives ? (
            <BuildingModel
              primitives={primitives}
              fallbackColor={closed ? "#a9aaa3" : appearance.color}
            />
          ) : appearance.asset === "gate" ? (
            <>
              <Box
                position={[-2.5, 2.2, 0]}
                scale={[0.55, 4.4, 0.65]}
                color={appearance.color}
              />
              <Box
                position={[2.5, 2.2, 0]}
                scale={[0.55, 4.4, 0.65]}
                color={appearance.color}
              />
              <Box
                position={[0, 4.3, 0]}
                scale={[5.6, 0.8, 0.8]}
                color={appearance.color}
              />
              <Box
                position={[0, 0.6, 1]}
                scale={[3, 0.7, 0.5]}
                color="#859daa"
              />
            </>
          ) : appearance.asset === "rest" || appearance.asset === "open" ? (
            <>
              <Box
                position={[0, 0.45, 0]}
                scale={[4, 0.45, 1]}
                color="#9a8062"
              />
              <Box
                position={[0, 0.95, -0.5]}
                scale={[4, 1, 0.2]}
                color="#9a8062"
              />
              <Tree x={-2.8} z={-1.7} />
              <Tree x={2.8} z={1.5} />
            </>
          ) : appearance.asset === "parking_lot" ? (
            <>
              <Box
                position={[0, 0.24, 0]}
                scale={[8.4, 0.05, 6.4]}
                color="#3f3f3d"
              />
              {[-2.8, -1.4, 0, 1.4, 2.8].map((x) => (
                <Box
                  key={`line-${x}`}
                  position={[x, 0.28, 0]}
                  scale={[0.06, 0.02, 5.6]}
                  color="#e8e4c9"
                />
              ))}
              {[-2.1, -0.7, 0.7, 2.1].map((x, i) =>
                [-1.6, 1.6].map((cz, j) => (
                  <group
                    key={`car-${x}-${cz}`}
                    position={[x, 0.3, cz]}
                    rotation={[0, cz > 0 ? Math.PI : 0, 0]}
                  >
                    <Box
                      position={[0, 0.28, 0]}
                      scale={[1, 0.55, 2]}
                      color={
                        ["#c25c4c", "#5f8391", "#c9b478", "#88a37a"][
                          (i + j) % 4
                        ]
                      }
                    />
                    <Box
                      position={[0, 0.62, -0.2]}
                      scale={[0.88, 0.4, 1]}
                      color="#2b2b28"
                    />
                  </group>
                )),
              )}
            </>
          ) : appearance.asset === "parking_garage" ? (
            <>
              <Box
                position={[0, 0.4, 0]}
                scale={[8.4, 0.2, 5.4]}
                color={closed ? "#a9aaa3" : appearance.color}
              />
              <Box
                position={[0, 1.6, 0]}
                scale={[8.2, 0.2, 5.2]}
                color={closed ? "#a9aaa3" : appearance.color}
              />
              <Box
                position={[0, 2.8, 0]}
                scale={[8.2, 0.2, 5.2]}
                color={closed ? "#a9aaa3" : appearance.color}
              />
              <Box
                position={[0, 4, 0]}
                scale={[8.4, 0.25, 5.4]}
                color="#5c5c58"
              />
              {[-4.1, -1.4, 1.4, 4.1].map((x) => (
                <Box
                  key={`col-${x}`}
                  position={[x, 2.1, 0]}
                  scale={[0.4, 4.2, 5.2]}
                  color={closed ? "#a9aaa3" : appearance.color}
                />
              ))}
              {[1, 2.2].map((y) =>
                [-2.6, -1.2, 1.2, 2.6].map((x) => (
                  <Box
                    key={`slot-${x}-${y}`}
                    position={[x, y, 2.55]}
                    scale={[1, 0.6, 0.06]}
                    color="#2c2c2a"
                  />
                )),
              )}
              <Box
                position={[0, 1.2, 2.6]}
                scale={[1.8, 1.4, 0.1]}
                color="#385965"
              />
            </>
          ) : appearance.asset === "attraction" ? (
            <>
              <mesh castShadow position={[0, 1.1, 0]}>
                <cylinderGeometry args={[2.7, 3.2, 1.7, 8]} />
                <meshStandardMaterial color={appearance.color} />
              </mesh>
              <mesh castShadow position={[0, 3.2, 0]}>
                <coneGeometry args={[3.5, 1.6, 8]} />
                <meshStandardMaterial color="#f1d9a4" />
              </mesh>
              <Box position={[0, 2, 0]} scale={[0.4, 4, 0.4]} color="#897967" />
            </>
          ) : (
            <>
              <Box
                position={[0, 1.5, 0]}
                scale={[7.5, 3, 5]}
                color={closed ? "#a9aaa3" : appearance.color}
              />
              <Box
                position={[0, 3.12, 0]}
                scale={[8, 0.28, 5.6]}
                color="#f1ebd9"
              />
              <Box
                position={[0, 1.3, 2.54]}
                scale={[1.3, 2.3, 0.15]}
                color="#385965"
              />
              <Box
                position={[-2.25, 1.65, 2.54]}
                scale={[1.7, 1.35, 0.12]}
                color="#bad4d4"
              />
              <Box
                position={[2.25, 1.65, 2.54]}
                scale={[1.7, 1.35, 0.12]}
                color="#bad4d4"
              />
              <Box
                position={[0, 2.8, 3]}
                scale={[7.8, 0.22, 1.2]}
                color="#fff5de"
              />
              {[-3, -1.5, 0, 1.5, 3].map((x) => (
                <Box
                  key={x}
                  position={[x, 2.93, 3]}
                  scale={[0.75, 0.07, 1.2]}
                  color={appearance.color}
                />
              ))}
            </>
          )}
        </group>
      </group>
      <Box
        position={[0, 0.16, depth / 2 + 0.4]}
        scale={[Math.min(1.8, width), 0.15, 0.8]}
        color="#f7eedc"
      />
    </group>
  );
}
function Walker({
  person,
  color,
  x,
  z,
  selected,
  onSelect,
  spacesuit = false,
  lowGravity = false,
}: {
  person: Person;
  color: string;
  x: number;
  z: number;
  selected: boolean;
  onSelect: () => void;
  spacesuit?: boolean;
  lowGravity?: boolean;
}) {
  // Show one dominant state. Chatting is an explicit visible activity; other
  // ordinary actions such as walking, waiting and resting stay unbadged.
  const state: { Icon: LucideIcon; label: string; tone: string } | null =
    person.currentAction?.type === "socialize"
      ? { Icon: MessageCircle, label: "Chatting with peers", tone: "social" }
      : person.mood === "frightened" || person.stress >= 0.75
      ? { Icon: TriangleAlert, label: "Afraid", tone: "danger" }
      : person.hunger >= 0.55
        ? { Icon: Utensils, label: "Hungry", tone: "need" }
        : person.fatigue >= 0.75
          ? { Icon: BatteryLow, label: "Exhausted", tone: "warn" }
          : person.mood === "frustrated"
            ? { Icon: Frown, label: "Frustrated", tone: "warn" }
            : person.mood === "pleased" || person.mood === "happy"
              ? { Icon: Smile, label: "Happy", tone: "positive" }
              : null;
  const StateIcon = state?.Icon;
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current)
      group.current.position.y = lowGravity
        ? 0.3 + Math.sin(clock.elapsedTime * 1.8 + x * 0.18 + z * 0.13) * 0.28
        : 0;
  });
  return (
    <group
      ref={group}
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {spacesuit ? (
        <>
          <mesh castShadow position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.27, 0.32, 0.82, 10]} />
            <meshStandardMaterial color="#e8edf0" roughness={0.55} />
          </mesh>
          <mesh castShadow position={[0, 1.15, 0]}>
            <sphereGeometry args={[0.31, 16, 12]} />
            <meshStandardMaterial color="#b8e1ea" metalness={0.35} roughness={0.2} />
          </mesh>
          <Box position={[0, 0.58, -0.24]} scale={[0.38, 0.52, 0.18]} color="#6d8496" />
          <Box position={[0, 0.64, 0.3]} scale={[0.34, 0.32, 0.12]} color={color} />
          <Box position={[-0.16, 0.12, 0]} scale={[0.12, 0.34, 0.14]} color="#c7d0d7" />
          <Box position={[0.16, 0.12, 0]} scale={[0.12, 0.34, 0.14]} color="#c7d0d7" />
        </>
      ) : (
        <>
          <mesh castShadow position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.2, 0.27, 0.7, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh castShadow position={[0, 1.04, 0]}>
            <icosahedronGeometry args={[0.23, 1]} />
            <meshStandardMaterial color="#edc9a7" />
          </mesh>
          <Box position={[0, 0.1, 0]} scale={[0.28, 0.3, 0.28]} color="#425568" />
        </>
      )}
      {state && StateIcon && (
        <Html
          position={[0, 1.72, 0]}
          center
          zIndexRange={[28, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span
            className={`person-state-icons person-state-icon ${state.tone}`}
            aria-label={`${person.displayName}: ${state.label}`}
            title={state.label}
          >
            <StateIcon size={13} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </Html>
      )}
      {selected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.4, 0.54, 24]} />
            <meshBasicMaterial color="#f77053" />
          </mesh>
          <Html position={[0, 2.35, 0]} center zIndexRange={[30, 0]}>
            <span className="person-label">{person.displayName}</span>
          </Html>
        </>
      )}
    </group>
  );
}
function MarsScenery({
  center,
  width,
  depth,
}: {
  center: [number, number];
  width: number;
  depth: number;
}) {
  const rocks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        x: center[0] + (((index * 37) % 100) / 100 - 0.5) * (width - 8),
        z: center[1] + (((index * 61) % 100) / 100 - 0.5) * (depth - 8),
        size: 0.25 + ((index * 13) % 7) * 0.08,
      })),
    [center, width, depth],
  );
  return (
    <>
      <Stars radius={90} depth={45} count={1800} factor={3} fade speed={0.2} />
      {rocks.map((rock, index) => (
        <mesh key={index} castShadow position={[rock.x, 0.16, rock.z]}>
          <dodecahedronGeometry args={[rock.size, 0]} />
          <meshStandardMaterial color="#7d5142" roughness={1} />
        </mesh>
      ))}
    </>
  );
}
function SafehouseSignal({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.08, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.5, 3.75, 32]} />
        <meshBasicMaterial color="#7ee4ee" transparent opacity={0.7} />
      </mesh>
      <Html position={[0, 0.35, 0]} center>
        <span className="person-label">SAFEHOUSE</span>
      </Html>
    </group>
  );
}
function Alien({
  x,
  z,
  scale = 1,
}: {
  x: number;
  z: number;
  scale?: number;
}) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      <mesh castShadow position={[0, 2.5, 0]}>
        <capsuleGeometry args={[0.8, 2.8, 8, 16]} />
        <meshStandardMaterial color="#647f58" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 4.55, 0]}>
        <sphereGeometry args={[1.05, 16, 12]} />
        <meshStandardMaterial color="#809a63" roughness={0.65} />
      </mesh>
      {[-0.48, 0.48].map((side) => (
        <mesh key={side} position={[side, 4.7, 0.88]}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshStandardMaterial color="#ffdb63" emissive="#d86a31" emissiveIntensity={1.6} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[side * 1.15, 2.75, 0]} rotation={[0, 0, side * 0.45]}>
          <capsuleGeometry args={[0.18, 1.5, 6, 10]} />
          <meshStandardMaterial color="#708b59" />
        </mesh>
      ))}
    </group>
  );
}
function AlienArrival({
  x,
  z,
  elapsed,
}: {
  x: number;
  z: number;
  elapsed: number;
}) {
  const landing = Math.min(1, Math.max(0, elapsed / 6));
  const height = 18 - landing * 13;
  const doorsOpen = elapsed >= 7;
  return (
    <group position={[x, 0, z]}>
      <group position={[0, height, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[3.4, 4.4, 0.65, 32]} />
          <meshStandardMaterial color="#48536a" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh castShadow position={[0, 0.62, 0]}>
          <sphereGeometry args={[2.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#87b6cf" metalness={0.6} roughness={0.18} />
        </mesh>
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index / 10) * Math.PI * 2;
          return (
            <mesh key={index} position={[Math.cos(angle) * 3.7, 0, Math.sin(angle) * 3.7]}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshStandardMaterial color="#e6c45e" emissive="#f4953f" emissiveIntensity={1.4} />
            </mesh>
          );
        })}
      </group>
      {landing > 0.65 && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7, 32]} />
          <meshBasicMaterial color="#4d9b9c" transparent opacity={0.18} />
        </mesh>
      )}
      {doorsOpen && (
        <>
          <Alien x={-2.7} z={1.4} scale={1.18} />
          <Alien x={2.8} z={-0.9} scale={1.35} />
          <Html position={[0, 7.2, 0]} center>
            <span className="person-label danger">UNIDENTIFIED LIFEFORMS</span>
          </Html>
        </>
      )}
    </group>
  );
}
function Dinosaur({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, -0.4, 0]}>
      <Box position={[0, 2.4, 0]} scale={[2.4, 2.3, 1.5]} color="#6f9670" />
      <Box position={[1.1, 3.7, 0]} scale={[1.1, 2, 1.2]} color="#6f9670" />
      <Box position={[1.7, 4.55, 0]} scale={[2, 0.95, 1.3]} color="#83a477" />
      <Box
        position={[2.05, 4.65, 0.67]}
        scale={[0.16, 0.16, 0.08]}
        color="#243b35"
      />
      <Box
        position={[2.05, 4.65, -0.67]}
        scale={[0.16, 0.16, 0.08]}
        color="#243b35"
      />
      <Box
        position={[-0.5, 0.9, -0.75]}
        scale={[0.75, 1.8, 0.6]}
        color="#61805f"
      />
      <Box
        position={[-0.5, 0.9, 0.75]}
        scale={[0.75, 1.8, 0.6]}
        color="#61805f"
      />
      <mesh castShadow position={[-2, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.85, 3, 4]} />
        <meshStandardMaterial color="#6f9670" />
      </mesh>
      <Html position={[0, 5.8, 0]} center>
        <span className="person-label danger">A very unexpected visitor</span>
      </Html>
    </group>
  );
}
class RenderBoundary extends Component<
  {
    children: ReactNode;
    environment: Environment;
    onSelect: (id: string) => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <h2>3D rendering is unavailable</h2>
        <p>The recorded state and inspectors are still available.</p>
        {this.props.environment.places.map((p) => (
          <button key={p.id} onClick={() => this.props.onSelect(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function World({
  environment,
  run,
  selected,
  onSelect,
  preview,
  heatMode = "off",
}: Props) {
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM_PERCENT);
  const people = run?.people ?? environment.population;
  const isMars = environment.demo?.kind === "mars";
  const daylight = daylightBackgroundForProgress(
    run ? run.time / Math.max(1, run.duration) : 0.2,
  );
  const scene = useMemo(() => {
    const xs = [
      environment.exit.x,
      ...environment.places.flatMap((place) => [
        place.position.x -
          Math.max(place.footprint?.width ?? 9, place.footprint?.depth ?? 7) /
            2,
        place.position.x +
          Math.max(place.footprint?.width ?? 9, place.footprint?.depth ?? 7) /
            2,
      ]),
      ...environment.connections.flatMap((c) => c.path?.map((p) => p.x) ?? []),
    ];
    const zs = [
      environment.exit.z,
      ...environment.places.flatMap((place) => [
        place.position.z -
          Math.max(place.footprint?.width ?? 9, place.footprint?.depth ?? 7) /
            2,
        place.position.z +
          Math.max(place.footprint?.width ?? 9, place.footprint?.depth ?? 7) /
            2,
      ]),
      ...environment.connections.flatMap((c) => c.path?.map((p) => p.z) ?? []),
    ];
    const minX = Math.min(...xs) - 8;
    const maxX = Math.max(...xs) + 8;
    const minZ = Math.min(...zs) - 8;
    const maxZ = Math.max(...zs) + 8;
    const nearestExitPlace = environment.places.reduce((nearest, place) => {
      const nearestDistance = Math.hypot(
        nearest.entry.x - environment.exit.x,
        nearest.entry.z - environment.exit.z,
      );
      const candidateDistance = Math.hypot(
        place.entry.x - environment.exit.x,
        place.entry.z - environment.exit.z,
      );
      return candidateDistance < nearestDistance ? place : nearest;
    });
    return {
      minX,
      maxX,
      minZ,
      maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      center: [(minX + maxX) / 2, (minZ + maxZ) / 2] as [number, number],
      nearestExitPlace,
    };
  }, [environment]);
  return (
    <>
      {!preview && (
        <output
          className="scene-zoom"
          aria-label="Scene zoom"
          title="Zoom relative to the fitted scene view"
        >
          Zoom {zoomPercent}%
        </output>
      )}
      <RenderBoundary environment={environment} onSelect={onSelect}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          style={{
            backgroundColor: isMars ? "#050711" : daylight.bottom,
            backgroundImage: isMars
              ? "radial-gradient(circle at 50% 15%, #17233d, #050711 72%)"
              : `linear-gradient(180deg, ${daylight.top}, ${daylight.bottom})`,
          }}
          aria-label="Interactive 3D environment"
          onPointerMissed={() => onSelect("")}
        >
          <ambientLight intensity={isMars ? 0.65 : 1.5} />
          <directionalLight
            position={[15, 30, 10]}
            intensity={isMars ? 1.25 : 2.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-38}
            shadow-camera-right={38}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
            shadow-normalBias={0.08}
          />
          <Camera
            preview={preview}
            center={scene.center}
            width={scene.width}
            depth={scene.depth}
            onZoomChange={setZoomPercent}
          />
          <OrbitControls
            makeDefault
            target={[scene.center[0], 0, scene.center[1]]}
            enablePan
            minZoom={3}
            maxZoom={28}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.3}
          />
          <Box
            position={[scene.center[0], -0.65, scene.center[1]]}
            scale={[scene.width, 1.1, scene.depth]}
            color={isMars ? "#5d3e36" : "#c5d2b9"}
          />
          {isMars && (
            <MarsScenery
              center={scene.center}
              width={scene.width}
              depth={scene.depth}
            />
          )}
          {run && heatMode !== "off" && (
            <HeatLayer environment={environment} run={run} mode={heatMode} />
          )}
          {(environment.connections ?? []).map((connection) => {
            const from = environment.places.find(
              (place) => place.id === connection.fromPlaceId,
            );
            const to = environment.places.find(
              (place) => place.id === connection.toPlaceId,
            );
            if (!from || !to) return null;
            const path = connection.path ?? [from.entry, to.entry];
            return path
              .slice(1)
              .map((point, i) => (
                <Road
                  key={`${connection.id}-${i}`}
                  from={[path[i].x, path[i].z]}
                  to={[point.x, point.z]}
                  weight={connection.weight}
                  mars={isMars}
                />
              ));
          })}
          <Road
            from={[environment.exit.x, environment.exit.z]}
            to={[
              scene.nearestExitPlace.entry.x,
              scene.nearestExitPlace.entry.z,
            ]}
            mars={isMars}
          />
          {environment.places.map((place) => (
            <group key={place.id}>
              <Building
                place={place}
                appearance={
                  environment.presentation?.[place.id] ?? {
                    color: "#95a591",
                    asset: "building",
                  }
                }
                selected={selected === place.id}
                closed={run ? !placeOpen(run, place.id) : false}
                onSelect={() => onSelect(place.id)}
              />
            </group>
          ))}
          {!isMars &&
            [0.12, 0.32, 0.52, 0.72, 0.9].flatMap((ratio) => [
              <Tree
                key={`north-${ratio}`}
                x={scene.minX + scene.width * ratio}
                z={scene.minZ + 2}
              />,
              <Tree
                key={`south-${ratio}`}
                x={scene.minX + scene.width * ratio}
                z={scene.maxZ - 2}
              />,
            ])}
          {isMars && environment.demo?.safePlaceId && (() => {
            const bunker = environment.places.find(
              (place) => place.id === environment.demo?.safePlaceId,
            );
            return bunker ? (
              <SafehouseSignal x={bunker.position.x} z={bunker.position.z} />
            ) : null;
          })()}
          {people
            .filter((p) => p.presence === "inside")
            .map((p, i) => {
              let x = p.position.x,
                z = p.position.z;
              if (p.placeId) {
                x += ((i % 5) - 2) * 0.6;
                z += ((Math.floor(i / 5) % 3) - 1) * 0.65;
              }
              if (run)
                for (const service of environment.services) {
                  const idx = run.services[service.id].queue.findIndex(
                    (q) => q.personId === p.id,
                  );
                  if (idx >= 0) {
                    const place = environment.places.find(
                      (l) => l.id === service.placeId,
                    )!;
                    const dx = place.entry.x - place.position.x;
                    const dz = place.entry.z - place.position.z;
                    const length = Math.max(0.1, Math.hypot(dx, dz));
                    const outwardX = dx / length;
                    const outwardZ = dz / length;
                    const side = (idx % 5) * 0.65 - 1.3;
                    const row = 1 + Math.floor(idx / 5) * 0.7;
                    x = place.entry.x + outwardX * row - outwardZ * side;
                    z = place.entry.z + outwardZ * row + outwardX * side;
                  }
                }
              return (
                <Walker
                  key={p.id}
                  person={p}
                  color={environment.presentation?.[p.id]?.color ?? "#95a591"}
                  x={x}
                  z={z}
                  selected={selected === p.id}
                  onSelect={() => onSelect(p.id)}
                  spacesuit={isMars}
                  lowGravity={isMars}
                />
              );
            })}
          {run?.events
            .filter((e) => e.status === "active")
            .map((e) =>
              e.visual === "dinosaur" ? (
                <Dinosaur key={e.id} x={e.position.x} z={e.position.z} />
              ) : e.visual === "ufo" ? (
                <AlienArrival
                  key={e.id}
                  x={e.position.x}
                  z={e.position.z}
                  elapsed={Math.max(0, (run?.time ?? 0) - e.startTimeSeconds)}
                />
              ) : (
                <mesh
                  key={e.id}
                  position={[e.position.x, 0.06, e.position.z]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <ringGeometry args={[1.7, 2, 32]} />
                  <meshBasicMaterial
                    color={
                      e.effects.some((f) => f.kind === "threat")
                        ? "#e87553"
                        : "#cbb756"
                    }
                    transparent
                    opacity={0.65}
                  />
                </mesh>
              ),
            )}
        </Canvas>
      </RenderBoundary>
    </>
  );
}
