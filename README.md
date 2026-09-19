# Crowd Control

**[Open the deployed app](https://crowd-control-julian.juelzlax.workers.dev)**

Describe a place, generate a researched low-poly world, and introduce events to explore how its people react. The implementation follows the [Crowd-Control PRD](docs/Crowd-Control-PRD.md).

## Stack

- **React / Next.js static export**, **React Three Fiber + Drei**: the 3D workspace, one-description onboarding, entity inspectors, events and sequential run comparisons.
- **Cloudflare Worker + static assets**: the app and same-origin API in one deployment. No Next.js server is deployed.
- **SQLite Durable Object per anonymous browser session**: authoritative state, persistence, WebSocket snapshots and one-second simulation alarms. No accounts or multiplayer editing.
- **Baseten `openai/gpt-oss-120b`**: environment synthesis and event interpretation with validated structured output. Setup uses Baseten's **Exa web search server tool**, then extracts actual retrieval records before synthesis.
- **Jev `typesafe/jev` via Cloudflare Workers AI**, using the authenticated `crowd-control` AI Gateway: individual choices from engine-generated valid actions.

App configuration: [wrangler.jsonc](wrangler.jsonc). Cloudflare account: `5123e5b48cbca84dedd3925e6085c866`. App Worker: `crowd-control-julian`.

The independently deployed team Jev endpoint remains available. See [the team API guide](docs/jev-api.md) for its URL, shared endpoint token, request shape and examples. The app uses its own Workers AI binding and does not expose or require that endpoint token in the browser. Your colleagues can use the deployed app without receiving your Cloudflare or Baseten account keys.

## Run locally

Use a current Node.js version supported by Wrangler (22.12+). On this machine, put `/opt/homebrew/opt/node@22/bin` first on `PATH`.

```sh
npm ci
cp .dev.vars.example .dev.vars
# Put your Baseten INFERENCE key in .dev.vars, then:
npx wrangler login
npm run build
npm run preview
```

Open `http://localhost:8787`. Wrangler serves the exported frontend and local Durable Objects; the AI binding connects to real Cloudflare inference. Baseten requests also use live inference/search, so this path consumes provider credits. Keep `.dev.vars` private. The Baseten MCP management key belongs only in your local agent configuration, not the application.

`npm run dev` runs the frontend compiler alone. For the complete API/WebSocket experience use `npm run build` followed by `npm run preview`. Rebuild after frontend changes; Wrangler reloads Worker changes itself.

```sh
npm run typecheck
npm test
npm run cf:types
npm run test:e2e
```

`test:e2e` requires the local preview, real provider credentials and Chromium (`npx playwright install chromium`). It creates isolated browser sessions and tests live research, Jev, promotion/dinosaur events, reset, comparison, and a second airport scenario. To exercise a deployed Worker, set `SMOKE_URL` to its origin. Screenshots and diagnostic state are written under `/private/tmp/crowd-*`; these artifacts are not committed. Unit tests do not call external models.

## Deploy

```sh
npx wrangler secret put BASETEN_API_KEY
npm run deploy
```

Only the Baseten inference key is a Worker secret. `BASETEN_MODEL` and `AI_GATEWAY_ID` are nonsecret configuration. The existing Cloudflare account/gateway must have Jev access and available credits. `npm run worker:dev`, `worker:deploy`, and `worker:tail` target the new app Worker. The separate `services/jev-worker` has its own deployment configuration.

## Data and engine boundaries

- [src/core/types.ts](src/core/types.ts): shared contracts. [generation.ts](src/core/generation.ts): Zod validation, deterministic layout and seeded 40-person population. [engine.ts](src/core/engine.ts): authoritative state transitions, perception, queues, services, transactions and metrics.
- [cloudflare/ai.ts](cloudflare/ai.ts): provider boundaries. [cloudflare/index.ts](cloudflare/index.ts): anonymous session routing, SQLite persistence, alarms and WebSockets.
- [src/ui/World.tsx](src/ui/World.tsx): reusable geometry and interpolated people. Presentation lives in a separate entity-ID mapping and never determines engine capabilities or goals. The entity lists and inspectors remain usable if 3D rendering fails.

Ground coordinates are `(x,z)` in illustrative world units; `y` is renderer height only. Places occupy separated 8×6 footprints in two rows. Every destination connects through its entrance to an unobstructed central spine; the exit is at `(-26,0)`. This is not a surveyed map. People shown near entrances and queues use small visual offsets; authoritative positions remain available in state.

Capabilities compose across any venue description: visit, browse, purchase, queue, receive_service, wait, rest, eat and exit. A ride or checkpoint is a **free independent timed slot**, with admission capacity separate from service slots and consumable stock. Initial service durations are compact assumed demo times (up to 30 seconds). No synchronized ride cycles or real airport screening/boarding rules are implied.

Jev receives a person's goals, traits, budget, current activity, recent experiences and perceived events. It chooses only among supplied valid choices. Up to four requests are in flight per session. Navigation and services keep running while inference is pending; failures preserve activity and schedule retries. Run identity, per-person decision version, and current dependencies reject late or invalid replies. No heuristic choice is labeled as a successful model response.

The engine commits single-item purchases synchronously: stock, current price, budget, place status and eligibility are checked at completion. The best discount applies without stacking. Transactions and completed services use idempotency keys. Noninterruptible services drain after closure or a threat; interruptible services and queue departures release membership consistently.

## Research, events and comparison

Setup budgets 42 seconds for search and 35 seconds for synthesis. Source IDs, URLs, titles, retrieval timestamps, excerpts and supported field paths are stored with the frozen baseline. The source panel distinguishes user instructions, researched facts, inferred structure and assumed operational values. Failed retrieval is visibly assumption-based; failed synthesis uses a labeled generic fallback. A returned LLM summary without tool results is never counted as successful research.

Events are interpreted by Baseten into a finite registry: discount, stock delta, availability, service capacity/duration, attraction, threat, announcement and scheduled goal target/deadline updates. IDs and parameter ranges are validated. Stock changes persist; temporary effects expire without undoing purchases. Overlapping effects are derived from base settings. The dinosaur is a prepared primitive asset connected to the same threat/perception/Jev path; it causes no unimplemented physical damage.

Local information is learned within its radius; announcements reach the environment. Scheduled goals use a `subjectKey` such as `CC101`. A gate change updates affected passengers' knowledge and goals only when perceived. Generic services do not represent actual airline operations.

Runs default to 180 simulated seconds. **Finish run** can save a shorter first run after ten seconds. **Reset baseline** restores exact initial people, goals, positions, budgets, stock, capacities, seed and research, with a new run ID. Run B automatically uses Run A's duration, and cannot finish early for comparison. Resetting an unfinished alternative discards that alternative; the saved first baseline remains. Comparisons include environment and per-place metrics, absolute differences, percentages (N/A for zero baseline), waits and intervention timings. Fresh model calls can differ across runs; this is not a causal estimate or exact replay.

Revise the description to generate a new independent setup. Refresh/reconnect restores the latest SQLite state. Existing runs continue to their bounded duration even if the tab disconnects. State is session-scoped to an HttpOnly cookie. Expired/missing cookies start a new session.

## API

The browser obtains an anonymous session with `GET /api/session`. Mutations use same-origin JSON requests. No provider credentials are returned.

| Route              | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `GET /api/health`  | Integration configuration status (not an inference probe) |
| `GET /api/session` | Coherent snapshot / session creation                      |
| `GET /api/live`    | WebSocket snapshots, reconnect supported                  |
| `POST /api/setup`  | `{ "description": "…" }`, asynchronous research/setup     |
| `POST /api/start`  | Start frozen baseline                                     |
| `POST /api/events` | `{ "text": "…" }`, asynchronous interpretation            |
| `POST /api/finish` | Freeze first run or an equal-duration alternative         |
| `POST /api/reset`  | Restore baseline and start next run                       |

Request bodies are bounded at 4 KiB for text-bearing mutations, event text at 1,000 characters, events at 30 per run and concurrent interpretations at two. WebSocket connections are bounded to five per session. Accepted decisions and event history are recorded; detailed most-recent Jev inputs are inspectable per person. The prototype uses a compact SQLite state document rather than a cross-session analytics database.

## Demo

1. Describe an amusement park with two rides, a gift shop, food and rest. Review actual sources and assumptions; start the run.
2. Select the gift shop and follow stock, checkout queues and completed purchases. Inspect a person to see goals and their actual accepted Jev choice.
3. Finish Run A after a useful observation period (60–90 seconds), then reset. Announce a 20% shop promotion and add a service slot using free text.
4. Compare the same-duration results. Outcomes are model-dependent; no purchase lift is scripted.
5. Reset and introduce a dinosaur in the central plaza. Inspect who perceived it and which actions Jev chose.
6. Generate an airport with two gate zones and a timed checkpoint. Announce a new gate for journey CC101; inspect affected passengers and unrelated people.

The old batch/Pixi prototype source remains in the repository for teammate reference, but its Next API/report routes are removed and it is not part of this deployment. The canonical implementation is the Cloudflare app described above.

## Verification

See [the validation record](docs/validation.md) for the tested scenarios, results and limitations.
