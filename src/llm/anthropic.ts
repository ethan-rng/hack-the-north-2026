import Anthropic from "@anthropic-ai/sdk";

// Model ids. Env overrides let us swap without touching call sites.
export const MODELS = {
  research: process.env.ANTHROPIC_MODEL_RESEARCH ?? "claude-sonnet-4-6",
  planner: process.env.ANTHROPIC_MODEL_PLANNER ?? "claude-opus-4-7",
  report: process.env.ANTHROPIC_MODEL_REPORT ?? "claude-haiku-4-5-20251001",
} as const;

let cached: Anthropic | undefined;
export function anthropic(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  cached = new Anthropic({ apiKey: key });
  return cached;
}

// Pull the first JSON object out of a text block. Handles fenced code blocks,
// stray commentary before/after, and refuses on empty/malformed input.
export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : firstBalanced(text);
  if (!raw) throw new Error("no JSON object found in response");
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`failed to parse JSON: ${(e as Error).message}\n---raw---\n${raw.slice(0, 500)}`);
  }
}

function firstBalanced(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
