import {
  B,
  Br,
  Cy,
  Co,
  Sp,
  Oc,
  To,
  palette as P,
  type BuildingStyle,
  type Primitive,
} from "./primitives";

const HALF_PI = Math.PI / 2;

function tree(x: number, z: number): Primitive[] {
  return [
    B([x, 0.6, z], [0.25, 1.2, 0.25], P.trunk),
    Oc([x, 1.8, z], 1.05, P.leaf),
  ];
}

function windowRow(
  y: number,
  z: number,
  color: string,
  count = 5,
  spacing = 1.5,
  size: [number, number] = [0.9, 0.7],
): Primitive[] {
  const out: Primitive[] = [];
  const start = -((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++)
    out.push(B([start + i * spacing, y, z], [size[0], size[1], 0.1], color));
  return out;
}

function stripes(
  y: number,
  radius: number,
  height: number,
  colorA: string,
  colorB: string,
  count = 8,
): Primitive[] {
  const out: Primitive[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    out.push(
      B(
        [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        [0.3, height, 0.3],
        i % 2 ? colorA : colorB,
      ),
    );
  }
  return out;
}

export const styles: BuildingStyle[] = [
  {
    id: "modern-box",
    label: "Modern Box",
    category: "commercial",
    description:
      "Compact one-story storefront with signage strip and glass entrance.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [7.5, 3, 5], main),
        B([0, 3.12, 0], [8, 0.28, 5.6], P.cream),
        B([0, 1.3, 2.54], [1.3, 2.3, 0.15], P.door),
        B([-2.25, 1.65, 2.54], [1.7, 1.35, 0.12], P.window),
        B([2.25, 1.65, 2.54], [1.7, 1.35, 0.12], P.window),
        B([0, 2.8, 3], [7.8, 0.22, 1.2], P.windowFrame),
        B([-3, 2.93, 3], [0.75, 0.07, 1.2], main),
        B([-1.5, 2.93, 3], [0.75, 0.07, 1.2], main),
        B([0, 2.93, 3], [0.75, 0.07, 1.2], main),
        B([1.5, 2.93, 3], [0.75, 0.07, 1.2], main),
        B([3, 2.93, 3], [0.75, 0.07, 1.2], main),
      ];
    },
  },
  {
    id: "glass-tower",
    label: "Glass Tower",
    category: "commercial",
    description: "Slim glass tower with a horizontal window grid.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const shell = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 3.5, 0], [4.5, 7, 4], shell),
        B([0, 7.12, 0], [4.8, 0.25, 4.3], P.charcoal),
        B([0, 0.5, 2.02], [1.2, 1, 0.06], P.door),
      ];
      for (let i = 0; i < 6; i++) {
        const y = 1.4 + i * 1;
        out.push(B([0, y, 2.02], [3.6, 0.6, 0.08], P.glass));
        out.push(B([2.28, y, 0], [0.08, 0.6, 3.2], P.glass));
        out.push(B([-2.28, y, 0], [0.08, 0.6, 3.2], P.glass));
      }
      return out;
    },
  },
  {
    id: "stepped-tower",
    label: "Art Deco Tower",
    category: "landmark",
    description: "Stepped setback tower reminiscent of 1930s skyscrapers.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [6, 3, 4.5], main),
        B([0, 3.6, 0], [5, 1.2, 3.8], main),
        B([0, 5, 0], [4, 1.6, 3], main),
        B([0, 6.5, 0], [3, 1.6, 2.2], main),
        B([0, 7.8, 0], [1.4, 1, 1.4], P.gold),
        Co([0, 8.7, 0], 0.6, 0.6, P.gold),
        B([0, 3.05, 2.3], [4, 0.1, 0.05], P.gold),
        B([0, 4.35, 1.95], [3, 0.1, 0.05], P.gold),
        ...windowRow(2, 2.28, P.window, 5, 1.1, [0.7, 1.3]),
      ];
    },
  },
  {
    id: "skyscraper",
    label: "Corporate Slab",
    category: "commercial",
    description: "Tall corporate slab with grid facade.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 4.5, 0], [5, 9, 3], main),
        B([0, 9.1, 0], [5.2, 0.2, 3.2], P.charcoal),
        B([0, 0.6, 1.55], [1.4, 1.2, 0.08], P.glassDeep),
      ];
      for (let row = 0; row < 8; row++) {
        for (let col = -2; col <= 2; col++)
          out.push(
            B([col * 0.9, 1.6 + row * 0.9, 1.55], [0.6, 0.55, 0.08], P.glass),
          );
      }
      return out;
    },
  },
  {
    id: "modern-cube",
    label: "Minimal Cube",
    category: "commercial",
    description: "White concrete cube with recessed floor-to-ceiling glass.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.9, 0], [6.5, 3.8, 4.5], main),
        B([0, 3.85, 0], [6.9, 0.15, 4.9], P.charcoal),
        B([0, 1.7, 2.29], [4.5, 3, 0.05], P.glassDeep),
        B([2.6, 1.7, 0], [0.05, 3, 3.2], P.glassDeep),
        B([-2.6, 1.7, 0], [0.05, 3, 3.2], P.glassDeep),
      ];
    },
  },
  {
    id: "corner-shop",
    label: "Corner Shop",
    category: "commercial",
    description: "Wooden storefront with striped awning and produce crate.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.35, 0], [6, 2.7, 4.5], main),
        B([0, 2.75, 0], [6.4, 0.3, 4.8], P.roof),
        Br([0, 2.6, 2.4], [5.5, 0.1, 1.4], P.awning, [0.35, 0, 0]),
        B([-2, 2.9, 2.9], [0.15, 0.5, 0.15], P.darkWood),
        B([2, 2.9, 2.9], [0.15, 0.5, 0.15], P.darkWood),
        B([0, 1.3, 2.28], [1.2, 2.2, 0.12], P.door),
        B([-2, 1.7, 2.28], [1.6, 1.4, 0.1], P.window),
        B([2, 1.7, 2.28], [1.6, 1.4, 0.1], P.window),
        B([-2.6, 0.3, 3], [1, 0.6, 0.7], P.wood),
      ];
    },
  },
  {
    id: "row-house",
    label: "Terraced House",
    category: "residential",
    description: "Terraced brick house with pitched roof and stoop.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.6, 0], [6, 3.2, 4], main),
        Br([-1.6, 3.7, 0], [3.5, 0.2, 4.2], P.roof, [0, 0, 0.35]),
        Br([1.6, 3.7, 0], [3.5, 0.2, 4.2], P.roof, [0, 0, -0.35]),
        B([0, 4.35, 0], [0.5, 0.4, 4.2], P.darkRoof),
        B([1.8, 4, -1.2], [0.35, 1.2, 0.35], P.darkWood),
        B([0, 1.1, 2.05], [0.9, 1.9, 0.1], P.door),
        B([-1.7, 1.7, 2.05], [1.1, 1, 0.08], P.window),
        B([1.7, 1.7, 2.05], [1.1, 1, 0.08], P.window),
        B([-1.7, 2.9, 2.05], [1.1, 0.8, 0.08], P.window),
        B([1.7, 2.9, 2.05], [1.1, 0.8, 0.08], P.window),
        B([0, 0.25, 2.4], [1.6, 0.15, 0.6], P.stone),
      ];
    },
  },
  {
    id: "cottage",
    label: "Thatched Cottage",
    category: "residential",
    description: "Storybook cottage with thick thatched roof.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.1, 0], [5, 2.2, 4], main),
        Co([0, 3.1, 0], 3.6, 1.7, P.thatch, 4, [0, HALF_PI / 2, 0]),
        Co([0, 3.1, 0], 3.55, 1.65, P.thatch, 4, [0, -HALF_PI / 2, 0]),
        B([0, 1.05, 2.03], [0.9, 1.8, 0.08], P.darkWood),
        B([-1.5, 1.5, 2.03], [0.9, 0.7, 0.08], P.window),
        B([1.5, 1.5, 2.03], [0.9, 0.7, 0.08], P.window),
        B([-1.5, 2.4, 2.03], [0.9, 0.5, 0.08], P.window),
        B([1.5, 2.4, 2.03], [0.9, 0.5, 0.08], P.window),
        B([1.6, 3.4, -1], [0.5, 1.2, 0.5], P.brick),
      ];
    },
  },
  {
    id: "villa",
    label: "Mediterranean Villa",
    category: "residential",
    description: "Stucco villa with terracotta tile roof and arched openings.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [7, 2.8, 5], main),
        B([0, 2.95, 0], [7.4, 0.35, 5.4], P.tileRoof),
        B([0, 3.3, 0], [6.6, 0.15, 4.6], P.tileRoof),
        Cy([-2, 1.7, 2.53], 0.55, 0.55, 0.06, P.darkWood, 16, [HALF_PI, 0, 0]),
        Cy([2, 1.7, 2.53], 0.55, 0.55, 0.06, P.darkWood, 16, [HALF_PI, 0, 0]),
        B([-2, 1.1, 2.53], [1.1, 1.2, 0.06], P.darkWood),
        B([2, 1.1, 2.53], [1.1, 1.2, 0.06], P.darkWood),
        B([0, 1.3, 2.53], [1.4, 2.6, 0.06], P.door),
        B([0, 2.4, 2.53], [3.2, 0.1, 0.06], P.brass),
      ];
    },
  },
  {
    id: "townhouse",
    label: "Brownstone",
    category: "residential",
    description: "Two-story brownstone with tall front stoop.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 2, 0], [5, 4, 4], main),
        B([0, 4.1, 0], [5.2, 0.2, 4.2], P.darkRoof),
        B([0, 4.4, -1.5], [0.6, 0.6, 0.6], P.charcoal),
        B([-1.4, 1.6, 2.05], [1, 1.4, 0.08], P.window),
        B([1.4, 1.6, 2.05], [1, 1.4, 0.08], P.window),
        B([-1.4, 3, 2.05], [1, 1.2, 0.08], P.window),
        B([1.4, 3, 2.05], [1, 1.2, 0.08], P.window),
        B([0, 2.3, 2.05], [0.9, 2.2, 0.1], P.door),
        B([0, 0.85, 2.7], [1.9, 0.15, 0.8], P.stone),
        B([0, 0.55, 3], [2, 0.15, 0.4], P.stone),
        B([0, 0.25, 3.3], [2.1, 0.15, 0.4], P.stone),
      ];
    },
  },
  {
    id: "brick-house",
    label: "Suburban Home",
    category: "residential",
    description: "Family home with a chimney, dormer, and porch.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [6.5, 2.8, 4.5], main),
        Br([-1.8, 3.5, 0], [4, 0.2, 4.8], P.roof, [0, 0, 0.4]),
        Br([1.8, 3.5, 0], [4, 0.2, 4.8], P.roof, [0, 0, -0.4]),
        B([0, 4, 0], [0.4, 0.4, 4.8], P.darkRoof),
        B([2.3, 4.1, -0.8], [0.6, 1.6, 0.6], P.brick),
        B([0, 1.2, 2.28], [1, 2, 0.1], P.door),
        B([-2, 1.5, 2.28], [1.2, 1, 0.08], P.window),
        B([2, 1.5, 2.28], [1.2, 1, 0.08], P.window),
        B([0, 0.35, 3], [3, 0.15, 1.2], P.stone),
        B([-1.4, 0.9, 3], [0.15, 1, 0.15], P.wood),
        B([1.4, 0.9, 3], [0.15, 1, 0.15], P.wood),
        B([0, 1.55, 3], [3.2, 0.15, 1.2], P.roof),
      ];
    },
  },
  {
    id: "cabin",
    label: "Log Cabin",
    category: "residential",
    description: "Stacked log cabin with stone chimney.",
    build: ({ color, closed }) => {
      const out: Primitive[] = [];
      const main = closed ? P.stone : color ?? P.wood;
      for (let i = 0; i < 6; i++)
        out.push(Cy([0, 0.35 + i * 0.45, 0], 0.22, 0.22, 5.5, i % 2 ? P.wood : main, 8, [0, 0, HALF_PI]));
      out.push(B([0, 1.5, 0], [5.6, 2.5, 4], main));
      out.push(Br([-1.4, 3.5, 0], [3.2, 0.2, 4.3], P.darkRoof, [0, 0, 0.4]));
      out.push(Br([1.4, 3.5, 0], [3.2, 0.2, 4.3], P.darkRoof, [0, 0, -0.4]));
      out.push(B([2.5, 3.6, -0.6], [0.55, 1.6, 0.55], P.stone));
      out.push(B([0, 1.1, 2.03], [0.9, 1.8, 0.1], P.darkWood));
      out.push(B([-1.6, 1.6, 2.03], [1, 0.9, 0.08], P.window));
      out.push(B([1.6, 1.6, 2.03], [1, 0.9, 0.08], P.window));
      return out;
    },
  },
  {
    id: "cafe",
    label: "Corner Café",
    category: "commercial",
    description: "Little café with striped awning and outdoor seating.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [5.5, 2.8, 4], main),
        B([0, 2.85, 0], [5.8, 0.2, 4.2], P.roof),
        B([0, 2.4, 2.15], [5.6, 0.08, 1.1], P.awning),
        B([-1.8, 2.4, 2.15], [0.2, 0.08, 1.1], P.awningStripe),
        B([-0.6, 2.4, 2.15], [0.2, 0.08, 1.1], P.awningStripe),
        B([0.6, 2.4, 2.15], [0.2, 0.08, 1.1], P.awningStripe),
        B([1.8, 2.4, 2.15], [0.2, 0.08, 1.1], P.awningStripe),
        B([0, 1.2, 2.03], [1, 2, 0.08], P.door),
        B([-1.7, 1.5, 2.03], [1.4, 1.2, 0.08], P.window),
        B([1.7, 1.5, 2.03], [1.4, 1.2, 0.08], P.window),
        Cy([-2, 0.4, 3.1], 0.3, 0.3, 0.06, P.darkWood, 20),
        Cy([-2, 0.2, 3.1], 0.05, 0.05, 0.4, P.charcoal),
        Cy([2, 0.4, 3.1], 0.3, 0.3, 0.06, P.darkWood, 20),
        Cy([2, 0.2, 3.1], 0.05, 0.05, 0.4, P.charcoal),
      ];
    },
  },
  {
    id: "bakery",
    label: "Bakery",
    category: "commercial",
    description: "Warm bakery with chimney and bread sign.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [6, 2.8, 4.2], main),
        Br([-1.6, 3.4, 0], [3.5, 0.2, 4.4], P.tileRoof, [0, 0, 0.35]),
        Br([1.6, 3.4, 0], [3.5, 0.2, 4.4], P.tileRoof, [0, 0, -0.35]),
        B([1.8, 3.9, -1.2], [0.5, 1.4, 0.5], P.brick),
        Cy([1.8, 4.7, -1.2], 0.2, 0.2, 0.4, P.charcoal, 12),
        B([0, 1.1, 2.13], [1, 2, 0.1], P.door),
        B([-1.8, 1.5, 2.13], [1.2, 1, 0.08], P.window),
        B([1.8, 1.5, 2.13], [1.2, 1, 0.08], P.window),
        B([0, 3, 2.15], [2.2, 0.6, 0.1], P.cream),
      ];
    },
  },
  {
    id: "restaurant",
    label: "Round Restaurant",
    category: "commercial",
    description: "Circular restaurant with slatted crown and neon sign.",
    labelHeight: 5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 1.5, 0], 3, 3.2, 3, main, 20),
        Cy([0, 3.15, 0], 3.3, 3.3, 0.3, P.roof, 20),
        Cy([0, 3.55, 0], 1.5, 1.5, 0.5, P.gold, 20),
      ];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        out.push(B([Math.cos(a) * 3.05, 1.7, Math.sin(a) * 3.05], [0.2, 0.9, 0.05], P.window));
      }
      out.push(B([0, 1.1, 3.05], [1.4, 2.2, 0.15], P.door));
      return out;
    },
  },
  {
    id: "fast-food",
    label: "Burger Joint",
    category: "commercial",
    description: "Fast-food outlet with oversized rooftop sign.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.1, 0], [7, 2.2, 4.5], main),
        B([0, 2.3, 0], [7.4, 0.25, 4.8], P.red),
        B([0, 3.4, 0], [3.6, 1.8, 0.5], P.neon),
        B([0, 3.4, 0], [3, 1.2, 0.55], P.red),
        B([0, 3.4, 0], [2.2, 0.5, 0.6], P.cream),
        B([0, 1, 2.28], [1.6, 1.8, 0.1], P.glassDeep),
        B([-2.4, 1.4, 2.28], [1.4, 1.2, 0.08], P.window),
        B([2.4, 1.4, 2.28], [1.4, 1.2, 0.08], P.window),
      ];
    },
  },
  {
    id: "ice-cream-parlor",
    label: "Ice Cream Parlor",
    category: "commercial",
    description: "Candy-striped kiosk with a big cone on top.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.2, 0], [5, 2.4, 4], main),
        B([0, 2.55, 0], [5.4, 0.3, 4.4], P.candy),
      ];
      for (let i = -2; i <= 2; i++)
        out.push(B([i * 1, 1.2, 2.03], [0.5, 2.4, 0.05], i % 2 ? P.candy : P.cream));
      out.push(Co([0, 3.9, 0], 0.7, 1.4, P.thatch, 16));
      out.push(Sp([0, 4.9, 0], 0.6, P.pastel));
      return out;
    },
  },
  {
    id: "bookstore",
    label: "Bookstore",
    category: "commercial",
    description: "Cozy two-window bookstore with a small hanging sign.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [5.5, 2.8, 4], main),
        B([0, 2.9, 0], [5.8, 0.2, 4.2], P.darkRoof),
        B([-1.5, 1.6, 2.03], [1.8, 1.6, 0.08], P.glassDeep),
        B([1.5, 1.6, 2.03], [1.8, 1.6, 0.08], P.glassDeep),
        B([0, 1.2, 2.03], [1, 2.2, 0.1], P.darkWood),
        B([-2.5, 2.2, 2.6], [0.05, 0.5, 0.05], P.black),
        B([-2.5, 2.6, 2.6], [1.2, 0.4, 0.1], P.wood),
      ];
    },
  },
  {
    id: "gift-shop",
    label: "Gift Shop",
    category: "commercial",
    description: "Cheerful cottage with awning flags and window displays.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [6, 2.8, 4], main),
        Br([-1.6, 3.4, 0], [3.5, 0.2, 4.3], P.red, [0, 0, 0.35]),
        Br([1.6, 3.4, 0], [3.5, 0.2, 4.3], P.red, [0, 0, -0.35]),
        B([0, 1.2, 2.03], [1, 2.2, 0.08], P.gold),
        B([-1.9, 1.6, 2.03], [1.3, 1.2, 0.08], P.window),
        B([1.9, 1.6, 2.03], [1.3, 1.2, 0.08], P.window),
      ];
      for (let i = 0; i < 5; i++) {
        const x = -2.4 + i * 1.2;
        out.push(B([x, 3.9, 2.1], [0.3, 0.4, 0.02], i % 2 ? P.candy : P.mint));
      }
      return out;
    },
  },
  {
    id: "market-stall",
    label: "Market Stall",
    category: "commercial",
    description: "Open-air canopy stall with produce crates.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([-2, 1.4, -1.5], [0.15, 2.8, 0.15], P.darkWood),
        B([2, 1.4, -1.5], [0.15, 2.8, 0.15], P.darkWood),
        B([-2, 1.4, 1.5], [0.15, 2.8, 0.15], P.darkWood),
        B([2, 1.4, 1.5], [0.15, 2.8, 0.15], P.darkWood),
        Br([0, 2.9, 0], [4.6, 0.1, 3.4], main, [0.1, 0, 0]),
        B([0, 2.95, 1.5], [4.6, 0.05, 0.6], P.awningStripe),
        B([0, 0.85, 0], [4, 0.15, 2.2], P.wood),
        B([-1.4, 0.55, 1], [0.7, 0.5, 0.5], P.tileRoof),
        B([0, 0.55, 1], [0.7, 0.5, 0.5], P.leaf),
        B([1.4, 0.55, 1], [0.7, 0.5, 0.5], P.gold),
      ];
    },
  },
  {
    id: "food-truck",
    label: "Food Truck",
    category: "commercial",
    description: "Retro service window truck parked with a menu board.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [5.5, 2, 2.6], main),
        B([-2.4, 1.3, 0], [0.6, 1.6, 2.4], P.silver),
        B([0, 2.65, 0], [5.6, 0.2, 2.8], P.charcoal),
        B([1.2, 1.6, 1.35], [2.4, 1.2, 0.1], P.glass),
        B([1.2, 2.6, 1.35], [2.6, 0.5, 0.6], P.tileRoof),
        Cy([-1.8, 0.5, 1.3], 0.4, 0.4, 0.3, P.charcoal, 20, [HALF_PI, 0, 0]),
        Cy([1.8, 0.5, 1.3], 0.4, 0.4, 0.3, P.charcoal, 20, [HALF_PI, 0, 0]),
        Cy([-1.8, 0.5, -1.3], 0.4, 0.4, 0.3, P.charcoal, 20, [HALF_PI, 0, 0]),
        Cy([1.8, 0.5, -1.3], 0.4, 0.4, 0.3, P.charcoal, 20, [HALF_PI, 0, 0]),
        B([2.8, 1.2, 2.4], [1.4, 1.8, 0.08], P.cream),
      ];
    },
  },
  {
    id: "kiosk",
    label: "Hex Kiosk",
    category: "commercial",
    description: "Six-sided kiosk with pointed roof.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        Cy([0, 1.2, 0], 1.6, 1.8, 2.4, main, 6),
        Cy([0, 2.5, 0], 2.2, 2.2, 0.15, P.roof, 6),
        Co([0, 3.3, 0], 2.1, 1.4, P.tileRoof, 6),
        B([0, 1.7, 1.65], [1.4, 1, 0.05], P.glass),
        B([0, 0.85, 1.65], [0.8, 0.7, 0.05], P.darkWood),
      ];
    },
  },
  {
    id: "library",
    label: "Library",
    category: "civic",
    description: "Colonnade library with dome above the entrance.",
    labelHeight: 6,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [7.5, 2.8, 5], main),
        B([0, 2.9, 0], [7.8, 0.2, 5.3], P.stone),
      ];
      for (let x = -3; x <= 3; x += 1)
        out.push(Cy([x, 1.5, 2.4], 0.25, 0.25, 3, P.cream, 12));
      out.push(B([0, 3.05, 2.4], [7.6, 0.3, 0.5], P.cream));
      out.push(B([0, 1.6, 2.5], [1.3, 2.6, 0.1], P.darkWood));
      out.push(Sp([0, 3.9, 0], 1.4, P.gold));
      out.push(Cy([0, 4.4, 0], 0.1, 0.1, 0.6, P.brass, 8));
      return out;
    },
  },
  {
    id: "museum",
    label: "Museum",
    category: "civic",
    description: "Grand museum with pediment and wide staircase.",
    labelHeight: 6,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.6, 0], [8, 3.2, 5], main),
        B([0, 3.4, 0], [8.4, 0.3, 5.4], P.cream),
      ];
      for (let x = -3.2; x <= 3.2; x += 1.6)
        out.push(Cy([x, 1.8, 2.4], 0.3, 0.3, 3.4, P.cream, 12));
      out.push(Br([0, 4.05, 2.4], [7.6, 0.1, 1.6], P.stone, [0.3, 0, 0]));
      out.push(B([0, 1.4, 2.55], [2, 2.6, 0.1], P.darkWood));
      out.push(B([0, 0.35, 3.2], [5, 0.15, 1], P.stone));
      out.push(B([0, 0.15, 3.6], [5.2, 0.15, 0.7], P.stone));
      return out;
    },
  },
  {
    id: "theater",
    label: "Theater",
    category: "civic",
    description: "Marquee theater with lit sign strip.",
    labelHeight: 5.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.8, 0], [7, 3.6, 4.5], main),
        B([0, 3.7, 0], [7.2, 0.3, 4.7], P.darkRoof),
        B([0, 2.5, 2.35], [5.6, 0.8, 0.4], P.neon),
        B([0, 2.5, 2.35], [5, 0.5, 0.5], P.gold),
        B([0, 1.1, 2.28], [1.4, 2, 0.1], P.darkWood),
        Sp([0, 4.3, 0], 0.6, P.gold),
        Cy([0, 4.7, 0], 0.1, 0.1, 0.6, P.brass, 8),
      ];
    },
  },
  {
    id: "cinema",
    label: "Cinema",
    category: "commercial",
    description: "Cinema with vertical vintage sign.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.6, 0], [6.5, 3.2, 4.5], main),
        B([0, 3.35, 0], [6.8, 0.2, 4.8], P.charcoal),
        B([-2.5, 4.5, 0], [1.2, 3, 0.4], P.red),
        B([-2.5, 4.5, 0], [0.7, 2.7, 0.42], P.cream),
        B([0, 2.4, 2.28], [4, 1, 0.1], P.glass),
        B([0, 1.2, 2.28], [1.6, 1.6, 0.1], P.door),
      ];
    },
  },
  {
    id: "arcade",
    label: "Arcade",
    category: "commercial",
    description: "Blocky arcade with animated neon signage.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [6.5, 2.8, 4.2], main),
        B([0, 3.1, 0], [1.5, 1, 4.2], P.neon),
        B([0, 3.1, 0], [1.4, 0.9, 4.3], P.candy),
        B([0, 3.1, 0], [1.3, 0.8, 4.35], P.neon),
        B([0, 1.1, 2.13], [1.6, 2, 0.1], P.charcoal),
        B([-2, 1.6, 2.13], [1.5, 1.4, 0.08], P.candy),
        B([2, 1.6, 2.13], [1.5, 1.4, 0.08], P.mint),
      ];
    },
  },
  {
    id: "hotel",
    label: "Boutique Hotel",
    category: "commercial",
    description: "Four-story boutique hotel with balconies.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 2.6, 0], [6, 5.2, 4.5], main),
        B([0, 5.3, 0], [6.3, 0.25, 4.8], P.darkRoof),
        B([0, 0.9, 2.28], [1.4, 1.8, 0.1], P.glass),
      ];
      for (let f = 0; f < 3; f++) {
        const y = 2 + f * 1.1;
        for (const x of [-1.8, 0, 1.8]) {
          out.push(B([x, y, 2.28], [0.9, 0.7, 0.05], P.glass));
          out.push(B([x, y - 0.55, 2.4], [1.2, 0.15, 0.1], P.brass));
        }
      }
      return out;
    },
  },
  {
    id: "bank",
    label: "Bank",
    category: "civic",
    description: "Heavy stone bank with columns and vault door.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.7, 0], [7.5, 3.4, 4.8], main),
        B([0, 3.55, 0], [7.8, 0.3, 5.1], P.darkStone),
      ];
      for (const x of [-2.7, -0.9, 0.9, 2.7])
        out.push(Cy([x, 1.7, 2.5], 0.28, 0.28, 3.4, P.cream, 12));
      out.push(B([0, 3.85, 2.5], [7, 0.4, 0.4], P.cream));
      out.push(B([0, 1.5, 2.6], [1.6, 3, 0.1], P.brass));
      out.push(Sp([0, 2, 2.7], 0.35, P.gold));
      return out;
    },
  },
  {
    id: "office-tower",
    label: "Office Tower",
    category: "commercial",
    description: "Reflective office block with roof mechanicals.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 3.5, 0], [4.5, 7, 3.5], main),
        B([0, 7.15, 0], [4.7, 0.2, 3.7], P.charcoal),
        B([-1, 7.4, -0.6], [1, 0.4, 1], P.silver),
        B([1, 7.4, 0.4], [0.8, 0.5, 0.8], P.silver),
      ];
      for (let r = 0; r < 5; r++) {
        for (let c = -1; c <= 1; c++)
          out.push(B([c * 1.4, 1.5 + r * 1.2, 1.78], [1.1, 0.8, 0.06], P.glass));
      }
      out.push(B([0, 0.6, 1.78], [1.5, 1.2, 0.08], P.glassDeep));
      return out;
    },
  },
  {
    id: "school",
    label: "School",
    category: "civic",
    description: "Two-wing school with entrance clock.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [7.5, 2.8, 4.2], main),
        B([0, 2.9, 0], [7.8, 0.2, 4.5], P.tileRoof),
        B([0, 3.5, 0], [1.6, 1.2, 1.6], main),
        B([0, 4.15, 0], [1.8, 0.15, 1.8], P.darkRoof),
        Cy([0, 3.5, 0.82], 0.4, 0.4, 0.05, P.cream, 20, [HALF_PI, 0, 0]),
        Cy([0, 3.5, 0.85], 0.3, 0.3, 0.05, P.charcoal, 20, [HALF_PI, 0, 0]),
        B([0, 1.15, 2.13], [1.4, 2, 0.1], P.darkWood),
        ...windowRow(1.6, 2.13, P.window, 4, 1.6, [0.9, 0.9]).map(
          (w) => (w.kind === "box" ? { ...w, position: [w.position[0] + (w.position[0] < 0 ? -0.8 : 0.8), w.position[1], w.position[2]] } : w),
        ) as Primitive[],
      ];
    },
  },
  {
    id: "hospital",
    label: "Hospital",
    category: "civic",
    description: "White clinic with a red cross emblem.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.9, 0], [7, 3.8, 4.5], main),
        B([0, 3.95, 0], [7.2, 0.15, 4.7], P.stone),
        B([0, 4.4, 0], [1, 0.5, 0.4], P.red),
        B([0, 4.4, 0], [0.35, 1.4, 0.42], P.red),
        B([0, 1.2, 2.28], [1.6, 2, 0.1], P.glass),
        B([-2, 1.6, 2.28], [1.2, 1, 0.08], P.window),
        B([2, 1.6, 2.28], [1.2, 1, 0.08], P.window),
        B([-2, 2.9, 2.28], [1.2, 1, 0.08], P.window),
        B([2, 2.9, 2.28], [1.2, 1, 0.08], P.window),
      ];
    },
  },
  {
    id: "fire-station",
    label: "Fire Station",
    category: "civic",
    description: "Fire station with bell tower and roll-up bay door.",
    labelHeight: 6,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [6.5, 3, 4.5], main),
        B([0, 3.15, 0], [6.8, 0.2, 4.7], P.darkRoof),
        B([2.5, 3.8, -1.6], [1, 2, 1], main),
        Co([2.5, 5.2, -1.6], 0.9, 1, P.darkRoof, 4),
        B([-1, 1.2, 2.28], [3, 2.2, 0.1], P.brass),
        B([2, 1.6, 2.28], [1.5, 1.2, 0.08], P.window),
      ];
    },
  },
  {
    id: "police-station",
    label: "Police Station",
    category: "civic",
    description: "Blocky civic building with badge sign.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.6, 0], [7, 3.2, 4.5], main),
        B([0, 3.35, 0], [7.3, 0.2, 4.8], P.charcoal),
        B([0, 3.9, 2.2], [1.4, 0.9, 0.1], P.gold),
        B([0, 3.9, 2.2], [0.7, 0.6, 0.15], P.slate),
        B([0, 1.2, 2.28], [1.4, 2, 0.1], P.darkWood),
        B([-2, 1.6, 2.28], [1.3, 1.2, 0.08], P.window),
        B([2, 1.6, 2.28], [1.3, 1.2, 0.08], P.window),
        B([-2, 2.9, 2.28], [1.3, 1, 0.08], P.window),
        B([2, 2.9, 2.28], [1.3, 1, 0.08], P.window),
      ];
    },
  },
  {
    id: "carousel",
    label: "Carousel",
    category: "attraction",
    description: "Merry-go-round with striped canopy and horses.",
    labelHeight: 5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.35, 0], 3.2, 3.4, 0.3, P.stone, 20),
        Cy([0, 2.1, 0], 0.3, 0.3, 3.4, P.gold, 12),
        ...stripes(2.7, 3, 0.2, main, P.cream, 12),
      ];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        out.push(
          Cy([Math.cos(a) * 2.4, 1.4, Math.sin(a) * 2.4], 0.1, 0.1, 1.8, P.brass, 8),
        );
        out.push(
          B([Math.cos(a) * 2.4, 1.1, Math.sin(a) * 2.4], [0.6, 0.5, 0.25], i % 2 ? P.candy : P.mint),
        );
      }
      out.push(Co([0, 4.2, 0], 3.6, 1.6, main, 12));
      out.push(Sp([0, 5.2, 0], 0.35, P.gold));
      return out;
    },
  },
  {
    id: "ferris-wheel",
    label: "Ferris Wheel",
    category: "attraction",
    description: "Large wheel with hanging gondolas.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Br([-1.2, 3.4, 0], [0.35, 6.5, 0.35], P.charcoal, [0, 0, 0.25]),
        Br([1.2, 3.4, 0], [0.35, 6.5, 0.35], P.charcoal, [0, 0, -0.25]),
        To([0, 5.6, 0], 3, 0.1, P.charcoal, 24, [0, HALF_PI, 0]),
        To([0, 5.6, 0], 2.7, 0.06, P.charcoal, 24, [0, HALF_PI, 0]),
        Sp([0, 5.6, 0], 0.35, P.brass),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * 2.85;
        const y = 5.6 + Math.sin(a) * 2.85;
        out.push(Cy([x, y, 0], 0.03, 0.03, 0.6, P.charcoal, 6));
        out.push(B([x, y - 0.5, 0], [0.5, 0.4, 0.5], i % 2 ? main : P.candy));
      }
      return out;
    },
  },
  {
    id: "coaster-station",
    label: "Coaster Station",
    category: "attraction",
    description: "Coaster boarding platform with a curved track element.",
    labelHeight: 5.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [6, 2.8, 3.5], main),
        B([0, 2.9, 0], [6.3, 0.2, 3.8], P.charcoal),
        B([0, 3.5, 0], [1.6, 1.2, 3.8], main),
        Co([0, 4.35, 0], 1, 0.5, P.red, 4),
        B([0, 1.3, 1.78], [1.4, 2.2, 0.1], P.charcoal),
      ];
      for (let i = 0; i < 6; i++)
        out.push(
          B([-3 + i * 1.2, 4.8 - Math.sin(i * 0.6) * 0.5, -3], [1.2, 0.1, 0.4], P.silver),
        );
      out.push(Cy([-3, 4.6, -3], 0.06, 0.06, 3, P.charcoal, 8));
      out.push(Cy([3, 4.6, -3], 0.06, 0.06, 3, P.charcoal, 8));
      return out;
    },
  },
  {
    id: "tea-cups",
    label: "Spinning Tea Cups",
    category: "attraction",
    description: "Turntable ride with brightly colored teacups.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.3, 0], 3.2, 3.4, 0.25, P.stone, 24),
        Cy([0, 0.55, 0], 3, 3, 0.1, main, 24),
        Cy([0, 1.4, 0], 0.35, 0.35, 1.6, P.brass, 12),
        Cy([0, 2.3, 0], 1.4, 1.4, 0.15, P.gold, 20),
      ];
      const colors = [P.candy, P.mint, P.pastel, P.neon];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const x = Math.cos(a) * 1.9;
        const z = Math.sin(a) * 1.9;
        out.push(Cy([x, 0.9, z], 0.6, 0.5, 0.7, colors[i], 20));
        out.push(To([x + 0.5, 0.9, z], 0.15, 0.05, colors[i], 12, [0, 0, HALF_PI]));
      }
      return out;
    },
  },
  {
    id: "haunted-house",
    label: "Haunted House",
    category: "attraction",
    description: "Leaning gothic mansion with pointed tower.",
    labelHeight: 6,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        Br([0, 1.6, 0], [6, 3.2, 4.5], main, [0, 0.03, 0.03]),
        Br([-1.6, 3.6, 0], [3.5, 0.2, 4.7], P.darkRoof, [0, 0.03, 0.4]),
        Br([1.6, 3.6, 0], [3.5, 0.2, 4.7], P.darkRoof, [0, 0.03, -0.4]),
        B([-2, 3.5, -0.8], [1.4, 3.2, 1.4], main),
        Co([-2, 5.6, -0.8], 1.1, 1.4, P.charcoal, 8),
        B([-2, 3.7, 0.02], [0.6, 0.9, 0.06], P.neon),
        B([0, 1.2, 2.3], [0.9, 2.4, 0.1], P.charcoal),
        B([-1.6, 1.6, 2.3], [0.7, 0.8, 0.08], P.neon),
        B([1.6, 1.6, 2.3], [0.7, 0.8, 0.08], P.neon),
      ];
    },
  },
  {
    id: "gazebo",
    label: "Gazebo",
    category: "landmark",
    description: "Small open gazebo with lattice railing.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.35, 0], 2.4, 2.6, 0.3, P.stone, 8),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push(
          Cy([Math.cos(a) * 2.2, 1.4, Math.sin(a) * 2.2], 0.1, 0.1, 2.1, P.cream, 8),
        );
      }
      out.push(Cy([0, 2.55, 0], 2.4, 2.4, 0.1, P.roof, 8));
      out.push(Co([0, 3.3, 0], 2.6, 1.4, main, 8));
      out.push(Sp([0, 4.15, 0], 0.2, P.gold));
      return out;
    },
  },
  {
    id: "park-pavilion",
    label: "Park Pavilion",
    category: "landmark",
    description: "Hexagonal open shelter for picnics.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [Cy([0, 0.35, 0], 3, 3.2, 0.3, P.stone, 6)];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        out.push(
          B([Math.cos(a) * 2.6, 1.4, Math.sin(a) * 2.6], [0.2, 2.2, 0.2], P.darkWood),
        );
      }
      out.push(Cy([0, 2.6, 0], 3.4, 3.4, 0.15, main, 6));
      out.push(Co([0, 3.5, 0], 3.5, 1.5, P.tileRoof, 6));
      out.push(B([-1, 0.85, 0], [2.4, 0.15, 1], P.wood));
      out.push(B([-1, 0.45, 0], [2.4, 0.5, 0.2], P.wood));
      return out;
    },
  },
  {
    id: "bandstand",
    label: "Bandstand",
    category: "landmark",
    description: "Round bandstand with domed roof.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.4, 0], 2.6, 2.8, 0.4, P.stone, 20),
        Cy([0, 0.9, 0], 2.4, 2.4, 0.4, main, 20),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push(
          Cy([Math.cos(a) * 2.2, 2, Math.sin(a) * 2.2], 0.09, 0.09, 2, P.cream, 8),
        );
      }
      out.push(Cy([0, 3.1, 0], 2.4, 2.4, 0.12, P.cream, 20));
      out.push(Sp([0, 3.6, 0], 1.6, main));
      out.push(Cy([0, 4.7, 0], 0.1, 0.1, 0.6, P.gold, 8));
      return out;
    },
  },
  {
    id: "pagoda",
    label: "Pagoda",
    category: "landmark",
    description: "Three-tier pagoda with upturned eaves.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [];
      const tiers = [
        { y: 1.1, w: 5, h: 1.6, roofW: 5.6, roofH: 0.3 },
        { y: 3.2, w: 4, h: 1.2, roofW: 4.6, roofH: 0.25 },
        { y: 4.9, w: 3, h: 1, roofW: 3.6, roofH: 0.22 },
      ];
      for (const t of tiers) {
        out.push(B([0, t.y, 0], [t.w, t.h, t.w * 0.75], main));
        out.push(B([0, t.y + t.h / 2 + t.roofH / 2, 0], [t.roofW, t.roofH, t.roofW * 0.75], P.tileRoof));
      }
      out.push(Cy([0, 6.4, 0], 0.15, 0.15, 1, P.brass, 8));
      out.push(Sp([0, 7, 0], 0.25, P.gold));
      return out;
    },
  },
  {
    id: "temple",
    label: "Greek Temple",
    category: "landmark",
    description: "White marble temple with rows of columns.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.35, 0], [8.4, 0.3, 5.4], P.stone),
        B([0, 0.75, 0], [8, 0.3, 5], P.cream),
      ];
      for (let x = -3.4; x <= 3.4; x += 1.4)
        for (const z of [-2.1, 2.1])
          out.push(Cy([x, 2.4, z], 0.28, 0.28, 3.5, P.cream, 12));
      out.push(B([0, 4.2, 0], [8, 0.3, 5], main));
      out.push(Br([0, 4.9, 0], [8, 0.05, 5.4], P.stone, [0.25, 0, 0]));
      out.push(Br([0, 4.9, 0], [8, 0.05, 5.4], P.stone, [-0.25, 0, 0]));
      return out;
    },
  },
  {
    id: "castle",
    label: "Castle",
    category: "landmark",
    description: "Stone keep with four corner turrets.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.6, 0], [6, 3.2, 4.5], main),
        B([0, 3.4, 0], [6.2, 0.15, 4.7], main),
      ];
      for (let i = 0; i < 8; i++)
        out.push(B([-2.7 + i * 0.8, 3.6, 2.3], [0.4, 0.4, 0.4], main));
      for (let i = 0; i < 8; i++)
        out.push(B([-2.7 + i * 0.8, 3.6, -2.3], [0.4, 0.4, 0.4], main));
      const turrets: Vec3T[] = [
        [-2.7, 3, -2.1],
        [2.7, 3, -2.1],
        [-2.7, 3, 2.1],
        [2.7, 3, 2.1],
      ];
      for (const t of turrets) {
        out.push(Cy(t, 0.6, 0.6, 3.6, main, 12));
        out.push(Co([t[0], t[1] + 2.2, t[2]], 0.8, 1, P.red, 12));
      }
      out.push(B([0, 1.4, 2.28], [1.4, 2.6, 0.1], P.darkWood));
      return out;
    },
  },
  {
    id: "windmill",
    label: "Windmill",
    category: "landmark",
    description: "Stone tower windmill with wooden blades.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        Cy([0, 2.1, 0], 1.4, 1.8, 4.2, main, 16),
        Co([0, 4.8, 0], 1.5, 1.4, P.darkRoof, 16),
        B([0, 4.4, 1.8], [0.5, 0.5, 0.5], P.darkWood),
        Br([0, 4.4, 1.85], [3.4, 0.15, 0.6], P.wood, [0, 0, 0]),
        Br([0, 4.4, 1.85], [3.4, 0.15, 0.6], P.wood, [0, 0, HALF_PI]),
        B([0, 1, 1.83], [0.9, 2, 0.1], P.darkWood),
        B([0, 3, 1.83], [0.7, 0.5, 0.08], P.window),
      ];
    },
  },
  {
    id: "lighthouse",
    label: "Lighthouse",
    category: "landmark",
    description: "Striped lighthouse with lantern room.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        Cy([0, 0.35, 0], 1.8, 2, 0.3, P.stone, 20),
        Cy([0, 3.5, 0], 1, 1.4, 6, main, 20),
        Cy([0, 6.7, 0], 1.3, 1.3, 0.2, P.charcoal, 20),
        Cy([0, 7.2, 0], 0.9, 0.9, 0.8, P.glass, 20),
        Co([0, 8, 0], 1, 0.6, P.red, 20),
        Sp([0, 8.5, 0], 0.15, P.gold),
        B([0, 1.5, 1.5], [0.6, 1.4, 0.1], P.darkWood),
        Cy([0, 3.5, 0], 1.05, 1.42, 0.4, P.cream, 20),
        Cy([0, 5, 0], 1.03, 1.2, 0.4, P.cream, 20),
      ];
    },
  },
  {
    id: "greenhouse",
    label: "Greenhouse",
    category: "utility",
    description: "Glass greenhouse with peaked roof.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.8, 0], [6.5, 1.6, 4.2], P.glass),
        B([0, 1.6, 0], [6.5, 0.05, 4.2], P.cream),
      ];
      for (let x = -3; x <= 3; x += 1)
        out.push(B([x, 1.4, 0], [0.08, 1.8, 4.3], P.cream));
      out.push(Br([-1.3, 2.4, 0], [3, 0.1, 4.3], main, [0, 0, 0.4]));
      out.push(Br([1.3, 2.4, 0], [3, 0.1, 4.3], main, [0, 0, -0.4]));
      out.push(B([0, 3, 0], [0.2, 0.2, 4.4], P.darkWood));
      for (const z of [-1.5, -0.5, 0.5, 1.5])
        out.push(B([-2.5, 0.5, z], [0.6, 0.6, 0.4], P.leaf));
      return out;
    },
  },
  {
    id: "airport-gate",
    label: "Airport Gate",
    category: "transit",
    description: "Portal with entry frame — familiar gate style.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([-2.5, 2.2, 0], [0.55, 4.4, 0.65], main),
        B([2.5, 2.2, 0], [0.55, 4.4, 0.65], main),
        B([0, 4.3, 0], [5.6, 0.8, 0.8], main),
        B([0, 0.6, -1], [3, 0.7, 0.5], P.slate),
        B([0, 2.4, 0.5], [4, 2, 0.1], P.glass),
      ];
    },
  },
  {
    id: "train-station",
    label: "Train Station",
    category: "transit",
    description: "Small station with arched entry and clock.",
    labelHeight: 5.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [7, 3, 4.2], main),
        B([0, 3.05, 0], [7.3, 0.15, 4.5], P.darkRoof),
        Cy([0, 3.15, 2.35], 1.4, 1.4, 0.2, main, 16, [HALF_PI, 0, 0]),
        Cy([0, 1.6, 2.3], 1.3, 1.3, 0.1, P.darkWood, 16, [HALF_PI, 0, 0]),
        B([0, 3.9, 0], [1, 1, 1], main),
        Cy([0, 3.9, 0.55], 0.35, 0.35, 0.05, P.cream, 20, [HALF_PI, 0, 0]),
        Cy([0, 3.9, 0.6], 0.25, 0.25, 0.05, P.charcoal, 20, [HALF_PI, 0, 0]),
        Br([0, 4.6, 0], [1.4, 0.15, 1.4], P.darkRoof, [0, HALF_PI / 2, 0]),
        B([-2.5, 1.6, 2.13], [1.4, 1.2, 0.08], P.window),
        B([2.5, 1.6, 2.13], [1.4, 1.2, 0.08], P.window),
      ];
    },
  },
  {
    id: "warehouse",
    label: "Warehouse",
    category: "utility",
    description: "Corrugated warehouse with roll-up door.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [8, 2.8, 5], main),
        B([0, 2.95, 0], [8.2, 0.2, 5.2], P.charcoal),
      ];
      for (let i = -3.5; i <= 3.5; i += 0.5)
        out.push(B([i, 1.4, 2.55], [0.05, 2.8, 0.05], P.charcoal));
      out.push(B([0, 1.2, 2.55], [2.4, 2, 0.05], P.brass));
      out.push(B([-3, 2.2, 2.55], [1, 0.6, 0.06], P.window));
      out.push(B([3, 2.2, 2.55], [1, 0.6, 0.06], P.window));
      return out;
    },
  },
  {
    id: "loft",
    label: "Brick Loft",
    category: "residential",
    description: "Converted brick loft with tall industrial windows.",
    labelHeight: 5.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 2, 0], [6, 4, 4.2], main),
        B([0, 4.1, 0], [6.2, 0.15, 4.4], P.charcoal),
      ];
      for (let i = -2.2; i <= 2.2; i += 1.5)
        out.push(B([i, 2.3, 2.13], [1.1, 2.4, 0.06], P.glassDeep));
      out.push(B([0, 0.9, 2.13], [1.4, 1.8, 0.1], P.charcoal));
      out.push(B([0, 4.4, -1.5], [0.5, 0.6, 0.5], P.charcoal));
      return out;
    },
  },
  {
    id: "clock-tower",
    label: "Clock Tower",
    category: "landmark",
    description: "Slim clock tower with weathervane.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 3, 0], [2.4, 6, 2.4], main),
        B([0, 6.2, 0], [2.7, 0.2, 2.7], P.cream),
        B([0, 6.5, 0], [1.6, 0.6, 1.6], main),
        Co([0, 7.4, 0], 1.6, 1.4, P.darkRoof, 4),
        Cy([0, 5.5, 1.22], 0.45, 0.45, 0.05, P.cream, 24, [HALF_PI, 0, 0]),
        Cy([0, 5.5, 1.25], 0.3, 0.3, 0.05, P.charcoal, 24, [HALF_PI, 0, 0]),
        B([0, 8.2, 0], [0.05, 0.6, 0.05], P.brass),
        B([0, 8.6, 0], [0.6, 0.05, 0.05], P.brass),
        B([0, 0.6, 1.22], [0.8, 1.2, 0.06], P.darkWood),
      ];
    },
  },
  {
    id: "terminal-modern",
    label: "Modern Terminal",
    category: "transit",
    description: "Wide glass airport terminal with curved standing-seam roof.",
    labelHeight: 5.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [8.5, 2.8, 4.5], main),
        B([0, 1.6, 2.3], [8, 2.6, 0.1], P.glass),
      ];
      for (let i = -3; i <= 3; i += 1)
        out.push(B([i, 1.6, 2.32], [0.05, 2.6, 0.05], P.silver));
      out.push(Cy([0, 3.4, 0], 4.5, 4.5, 0.15, P.silver, 32, [0, 0, 0]));
      out.push(Cy([0, 3.4, 0], 4.6, 4.6, 0.05, P.charcoal, 32));
      out.push(B([0, 3.9, -1.5], [1, 0.6, 0.5], P.charcoal));
      out.push(B([0, 1.2, 2.4], [1.4, 2, 0.1], P.glassDeep));
      out.push(B([-3, 4, 0], [0.08, 1.6, 0.08], P.silver));
      out.push(B([3, 4, 0], [0.08, 1.6, 0.08], P.silver));
      return out;
    },
  },
  {
    id: "terminal-classic",
    label: "Classic Terminal",
    category: "transit",
    description: "Mid-century terminal with clock and colonnade entry.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [8.5, 2.8, 4.5], main),
        B([0, 2.95, 0], [8.8, 0.2, 4.8], P.charcoal),
      ];
      for (let x = -3.5; x <= 3.5; x += 1)
        out.push(Cy([x, 1.6, 2.3], 0.16, 0.16, 2.8, P.cream, 12));
      out.push(B([0, 3.4, 0], [3, 1, 1], main));
      out.push(Cy([0, 3.4, 0.52], 0.35, 0.35, 0.05, P.cream, 24, [HALF_PI, 0, 0]));
      out.push(Cy([0, 3.4, 0.56], 0.25, 0.25, 0.05, P.charcoal, 24, [HALF_PI, 0, 0]));
      out.push(B([0, 1, 2.35], [1.4, 2, 0.06], P.glass));
      return out;
    },
  },
  {
    id: "control-tower",
    label: "Control Tower",
    category: "transit",
    description: "Airport control tower with hexagonal cab.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 0.5, 0], [3, 1, 3], main),
        Cy([0, 4.5, 0], 0.7, 1, 7, main, 20),
        Cy([0, 8.2, 0], 1.6, 1.4, 0.8, P.charcoal, 6),
        Cy([0, 8.6, 0], 1.7, 1.7, 0.6, P.glassDeep, 6),
        Cy([0, 9.1, 0], 1.6, 1.6, 0.15, P.charcoal, 6),
        Co([0, 9.6, 0], 1.4, 0.6, P.silver, 6),
        Cy([0, 10.4, 0], 0.05, 0.05, 1.4, P.charcoal, 6),
        Sp([0, 11.2, 0], 0.15, P.red),
        B([0, 2.5, 0.72], [0.6, 0.8, 0.06], P.window),
        B([0, 4.5, 0.85], [0.5, 0.8, 0.06], P.window),
        B([0, 6.5, 0.95], [0.5, 0.8, 0.06], P.window),
      ];
    },
  },
  {
    id: "hangar",
    label: "Aircraft Hangar",
    category: "transit",
    description: "Corrugated half-cylinder aircraft hangar.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 1.8, 0], 3.6, 3.6, 8, main, 24, [0, 0, HALF_PI]),
        B([0, 1.8, 0], [8, 3.6, 4.5], main),
      ];
      for (let x = -3.5; x <= 3.5; x += 0.5)
        out.push(B([x, 1.8, 2.28], [0.05, 3.6, 0.05], P.charcoal));
      out.push(B([0, 1.5, 2.3], [4, 3, 0.08], P.brass));
      out.push(B([0, 1.5, 2.3], [0.1, 3, 0.1], P.charcoal));
      out.push(Cy([0, 1.8, -2.3], 3.6, 3.6, 0.05, P.charcoal, 24, [0, 0, HALF_PI]));
      return out;
    },
  },
  {
    id: "jetbridge",
    label: "Jet Bridge",
    category: "transit",
    description: "Extending jetway to a plane docking position.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 2.2, -1.8], [3, 3.2, 2.4], main),
        B([0, 1.6, 0.4], [2, 1.8, 3.5], P.silver),
        B([0, 1.6, 0.4], [1.9, 1.6, 3.5], P.glass),
        Cy([0, 0.5, 0.4], 0.15, 0.15, 1.4, P.charcoal, 12, [HALF_PI, 0, HALF_PI]),
        Cy([0, 0.5, 2], 0.15, 0.15, 1.4, P.charcoal, 12, [HALF_PI, 0, HALF_PI]),
        B([1.6, 1.6, 2.4], [0.2, 2, 0.2], P.silver),
        B([-1.6, 1.6, 2.4], [0.2, 2, 0.2], P.silver),
        B([0, 2.9, 2.4], [3.4, 0.3, 0.3], P.silver),
        B([0, 3.9, -1.8], [3.4, 0.3, 2.6], P.charcoal),
      ];
    },
  },
  {
    id: "radar-dome",
    label: "Radar Dome",
    category: "utility",
    description: "White geodesic radar dome on a service base.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.5, 0], [4, 1, 4], main),
        Cy([0, 1.4, 0], 1.6, 1.8, 0.8, P.silver, 16),
        Sp([0, 3, 0], 2.2, P.cream),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push(B([Math.cos(a) * 2, 3.1, Math.sin(a) * 2], [0.05, 1.2, 0.05], P.silver));
      }
      out.push(B([0, 0.8, 2.05], [0.9, 1.2, 0.06], P.darkWood));
      return out;
    },
  },
  {
    id: "cargo-warehouse",
    label: "Cargo Warehouse",
    category: "utility",
    description: "Low cargo warehouse with roll doors and dock levellers.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.2, 0], [8.5, 2.4, 4.5], main),
        B([0, 2.55, 0], [8.7, 0.15, 4.7], P.charcoal),
      ];
      for (let i = -3; i <= 3; i += 2) {
        out.push(B([i, 1, 2.28], [1.4, 1.8, 0.06], P.brass));
        out.push(B([i, 0.15, 2.5], [1.4, 0.15, 0.15], P.charcoal));
      }
      out.push(B([0, 3.1, -1.6], [2, 0.8, 0.6], P.charcoal));
      return out;
    },
  },
  {
    id: "fuel-depot",
    label: "Fuel Depot",
    category: "utility",
    description: "Cluster of storage tanks with catwalks and piping.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const positions: [number, number][] = [
        [-2.2, -1],
        [0, -1],
        [2.2, -1],
        [-1, 1.3],
        [1, 1.3],
      ];
      const out: Primitive[] = [B([0, 0.15, 0], [8, 0.3, 5], P.charcoal)];
      for (const [x, z] of positions) {
        out.push(Cy([x, 1.4, z], 0.9, 0.9, 2.4, main, 20));
        out.push(Cy([x, 2.65, z], 0.9, 0.9, 0.15, P.silver, 20));
        out.push(To([x, 2, z], 0.95, 0.05, P.charcoal, 20, [0, HALF_PI, 0]));
      }
      out.push(Cy([-1.1, 1, 0.15], 0.05, 0.05, 3.5, P.silver, 8, [0, 0, HALF_PI]));
      out.push(Cy([1.1, 1, 0.15], 0.05, 0.05, 3.5, P.silver, 8, [0, 0, HALF_PI]));
      return out;
    },
  },
  {
    id: "runway-beacon",
    label: "Runway Beacon",
    category: "transit",
    description: "Small illuminated pylon beacon at runway threshold.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.2, 0], [3, 0.4, 3], P.charcoal),
        Cy([0, 1.6, 0], 0.25, 0.35, 2.8, main, 12),
        Cy([0, 3.2, 0], 0.6, 0.6, 0.3, P.silver, 20),
        Sp([0, 3.7, 0], 0.4, P.neon),
        Cy([0, 4.2, 0], 0.05, 0.05, 0.6, P.brass, 8),
      ];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        out.push(B([Math.cos(a) * 1, 0.4, Math.sin(a) * 1], [0.15, 0.15, 0.05], P.neon));
      }
      return out;
    },
  },
  {
    id: "helipad",
    label: "Helipad",
    category: "transit",
    description: "Ground-level helipad with big painted H.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.15, 0], 3.4, 3.4, 0.3, P.charcoal, 32),
        Cy([0, 0.32, 0], 3.1, 3.1, 0.05, main, 32),
        B([-0.6, 0.36, 0], [0.3, 0.05, 1.8], P.cream),
        B([0.6, 0.36, 0], [0.3, 0.05, 1.8], P.cream),
        B([0, 0.36, 0], [1.5, 0.05, 0.3], P.cream),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push(Sp([Math.cos(a) * 3.1, 0.5, Math.sin(a) * 3.1], 0.08, P.neon));
      }
      return out;
    },
  },
  {
    id: "skyscraper-twin",
    label: "Twin Towers",
    category: "commercial",
    description: "Two connected slim towers with sky bridge.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([-1.6, 4, 0], [2.4, 8, 2.4], main),
        B([1.6, 4, 0], [2.4, 8, 2.4], main),
        B([-1.6, 8.15, 0], [2.6, 0.2, 2.6], P.charcoal),
        B([1.6, 8.15, 0], [2.6, 0.2, 2.6], P.charcoal),
        B([0, 5, 0], [1.5, 0.6, 2], P.silver),
        B([0, 4.4, 0], [1.5, 0.6, 2], P.glass),
      ];
      for (let f = 0; f < 7; f++)
        for (const x of [-1.6, 1.6])
          out.push(B([x, 1.2 + f * 1, 1.22], [1.8, 0.7, 0.05], P.glass));
      return out;
    },
  },
  {
    id: "skyscraper-tapered",
    label: "Tapered Tower",
    category: "commercial",
    description: "Tower that narrows in setbacks toward the sky.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.5, 0], [5, 3, 4], main),
        B([0, 4.2, 0], [4.2, 2.4, 3.4], main),
        B([0, 6.4, 0], [3.4, 2, 2.8], main),
        B([0, 8.1, 0], [2.6, 1.4, 2.2], main),
        B([0, 9.3, 0], [1.6, 1, 1.6], main),
        Cy([0, 10.2, 0], 0.05, 0.05, 1.4, P.brass, 8),
      ];
      for (let f = 0; f < 3; f++)
        out.push(B([0, 1.4 + f * 0.85, 2.05], [3.6, 0.55, 0.05], P.glass));
      out.push(B([0, 4.2, 1.75], [3, 1.6, 0.06], P.glass));
      out.push(B([0, 6.3, 1.45], [2.2, 1.4, 0.06], P.glass));
      return out;
    },
  },
  {
    id: "skyscraper-crown",
    label: "Crowned Tower",
    category: "commercial",
    description: "Skyscraper capped with an ornate metallic crown.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 4, 0], [4.5, 8, 3.5], main),
        B([0, 8.15, 0], [4.5, 0.3, 3.5], P.brass),
        B([0, 8.55, 0], [3.4, 0.4, 2.6], P.brass),
        B([0, 9, 0], [2.4, 0.5, 1.8], P.gold),
        Co([0, 9.6, 0], 1.4, 1.4, P.gold, 4),
      ];
      for (let f = 0; f < 7; f++)
        for (let c = -1; c <= 1; c++)
          out.push(B([c * 1.3, 1.2 + f * 1, 1.78], [0.9, 0.7, 0.05], P.glass));
      out.push(B([0, 0.6, 1.78], [1.4, 1.2, 0.08], P.darkWood));
      return out;
    },
  },
  {
    id: "skyscraper-panels",
    label: "Panel Tower",
    category: "commercial",
    description: "Modern tower with alternating panel and glass bands.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [B([0, 4, 0], [4.5, 8, 3.5], main)];
      for (let i = 0; i < 6; i++) {
        const y = 1.4 + i * 1.15;
        out.push(B([0, y, 1.78], [4.2, 0.35, 0.08], P.glass));
        out.push(B([0, y + 0.6, 1.78], [4.2, 0.3, 0.08], P.silver));
      }
      out.push(B([0, 8.1, 0], [4.6, 0.2, 3.6], P.charcoal));
      out.push(B([0, 8.5, 0], [1.2, 0.5, 1.2], P.silver));
      out.push(B([0, 0.6, 1.78], [1.4, 1.2, 0.08], P.charcoal));
      return out;
    },
  },
  {
    id: "skyscraper-cross",
    label: "Cross-Plate Tower",
    category: "commercial",
    description: "Cross-shaped floor plate maximizing corner offices.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 4, 0], [4.4, 8, 1.8], main),
        B([0, 4, 0], [1.8, 8, 4.4], main),
        B([0, 8.15, 0], [4.6, 0.2, 1.9], P.charcoal),
        B([0, 8.15, 0], [1.9, 0.2, 4.6], P.charcoal),
      ];
      for (let f = 0; f < 7; f++) {
        out.push(B([0, 1.2 + f * 1, 0.95], [4.1, 0.6, 0.05], P.glass));
        out.push(B([0, 1.2 + f * 1, -0.95], [4.1, 0.6, 0.05], P.glass));
        out.push(B([0.95, 1.2 + f * 1, 0], [0.05, 0.6, 4.1], P.glass));
        out.push(B([-0.95, 1.2 + f * 1, 0], [0.05, 0.6, 4.1], P.glass));
      }
      return out;
    },
  },
  {
    id: "skyscraper-glass",
    label: "All-Glass Tower",
    category: "commercial",
    description: "Reflective all-glass slab with subtle mullions.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 4.5, 0], [4.6, 9, 3.6], P.glassDeep),
        B([0, 4.5, 0], [4.5, 8.9, 3.5], main),
        B([0, 4.5, 1.85], [4.55, 8.9, 0.03], P.glass),
        B([0, 4.5, -1.85], [4.55, 8.9, 0.03], P.glass),
        B([0, 9.1, 0], [4.7, 0.2, 3.7], P.charcoal),
        B([0, 9.5, 0], [0.15, 0.6, 0.15], P.charcoal),
      ];
      for (let i = 0; i < 12; i++)
        out.push(B([0, 0.6 + i * 0.75, 1.88], [4.55, 0.03, 0.05], P.silver));
      out.push(B([0, 0.6, 1.88], [1.4, 1.2, 0.08], P.darkWood));
      return out;
    },
  },
  {
    id: "skyscraper-brick",
    label: "Prewar Brick",
    category: "commercial",
    description: "Prewar brick tower with stepped stone crown.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.brick : color;
      const out: Primitive[] = [
        B([0, 4, 0], [4.4, 8, 3.5], closed ? P.stone : main),
        B([0, 8.1, 0], [4.6, 0.4, 3.7], P.stone),
        B([0, 8.6, 0], [3.6, 0.4, 2.7], P.stone),
        B([0, 9.1, 0], [2.6, 0.4, 1.9], P.cream),
      ];
      for (let f = 0; f < 6; f++)
        for (let c = -1; c <= 1; c++)
          out.push(B([c * 1.3, 1.5 + f * 1.1, 1.78], [0.7, 0.9, 0.05], P.window));
      out.push(B([0, 0.7, 1.78], [1.4, 1.4, 0.08], P.brass));
      return out;
    },
  },
  {
    id: "skyscraper-lattice",
    label: "Lattice Tower",
    category: "commercial",
    description: "Diagonal cross-braced lattice tower.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 4.5, 0], [4, 9, 3.4], main),
        B([0, 9.1, 0], [4.2, 0.2, 3.6], P.charcoal),
      ];
      for (let i = 0; i < 8; i++) {
        const y = 1.5 + i * 1;
        out.push(Br([0, y, 1.72], [4.4, 0.15, 0.1], P.charcoal, [0, 0, 0.5]));
        out.push(Br([0, y, 1.72], [4.4, 0.15, 0.1], P.charcoal, [0, 0, -0.5]));
      }
      out.push(B([0, 4.5, 1.72], [0.2, 9, 0.1], P.charcoal));
      out.push(B([2, 4.5, 1.72], [0.2, 9, 0.1], P.charcoal));
      out.push(B([-2, 4.5, 1.72], [0.2, 9, 0.1], P.charcoal));
      return out;
    },
  },
  {
    id: "skyscraper-spire",
    label: "Spired Tower",
    category: "commercial",
    description: "Slender tower topped with a needle spire.",
    labelHeight: 11,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 3.5, 0], [3.8, 7, 3.2], main),
        B([0, 7.05, 0], [4, 0.15, 3.4], P.charcoal),
        Co([0, 7.4, 0], 2, 0.6, main),
        Co([0, 8, 0], 1.2, 1, main),
        Cy([0, 9.4, 0], 0.05, 0.15, 1.8, P.silver, 8),
        Sp([0, 10.4, 0], 0.1, P.gold),
      ];
      for (let f = 0; f < 6; f++)
        for (let c = -1; c <= 1; c++)
          out.push(B([c * 1.1, 1.2 + f * 1, 1.62], [0.8, 0.75, 0.05], P.glass));
      return out;
    },
  },
  {
    id: "skyscraper-antenna",
    label: "Antenna Tower",
    category: "commercial",
    description: "Communications tower bristling with antennas.",
    labelHeight: 11,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 3.5, 0], [3.6, 7, 3], main),
        B([0, 7.05, 0], [3.8, 0.2, 3.2], P.charcoal),
        Cy([0, 8.5, 0], 0.05, 0.1, 3, P.red, 8),
        Cy([-0.8, 7.6, 0], 0.05, 0.1, 1.4, P.charcoal, 8),
        Cy([0.8, 7.6, 0], 0.05, 0.1, 1.4, P.charcoal, 8),
        To([0, 8.3, 0], 0.4, 0.04, P.charcoal, 20, [0, HALF_PI, 0]),
        Sp([0, 10.1, 0], 0.14, P.red),
        Sp([-0.8, 8.3, 0], 0.12, P.silver),
        Sp([0.8, 8.3, 0], 0.12, P.silver),
      ];
      for (let f = 0; f < 6; f++)
        out.push(B([0, 1.2 + f * 1, 1.52], [3.2, 0.7, 0.05], P.glass));
      return out;
    },
  },
  {
    id: "skyscraper-tiered",
    label: "Tiered Tower",
    category: "commercial",
    description: "Skyscraper with dramatic multi-level setbacks.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.5, 0], [5.5, 3, 4], main),
        B([-1, 4, 0], [3.5, 2, 3], main),
        B([1.2, 5.8, 0], [2.8, 3, 2.4], main),
        B([-0.4, 8, 0], [1.8, 1.6, 1.8], main),
        B([-0.4, 9, 0], [0.6, 0.6, 0.6], P.silver),
      ];
      for (const [x, y] of [
        [0, 1.6],
        [-1, 4.1],
        [1.2, 5.9],
      ])
        out.push(B([x, y, 2.05], [3, 1.6, 0.05], P.glass));
      return out;
    },
  },
  {
    id: "skyscraper-arch",
    label: "Arched Tower",
    category: "commercial",
    description: "Tower cut by a dramatic arch at the top floors.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([-1.7, 4, 0], [1.6, 8, 3], main),
        B([1.7, 4, 0], [1.6, 8, 3], main),
        B([0, 7.5, 0], [4.6, 1, 3], main),
        Cy([0, 6, 0], 1.7, 1.7, 3.2, P.charcoal, 24, [HALF_PI, 0, 0]),
        Cy([0, 6, 0], 1.5, 1.5, 3.3, P.glassDeep, 24, [HALF_PI, 0, 0]),
        B([0, 8.15, 0], [4.8, 0.3, 3.2], P.charcoal),
        B([-1.7, 0.6, 1.55], [1.2, 1.2, 0.08], P.glass),
        B([1.7, 0.6, 1.55], [1.2, 1.2, 0.08], P.glass),
      ];
    },
  },
  {
    id: "factory-sawtooth",
    label: "Sawtooth Factory",
    category: "utility",
    description: "Industrial workshop with sawtooth clerestory roof.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.2, 0], [8, 2.4, 5], main),
        B([0, 3.05, 0], [8.2, 0.1, 5.2], P.charcoal),
      ];
      for (let i = -1.8; i <= 1.8; i += 1.2) {
        out.push(Br([i - 0.3, 3.5, 0], [0.9, 0.05, 5], P.charcoal, [0, 0, 0.5]));
        out.push(Br([i + 0.3, 3.5, 0], [0.9, 0.05, 5], P.glass, [0, 0, -0.5]));
      }
      out.push(B([-3, 1.1, 2.55], [1.5, 1.8, 0.06], P.brass));
      out.push(B([0, 3.7, -2], [0.35, 1.6, 0.35], P.charcoal));
      out.push(B([2.5, 1.6, 2.55], [1.2, 1, 0.06], P.window));
      return out;
    },
  },
  {
    id: "silo-cluster",
    label: "Grain Silos",
    category: "utility",
    description: "Cluster of concrete grain silos with connecting chutes.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [B([0, 0.15, 0], [8, 0.3, 4.5], P.charcoal)];
      const positions: [number, number][] = [
        [-2.5, 0],
        [-0.8, 0],
        [0.9, 0],
        [2.6, 0],
      ];
      for (const [x, z] of positions) {
        out.push(Cy([x, 2.5, z], 0.75, 0.75, 4.6, main, 20));
        out.push(Co([x, 5.1, z], 0.85, 0.7, P.charcoal, 20));
      }
      out.push(B([0, 5.8, 0], [7, 0.3, 0.4], P.charcoal));
      out.push(B([0, 6.2, 0], [0.5, 0.5, 0.4], P.silver));
      return out;
    },
  },
  {
    id: "refinery",
    label: "Refinery",
    category: "utility",
    description: "Petrochemical refinery with columns, tanks, and stack.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.15, 0], [8, 0.3, 5], P.charcoal),
        Cy([-2.5, 3, -1], 0.4, 0.4, 5.8, P.silver, 16),
        Cy([-1, 4, -1], 0.35, 0.35, 7.8, main, 16),
        Cy([0.5, 3.5, -1], 0.5, 0.5, 6.8, main, 16),
        Cy([2, 2.8, -1], 0.6, 0.6, 5.4, P.silver, 16),
        Cy([3, 1.5, 1.6], 1, 1, 2.8, main, 20),
        Cy([-2, 1.2, 1.6], 0.8, 0.8, 2.2, P.silver, 20),
        Cy([-2.5, 6.4, -1], 0.4, 0.4, 0.5, P.red, 16),
        Cy([-1, 8.4, -1], 0.35, 0.35, 0.5, P.red, 16),
      ];
      for (let i = 0; i < 4; i++)
        out.push(Cy([-2 + i * 1.4, 2.5, -1], 0.05, 0.05, 1.4, P.silver, 8, [0, 0, HALF_PI]));
      return out;
    },
  },
  {
    id: "power-plant",
    label: "Power Plant",
    category: "utility",
    description: "Power station with cooling tower and smokestacks.",
    labelHeight: 9,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [8, 3, 4.5], main),
        B([0, 3.15, 0], [8.2, 0.2, 4.7], P.charcoal),
        Cy([2.5, 4.5, -0.8], 1.6, 2, 5.5, P.cream, 20),
        Cy([2.5, 7.3, -0.8], 1.8, 1.8, 0.3, P.charcoal, 20),
        Cy([-2, 4.5, -1], 0.35, 0.35, 5, main, 16),
        Cy([-1, 4.5, -1], 0.35, 0.35, 5, main, 16),
        Cy([-2, 7.1, -1], 0.4, 0.4, 0.3, P.red, 16),
        Cy([-1, 7.1, -1], 0.4, 0.4, 0.3, P.red, 16),
        B([0, 1.4, 2.28], [3, 1.8, 0.1], P.brass),
        B([-3, 2, 2.28], [1.2, 1, 0.06], P.window),
      ];
    },
  },
  {
    id: "water-tower",
    label: "Water Tower",
    category: "utility",
    description: "Elevated bulb water tank on braced steel legs.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [];
      const legs: [number, number][] = [
        [-1.6, -1.6],
        [1.6, -1.6],
        [-1.6, 1.6],
        [1.6, 1.6],
      ];
      for (const [x, z] of legs) {
        out.push(Cy([x, 2.5, z], 0.1, 0.15, 5, P.charcoal, 8));
      }
      for (let i = 0; i < 4; i++) {
        const [x1, z1] = legs[i];
        const [x2, z2] = legs[(i + 1) % 4];
        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;
        out.push(B([cx, 2.5, cz], [Math.abs(x1 - x2) + 0.1, 0.08, Math.abs(z1 - z2) + 0.1], P.charcoal));
      }
      out.push(Cy([0, 5.3, 0], 2.2, 2.2, 0.4, P.charcoal, 20));
      out.push(Sp([0, 6.3, 0], 2, main));
      out.push(Cy([0, 8.1, 0], 0.15, 0.15, 0.8, P.red, 8));
      out.push(Sp([0, 8.6, 0], 0.2, P.red));
      return out;
    },
  },
  {
    id: "wind-turbine",
    label: "Wind Turbine",
    category: "utility",
    description: "Tall wind turbine with three long blades.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color ?? P.cream;
      const out: Primitive[] = [
        Cy([0, 0.3, 0], 1.4, 1.6, 0.6, P.charcoal, 20),
        Cy([0, 4.5, 0], 0.35, 0.55, 8, main, 16),
        B([0, 8.6, 0], [1, 0.8, 1.8], main),
        Sp([0, 8.6, 1.05], 0.35, P.charcoal),
      ];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        out.push(
          Br(
            [Math.sin(a) * 1.8, 8.6 + Math.cos(a) * 1.8, 1.1],
            [0.15, 3.6, 0.4],
            main,
            [0, 0, a],
          ),
        );
      }
      return out;
    },
  },
  {
    id: "solar-farm",
    label: "Solar Array",
    category: "utility",
    description: "Rows of tilted photovoltaic panels on a pad.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.15, 0], [8, 0.3, 5], P.charcoal),
      ];
      for (let row = -1; row <= 1; row++) {
        for (let col = -3; col <= 3; col++) {
          const x = col * 1.1;
          const z = row * 1.5;
          out.push(Cy([x, 0.5, z], 0.05, 0.05, 0.6, P.silver, 6));
          out.push(Br([x, 0.9, z], [0.9, 0.05, 0.7], P.glassDeep, [0.4, 0, 0]));
          out.push(Br([x, 0.92, z], [0.85, 0.02, 0.65], main, [0.4, 0, 0]));
        }
      }
      return out;
    },
  },
  {
    id: "cement-plant",
    label: "Cement Plant",
    category: "utility",
    description: "Industrial cement plant with mixing tower and conveyors.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 0.15, 0], [8, 0.3, 5], P.charcoal),
        B([-2.5, 2, 0], [3, 4, 3], main),
        Cy([1.5, 4.5, 0], 0.9, 1.2, 8, main, 20),
        Cy([1.5, 8.7, 0], 1, 1, 0.3, P.charcoal, 20),
        Br([-0.8, 3.5, 0], [3.5, 0.4, 0.7], P.charcoal, [0, 0, 0.4]),
        B([-2.5, 2, 1.55], [1.4, 1.6, 0.06], P.brass),
        B([-2.5, 4.5, 1.55], [1.8, 0.8, 0.05], P.window),
      ];
    },
  },
  {
    id: "stadium",
    label: "Stadium",
    category: "attraction",
    description: "Open oval stadium with tiered seating and pylons.",
    labelHeight: 5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.15, 0], 4.2, 4.4, 0.3, P.charcoal, 32),
        Cy([0, 1, 0], 4, 4.2, 1.4, main, 32),
        Cy([0, 1.9, 0], 4.4, 4.4, 0.2, P.silver, 32),
        Cy([0, 0.65, 0], 3.4, 3.4, 0.05, P.leaf, 32),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push(Cy([Math.cos(a) * 4.5, 2.5, Math.sin(a) * 4.5], 0.1, 0.1, 3, P.silver, 8));
        out.push(Sp([Math.cos(a) * 4.5, 4.1, Math.sin(a) * 4.5], 0.25, P.neon));
      }
      return out;
    },
  },
  {
    id: "arena",
    label: "Indoor Arena",
    category: "attraction",
    description: "Dome-topped multipurpose indoor arena.",
    labelHeight: 5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 1.2, 0], 4, 4.2, 2.4, main, 24),
        Sp([0, 3.5, 0], 3.6, P.silver),
        Cy([0, 5.3, 0], 0.3, 0.3, 0.6, P.charcoal, 12),
        Sp([0, 6, 0], 0.25, P.red),
      ];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        out.push(B([Math.cos(a) * 4.1, 1.7, Math.sin(a) * 4.1], [0.4, 1.4, 0.1], P.window));
      }
      out.push(B([0, 1, 4.1], [2, 1.8, 0.1], P.brass));
      return out;
    },
  },
  {
    id: "gym",
    label: "Gym",
    category: "commercial",
    description: "Community gym with weight-plate signage.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.5, 0], [7, 3, 4.5], main),
        B([0, 3.15, 0], [7.3, 0.2, 4.8], P.charcoal),
        Cy([0, 3.7, 0], 0.6, 0.6, 0.2, P.charcoal, 20),
        Cy([-0.6, 3.7, 0], 0.15, 0.15, 1.2, P.charcoal, 8, [0, 0, HALF_PI]),
        Cy([0.6, 3.7, 0], 0.15, 0.15, 1.2, P.charcoal, 8, [0, 0, HALF_PI]),
        Cy([-1.3, 3.7, 0], 0.4, 0.4, 0.15, P.charcoal, 20, [0, 0, HALF_PI]),
        Cy([1.3, 3.7, 0], 0.4, 0.4, 0.15, P.charcoal, 20, [0, 0, HALF_PI]),
        B([0, 1.3, 2.28], [1.4, 2, 0.1], P.glassDeep),
        B([-2, 1.6, 2.28], [1.6, 1.4, 0.08], P.window),
        B([2, 1.6, 2.28], [1.6, 1.4, 0.08], P.window),
      ];
    },
  },
  {
    id: "swimming-pool",
    label: "Swimming Pool",
    category: "attraction",
    description: "Outdoor pool with deck, lifeguard chair, and umbrellas.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.2, 0], [8, 0.4, 5], P.cream),
        B([0, 0.35, 0], [6, 0.15, 3.4], P.glassDeep),
        B([0, 0.4, 0], [5.6, 0.05, 3], P.glass),
      ];
      for (let x = -2.4; x <= 2.4; x += 0.6)
        out.push(B([x, 0.4, 0], [0.05, 0.06, 3], P.cream));
      out.push(B([3.2, 1.4, -1.6], [0.15, 2, 0.15], P.charcoal));
      out.push(B([3.2, 2.5, -1.6], [0.9, 0.15, 0.7], P.awning));
      out.push(Sp([3.2, 3, -1.6], 0.55, P.awning));
      out.push(Co([-3, 1.8, 1.6], 0.9, 0.5, main, 12));
      out.push(Cy([-3, 0.8, 1.6], 0.06, 0.06, 1.8, P.wood, 8));
      out.push(Cy([2.6, 0.9, 1.6], 0.06, 0.06, 1.8, P.wood, 8));
      out.push(Co([2.6, 1.9, 1.6], 0.9, 0.5, P.awning, 12));
      return out;
    },
  },
  {
    id: "bowling-alley",
    label: "Bowling Alley",
    category: "commercial",
    description: "Long low bowling alley with rooftop pin sign.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.2, 0], [8, 2.4, 4.5], main),
        B([0, 2.55, 0], [8.2, 0.2, 4.7], P.charcoal),
        Cy([-2.5, 3.6, 0], 0.4, 0.3, 1.6, P.cream, 12),
        Sp([-2.5, 4.5, 0], 0.3, P.cream),
        B([-2.5, 4, 0.5], [0.25, 0.5, 0.05], P.red),
        B([0.8, 3.4, 0], [3.4, 1, 0.6], P.neon),
        B([0.8, 3.4, 0], [3, 0.6, 0.65], P.charcoal),
        B([0, 1, 2.28], [1.6, 2, 0.1], P.charcoal),
      ];
      for (let i = -3; i <= 3; i += 1.2)
        out.push(B([i, 1.6, 2.28], [0.9, 0.7, 0.06], P.window));
      return out;
    },
  },
  {
    id: "tennis-court",
    label: "Tennis Court",
    category: "attraction",
    description: "Fenced tennis court with net and umpire chair.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.2, 0], [8, 0.4, 4.5], main),
        B([0, 0.42, 0], [7.4, 0.05, 3.6], P.cream),
        B([0, 0.42, 0], [0.06, 0.06, 3.6], P.cream),
        B([0, 0.44, -1.4], [7.4, 0.05, 0.05], P.cream),
        B([0, 0.44, 1.4], [7.4, 0.05, 0.05], P.cream),
      ];
      out.push(B([0, 0.7, 0], [0.05, 0.6, 3.4], P.charcoal));
      out.push(B([0, 0.9, 0], [0.03, 0.05, 3.4], P.cream));
      out.push(Cy([3, 1.6, 2.5], 0.1, 0.1, 2.8, P.charcoal, 8));
      out.push(B([3, 3, 2.5], [0.6, 0.15, 0.6], P.charcoal));
      for (const x of [-3.8, -1.9, 1.9, 3.8])
        for (const z of [-2.1, 2.1])
          out.push(Cy([x, 1.8, z], 0.06, 0.06, 3.2, P.silver, 8));
      return out;
    },
  },
  {
    id: "bus-depot",
    label: "Bus Depot",
    category: "transit",
    description: "Covered bus depot with pull-in bays.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.15, 0], [8, 0.3, 5], P.charcoal),
        B([-3, 1.2, -1.5], [1.4, 2.4, 1.6], P.window),
        B([-3, 1.2, -1.5], [1.3, 2.3, 1.55], main),
      ];
      const bayPositions = [-1, 0.5, 2, 3.5];
      for (const x of bayPositions) {
        out.push(B([x, 0.6, 0.4], [1.2, 1.2, 2.4], P.silver));
        out.push(B([x, 1.3, 0.4], [1.2, 0.4, 2.4], P.glass));
        out.push(Cy([x - 0.4, 0.35, 1.4], 0.15, 0.15, 0.2, P.charcoal, 12, [HALF_PI, 0, 0]));
        out.push(Cy([x + 0.4, 0.35, 1.4], 0.15, 0.15, 0.2, P.charcoal, 12, [HALF_PI, 0, 0]));
        out.push(Cy([x - 0.4, 0.35, -0.6], 0.15, 0.15, 0.2, P.charcoal, 12, [HALF_PI, 0, 0]));
        out.push(Cy([x + 0.4, 0.35, -0.6], 0.15, 0.15, 0.2, P.charcoal, 12, [HALF_PI, 0, 0]));
      }
      out.push(B([1.25, 3.2, 0], [7, 0.2, 5], P.charcoal));
      out.push(Cy([-1.5, 1.7, 2.4], 0.1, 0.1, 3, P.silver, 8));
      out.push(Cy([4.5, 1.7, 2.4], 0.1, 0.1, 3, P.silver, 8));
      return out;
    },
  },
  {
    id: "subway-entrance",
    label: "Subway Entrance",
    category: "transit",
    description: "Stairway descending to an underground station.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.15, 0], [8, 0.3, 5], P.stone),
      ];
      for (let i = 0; i < 6; i++)
        out.push(B([0, 0.3 - i * 0.12, -1.4 + i * 0.4], [3, 0.05, 0.4], P.charcoal));
      out.push(B([-1.55, 1.4, -1], [0.1, 2.4, 3.4], P.silver));
      out.push(B([1.55, 1.4, -1], [0.1, 2.4, 3.4], P.silver));
      out.push(B([0, 2.55, -1], [3.4, 0.15, 3.4], P.silver));
      out.push(B([0, 3, -2.6], [2, 0.8, 0.1], main));
      out.push(Cy([0, 3, -2.55], 0.35, 0.35, 0.05, P.cream, 20, [HALF_PI, 0, 0]));
      out.push(B([0, 3, -2.53], [0.5, 0.1, 0.02], main));
      return out;
    },
  },
  {
    id: "parking-garage",
    label: "Parking Garage",
    category: "transit",
    description: "Multi-level open-air parking structure.",
    labelHeight: 6,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [];
      for (let level = 0; level < 4; level++)
        out.push(B([0, 0.6 + level * 1.4, 0], [8, 0.2, 5], main));
      for (const x of [-3.9, -1.3, 1.3, 3.9])
        out.push(B([x, 3, 0], [0.4, 6, 5], main));
      out.push(B([0, 0.15, 0], [8.2, 0.3, 5.2], P.charcoal));
      out.push(B([0, 6.2, 0], [8.2, 0.15, 5.2], P.charcoal));
      for (let level = 0; level < 3; level++) {
        for (let x = -2.6; x <= 2.6; x += 1.3) {
          out.push(B([x, 1.5 + level * 1.4, 2.05], [1, 0.5, 0.05], P.charcoal));
        }
      }
      return out;
    },
  },
  {
    id: "taxi-stand",
    label: "Taxi Stand",
    category: "transit",
    description: "Sheltered taxi rank with signage and lane markers.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.15, 0], [8, 0.3, 5], P.charcoal),
        B([-2, 1.4, 0], [2.5, 2.4, 2], main),
        B([-2, 2.7, 0], [2.7, 0.15, 2.2], P.charcoal),
        Cy([-2, 3.2, 0], 0.06, 0.06, 1, P.silver, 8),
        B([-2, 3.9, 0], [1.4, 0.5, 0.1], P.neon),
        B([-2, 1.3, 1.03], [1.6, 1.6, 0.06], P.glass),
        B([2, 1, 0], [3, 1.6, 2], P.gold),
        B([2, 1.7, 0], [3, 0.5, 2], P.charcoal),
        B([2, 1.7, 0], [2.5, 0.3, 2.05], P.cream),
        Cy([1.2, 0.4, 1], 0.3, 0.3, 0.2, P.charcoal, 20, [HALF_PI, 0, 0]),
        Cy([2.8, 0.4, 1], 0.3, 0.3, 0.2, P.charcoal, 20, [HALF_PI, 0, 0]),
        Cy([1.2, 0.4, -1], 0.3, 0.3, 0.2, P.charcoal, 20, [HALF_PI, 0, 0]),
        Cy([2.8, 0.4, -1], 0.3, 0.3, 0.2, P.charcoal, 20, [HALF_PI, 0, 0]),
      ];
      return out;
    },
  },
  {
    id: "ferry-terminal",
    label: "Ferry Terminal",
    category: "transit",
    description: "Waterside ferry terminal with pier and awning.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.15, -1.2], [7, 0.3, 2], P.wood),
        B([-1.4, 1.4, -1.2], [4, 2.6, 1.8], main),
        B([-1.4, 2.85, -1.2], [4.2, 0.15, 2], P.charcoal),
        Br([-1.4, 3.4, -1.2], [4.2, 0.08, 2.2], P.awning, [0.2, 0, 0]),
        B([-1.4, 1.1, -0.3], [1.4, 1.8, 0.06], P.glass),
        B([-1.4, 2.1, -1.2], [1.4, 0.6, 0.06], P.window),
        B([2.5, 0.35, -1.2], [1.5, 0.4, 1.4], P.charcoal),
      ];
      for (let x = -3; x <= 3; x += 1)
        out.push(Cy([x, 0.05, 1.4], 0.15, 0.15, 0.4, P.wood, 8));
      out.push(B([0, 0.4, 1.6], [7, 0.1, 1.4], P.wood));
      out.push(B([0, 0.6, 2.3], [0.06, 0.5, 0.06], P.charcoal));
      out.push(B([0, 0.8, 2.3], [0.6, 0.35, 0.02], P.red));
      return out;
    },
  },
  {
    id: "chapel",
    label: "Chapel",
    category: "civic",
    description: "Small chapel with pointed steeple.",
    labelHeight: 6.5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.4, 0], [5, 2.8, 4], main),
        Br([-1.4, 3.4, 0], [3.2, 0.2, 4.3], P.darkRoof, [0, 0, 0.4]),
        Br([1.4, 3.4, 0], [3.2, 0.2, 4.3], P.darkRoof, [0, 0, -0.4]),
        B([-2, 3.4, -1.4], [1.4, 2, 1.4], main),
        Co([-2, 4.8, -1.4], 1.2, 1.6, P.darkRoof, 4),
        Cy([-2, 5.9, -1.4], 0.05, 0.05, 0.6, P.gold, 8),
        Sp([-2, 6.3, -1.4], 0.15, P.gold),
        B([0, 1.4, 2.03], [1, 2.4, 0.08], P.darkWood),
        B([0, 2.6, 2.05], [0.5, 0.05, 0.05], P.gold),
        B([0, 2.9, 2.05], [0.05, 0.5, 0.05], P.gold),
        B([-1.5, 1.9, 2.03], [0.7, 1.4, 0.06], P.glassDeep),
        B([1.5, 1.9, 2.03], [0.7, 1.4, 0.06], P.glassDeep),
      ];
    },
  },
  {
    id: "cathedral",
    label: "Cathedral",
    category: "civic",
    description: "Gothic cathedral with twin spires and rose window.",
    labelHeight: 8,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 2, 0], [7, 4, 4.5], main),
        Br([-1.8, 4.4, 0], [4, 0.2, 4.7], P.darkRoof, [0, 0, 0.35]),
        Br([1.8, 4.4, 0], [4, 0.2, 4.7], P.darkRoof, [0, 0, -0.35]),
        B([-2.6, 3, -1.7], [1.3, 6, 1.3], main),
        B([2.6, 3, -1.7], [1.3, 6, 1.3], main),
        Co([-2.6, 6.5, -1.7], 1.1, 1.6, P.darkRoof, 4),
        Co([2.6, 6.5, -1.7], 1.1, 1.6, P.darkRoof, 4),
        Cy([-2.6, 7.7, -1.7], 0.05, 0.05, 0.6, P.gold, 8),
        Cy([2.6, 7.7, -1.7], 0.05, 0.05, 0.6, P.gold, 8),
        B([0, 1.6, 2.28], [1.4, 3, 0.1], P.darkWood),
        Cy([0, 3.6, 2.28], 0.9, 0.9, 0.1, P.gold, 24, [HALF_PI, 0, 0]),
        Cy([0, 3.6, 2.3], 0.75, 0.75, 0.05, P.glassDeep, 24, [HALF_PI, 0, 0]),
      ];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        out.push(B([Math.cos(a) * 0.5, 3.6 + Math.sin(a) * 0.5, 2.32], [0.08, 0.5, 0.02], P.gold));
      }
      return out;
    },
  },
  {
    id: "mosque",
    label: "Mosque",
    category: "civic",
    description: "Domed mosque with tall minaret.",
    labelHeight: 7,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0.7, 1.4, 0], [5.6, 2.8, 4.5], main),
        Cy([0.7, 3.7, 0], 2.4, 2.4, 0.2, P.charcoal, 20),
        Sp([0.7, 4.4, 0], 2.2, main),
        Cy([0.7, 6.3, 0], 0.08, 0.08, 0.8, P.gold, 8),
        Sp([0.7, 6.9, 0], 0.2, P.gold),
        Cy([-3, 3.5, 1], 0.4, 0.5, 6.5, main, 16),
        Cy([-3, 6.9, 1], 0.6, 0.6, 0.15, P.charcoal, 16),
        Cy([-3, 7.15, 1], 0.5, 0.5, 0.6, main, 16),
        Co([-3, 7.8, 1], 0.6, 0.6, P.charcoal, 16),
        Sp([-3, 8.3, 1], 0.15, P.gold),
      ];
      out.push(B([0.7, 1.4, 2.28], [1.2, 2.2, 0.1], P.darkWood));
      out.push(Cy([0.7, 2.6, 2.28], 0.4, 0.4, 0.05, P.gold, 20, [HALF_PI, 0, 0]));
      out.push(B([2.5, 2, 2.28], [1.2, 1.2, 0.05], P.window));
      out.push(B([-1, 2, 2.28], [1.2, 1.2, 0.05], P.window));
      return out;
    },
  },
  {
    id: "shrine",
    label: "Torii Shrine",
    category: "landmark",
    description: "Small stone shrine with torii gateway.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        B([0, 1.2, -1.5], [3.5, 2.4, 3], main),
        Br([-1, 2.9, -1.5], [2.5, 0.15, 3.2], P.darkRoof, [0, 0, 0.5]),
        Br([1, 2.9, -1.5], [2.5, 0.15, 3.2], P.darkRoof, [0, 0, -0.5]),
        B([-1.5, 1.8, 1.5], [0.3, 3.6, 0.3], P.red),
        B([1.5, 1.8, 1.5], [0.3, 3.6, 0.3], P.red),
        B([0, 3.4, 1.5], [3.6, 0.2, 0.4], P.red),
        B([0, 3.7, 1.5], [4, 0.15, 0.4], P.red),
        B([0, 3.05, 1.5], [3, 0.1, 0.3], P.red),
        B([0, 1.15, -0.6], [1, 2.3, 0.08], P.darkWood),
      ];
    },
  },
  {
    id: "opera-house",
    label: "Opera House",
    category: "civic",
    description: "Sail-like concert hall with layered shell roofs.",
    labelHeight: 6,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.6, 0], [8, 1.2, 4.5], P.stone),
        B([0, 1.4, 0], [7.5, 0.3, 4], P.cream),
      ];
      const shells: [number, number, number, number][] = [
        [-2, 1.4, 0, 3],
        [0, 1.4, 0.5, 3.6],
        [2, 1.4, 0, 3],
        [0.6, 1.4, -1, 2.4],
      ];
      for (const [x, y, z, r] of shells) {
        out.push(Cy([x, y + r * 0.4, z], 0.05, r, r * 1.5, main, 20, [-0.9, 0, 0]));
      }
      out.push(B([0, 0.8, 2.25], [3, 1, 0.05], P.glass));
      return out;
    },
  },
  {
    id: "planetarium",
    label: "Planetarium",
    category: "civic",
    description: "Cylindrical planetarium topped by a projection dome.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 1.4, 0], 3.4, 3.6, 2.8, main, 32),
        Cy([0, 2.9, 0], 3.4, 3.4, 0.2, P.charcoal, 32),
        Sp([0, 3.5, 0], 3.2, P.silver),
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push(B([Math.cos(a) * 3.5, 1.6, Math.sin(a) * 3.5], [0.15, 1.2, 0.05], P.glass));
      }
      out.push(B([0, 1.1, 3.55], [1.4, 2, 0.1], P.glassDeep));
      out.push(B([0, 3.5, 3.7], [0.05, 0.05, 0.6], P.charcoal));
      return out;
    },
  },
  {
    id: "observatory",
    label: "Observatory",
    category: "landmark",
    description: "Hilltop observatory with slit-dome for a telescope.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      return [
        Cy([0, 0.4, 0], 3, 3.2, 0.8, P.stone, 20),
        Cy([0, 1.6, 0], 2.4, 2.6, 1.6, main, 20),
        Sp([0, 3.4, 0], 2.4, P.silver),
        B([0, 3.4, 0], [0.6, 3, 0.5], P.charcoal),
        Cy([-0.1, 3.7, 0], 0.1, 0.1, 2, P.silver, 8, [0, 0, 0.6]),
        B([0, 1.4, 2.55], [1.2, 1.6, 0.05], P.window),
        B([0, 0.9, 2.55], [0.9, 0.6, 0.05], P.darkWood),
      ];
    },
  },
  {
    id: "aquarium",
    label: "Aquarium",
    category: "attraction",
    description: "Wavy-roof aquarium with fish silhouette signage.",
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.5, 0], [7, 3, 4.5], main),
        B([0, 3.15, 0], [7.4, 0.25, 4.8], P.glassDeep),
      ];
      for (let i = -3; i <= 3; i += 1) {
        const h = 0.4 + Math.abs(Math.sin(i)) * 0.3;
        out.push(B([i, 3.4 + h / 2, 0], [0.5, h, 4.7], P.mint));
      }
      out.push(B([-2, 2, 2.28], [2, 1.6, 0.05], P.glassDeep));
      out.push(B([2, 2, 2.28], [2, 1.6, 0.05], P.glassDeep));
      out.push(B([0, 1.2, 2.28], [1.4, 2, 0.1], P.charcoal));
      out.push(Oc([2, 3.8, 0], 0.3, P.candy));
      out.push(Oc([-2, 3.8, 0], 0.3, P.gold));
      return out;
    },
  },
  {
    id: "convention-center",
    label: "Convention Center",
    category: "civic",
    description: "Wide conference building with entry canopy.",
    labelHeight: 5,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 1.4, 0], [8.5, 2.8, 4.5], main),
        B([0, 2.95, 0], [8.7, 0.2, 4.7], P.charcoal),
        B([0, 3.4, 2], [3.4, 0.15, 1.4], P.silver),
        Cy([-1.5, 2.9, 2.5], 0.06, 0.06, 0.8, P.silver, 8),
        Cy([1.5, 2.9, 2.5], 0.06, 0.06, 0.8, P.silver, 8),
      ];
      for (let i = -3.5; i <= 3.5; i += 1)
        out.push(B([i, 1.6, 2.28], [0.8, 1.6, 0.05], P.glass));
      out.push(B([0, 1.1, 2.3], [2.4, 2, 0.06], P.glassDeep));
      out.push(B([0, 3.9, 0], [4, 0.6, 0.1], P.silver));
      return out;
    },
  },
  {
    id: "airship-mast",
    label: "Airship Mast",
    category: "transit",
    description: "Tall tower with mooring platform for airships.",
    labelHeight: 10,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        B([0, 0.4, 0], [4, 0.8, 4], P.charcoal),
      ];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        out.push(Cy([Math.cos(a) * 1.4, 3.5, Math.sin(a) * 1.4], 0.15, 0.2, 6, main, 8));
      }
      for (let level = 1; level <= 6; level++) {
        for (let j = 0; j < 4; j++) {
          const a1 = (j / 4) * Math.PI * 2 + Math.PI / 4;
          const a2 = ((j + 1) / 4) * Math.PI * 2 + Math.PI / 4;
          const y = 0.8 + level;
          const x1 = Math.cos(a1) * 1.4;
          const z1 = Math.sin(a1) * 1.4;
          const x2 = Math.cos(a2) * 1.4;
          const z2 = Math.sin(a2) * 1.4;
          out.push(B([(x1 + x2) / 2, y, (z1 + z2) / 2], [Math.abs(x1 - x2) + 0.1, 0.08, Math.abs(z1 - z2) + 0.1], main));
        }
      }
      out.push(Cy([0, 7.2, 0], 1.4, 1.6, 0.4, P.charcoal, 20));
      out.push(Cy([0, 7.7, 0], 0.6, 0.6, 0.8, main, 16));
      out.push(Sp([0, 8.5, 0], 0.4, P.silver));
      out.push(Cy([0, 9.4, 0], 0.05, 0.05, 1.6, P.red, 8));
      return out;
    },
  },
  {
    id: "space-launch",
    label: "Launch Pad",
    category: "landmark",
    description: "Rocket on a launch pad with service gantry.",
    labelHeight: 11,
    build: ({ color, closed }) => {
      const main = closed ? P.stone : color;
      const out: Primitive[] = [
        Cy([0, 0.3, 0], 3.5, 3.5, 0.6, P.charcoal, 20),
        Cy([0, 0.8, 0], 3, 3, 0.15, P.silver, 20),
        Cy([0, 3.5, 0], 0.8, 0.9, 6, P.cream, 24),
        Co([0, 7.4, 0], 0.8, 1.6, P.cream, 24),
        Cy([0, 8.6, 0], 0.05, 0.05, 1, P.red, 8),
        Cy([0, 2, 0.85], 0.15, 0.15, 3.6, main, 8),
        Cy([0, 2, -0.85], 0.15, 0.15, 3.6, main, 8),
        Co([0, 0.35, 0], 1, 0.5, P.charcoal, 24),
      ];
      out.push(B([2.6, 3.5, 0], [0.2, 6, 0.2], P.silver));
      for (let level = 1; level <= 5; level++)
        out.push(B([1.6, 0.8 + level * 1.2, 0], [2, 0.1, 0.6], P.silver));
      out.push(B([1.6, 5.5, 0], [1.8, 0.15, 0.5], P.charcoal));
      return out;
    },
  },
];

type Vec3T = [number, number, number];

export const stylesById: Record<string, BuildingStyle> = Object.fromEntries(
  styles.map((s) => [s.id, s]),
);

export const categories: readonly BuildingStyle["category"][] = [
  "residential",
  "commercial",
  "civic",
  "attraction",
  "transit",
  "landmark",
  "utility",
];
