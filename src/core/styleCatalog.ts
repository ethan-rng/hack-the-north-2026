// Server-safe mirror of the /dev buildings library. This module is imported by
// the Cloudflare Worker so it must not pull in JSX or client-only code. Keep it
// in sync manually with src/ui/buildings/styles.ts.

export type StyleCategory =
  | "residential"
  | "commercial"
  | "civic"
  | "attraction"
  | "transit"
  | "landmark"
  | "utility";

export type StyleAssetBucket =
  | "building"
  | "stall"
  | "gate"
  | "attraction"
  | "rest"
  | "open"
  | "parking_lot"
  | "parking_garage";

export interface StyleEntry {
  id: string;
  category: StyleCategory;
  assets: StyleAssetBucket[];
}

export const styleCatalog: StyleEntry[] = [
  { id: "modern-box", category: "commercial", assets: ["building"] },
  { id: "glass-tower", category: "commercial", assets: ["building"] },
  { id: "stepped-tower", category: "landmark", assets: ["building"] },
  { id: "skyscraper", category: "commercial", assets: ["building"] },
  { id: "modern-cube", category: "commercial", assets: ["building"] },
  { id: "corner-shop", category: "commercial", assets: ["building"] },
  { id: "row-house", category: "residential", assets: ["building"] },
  { id: "cottage", category: "residential", assets: ["building"] },
  { id: "villa", category: "residential", assets: ["building"] },
  { id: "townhouse", category: "residential", assets: ["building"] },
  { id: "brick-house", category: "residential", assets: ["building"] },
  { id: "cabin", category: "residential", assets: ["building"] },
  { id: "cafe", category: "commercial", assets: ["building"] },
  { id: "bakery", category: "commercial", assets: ["building"] },
  { id: "restaurant", category: "commercial", assets: ["building"] },
  { id: "fast-food", category: "commercial", assets: ["building"] },
  {
    id: "ice-cream-parlor",
    category: "commercial",
    assets: ["building", "stall"],
  },
  { id: "bookstore", category: "commercial", assets: ["building"] },
  { id: "gift-shop", category: "commercial", assets: ["building"] },
  { id: "market-stall", category: "commercial", assets: ["stall"] },
  { id: "food-truck", category: "commercial", assets: ["stall", "building"] },
  { id: "kiosk", category: "commercial", assets: ["stall", "building"] },
  { id: "library", category: "civic", assets: ["building"] },
  { id: "museum", category: "civic", assets: ["building"] },
  { id: "theater", category: "civic", assets: ["building"] },
  { id: "cinema", category: "commercial", assets: ["building"] },
  { id: "arcade", category: "commercial", assets: ["building"] },
  { id: "hotel", category: "commercial", assets: ["building"] },
  { id: "bank", category: "civic", assets: ["building"] },
  { id: "office-tower", category: "commercial", assets: ["building"] },
  { id: "school", category: "civic", assets: ["building"] },
  { id: "hospital", category: "civic", assets: ["building"] },
  { id: "fire-station", category: "civic", assets: ["building"] },
  { id: "police-station", category: "civic", assets: ["building"] },
  { id: "carousel", category: "attraction", assets: ["attraction"] },
  { id: "ferris-wheel", category: "attraction", assets: ["attraction"] },
  { id: "coaster-station", category: "attraction", assets: ["attraction"] },
  { id: "tea-cups", category: "attraction", assets: ["attraction"] },
  {
    id: "haunted-house",
    category: "attraction",
    assets: ["attraction", "building"],
  },
  { id: "gazebo", category: "landmark", assets: ["rest", "open"] },
  { id: "park-pavilion", category: "landmark", assets: ["rest", "open"] },
  { id: "bandstand", category: "landmark", assets: ["rest", "open"] },
  { id: "pagoda", category: "landmark", assets: ["building"] },
  { id: "temple", category: "landmark", assets: ["building"] },
  { id: "castle", category: "landmark", assets: ["building"] },
  { id: "windmill", category: "landmark", assets: ["building"] },
  { id: "lighthouse", category: "landmark", assets: ["building"] },
  { id: "greenhouse", category: "utility", assets: ["rest", "building"] },
  { id: "airport-gate", category: "transit", assets: ["gate"] },
  { id: "train-station", category: "transit", assets: ["building"] },
  { id: "warehouse", category: "utility", assets: ["building"] },
  { id: "loft", category: "residential", assets: ["building"] },
  { id: "clock-tower", category: "landmark", assets: ["building"] },
  { id: "terminal-modern", category: "transit", assets: ["building"] },
  { id: "terminal-classic", category: "transit", assets: ["building"] },
  { id: "control-tower", category: "transit", assets: ["building"] },
  { id: "hangar", category: "transit", assets: ["building"] },
  { id: "jetbridge", category: "transit", assets: ["gate", "building"] },
  { id: "radar-dome", category: "utility", assets: ["building"] },
  { id: "cargo-warehouse", category: "utility", assets: ["building"] },
  { id: "fuel-depot", category: "utility", assets: ["building"] },
  { id: "runway-beacon", category: "transit", assets: ["open", "building"] },
  { id: "helipad", category: "transit", assets: ["open", "building"] },
  { id: "skyscraper-twin", category: "commercial", assets: ["building"] },
  { id: "skyscraper-tapered", category: "commercial", assets: ["building"] },
  { id: "skyscraper-crown", category: "commercial", assets: ["building"] },
  { id: "skyscraper-panels", category: "commercial", assets: ["building"] },
  { id: "skyscraper-cross", category: "commercial", assets: ["building"] },
  { id: "skyscraper-glass", category: "commercial", assets: ["building"] },
  { id: "skyscraper-brick", category: "commercial", assets: ["building"] },
  { id: "skyscraper-lattice", category: "commercial", assets: ["building"] },
  { id: "skyscraper-spire", category: "commercial", assets: ["building"] },
  { id: "skyscraper-antenna", category: "commercial", assets: ["building"] },
  { id: "skyscraper-tiered", category: "commercial", assets: ["building"] },
  { id: "skyscraper-arch", category: "commercial", assets: ["building"] },
  { id: "factory-sawtooth", category: "utility", assets: ["building"] },
  { id: "silo-cluster", category: "utility", assets: ["building"] },
  { id: "refinery", category: "utility", assets: ["building"] },
  { id: "power-plant", category: "utility", assets: ["building"] },
  { id: "water-tower", category: "utility", assets: ["building"] },
  { id: "wind-turbine", category: "utility", assets: ["open"] },
  { id: "solar-farm", category: "utility", assets: ["open"] },
  { id: "cement-plant", category: "utility", assets: ["building"] },
  { id: "stadium", category: "attraction", assets: ["attraction"] },
  { id: "arena", category: "attraction", assets: ["attraction", "building"] },
  { id: "gym", category: "commercial", assets: ["building"] },
  { id: "swimming-pool", category: "attraction", assets: ["attraction", "rest"] },
  { id: "bowling-alley", category: "commercial", assets: ["building"] },
  {
    id: "tennis-court",
    category: "attraction",
    assets: ["attraction", "open"],
  },
  { id: "bus-depot", category: "transit", assets: ["building"] },
  { id: "subway-entrance", category: "transit", assets: ["gate", "building"] },
  { id: "parking-garage", category: "transit", assets: ["parking_garage"] },
  { id: "taxi-stand", category: "transit", assets: ["stall", "building"] },
  { id: "ferry-terminal", category: "transit", assets: ["building"] },
  { id: "chapel", category: "civic", assets: ["building"] },
  { id: "cathedral", category: "civic", assets: ["building"] },
  { id: "mosque", category: "civic", assets: ["building"] },
  { id: "shrine", category: "landmark", assets: ["rest", "building"] },
  { id: "opera-house", category: "civic", assets: ["building"] },
  { id: "planetarium", category: "civic", assets: ["building"] },
  { id: "observatory", category: "landmark", assets: ["building"] },
  { id: "aquarium", category: "attraction", assets: ["building"] },
  { id: "convention-center", category: "civic", assets: ["building"] },
  { id: "airship-mast", category: "transit", assets: ["building"] },
  { id: "space-launch", category: "landmark", assets: ["building"] },
];

export const styleIds = styleCatalog.map((s) => s.id) as [string, ...string[]];

const byId = new Map(styleCatalog.map((s) => [s.id, s] as const));

export function styleFor(id: string): StyleEntry | undefined {
  return byId.get(id);
}

export function candidatesForAsset(asset: string): StyleEntry[] {
  const bucket = asset as StyleAssetBucket;
  const matches = styleCatalog.filter((s) => s.assets.includes(bucket));
  return matches.length ? matches : styleCatalog.filter((s) => s.assets.includes("building"));
}

// Simple deterministic 32-bit hash from a string. Cheap and stable across runs.
function hash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick one styleId for a place, preferring styles not yet used in this
// environment. Deterministic on (asset, seed, place index, place name).
export function pickStyleId(
  asset: string,
  seed: number,
  index: number,
  placeName: string,
  used: Set<string>,
): string {
  const pool = candidatesForAsset(asset);
  const key = `${seed}|${index}|${placeName}|${asset}`;
  const start = hash(key) % pool.length;
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(start + offset) % pool.length];
    if (!used.has(candidate.id)) return candidate.id;
  }
  return pool[start].id;
}
