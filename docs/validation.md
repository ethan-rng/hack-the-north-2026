# Implementation validation — 2026-09-19

The app was exercised with live Baseten Model APIs, Baseten/Exa search, and Jev through Cloudflare Workers AI. No model choices were mocked in the browser or deployment checks.

## Re-entry and timeline chapters

Integrated with the weighted graph layout update (`404bd67`); shortest-path movement remains intact. The composer height now determines metric positioning so chapter cards do not cover scene statistics.

All 39 unit tests and frontend/Worker type checks pass. New lifecycle coverage checks that leave and flee must finish before re-entry becomes valid, already-inside/stale requests cannot re-enter, outside waits complete, outside people receive global events, repeated visits preserve personal history, and historical playback respects presence transitions without inference.

`npx tsx scripts/chapters-smoke.mts` uses deterministic engine recordings and mocked API responses (no model calls). It checks chapter labels, checkpoint navigation at 0s/30s, active chapter highlighting, pause-on-seek, refresh, mobile navigation, failed-submission status and zero mutation requests while replaying. Run it against a built app using `SMOKE_URL` (defaults to `http://127.0.0.1:8766`).

## Earlier global event update

All 33 unit tests and frontend/Worker type checks pass. Regression coverage checks distant recipients for announcements, attractions, threats and discounts, immediate Jev context delivery, targeted gate updates, exited-person exclusion (superseded by re-entry support above), duplicate prevention, and legacy stored local events ignoring their old radius.

The deployed airport smoke test submitted a gate-change sign without requesting a terminal-wide announcement. The recording at time zero showed all **40 people** already knew the event. Only the **14 matching passengers** had their goal targets updated; unrelated goals were unchanged. The segment recorded **168 accepted Jev decisions**, zero failures, five purchases and four timed-service completions, then paused at exactly 30 seconds with no further idle calls. New events contain neither an awareness option nor a radius. Production build and deployment passed.

## Event-driven playback update

The new 30-second processing flow replaces the continuous-run behavior described in the earlier scenario results below. All 28 unit tests pass, including settled initial placement, paused-state guards, exact segment duration, decision budgets, interrupted requests, failure preservation, immutable history, and position interpolation without future stock/budget leakage.

A live local mall browser test accepted **104 Jev decisions** for the first 30-second promotion segment and **60** for the second dinosaur segment, with no failures. Initial state stayed frozen with zero calls. Both segments completed before playback started. Play/pause, 0.5× and 4× speeds, backward/forward seeking, automatic end pause, reconnect, exact reset, concurrent-event rejection and stale-run rejection passed. Idle and playback checks observed **zero additional calls**. Desktop and mobile screenshots were inspected; no uncaught browser errors occurred. These call counts are observations, not fixed quotas.

The updated airport smoke test also passed with live research and a gate-change event: **129 accepted Jev decisions**, zero failures, **14 affected passengers**, zero unrelated goal updates, one purchase and seven timed-service completions. It paused at exactly 30 simulated seconds and remained idle without additional calls.

The public check also exercised invalid event interpretation: a category-wide discount with an unresolved target was rejected without advancing the scene. The interpretation prompt now explicitly expands category offers to existing product IDs. A startup regression check delays session creation and verifies that submission waits for the session and preserves a description typed during loading.

Final public deployment verification passed at `https://crowd-control-julian.juelzlax.workers.dev` (Worker version `f9119f3b-0568-44f1-9a57-baf745c1271a`). The promotion and dinosaur segments each recorded exactly 30 simulated seconds, using **104** and **77** Jev attempts respectively. Playback, 0.5×/4× speeds, seeking, automatic pause, reconnect, reset and request guards passed with zero idle/playback calls and no browser errors.

## Earlier continuous-run validation

### Automated checks

- Production static export and both frontend/Worker TypeScript checks pass.
- 17 engine/integration-boundary unit tests pass: last-unit contention; checkout-time price/budget validation; reusable free service slots; noninterruptible draining; checkout interruption; queue patience; promotion overlap/expiry; explicit food consumption; local gate-change awareness and fixed deadline; stale responses; unrelated revisions; exact reset; retained exited people; equal comparison durations; layout reachability; asset-independent capabilities/goals; invalid event targets; actual tool-source extraction.
- Cloudflare deployment dry run passes; Worker and SQLite Durable Object migration deployed.
- Public API guards return expected codes: missing setup 409, invalid description 400, cross-origin mutation 403, oversized text payload 413, wrong content type 415.

## Live scenarios

### Generated amusement park — public app

One description generated seven places and 40 people with five retrieved sources. Real Jev choices were accepted; the baseline had no inference failures. Baseten interpreted a 20% shop discount and a dinosaur threat into active engine effects. Local perception, the prepared dinosaur geometry, inspector selection and event history were visible.

The first run and reset alternative each completed **45 simulated seconds**. Observed results:

| Metric                                   |      A |      B |
| ---------------------------------------- | -----: | -----: |
| Place visits                             |     51 |     52 |
| Purchases / units sold                   |     14 |     14 |
| Simulation revenue                       | $50.00 | $52.00 |
| Service completions, including checkouts |     21 |     20 |
| Queue abandonments                       |      1 |      2 |

These are recorded model-dependent outcomes, not expected values or evidence that a promotion causes an increase. The two runs used the same starting state. Promotion and threat timing, changing stock, accepted decisions, and effects/history were available in snapshots. The browser reported no uncaught page errors.

A 2.5-second requestAnimationFrame sample during the live 40-person scene at 1440×960 measured approximately **54 FPS** in headless Chromium on the development machine. This is a short local rendering sample, not a guarantee for other devices or sustained worst-case performance. Desktop and 390px mobile screenshots were inspected; the camera fits the available canvas and the mobile inspectors scroll independently.

### Generated airport — second domain

A separate single description of Toronto Pearson Terminal 1 produced gate zones, shops, food, rest and timed services, using five external sources. An environment-wide gate-change announcement for `CC101` updated **14 affected people** and **zero unrelated people's goals**. The 75-second local run accepted **244 Jev decisions** without inference failure, committed **9 purchases**, and completed **10 free non-retail services**.

The final public airport run completed **7 purchases** and **4 free non-retail services**, accepted **267 Jev decisions**, and recorded **11 failed decision requests** with activity preservation/retry behavior. All **14 affected passengers** subsequently had accepted movement decisions toward the updated gate. A follow-up direct Jev health probe returned a valid `eat` choice; the integration remained available. Saved-session reconnect also passed without browser errors.

This validates common service mechanics and knowledge-mediated routing. It does not implement boarding eligibility, synchronized flights, security rules or operational airport forecasting.

## Known scope and limits

- Geometry, population, stock, budget, prices and operating times are assumptions. Source attribution and limitations remain visible in the app.
- Search and model availability can vary; bounded, labeled fallbacks remain part of the implementation.
- Generated services use compact assumed demo timings. In the first live probe, longer assumed timings produced no completions during a 45-second observation window; the final generation contract uses 2–30 second initial services and explicitly labels them illustrative.
- Snapshot storage is a bounded prototype document per session. There are no user accounts, cross-session analytics, arbitrary meshes/code or detailed domain physics.
- The original team Jev endpoint remains independently deployed; application users do not need its token.
