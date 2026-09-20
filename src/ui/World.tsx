"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Component, useMemo, useRef, type ReactNode } from "react";
import type { Group } from "three";
import type { Environment, Person, Place, Run } from "@/core/types";
import { placeOpen } from "@/core/engine";

type Props = {
  environment: Environment;
  run?: Run;
  selected?: string;
  onSelect: (id: string) => void;
  preview?: boolean;
};
function Camera({
  preview,
  center,
  width,
  depth,
}: {
  preview?: boolean;
  center: [number, number];
  width: number;
  depth: number;
}) {
  const { size } = useThree();
  return (
    <OrthographicCamera
      makeDefault
      position={[center[0] + 42, 42, center[1] + 48]}
      zoom={Math.min(
        preview ? 12 : 14,
        size.width / (width + 18),
        size.height / (depth + 12),
      )}
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
}: {
  from: [number, number];
  to: [number, number];
  weight?: number;
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
        color={weight === 3 ? "#e8dec9" : "#f7eedc"}
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
  appearance: { color: string; asset: string };
  selected: boolean;
  closed: boolean;
  onSelect: () => void;
}) {
  const rotation = Math.atan2(
    place.entry.x - place.position.x,
    place.entry.z - place.position.z,
  );
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
        scale={[9, 0.24, 7]}
        color={selected ? "#203e48" : "#d7dac9"}
      />
      {appearance.asset === "gate" ? (
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
          <Box position={[0, 0.6, 1]} scale={[3, 0.7, 0.5]} color="#859daa" />
        </>
      ) : appearance.asset === "rest" || appearance.asset === "open" ? (
        <>
          <Box position={[0, 0.45, 0]} scale={[4, 0.45, 1]} color="#9a8062" />
          <Box position={[0, 0.95, -0.5]} scale={[4, 1, 0.2]} color="#9a8062" />
          <Tree x={-2.8} z={-1.7} />
          <Tree x={2.8} z={1.5} />
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
          <Box position={[0, 3.12, 0]} scale={[8, 0.28, 5.6]} color="#f1ebd9" />
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
      <Html
        position={[0, appearance.asset === "gate" ? 5.8 : 4.5, 0]}
        center
        zIndexRange={[20, 0]}
      >
        <button
          className={`place-label ${selected ? "selected" : ""}`}
          onClick={onSelect}
        >
          {closed && <span className="closed-dot" />}
          {place.name}
        </button>
      </Html>
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
}: {
  person: Person;
  color: string;
  x: number;
  z: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<Group>(null);
  const initialPosition = useRef<[number, number, number]>([x, 0, z]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const blend = 1 - Math.exp(-dt * 8);
    g.position.x += (x - g.position.x) * blend;
    g.position.z += (z - g.position.z) * blend;
  });
  return (
    <group
      ref={group}
      position={initialPosition.current}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.27, 0.7, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, 1.04, 0]}>
        <icosahedronGeometry args={[0.23, 1]} />
        <meshStandardMaterial color="#edc9a7" />
      </mesh>
      <Box position={[0, 0.1, 0]} scale={[0.28, 0.3, 0.28]} color="#425568" />
      {selected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.4, 0.54, 24]} />
            <meshBasicMaterial color="#f77053" />
          </mesh>
          <Html position={[0, 1.9, 0]} center zIndexRange={[30, 0]}>
            <span className="person-label">{person.displayName}</span>
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
        <p>The simulation and inspectors are still running.</p>
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
}: Props) {
  const people = run?.people ?? environment.population;
  const scene = useMemo(() => {
    const xs = [
      environment.exit.x,
      ...environment.places.map((place) => place.position.x),
    ];
    const zs = [
      environment.exit.z,
      ...environment.places.map((place) => place.position.z),
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
    <RenderBoundary environment={environment} onSelect={onSelect}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        aria-label="Interactive 3D environment"
        onPointerMissed={() => onSelect("")}
      >
        <color attach="background" args={["#e9ede3"]} />
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[15, 30, 10]}
          intensity={2.5}
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
          color="#c5d2b9"
        />
        {(environment.connections ?? []).map((connection) => {
          const from = environment.places.find(
            (place) => place.id === connection.fromPlaceId,
          );
          const to = environment.places.find(
            (place) => place.id === connection.toPlaceId,
          );
          return from && to ? (
            <Road
              key={connection.id}
              from={[from.entry.x, from.entry.z]}
              to={[to.entry.x, to.entry.z]}
              weight={connection.weight}
            />
          ) : null;
        })}
        <Road
          from={[environment.exit.x, environment.exit.z]}
          to={[scene.nearestExitPlace.entry.x, scene.nearestExitPlace.entry.z]}
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
        {[0.12, 0.32, 0.52, 0.72, 0.9].flatMap((ratio) => [
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
        <Html position={[environment.exit.x, 0.3, environment.exit.z]} center>
          <span className="exit-label">EXIT ↙</span>
        </Html>
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
              />
            );
          })}
        {run?.events
          .filter((e) => e.status === "active")
          .map((e) =>
            e.visual === "dinosaur" ? (
              <Dinosaur key={e.id} x={e.position.x} z={e.position.z} />
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
  );
}
