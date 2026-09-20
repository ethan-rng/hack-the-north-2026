"use client";
import type { ReactNode } from "react";
import { Box3, Euler, Matrix4, Vector3 } from "three";

export type Vec3 = [number, number, number];

export type Primitive = (
  | {
      kind: "box";
      position: Vec3;
      scale: Vec3;
      color?: string;
      rotation?: Vec3;
    }
  | {
      kind: "cyl";
      position: Vec3;
      radiusTop: number;
      radiusBottom: number;
      height: number;
      segments?: number;
      color?: string;
      rotation?: Vec3;
    }
  | {
      kind: "cone";
      position: Vec3;
      radius: number;
      height: number;
      segments?: number;
      color?: string;
      rotation?: Vec3;
    }
  | {
      kind: "sphere";
      position: Vec3;
      radius: number;
      color?: string;
    }
  | {
      kind: "octa";
      position: Vec3;
      radius: number;
      detail?: number;
      color?: string;
      rotation?: Vec3;
    }
  | {
      kind: "torus";
      position: Vec3;
      radius: number;
      tube: number;
      segments?: number;
      color?: string;
      rotation?: Vec3;
    }
) & { material?: "masonry" | "glass" | "metal" | "wood" | "roof" };

export type BuildingCategory =
  | "residential"
  | "commercial"
  | "civic"
  | "attraction"
  | "transit"
  | "landmark"
  | "utility";

export type BuildingStyle = {
  id: string;
  label: string;
  category: BuildingCategory;
  description?: string;
  labelHeight?: number;
  build: (context: { color: string; closed: boolean }) => Primitive[];
};

export const B = (position: Vec3, scale: Vec3, color?: string): Primitive => ({
  kind: "box",
  position,
  scale,
  color,
});

export const Br = (
  position: Vec3,
  scale: Vec3,
  color: string | undefined,
  rotation: Vec3,
): Primitive => ({ kind: "box", position, scale, color, rotation });

export const Cy = (
  position: Vec3,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color?: string,
  segments = 16,
  rotation?: Vec3,
): Primitive => ({
  kind: "cyl",
  position,
  radiusTop,
  radiusBottom,
  height,
  segments,
  color,
  rotation,
});

export const Co = (
  position: Vec3,
  radius: number,
  height: number,
  color?: string,
  segments = 12,
  rotation?: Vec3,
): Primitive => ({
  kind: "cone",
  position,
  radius,
  height,
  segments,
  color,
  rotation,
});

export const Sp = (
  position: Vec3,
  radius: number,
  color?: string,
): Primitive => ({
  kind: "sphere",
  position,
  radius,
  color,
});

export const Oc = (
  position: Vec3,
  radius: number,
  color?: string,
  detail = 0,
): Primitive => ({ kind: "octa", position, radius, detail, color });

export const To = (
  position: Vec3,
  radius: number,
  tube: number,
  color?: string,
  segments = 20,
  rotation?: Vec3,
): Primitive => ({
  kind: "torus",
  position,
  radius,
  tube,
  segments,
  color,
  rotation,
});

function Surface({
  color,
  material,
}: {
  color: string;
  material?: Primitive["material"];
}) {
  const glass = material === "glass";
  return (
    <meshStandardMaterial
      color={color}
      roughness={glass ? 0.16 : material === "metal" ? 0.35 : 0.86}
      metalness={material === "metal" ? 0.65 : glass ? 0.18 : 0}
    />
  );
}

