import { B, type Primitive, palette as P } from "./primitives";
import { scenePalette, type VisualContext } from "../../core/visualContext";

const shopfronts = new Set([
  "cafe",
  "bakery",
  "restaurant",
  "fast-food",
  "ice-cream-parlor",
  "bookstore",
  "gift-shop",
  "corner-shop",
  "modern-box",
  "modern-cube",
  "bank",
  "arcade",
]);
/** Indoor tenants read as stores opening onto one shared concourse, not detached houses. */
function indoorShop(color: string, context: VisualContext): Primitive[] {
  const palette = scenePalette(context);
  const primitives: Primitive[] = [
    { ...B([0, 1.7, -2.8], [8, 3.4, 0.25], color), material: "masonry" },
    { ...B([-3.9, 1.7, 0], [0.2, 3.4, 5.6], color), material: "masonry" },
    { ...B([3.9, 1.7, 0], [0.2, 3.4, 5.6], color), material: "masonry" },
    { ...B([0, 3.35, 0], [8.2, 0.2, 5.8], palette.trim), material: "roof" },
    { ...B([0, 2.85, 2.87], [8, 0.8, 0.25], color), material: "masonry" },
    {
      ...B([0, 2.9, 3.02], [3.8, 0.25, 0.05], palette.trim),
      material: "metal",
    },
    { ...B([0, 1.1, 1], [4.5, 0.85, 0.8], palette.trim), material: "wood" },
  ];
  for (const x of [-2.55, 2.55]) {
    primitives.push({
      ...B([x, 1.2, 2.8], [2.65, 2.3, 0.08], palette.glass),
      material: "glass",
    });
    primitives.push({
      ...B([x, 0.08, 2.85], [2.8, 0.15, 0.2], palette.roof),
      material: "metal",
    });
  }
  for (const x of [-3.9, -1.2, 1.2, 3.9])
    primitives.push({
      ...B([x, 1.25, 2.9], [0.12, 2.5, 0.15], palette.roof),
      material: "metal",
    });
  return primitives;
}
export function contextualPrimitives(
  primitives: Primitive[],
  context: VisualContext,
  wallColor: string,
  styleId?: string,
  custom = false,
): Primitive[] {
  if (
    !custom &&
    context.setting === "interior" &&
    styleId &&
    shopfronts.has(styleId)
  )
    return indoorShop(wallColor, context);
  const palette = scenePalette(context);
  return primitives.map((p) => {
    // Custom designs already use the contextual palette; preserve deliberate colors and materials.
    if (custom) return p;
    const color = p.color;
    if ([P.glass, P.glassDeep, P.window, P.door].some((c) => c === color))
      return { ...p, color: palette.glass, material: "glass" };
    if ([P.darkRoof, P.roof, P.tileRoof, P.slate].some((c) => c === color))
      return { ...p, color: palette.roof, material: "roof" };
    if ([P.cream, P.windowFrame, P.awningStripe].some((c) => c === color))
      return { ...p, color: palette.trim, material: "masonry" };
    if ([P.brick, P.concrete, P.stone].some((c) => c === color))
      return { ...p, color: wallColor, material: "masonry" };
    if (color === P.silver) return { ...p, material: "metal" };
    if (color === P.leaf) return { ...p, color: palette.foliage };
    if (color === P.wood || color === P.darkWood)
      return { ...p, material: "wood" };
    return p;
  });
}
