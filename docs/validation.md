# Implementation validation — 2026-09-19

The app was exercised with live Baseten Model APIs, Baseten/Exa search, and Jev through Cloudflare Workers AI. No model choices were mocked in the browser or deployment checks.

## Automated checks

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
- Snapshot storage is a bounded prototype document per session. There are no user accounts, cross-session analytics, exact replay, arbitrary meshes/code or detailed domain physics.
- The original team Jev endpoint remains independently deployed; application users do not need its token.
