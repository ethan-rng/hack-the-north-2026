// Apply dot-path patches like "business.menu.latte.price" -> 5.5.
// Numeric-looking segments are treated as array indices only when the current
// value is an array; menu items are looked up by their `id` field.

import type { Patch } from "@/sim/schema";
type PatchInput = { path: string; value: unknown };

export function applyPatches<T>(input: T, patches: PatchInput[] | ReadonlyArray<PatchInput>): T {
  const cloned = structuredClone(input);
  for (const p of patches) setPath(cloned as Record<string, unknown>, p.path.split("."), p.value);
  return cloned;
}

function setPath(obj: unknown, path: string[], value: unknown): void {
  if (path.length === 0) return;
  const [head, ...rest] = path;
  if (obj == null || typeof obj !== "object") return;
  const container = obj as Record<string, unknown> | unknown[];

  const child = resolveChild(container, head);
  if (rest.length === 0) {
    assignChild(container, head, child.index, value);
    return;
  }
  if (child.value == null || (typeof child.value !== "object" && !Array.isArray(child.value))) {
    // Auto-create intermediate objects.
    const next: Record<string, unknown> = {};
    assignChild(container, head, child.index, next);
    setPath(next, rest, value);
    return;
  }
  setPath(child.value, rest, value);
}

type ResolvedChild = { value: unknown; index: number | null };

function resolveChild(container: Record<string, unknown> | unknown[], key: string): ResolvedChild {
  if (Array.isArray(container)) {
    const asNum = Number(key);
    if (Number.isInteger(asNum) && asNum >= 0 && asNum < container.length) {
      return { value: container[asNum], index: asNum };
    }
    // Look up by object.id.
    const idx = container.findIndex((el) => el && typeof el === "object" && (el as { id?: unknown }).id === key);
    if (idx >= 0) return { value: container[idx], index: idx };
    return { value: undefined, index: null };
  }
  return { value: (container as Record<string, unknown>)[key], index: null };
}

function assignChild(
  container: Record<string, unknown> | unknown[],
  key: string,
  index: number | null,
  value: unknown,
): void {
  if (Array.isArray(container)) {
    if (index === null) {
      // Try to find by id.
      const idx = container.findIndex((el) => el && typeof el === "object" && (el as { id?: unknown }).id === key);
      if (idx >= 0) container[idx] = value;
      return;
    }
    container[index] = value;
    return;
  }
  (container as Record<string, unknown>)[key] = value;
}

export type { Patch };
