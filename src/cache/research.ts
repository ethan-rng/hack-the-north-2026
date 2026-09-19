import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CustomerModel } from "@/sim/schema";

const CACHE_DIR = path.join(process.cwd(), ".cache", "research");

export interface ResearchCacheKey {
  businessType: string;
  location: string;
  ownerNotes?: string;
}

export interface CachedResearch {
  model: CustomerModel;
  raw_summary?: string;
  created_at: string;
}

function keyHash(k: ResearchCacheKey): string {
  const norm = `${k.businessType.trim().toLowerCase()}|${k.location.trim().toLowerCase()}|${(k.ownerNotes ?? "").trim().toLowerCase()}`;
  return createHash("sha256").update(norm).digest("hex").slice(0, 24);
}

export async function readCache(k: ResearchCacheKey): Promise<CachedResearch | null> {
  const p = path.join(CACHE_DIR, `${keyHash(k)}.json`);
  if (!existsSync(p)) return null;
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as CachedResearch;
  } catch {
    return null;
  }
}

export async function writeCache(k: ResearchCacheKey, value: CachedResearch): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const p = path.join(CACHE_DIR, `${keyHash(k)}.json`);
  await writeFile(p, JSON.stringify(value, null, 2), "utf8");
}
