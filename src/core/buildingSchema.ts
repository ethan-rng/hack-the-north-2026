// Server-safe Zod validation for LLM-generated low-poly buildings. Mirrors the
// Primitive union in src/ui/buildings/primitives.tsx but without JSX or client
// imports so the Cloudflare Worker can parse untrusted LLM output.

import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const bounded = (min: number, max: number) => z.number().min(min).max(max);
const vec3 = z.tuple([bounded(-14, 14), bounded(-1, 14), bounded(-14, 14)]);
const rotation = z.tuple([
  bounded(-6.3, 6.3),
  bounded(-6.3, 6.3),
  bounded(-6.3, 6.3),
]);
const material = z
  .enum(["masonry", "glass", "metal", "wood", "roof"])
  .optional();
const color = z.string().regex(HEX_COLOR).optional();
const scale = z.tuple([
  bounded(0.05, 20),
  bounded(0.05, 20),
  bounded(0.05, 20),
]);
const radius = bounded(0.05, 12);
const height = bounded(0.1, 14);
const segments = z.number().int().min(3).max(64).optional();
const tube = bounded(0.02, 4);

export const primitiveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("box"),
    position: vec3,
    scale,
    color,
    material,
    rotation: rotation.optional(),
  }),
  z.object({
    kind: z.literal("cyl"),
    position: vec3,
    radiusTop: radius,
    radiusBottom: radius,
    height,
    segments,
    color,
    material,
    rotation: rotation.optional(),
  }),
  z.object({
    kind: z.literal("cone"),
    position: vec3,
    radius,
    height,
    segments,
    color,
    material,
    rotation: rotation.optional(),
  }),
  z.object({
    kind: z.literal("sphere"),
    position: vec3,
    radius,
    color,
    material,
  }),
  z.object({
    kind: z.literal("octa"),
    position: vec3,
    radius,
    detail: z.number().int().min(0).max(2).optional(),
    color,
    material,
    rotation: rotation.optional(),
  }),
  z.object({
    kind: z.literal("torus"),
    position: vec3,
    radius,
    tube,
    segments,
    color,
    material,
    rotation: rotation.optional(),
  }),
]);

export const generatedBuildingSchema = z.object({
  primitives: z.array(primitiveSchema).min(3).max(60),
  labelHeight: bounded(0.5, 20).optional(),
});

export type GeneratedBuilding = z.infer<typeof generatedBuildingSchema>;

// Reject buildings that float in the air or drift far off their footprint.
// The rendered scene expects buildings on the 9x7 base plate; anything that
// escapes that box is treated as a validation failure.
export function reasonableBuilding(building: GeneratedBuilding): boolean {
  const grounded = building.primitives.some(
    (p) => p.position[1] <= 1 && p.position[1] >= -0.5,
  );
  if (!grounded) return false;
  const withinFootprint = building.primitives.every(
    (p) =>
      Math.abs(p.position[0]) <= 10 &&
      Math.abs(p.position[2]) <= 10 &&
      p.position[1] <= 12,
  );
  return withinFootprint;
}
