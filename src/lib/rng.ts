export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickByWeights<T>(rng: Rng, options: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

export function pickByProbabilities<T>(
  rng: Rng,
  entries: ReadonlyArray<readonly [T, number]>,
): T {
  return pickByWeights(
    rng,
    entries.map(([o]) => o),
    entries.map(([, w]) => w),
  );
}

export function sampleRange(
  rng: Rng,
  min: number,
  median: number,
  max: number,
): number {
  const u = rng();
  if (u < 0.5) return min + (median - min) * (u * 2);
  return median + (max - median) * ((u - 0.5) * 2);
}

export function normalizeDist(dist: Record<string, number>): Record<string, number> {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return dist;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(dist)) out[k] = v / total;
  return out;
}
