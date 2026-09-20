# Dynamic Building Generation — Design Notes

Exploration branch: `julian-dynamic-buildings`.

## Goal

Let a Baseten agent generate 3D low-poly buildings on the fly for a place that
does not match any of the 105 predefined styles, so unusual venues (e.g. a
customs-declaration hall, a beach cabana row, a research reactor) still get
recognisable geometry instead of falling back to the generic `building` block.

The pre-built /dev library remains the fast path; dynamic generation is a
fallback for the long tail.

## Approach

### 1 — Reuse the primitive schema

The existing `Primitive` union (`box | cyl | cone | sphere | octa | torus`) is
already validated by the render loop in `src/ui/buildings/primitives.tsx`. Port
it into a server-safe Zod schema in `src/core/buildingSchema.ts` (no JSX
imports) so the Cloudflare Worker can validate LLM output.

```ts
export const primitiveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("box"),
    position: vec3,
    scale: vec3,
    color: hexColor.optional(),
    rotation: vec3.optional(),
  }),
  // ... cyl, cone, sphere, octa, torus
]);

export const generatedBuildingSchema = z.object({
  primitives: z.array(primitiveSchema).min(3).max(60),
  labelHeight: z.number().min(0.5).max(20).optional(),
});
```

### 2 — Trigger only when needed

Extend the environment prompt: for each place emit either a canonical `styleId`
from the enum **or** the sentinel `"custom"`. When `custom`, the LLM must
supply a short `styleBrief` string (e.g. "beach cabana with striped canopy on
wooden posts, driftwood signboard").

`compileEnvironment` records `custom` places for later resolution. The `/api/setup`
handler in `cloudflare/index.ts` iterates those custom places (max 4 per env)
and calls a new `generateBuilding(brief)` function that returns a validated
`Primitive[]`.

### 3 — Cache aggressively

Custom generations are:
- **Deterministic per brief** — content-address by SHA-256 of the brief text.
- **Persisted in Durable Object storage** — `buildings` table keyed on the hash.
- **Ambient across sessions** — a bucket cache in a top-level Durable Object
  namespace so different sessions can share.

Cost per generation is small (~2-4k tokens); caching means a well-used custom
style only pays that cost once.

### 4 — Render path

`Environment.presentation[id]` gains an optional `customPrimitives?: Primitive[]`
field alongside `styleId`. `World.tsx` `Building` prefers, in order:
1. `customPrimitives` if present,
2. `stylesById[styleId]` if valid,
3. the existing asset switch.

No new render code — just wire the array into `BuildingModel`.

### 5 — Validation & safety

Zod already rejects nonsense (bad enums, out-of-range numbers). Add extra
guards inside the schema for realism:
- Bounding box: all coordinates within `±10, 0..12, ±10`.
- Total primitive count ≤ 60 (frame budget).
- Colors clamped to a hex regex.
- Reject if the primitives don't touch `y=0` (the ground plate).

If validation fails, the place falls back to `styleId` and the failure is
recorded in `provenance` as `assumed`.

## Prompt sketch

```
You design a low-poly 3D building from a short description. Return only a
primitives array. Every primitive is a box, cylinder, cone, sphere,
icosahedron, or torus placed within ±10x, 0..12y, ±10z. Aim for 8-30
primitives — enough to be recognisable, few enough to render cheaply. Use
flat colors from a low-poly palette. Ground the building at y=0.

Description: "beach cabana with striped canopy on wooden posts"

Return: { primitives: [...] }
```

## Open questions

- **Latency** — even with a fast model this adds ~2-4s to setup. Should custom
  places generate in parallel with the world build, or lazy-load client-side
  after the run starts? Probably the latter.
- **Style consistency** — a run with 4 custom + 20 predefined might look
  mismatched if the custom generator picks unrelated palettes. Passing an
  environment-level palette hint in the brief should help.
- **Rejection rate** — first pass will fail Zod often. Add a single retry that
  echoes the parse errors back to the LLM.
- **Trust boundary** — briefs come from the environment-generation LLM, not the
  user directly. Still, the primitives array is the untrusted input; enforce
  strict Zod parsing on the Worker before persisting.

## Rollout plan

1. Land the Zod schema + validator, no LLM wiring yet.
2. Add a `/dev/custom` scratch page: enter a brief, hit generate, see the
   result rendered alongside the 105 predefined styles. Purely a designer tool.
3. Only after (2) looks good, add `custom` sentinel + `styleBrief` to the
   environment schema and a lazy-generation path.

## What NOT to do

- Do not replace the /dev library. The 105 styles are the fast, cached,
  deterministic path.
- Do not let the LLM emit JSX or component code — only the primitives array.
- Do not run generation inside the hot decision loop.
