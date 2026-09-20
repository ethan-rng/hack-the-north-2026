"use client";
import type { ReactNode } from "react";

export type Vec3 = [number, number, number];

export type Primitive =
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
    };

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

export const Sp = (position: Vec3, radius: number, color?: string): Primitive => ({
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
              <meshStandardMaterial color={color} roughness={0.85} />
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
              <meshStandardMaterial color={color} roughness={0.8} />
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
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
          );
        if (p.kind === "sphere")
          return (
            <mesh key={i} castShadow receiveShadow position={p.position}>
              <sphereGeometry args={[p.radius, 20, 16]} />
              <meshStandardMaterial color={color} roughness={0.7} />
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
              <meshStandardMaterial color={color} roughness={0.75} />
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
            <meshStandardMaterial color={color} roughness={0.7} />
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
