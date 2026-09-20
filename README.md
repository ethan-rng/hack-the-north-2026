# Commotion

**[Open the deployed app](https://crowd-control-julian.juelzlax.workers.dev)**

Describe a place, generate a researched low-poly world, and introduce events to explore how its people react. The implementation follows the [Commotion PRD](docs/Crowd-Control-PRD.md).

## Stack

- **React / Next.js static export**, **React Three Fiber + Drei**: the 3D workspace, one-description onboarding, entity inspectors, events and sequential run comparisons.
- **Cloudflare Worker + static assets**: the app and same-origin API in one deployment. No Next.js server is deployed.
- **SQLite Durable Object per anonymous browser session**: authoritative state, persistence, WebSocket snapshots and bounded event-processing alarms and recorded timelines. No accounts or multiplayer editing.
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

`test:e2e` requires the local preview, real provider credentials and Chromium (`npx playwright install chromium`). It creates isolated browser sessions and tests live research, Jev, frozen initial state, promotion/dinosaur segments, playback controls, scrubbing, reset, reconnect, and a second airport scenario. To exercise a deployed Worker, set `SMOKE_URL` to its origin. Screenshots and diagnostic state are written under `/private/tmp/crowd-*`; these artifacts are not committed. Unit tests do not call external models.

## Deploy

```sh
npx wrangler secret put BASETEN_API_KEY
npm run deploy
```

Only the Baseten inference key is a Worker secret. `BASETEN_MODEL` and `AI_GATEWAY_ID` are nonsecret configuration. The existing Cloudflare account/gateway must have Jev access and available credits. `npm run worker:dev`, `worker:deploy`, and `worker:tail` target the new app Worker. The separate `services/jev-worker` has its own deployment configuration.

## Data and engine boundaries

- [src/core/types.ts](src/core/types.ts): shared contracts. [generation.ts](src/core/generation.ts): Zod validation, deterministic layout and seeded 40-person population. [engine.ts](src/core/engine.ts): authoritative state transitions, perception, queues, services, transactions and metrics. [playback.ts](src/core/playback.ts): settled initial population, bounded processing and historical frames.
- [cloudflare/ai.ts](cloudflare/ai.ts): provider boundaries. [cloudflare/index.ts](cloudflare/index.ts): anonymous session routing, SQLite persistence, alarms and WebSockets.
- [src/ui/World.tsx](src/ui/World.tsx): reusable geometry and interpolated people. Presentation lives in a separate entity-ID mapping and never determines engine capabilities or goals. The entity lists and inspectors remain usable if 3D rendering fails.

Ground coordinates are `(x,z)` in illustrative world units; `y` is renderer height only. Research/configuration produces 6–12 points of interest and a sparse connected graph whose weights mean nearby, medium or farther apart. A deterministic force layout uses those weights to vary visual spacing, and movement follows the graph so longer routes take longer to animate. Distances and edge weights are deliberately omitted from Jev's choice context: they affect presentation and travel time, not destination preference. This is not a surveyed map. People shown near entrances and queues use small visual offsets; authoritative positions remain available in state.

Capabilities compose across any venue description: visit, browse, purchase, queue, receive_service, wait, rest, eat and exit. A ride or checkpoint is a **free independent timed slot**, with admission capacity separate from service slots and consumable stock. Initial service durations are compact assumed demo times (up to 30 seconds). No synchronized ride cycles or real airport screening/boarding rules are implied.

Jev receives a person's goals, traits, budget, current activity, recent experiences and perceived events. It chooses only among supplied valid choices. Up to four requests are in flight per session. During processing, virtual time waits for each due decision batch; model latency does not consume simulated seconds. Failures preserve activity and schedule retries. Run identity, per-person decision version, and current dependencies reject late or invalid replies. No heuristic choice is labeled as a successful model response.

The engine commits single-item purchases synchronously: stock, current price, budget, place status and eligibility are checked at completion. The best discount applies without stacking. Transactions and completed services use idempotency keys. Noninterruptible services drain after closure or a threat; interruptible services and queue departures release membership consistently.

## Research, events and comparison

Setup budgets 42 seconds for search and 35 seconds for synthesis. Source IDs, URLs, titles, retrieval timestamps, excerpts and supported field paths are stored with the frozen baseline. The source panel distinguishes user instructions, researched facts, inferred structure and assumed operational values. Failed retrieval is visibly assumption-based; failed synthesis uses a labeled generic fallback. A returned LLM summary without tool results is never counted as successful research.

Events are interpreted by Baseten into a finite registry: discount, stock delta, availability, service capacity/duration, attraction, threat, announcement and scheduled goal target/deadline updates. IDs and parameter ranges are validated. Stock changes persist; temporary effects expire without undoing purchases. Overlapping effects are derived from base settings. The dinosaur is a prepared primitive asset connected to the same threat/perception/Jev path; it causes no unimplemented physical damage.

Every event is global: everyone, including people who have left, learns it immediately, regardless of distance or its visual location. Jev chooses each person's reaction independently. Mechanical effects retain their specific targets: a store promotion changes that store's offers, and a gate change updates only passengers with the matching `subjectKey`, such as `CC101`. Generic services do not represent actual airline operations.

The generated population is already distributed through the venue, with initial activities and no fabricated sales. Opening the scenario makes no Jev calls and leaves everyone paused. Each event is interpreted, then the backend records exactly **30 simulated seconds** before the browser plays the result and automatically pauses. Playback supports 0.25×, 0.5×, 1×, 2× and 4× speed, pause, and forward/backward scrubbing. Inspectors and metrics follow the selected frame; playback makes no inference requests.

People who have completed a leave or flee action can choose to stay outside or `reenter`. Re-entry starts at the entrance and preserves budgets, completed goals, purchases and history. These Jev decisions use the same bounded event-processing budget; there are no calls while idle.

Each event submission appears as a labeled timeline chapter. Completed chapters have clickable checkpoints that pause and seek to the event start, with the current chapter highlighted. Processing and failed submissions remain visible. Chapters survive refresh and clear on reset.

New events extend the latest recorded state. Return to the end of the timeline before submitting; historical scrubbing does not branch the simulation. One event processes at a time, with up to four concurrent Jev requests and a maximum of **240 attempts per segment**. Actual usage varies with people and activity. After the call budget or 180-second processing budget is reached, existing activities complete the remaining virtual time; the segment reports the limit. Failed interpretation leaves the scene unchanged. A run supports up to 30 event submissions.

**Finish run** saves the current recorded outcome. **Reset baseline** restores exact initial people, goals, positions, budgets, stock, capacities, seed and research, with a new run ID. Process the same number of 30-second segments in Runs A and B to compare equal durations; unequal durations are explicitly excluded from comparison. Resetting an unfinished alternative discards that alternative; the saved first baseline remains. Comparisons include environment and per-place metrics, absolute differences, percentages (N/A for zero baseline), waits and intervention timings. Fresh model calls can differ across runs; comparison is not a causal estimate. Replaying a recorded run reuses its saved state without new decisions.

Revise the description to generate a new independent setup. Refresh/reconnect restores the latest SQLite state. An already submitted event finishes its bounded processing if the tab disconnects. Reopening restores the recording paused; no further calls occur until another event is submitted. State is session-scoped to an HttpOnly cookie. Expired/missing cookies start a new session.

## API

The browser obtains an anonymous session with `GET /api/session`. Mutations use same-origin JSON requests. No provider credentials are returned.

| Route                            | Purpose                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                | Integration configuration status (not an inference probe)                                                |
| `GET /api/session`               | Coherent snapshot / session creation                                                                     |
| `GET /api/live`                  | WebSocket snapshots, reconnect supported                                                                 |
| `POST /api/setup`                | `{ "description": "…" }`, asynchronous research/setup                                                    |
| `POST /api/start`                | Start frozen baseline                                                                                    |
| `POST /api/events`               | `{ "text": "…", "runId": "…", "expectedTime": 0 }`, asynchronous interpretation and 30-second processing |
| `GET /api/recording?segmentId=…` | Completed segment frames for the current run                                                             |
| `POST /api/finish`               | Save current recorded outcome                                                                            |
| `POST /api/reset`                | Restore baseline and start next run                                                                      |

Request bodies are bounded at 4 KiB for text-bearing mutations, event text at 1,000 characters, events at 30 per run and processing jobs at one. WebSocket connections are bounded to five per session. Accepted decisions and event history are recorded; accepted choices are inspectable at each recorded second. Large inference inputs are omitted from playback frames. The prototype stores current state in a SQLite document and historical frames in a separate table.

## Demo

1. Describe an amusement park with two rides, a gift shop, food and rest. Review actual sources and assumptions; open the paused scenario.
2. Submit a shop promotion. Wait for 30 simulated seconds to process, then watch playback. Pause, change speed, and scrub while inspecting a person or shop.
3. Finish Run A after one or more event segments, then reset. Announce a promotion with an extra service slot using free text.
4. Compare the same-duration results. Outcomes are model-dependent; no purchase lift is scripted.
5. Reset and introduce a dinosaur in the central plaza. Inspect how individuals reacted and which actions Jev chose.
6. Generate an airport with two gate zones and a timed checkpoint. Announce a new gate for journey CC101; inspect affected passengers and unrelated people.

The old batch/Pixi prototype source remains in the repository for teammate reference, but its Next API/report routes are removed and it is not part of this deployment. The canonical implementation is the Cloudflare app described above.

## Verification

See [the validation record](docs/validation.md) for the tested scenarios, results and limitations.
