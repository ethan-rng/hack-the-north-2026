# Jev team API

The Cloudflare Worker exposes `typesafe/jev` for Crowd Control's individual decisions. It sends native Jev `state` and typed `questions` through the Workers AI binding, using the authenticated `crowd-control` AI Gateway. The simulation backend owns action eligibility, state, and execution.

## Deployment status

The Worker, endpoint secret, and gateway connection are deployed to Julian's Cloudflare account (`juelzlax@gmail.com`, account `5123e5b48cbca84dedd3925e6085c866`). **Live Jev inference is verified working.** On September 19, 2026, the deployed endpoint returned `jev-1.13.0`, selecting `move_to_food` from the fixture's offered actions in 641 ms end to end (one smoke test, not a latency guarantee). Authentication and validation checks also pass.

The endpoint unwraps Cloudflare's `Completed` result envelope so callers receive Jev's `model`, `answers`, and `usage` directly. Failed, pending, and malformed results are rejected. AI Gateway credits fund inference; manage the balance in [AI Gateway](https://dash.cloudflare.com/5123e5b48cbca84dedd3925e6085c866/ai/ai-gateway). Teammates can use the existing endpoint key without a Cloudflare login.

## Calling from a teammate's backend

The repo also contains a separate `worker/` proxy and `src/jev/worker.ts` client from the application implementation. That client currently calls `/jev` without this endpoint's bearer authentication and expects a different response shape. Setting its `JEV_WORKER_URL` to this service alone will not work; adapt that client to the contract below before using this service from the app.

- Base URL: `https://crowd-control-jev.juelzlax.workers.dev`
- Inference: `POST /v1/jev`
- Header: `Authorization: Bearer <JEV_API_KEY>`
- Body: `application/json` containing `state` and `questions`
- Health: `GET /health` (no key, no inference)

Teammates do not need a Cloudflare account or a TypeSafe key. Julian has a private, gitignored `services/jev-worker/.env.team` file containing the base URL and endpoint key. Share it privately and load the values into the backend's environment. Do not put the key in frontend code, public environment variables, or commits. This is a server-to-server API; browser CORS is intentionally not enabled.

From the repo root, after setting the two environment variables:

```sh
curl --fail-with-body "$JEV_BASE_URL/v1/jev" \
  -H "Authorization: Bearer $JEV_API_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @services/jev-worker/examples/decision.json
```

Node.js backend:

```js
const response = await fetch(`${process.env.JEV_BASE_URL}/v1/jev`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.JEV_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    state: personContext, // Only information this person has perceived.
    questions: {
      nextAction: {
        type: "choice",
        instructions: "Choose this person's next action from the valid options using their goals and constraints.",
        criteria: validActionDescriptions, // { actionId: description, ... }
      },
    },
  }),
  signal: AbortSignal.timeout(25_000),
});
if (!response.ok) throw new Error(`Jev request failed: ${response.status}`);
const result = await response.json();
const actionId = result.answers.nextAction.choice;
// Revalidate the action against current engine state before applying it.
```

The response is Jev's structured result, including `model`, `answers`, and `usage` when supplied by the provider. Choice answers include `choice`, `confidence`, and `probabilities`. No natural-language reasoning is fabricated. A request ID is returned in `X-Request-Id`.

## Request limits and errors

The endpoint accepts a string, object, or array for `state`, and 1–16 questions. Each question has nonempty `instructions` and one of these shapes:

| Type | Criteria | Result |
| --- | --- | --- |
| `choice` | Object mapping 2–32 option IDs to descriptions | Selected option, confidence, probabilities |
| `score` | Ordered array of 2–32 descriptions | Score, confidence, probabilities |
| `noul` | Optional `{ "true": "...", "false": "..." }` | Value from 0 to 1 |

Request bodies are limited to 64 KiB. Question/option IDs are at most 128 characters; instructions and criterion descriptions are at most 4,000 characters. Inference times out after 20 seconds. These are endpoint guardrails, not claims about Jev's maximum capabilities. One valid action can be applied by the engine without asking the model; do not fabricate extra choices.

| Status | Meaning |
| --- | --- |
| 400 | Invalid JSON or input schema |
| 401 | Missing or incorrect endpoint key |
| 404 / 405 | Unknown route / wrong method |
| 413 / 415 | Body too large / wrong content type |
| 502 | Upstream inference failed or returned no structured answers |
| 503 | Worker endpoint key missing |
| 504 | Inference timeout |

Preserve the current behavior on failed inference. Use bounded concurrency (start with four in-flight person decisions) and at most one delayed retry for transient failures; do not keep retrying account setup errors. Do not run inference on animation frames. The endpoint disables gateway response caching (`skipCache: true`) and performs no automatic retries. Account/provider quotas still apply; this endpoint does not impose a global spending cap.

## PRD integration responsibilities

The example uses one person's known state and engine-supplied actions. Include goals, budget, needs, current activity, recent experiences, and perceived surroundings. Never give a person unperceived global events. The API does not filter world state for you.

Retain `setupId`, `runId`, `personId`, decision identity, and `basedOnRevision` in the caller's request context. Jev's native response does not echo these fields. Discard responses after reset/regeneration or a newer conflicting decision, and revalidate targets, budget, stock, capacity, and relevant urgent events before applying an action. An unrelated revision change alone should not reject it. The endpoint does not mutate the simulation or implement its decision scheduler.

## Development and deployment

Use Node.js 22.6 or later (the unit tests use native TypeScript stripping):

```sh
cd services/jev-worker
npm ci
cp .dev.vars.example .dev.vars # Only on a fresh checkout; set a local endpoint key.
npx wrangler login           # Only maintainers need this, if not already authenticated.
npm run types
npm run check
npm run test:unit
npm run dev
```

The AI binding is remote: local development makes real Cloudflare inference requests. On Julian's machine, a compatible Node is available with `export PATH=/opt/homebrew/opt/node@22/bin:$PATH`; the default shell originally selected Node 20.

Deploy and set the endpoint secret:

```sh
npm run deploy
npx wrangler secret put JEV_API_KEY
```

The secret prompt is interactive. Changing it invalidates the old team key; update teammates' environments privately. Never deploy `.env.team` or `.dev.vars` as source. `AI_GATEWAY_ID` in `wrangler.jsonc` selects `crowd-control`. The Workers AI binding authenticates within the account without an additional Cloudflare API token. Deployment targets the account explicitly named in `wrangler.jsonc`.

After receiving `.env.team`, verify the deployed service (Node 22+):

```sh
node --env-file=.env.team --test scripts/api.test.mjs
node --env-file=.env.team scripts/smoke.mjs
```

The first command tests HTTP health, authentication, and input rejection without inference. The smoke test makes one real Jev request and checks that the chosen action is one of the provided choices. It reports measured latency rather than assuming a performance target. Worker logs record request IDs, latency, and error categories; they do not explicitly log payloads or credentials. AI Gateway has separate logging settings.

## References

- [Cloudflare Jev model](https://developers.cloudflare.com/ai/models/typesafe/jev/)
- [AI binding and third-party models](https://developers.cloudflare.com/ai-gateway/usage/worker-binding-methods/)
- [Gateway unified billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
- [TypeSafe typed decisions](https://docs.typesafe.ai/introduction)