export function BuildingModel({
  primitives,
  fallbackColor,
}: {
  primitives: Primitive[];
  fallbackColor: string;
}) {
  return (
    <>
      {primitives.map((p, i) => {
        const color = p.color ?? fallbackColor;
        if (p.kind === "box")
          return (
            <mesh
              key={i}
              castShadow
              receiveShadow
              position={p.position}
              rotation={p.rotation}
            >
              <boxGeometry args={p.scale} />
              <Surface color={color} material={p.material} />
            </mesh>
          );
        if (p.kind === "cyl")
          return (
            <mesh
              key={i}
              castShadow
              receiveShadow
              position={p.position}
              rotation={p.rotation}
            >
              <cylinderGeometry
                args={[p.radiusTop, p.radiusBottom, p.height, p.segments ?? 16]}
              />
              <Surface color={color} material={p.material} />
            </mesh>
          );
        if (p.kind === "cone")
          return (
            <mesh
              key={i}
              castShadow
              receiveShadow
              position={p.position}
              rotation={p.rotation}
            >
              <coneGeometry args={[p.radius, p.height, p.segments ?? 12]} />
              <Surface color={color} material={p.material} />
            </mesh>
          );
        if (p.kind === "sphere")
          return (
            <mesh key={i} castShadow receiveShadow position={p.position}>
              <sphereGeometry args={[p.radius, 20, 16]} />
              <Surface color={color} material={p.material} />
            </mesh>
          );
        if (p.kind === "octa")
          return (
            <mesh
              key={i}
              castShadow
              receiveShadow
              position={p.position}
              rotation={p.rotation}
            >
              <icosahedronGeometry args={[p.radius, p.detail ?? 0]} />
              <Surface color={color} material={p.material} />
            </mesh>
          );
        return (
          <mesh
            key={i}
            castShadow
            receiveShadow
            position={p.position}
            rotation={p.rotation}
          >
            <torusGeometry args={[p.radius, p.tube, 10, p.segments ?? 20]} />
            <Surface color={color} material={p.material} />
          </mesh>
        );
      })}
    </>
  );
}

export const palette = {
  darkRoof: "#3a2b22",
  roof: "#5b3f2f",
  tileRoof: "#a8543d",
  thatch: "#c9a56b",
  glass: "#a3c7d0",
  glassDeep: "#5f8391",
  window: "#bad4d4",
  windowFrame: "#f7eedc",
  concrete: "#c9c9c1",
  stone: "#a8a89c",
  darkStone: "#7a7a72",
  wood: "#a58269",
  darkWood: "#6b5039",
  brick: "#a85a3d",
  gold: "#dcb968",
  brass: "#b48a3d",
  charcoal: "#3a3a37",
  black: "#242524",
  cream: "#f1ebd9",
  door: "#385965",
  red: "#c94b3a",
  awning: "#c25c4c",
  awningStripe: "#f0e8d6",
  leaf: "#659484",
  trunk: "#96785f",
  neon: "#f4d774",
  pastel: "#f2c9c1",
  candy: "#e07999",
  mint: "#a9d8bd",
  sand: "#dfc99a",
  slate: "#4d5a63",
  silver: "#d1d5d9",
} as const;

/** Bounds include rotated primitive geometry so large landmarks fit their assigned plot. */
export function footprintBounds(primitives: Primitive[]) {
  const bounds = new Box3();
  for (const p of primitives) {
    const radius =
      p.kind === "cyl"
        ? Math.max(p.radiusTop, p.radiusBottom)
        : p.kind === "box"
          ? 0
          : p.radius + (p.kind === "torus" ? p.tube : 0);
    const size =
      p.kind === "box"
        ? p.scale
        : p.kind === "cyl" || p.kind === "cone"
          ? [radius * 2, p.height, radius * 2]
          : [radius * 2, radius * 2, radius * 2];
    const box = new Box3(
      new Vector3(-size[0] / 2, -size[1] / 2, -size[2] / 2),
      new Vector3(size[0] / 2, size[1] / 2, size[2] / 2),
    );
    const rotation = "rotation" in p ? p.rotation : undefined;
    const matrix = new Matrix4().makeRotationFromEuler(
      new Euler(...(rotation ?? [0, 0, 0])),
    );
    matrix.setPosition(...p.position);
    bounds.union(box.applyMatrix4(matrix));
  }
  return {
    width: Math.max(1, bounds.max.x - bounds.min.x),
    depth: Math.max(1, bounds.max.z - bounds.min.z),
    x: (bounds.min.x + bounds.max.x) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}
