# Crowd Control Product Requirements Document

Working title: Crowd Control  
Delivery: Hack the North MVP, ready before hacking ends  
Team: Julian, product manager and frontend developer; two engineers focused on backend and simulation  
Audience: The three builders and their coding agents

Updated 2026-09-19: event-driven 30-second processing and recorded playback replace continuous simulation. Pause, speed controls and timeline scrubbing are required.

## 1 Product direction

Build an event-driven, low-poly 3D simulation of a populated environment described by the user. The user enters one short description. A research agent finds relevant information, fills gaps with labeled assumptions, and produces a usable environment configuration. The system generates an approximate 3D scene and a population of individual AI-controlled people.

Once inside, the user can type events, watch people react, click people to inspect their state, and click stores or other places to see their numbers change in a side pane. Users simulate the entire environment. They do not need to own or designate a focal business.

Examples include a shopping mall, a plaza, an amusement park, an airport terminal, a market, or an unfamiliar environment assembled from the same general mechanics. The mall is a polished demonstration, not the backend's domain boundary. The product has both a practical use for exploring operational and commercial scenarios and a playful use for unusual events.

Core flow: describe environment, research and generate, inspect the compact summary, open the paused populated scenario, introduce an event, process 30 simulated seconds, play and inspect the recorded outcome, then compare sequential runs from the same baseline.

Baseten must perform meaningful runtime work, including event interpretation. It should also power the research/configuration reasoning where suitable. Jev must be accessed through Cloudflare Workers AI to choose individual people's actions. Simulation code owns authoritative movement, capacities, resources, queues, transactions, and metrics.

### Changes from the initial mall specification

- Single-description onboarding and external research are required in the MVP.
- Generated environments replace the one fixed mall limitation.
- The primary contracts are environment, place, person, capability, and service point.
- The renderer generates simple 3D scenes using reusable assets and primitives for any valid configuration.
- Store inspection remains required, and non-retail places expose metrics relevant to their capabilities.
- There is no required focal business, lengthy setup questionnaire, or manual scene-building step.
- Baseline comparisons, person inspection, free-text events, the business-first demo, and the dinosaur finale remain required.

## 2 Problem and product value

Changes to promotions, service capacity, closures, and information can redirect people, create queues, consume stock, and affect neighboring businesses. Crowd Control makes those interactions visible and inspectable in an environment the user describes.

Research grounds available facts about the environment. Simulated populations, missing operational parameters, and generated behavior remain assumptions unless separately supported. The MVP explores possible outcomes under those assumptions. It does not claim to forecast real sales, passenger behavior, or evacuation safety accurately.

| POW dimension | What the MVP demonstrates |
| --- | --- |
| Problem-centric | Explore how interventions affect people, resources, service, and businesses in a relevant setting. |
| Original | Combine researched environments, generated scenes, heterogeneous people, limited awareness, and shared operational mechanics. |
| Wow factor | One description becomes a populated world; a typed event changes its behavior; clicking a person or store reveals the consequences. |

The backend's capabilities must be determined by supported simulation mechanics, not by the presence of a matching 3D model. A roller coaster can operate as a timed service without a bespoke moving coaster asset.

## 3 MVP scope

### Required

- One short description as the only required onboarding input. No required environment category, map upload, location URL, crowd slider, or business ownership field.
- A research agent that uses external sources during setup, including research of a named real location where identifiable.
- Assumptions for information that cannot be found, with provenance and visible limitations.
- An automatically generated, valid environment configuration and low-poly 3D layout using reusable geometry and assets.
- A compact generated summary with optional correction through the same description field and an Explore scenario action.
- Approximately 40 people and six to ten places as the initial performance target, configurable internally. Large real venues may be represented by a clearly disclosed subset or simplified zones.
- Places with capability-driven interactions, including retail, waiting/gathering, rest, and generic timed services.
- Goals, budgets where applicable, interests, patience, needs, moods, memory, and limited event awareness for individuals.
- Free-text events beyond prepared demo phrases, supported effects, and generic visual fallbacks.
- Play/pause, 0.25× through 4× speed, and a timeline that scrubs forward and backward through recorded state.
- Main 3D pane, historical person inspector, selectable places, store product/stock/revenue panes, and relevant non-retail metrics.
- Sequential comparison of two runs from the same generated baseline over equal simulated durations.
- Baseten and Jev through Cloudflare Workers AI used in the running product.
- Business scenarios followed by one chaotic dinosaur finale.
- Clear setup progress, event progress, research limitations, and operational failure states.

### Outside MVP

- Spoken announcements, voice input, ElevenLabs, heatmaps, advanced historical dashboards, and an AI campaign adviser.
- Phone or messaging controls, multiplayer editing, accounts, and authentication.
- A drag-and-drop scene editor, accurate multi-floor navigation, geographic reconstruction, realistic crowd physics, and arbitrary generated 3D assets.
- Full airport, amusement-park, traffic, or financial operational models. Approximate supported interactions are in scope.
- Authenticated business integrations, live POS or passenger data, continuous web monitoring, and real-world forecast calibration.
- Multi-item carts, product variants, taxes, returns, profit accounting, and detailed inventory replenishment workflows.
- Additional sponsor integrations that do not directly support the core build.

The visible operational numbers and compact run comparison are required. An additional analytics platform is not.

## 4 Onboarding and research

### User flow

1. Show one text box with an example such as: “A busy amusement park with two popular rides, food stalls, and a gift shop.” A real location name and city may be included in the same description but are not required.
2. The user submits the description. Show short progress states such as researching, building environment, and ready.
3. Research relevant locations or environment characteristics, synthesize a configuration, generate the scene, and validate the result.
4. Show a compact summary: interpreted environment, included places, population size, key assumptions, and whether the layout is approximate. Put detailed source links and assumptions behind an expandable area.
5. The user opens the paused scenario with people already at relevant destinations, engaged in initial activities. Do not simulate arrivals or initial travel. They may optionally revise the original description and regenerate. No additional mandatory questions or wizard steps.

The system must work with sparse descriptions. It should infer reasonable defaults and make the defaults discoverable rather than forcing the user to supply every operational parameter.

### Research behavior

For an identifiable real location, prefer sources such as official venue directories, maps, opening information, and published service descriptions. Extract what is relevant to the requested environment, not every fact available.

For a generic or fictional environment, research relevant venue patterns where useful and generate a clearly synthetic configuration. Do not attach the name of a real venue to an invented layout or business roster without showing which details are assumed.

If the location is ambiguous, use the supplied context and record uncertainty. Do not silently claim that a guessed place is verified. A clearly labeled generic interpretation is an acceptable fallback; the user can correct the description.

Research must actually invoke a search/retrieval tool in a normal setup run. An LLM answering from memory is not the research feature. Engineers choose the provider and tool interface. Baseten can reason over tool results; a particular built-in browsing feature is not required.

Research is bounded. Choose a request/time budget, perform useful retrieval, and fill remaining gaps with assumptions. Do not keep onboarding blocked while trying to discover unavailable stock levels, population characteristics, service times, or capacity figures.

If retrieval fails entirely, show that research was unavailable and continue with an assumption-based environment when possible. Retain the failed research status. The final demo must also show a successful live research path; an offline fixture alone does not satisfy the requirement.

### Source and assumption rules

- Store source URL, title, retrieval time, and which configuration fields each source supports.
- Distinguish user-provided scenario choices, researched facts, inferred structure, and assumed values.
- User instructions define the scenario. A requested fictional promotion or modified layout may intentionally differ from a source; label it as a scenario choice.
- Reconcile conflicting sources explicitly or use a labeled assumption. Do not fabricate citations, coordinates, or exact measurements.
- Missing details may include stock, budgets, service durations, interests, population size, and spatial relationships. Supply valid defaults and label them.
- Keep generic illustrative facts separate from claims about a specific real location.
- Treat fetched content as information, not as instructions for the agent or permission to execute code.
- Freeze the chosen configuration for the run. Reset and comparisons reuse it without researching again.

## 5 Environment generation and rendering

The setup pipeline produces a semantic environment definition and separate presentation hints. Engine validity never depends on asset availability.

### Generalized concepts

| Concept | Examples |
| --- | --- |
| Environment | Mall, plaza, amusement park, airport terminal, public square. |
| Place | Shop, restaurant, ride, gate, checkpoint, plaza stage, rest area. |
| Person | Shopper, visitor, passenger, or another goal-driven participant. |
| Goal | Buy an item, eat, receive a service, visit an attraction, reach a location, wait until a time, or leave. |
| Service point | Checkout, ride boarding, ticket booth, or an approximate checkpoint. |
| Resource | Consumable stock, distinct from reusable admission or service capacity. |
| Capability | An implemented interaction available at a place. |

### Scene generation

Generate an approximate single ground plane with labeled places, entrances/exits, walkable paths or zones, and people. Render using reusable buildings, stalls, gates, seating, signs, simple attraction shapes, and generic blocks where needed. The mall can retain richer prepared assets.

Do not require the model to generate production-ready meshes or collision geometry. It can propose semantic locations and approximate arrangement; deterministic code validates and repairs the layout. Every required destination and exit must be reachable. Avoid overlapping blocking footprints and disconnected queues.

A large real environment may be reduced to representative zones or a requested area. Show what was included and simplified. The onboarding description is not restricted to an environment enum; unfamiliar types may be composed from existing capabilities.

If no reliable spatial information exists, construct a plausible layout and label it approximate. An exact floor plan is not required. If custom rendering fails, generic 3D shapes and labels must still permit a usable scene.

Changing or missing an asset must not change a place's inventory, service behavior, validity, or availability in the backend. Presentation metadata belongs in a separate mapping keyed by entity ID.

## 6 Simulation workspace

| Area | Required behavior |
| --- | --- |
| Main pane | Generated low-poly environment, moving people, visible queues, place labels, active event cues, and selected entity highlight. |
| Event input | Free-text field, submission state, interpreted summary, activation, and approximation/failure feedback. |
| Place side pane | Click any place. Show name, purpose, availability, capabilities, visits, occupancy, and relevant queues/services. |
| Store details | Where retail applies, show products, base/effective prices, stock, completed purchases, units sold, and revenue. |
| Person side pane | Click a person. Show goals, interests, budget where relevant, needs, mood/stress, action, destination, known events, and recent experiences. |
| Context summary | Compact access to setup assumptions, included area, and sources. |
| Comparison | Reset/new-run action and outcome comparison for two runs using the same baseline and duration. |

Selecting a store changes the inspected entity, not the simulation's ownership or scope. Non-retail places should show applicable numbers, such as ride service completions, rather than invented product or revenue fields. Free services may legitimately have zero revenue; inapplicable metrics should be omitted or labeled not applicable.

Selecting a person or place updates the relevant panel without stopping the simulation. A person who exits retains an inspectable record labeled exited. Do not fabricate a model's reasoning; show actual inputs, state, and accepted choices.

## 7 Events and individual decisions

Accept arbitrary user event text. Interpret semantics and compile executable consequences to supported effects. A new phrase, environment type, or missing asset must not be the sole reason for rejection.

Examples of supported effects include discounts, stock changes, place availability, service capacity/duration changes, attractions, threats, informational announcements, and updates to an existing scheduled goal's target or deadline. The last effect permits a simple gate-change scenario without implementing an airline operations system.

Separate a description people can react to from the effects the engine can execute. A strange event may be represented as a local stimulus and generic marker, with unimplemented physical consequences disclosed. If there is no meaningful representation, retain the text and explain the limitation rather than claiming success.

Events resolve existing place/product/person/zone references and specify start, duration, reach, and validated parameters. Missing details use documented defaults visible in the interpretation. Applicable effects expire without deleting history or undoing completed transactions.

Each person's decision context contains its goals, resources, current activity, recent experiences, and perceived surroundings. Local events must not become instant universal knowledge. Announcements can reach the full environment; signs and visible threats have local reach.

Jev chooses from presently valid actions supplied by the engine. Reconsider when people perceive an event, arrive, encounter unavailable stock or a queue, wait too long, complete an interaction, or approach a deadline. During backend processing, virtual time waits for pending decision batches while activities remain intact. Urgent events may interrupt interruptible activities; normal destination choices should not oscillate every update.

A promotion changes an offer, not every person's destination. A threat creates a perceived situation, not a scripted universal outcome. Trait differences and constraints should affect what choices are available and selected.

## 8 Shared mechanics and capability boundaries

### Initial capability vocabulary

| Capability | What the engine implements |
| --- | --- |
| `visit` | Enter a reachable place subject to admission capacity. |
| `browse` | Spend time inspecting available offerings. |
| `purchase` | Buy one product through a validated checkout transaction. |
| `queue` | Join and leave an ordered queue attached to a service point. |
| `receive_service` | Occupy service capacity for a duration and record completion. |
| `wait` | Remain in a place until a supported goal condition or decision changes. |
| `rest` | Spend time reducing modeled fatigue. |
| `eat` | Satisfy hunger through an explicit supported food interaction. |
| `exit` | Leave through an accessible exit and retain the person record. |

Place capabilities are configuration data referring to implemented mechanics. The generator cannot create a new executable mechanic by inventing a capability name. Map unfamiliar activities to a supported approximation and expose the limitation. Engineers may add capabilities behind this contract.

### Retail rules

- One product per checkout in the MVP; no multi-item carts.
- Browsing does not reserve stock. Revalidate stock, current effective price, budget, place status, and checkout eligibility at completion.
- Deduct stock, debit the person, record the transaction, and update metrics consistently and exactly once.
- At most one purchase succeeds when two people compete for the last unit.
- Apply the single best eligible discount without stacking. Prices and budgets stay nonnegative.
- Resolve price at checkout completion. Expired or unaffordable offers cause reconsideration instead of an invalid purchase.
- Food purchases can trigger the supported eating activity and reduce hunger on completion; merely entering a food outlet does not automatically satisfy hunger.

### Services and capacities

Consumable inventory and reusable capacity must be separate. A purchased item is depleted. A service slot is released after use. Admission capacity is another separate limit on occupancy.

The baseline generic service is an independent timed slot. A cashier and an approximate ride can share this mechanic with different durations and slot counts. Synchronized ride cycles, exact screening rules, boarding eligibility, and detailed domain safety rules are outside the MVP unless implemented and explicitly modeled.

For simplicity, generic non-retail services are free in the MVP; retail uses the purchase mechanic. Do not invent service revenue. A future paid-service extension can add transactional behavior deliberately.

Queue membership and active service assignments have one authoritative source. Normal queue departures, threats, closures, and completion update membership consistently. A closure can stop new admissions while allowing an already active non-interruptible service to finish. A person on such a service reacts after completion; it must not teleport out because a threat appears.

## 9 Data contracts

These are logical contracts, not prescribed database tables or framework classes. Engineers choose normalization and transport, while keeping one agreed interface with the frontend.

No root `schemaVersion`, `mallId`, replacement `environmentId`, or `currency` field is required. Use a fixed simulation money display convention and integer cents. If research finds prices in different units, mark a normalized price as an assumption rather than silently mixing amounts. Setup, run, place, person, product, event, and interaction IDs remain useful for references and stale response protection.

### Setup request and result

| Field | Shape | Meaning |
| --- | --- | --- |
| `setupId` | String | Identifies this generation attempt and rejects results from replaced descriptions. |
| `description` | String | The sole required user input, retained unchanged. |
| `status` | queued, researching, generating, validating, ready, failed | Overall setup lifecycle. |
| `researchStatus` | pending, complete, partial, unavailable | Distinguishes successful research from an assumption-only fallback. |
| `summary` | String | Concise interpretation for the user. |
| `environmentDefinition` | Object or null | Validated generated configuration. |
| `sources` | Source records | Research evidence. |
| `provenance` | Field-level records | Evidence or assumption supporting configuration values. |
| `limitations` | String list | Omitted areas, unknown identity, approximated mechanics, layout limitations. |

### Environment definition

| Field | Shape | Meaning |
| --- | --- | --- |
| `name`, `description`, `typeLabel` | Strings | Semantic identity and open-ended environment category. |
| `layout` | Layout definition | Ground-plane bounds, zones, places, entrances/exits, and navigable connections. |
| `places` | Place definitions | Initial place configuration and supported capabilities. |
| `products` | Product definitions | Initial stock and catalog, empty when irrelevant. |
| `servicePoints` | Service definitions | Initial queue/service configurations. |
| `population` | Person initial states | Synthetic goals, traits, positions, budgets, and needs. |
| `presentation` | Entity-keyed visual hints | Optional asset preferences, labels, colors, and fallback kinds. |
| `configurationSeed` | Seed | Repeatable application-controlled generation where applicable. |

Freeze this definition after setup. Derive the run's initial snapshot once, then mutate only runtime state. Research, rendering preferences, and starting values should not independently overwrite live state.

### Layout and presentation

Layout contains `bounds`, `zones`, `entrances`, `exits`, and `connections` or equivalent navigable geometry. Zones have stable IDs, labels, footprints, and entry positions. Adopt one coordinate convention and units before implementation; a two-dimensional ground plane rendered in 3D is enough. Place references and destinations must resolve within the layout.

A presentation entry contains optional `assetKey`, `fallbackKind`, `label`, `color`, and visual scale. Supported fallback kinds can include building, stall, gate, attraction, open area, rest area, and marker. Unknown kinds fall back to a labeled primitive. Physical admission and navigation are defined by layout and simulation data, never inferred solely from a decorative mesh.

### Sources and provenance

A source has `id`, `url`, `title`, and `retrievedAt`. A provenance record has `targetPath`, `basis` (user_provided, researched, inferred, assumed), `sourceIds`, and `note` explaining support, conflicts, or defaults. User-provided and assumed values may have no source IDs. Group related assumed fields under a documented path if field-by-field records would be excessive.

Keep source trust and model confidence separate. No confidence number turns an assumed capacity into an observed fact.

### Environment runtime state

| Field | Shape | Meaning |
| --- | --- | --- |
| `layout` | Validated layout | Runtime spatial reference, fixed within the initial MVP run. |
| `places` | Records by ID | Availability, capabilities, occupancy-related data, metrics. |
| `products` | Records by ID | Current retail prices/stock inputs. |
| `servicePoints` | Records by ID | Queues and active timed service assignments. |
| `people` | Records by ID | Current individual state, including retained exited people. |
| `activeEvents` | Records by ID | Effects currently in force; full history remains in the run. |
| `transactions` | Records by ID | Committed retail purchases. |
| `interactionLog` | Bounded runtime log or run history reference | Service completions and goal-relevant interactions. |
| `simulationTimeSeconds` | Nonnegative number | Elapsed simulated time. |
| `stateRevision` | Increasing integer | Authoritative state revision, separate from animation frames. |

### Place

| Field | Shape | Meaning |
| --- | --- | --- |
| `id`, `name`, `typeLabel`, `description` | Strings | Identity, purpose, and open-ended semantic type. |
| `zoneId`, `entryPosition` | References/coordinates | Where people enter and interact. |
| `status` | open, closed, evacuating | Availability. |
| `capabilities` | Implemented capability keys | Valid interactions at this place. |
| `admissionCapacity` | Nonnegative integer or null | Occupancy limit; null means no modeled limit. |
| `productIds`, `servicePointIds` | ID lists | Associated commerce and service facilities. |
| `tags` | String list | Categories, attractions, food, and other relevant descriptors. |
| `metrics` | Applicable metric values | Visits, purchases, revenue, service completions, abandonment, waits. |

No product catalog or checkout is mandatory for a place. A public square can consist entirely of visit, wait, and rest capabilities.

### Product

Fields: `id`, `placeId`, `name`, `category`, `basePriceCents`, `stockUnits`, and optional `tags`. Prices and stock are nonnegative integers. Effective price is calculated from active promotions and may be sent to the frontend as a derived value.

### Service point

Fields: `id`, `placeId`, `label`, `typeLabel`, `status` (accepting, draining, closed), `slotCount`, `durationSeconds`, `interruptible`, `queuePersonIds`, and `activeAssignments`.

Each active assignment records `personId`, `actionId`, `startedAtSeconds`, and `expectedCompletionAtSeconds`. The service type describes its meaning; executable behavior comes from the common timed-service or checkout mechanic. Queue order and active assignment are authoritative here rather than duplicated on the place.

### Person

| Field | Shape | Meaning |
| --- | --- | --- |
| `id`, `displayName` | Strings | Stable identity. Appearance belongs in presentation hints. |
| `roleLabel` | String | Visitor, passenger, shopper, or another semantic label. |
| `interests` | Category to 0–1 score | Stable preferences. |
| `goals` | Goal records | Purpose beyond shopping alone. |
| `budgetRemainingCents` | Nonnegative integer or null | Spendable balance; null means commerce is not modeled for this person, not unlimited funds. |
| `priceSensitivity`, `crowdTolerance` | Values from 0 to 1 | Price and crowd preferences. |
| `maxQueueWaitSeconds` | Nonnegative number | Patience threshold. |
| `departureTimeSeconds` | Time or null | Planned departure where applicable. |
| `hunger`, `fatigue`, `stress` | Values from 0 to 1 | Dynamic needs and stress. |
| `mood` | Small label set | Neutral, interested, pleased, frustrated, frightened. |
| `position`, `zoneId` | Coordinates/reference | Current location. |
| `presence` | inside, exited | Lifecycle state. |
| `currentAction` | Action record or null | Current behavior. |
| `actionStartedAtSeconds` | Time or null | Start of current activity. |
| `knownEventIds` | IDs | Events actually perceived. |
| `knownFacts` | Bounded fact records | Perceived targets/deadlines and other world facts with last-learned time. |
| `recentExperiences` | Bounded records | Visits, sold-out results, service completion, abandoned queues. |
| `purchaseIds`, `interactionIds` | IDs | Completed activity references. |
| `lastDecision` | Decision metadata or null | Accepted choice, run, time, and input revision. |

A goal has `id`, `kind`, `description`, `targetId` or `targetCategory`, `priority`, optional `quantity`, optional `deadlineSeconds`, and `progress`/`status`. Initial executable goal kinds include buy, eat, visit, receive_service, reach, wait_until, and exit. An unfamiliar semantic goal may map to one of these with a disclosed approximation.

A scheduled goal can have a `subjectKey`, such as a flight reference, to associate a later announcement with affected people. Authoritative target updates and the person's knowledge of them are separate. A passenger must not redirect because an unseen global field changed; the announcement updates its known facts when perceived.

People without a numeric budget cannot execute a purchase. Generation supplies a budget for people expected to shop. Demographics are optional; prefer direct goals and constraints over stereotypes.

### Event

Fields: `id`, `originalText`, `title`, `description`, `status` (interpreting, active, completed, unsupported, failed), `category`, `targets`, `startTimeSeconds`, `durationSeconds` or explicit until-run-end scope, `awareness`, `effects`, and `approximationNotes`.

Awareness describes channel and reach: environment-wide announcement, local visibility, proximity/radius, or an audience condition. Event visuals are an optional presentation mapping. Effects use validated targets and parameters from the implemented registry. Completed events remain available in run history so knowledge references still resolve.

### Action and decision

An action records `actionId`, `decisionId`, `runId`, `personId`, `type`, optional `targetId` and `servicePointId`, optional `quantity`, `basedOnRevision`, and `status` (pending, active, completed, cancelled).

Initial action types: move, browse, join_queue, purchase, receive_service, eat, rest, flee, leave, wait. Expose only valid actions for the current person and available place capabilities. Internal navigation or service substates are an engineering choice.

Validate relevant dependencies when applying a returned decision. An unrelated world update does not by itself invalidate the decision. A reset, newer decision, unavailable target, changed budget, or critical new event may invalidate it.

### Transactions and interactions

A transaction records `id`, `runId`, `actionId` or another idempotency key, `personId`, `placeId`, `productId`, `quantity`, `unitPriceCents`, `totalCents`, and `simulationTimeSeconds`.

An interaction record contains `id`, `runId`, `personId`, `placeId`, optional `servicePointId`, `type`, `startedAtSeconds`, `completedAtSeconds`, and `outcome`. Service completion can satisfy a goal without creating a retail transaction.

### Simulation run

Fields: `runId`, `baselineId`, `setupId`, `seed`, `initialStateSnapshot`, `submittedEvents`, `decisionLog`, `interactionLog`, `evaluationDurationSeconds`, and `results`.

The baseline includes the generated configuration, population, positions, budgets, products, service settings, and starting knowledge. Reset restores it without research/regeneration, clears effects/queues/transactions/metrics, and creates a new run identity. Late replies from old setup or run IDs cannot affect the new world.

Each submitted event produces exactly 30 simulated seconds of recorded state. The scene stays frozen with visible processing progress until the entire segment is ready, then plays automatically and pauses at the end. No Jev calls occur during idle time, playback or seeking. New events extend the latest state; scrubbing does not create alternate histories.

Use at most four concurrent Jev requests, 240 attempts per segment, and a 180-second processing budget. If a limit is reached, finish the virtual segment using existing activities and disclose it. Failed event interpretation leaves the prior state intact. Persist frames for refresh, including positions, actions, goals, stock, budgets, services, metrics and events. Historical inspectors must not display future values.

Fresh event processing may differ even with the same seed. Playback uses recorded state without re-inference. Equal-duration comparisons require the same number of 30-second segments.

## 10 Metrics and comparison

| Metric | Definition |
| --- | --- |
| Place visits | Entries into a place, counted once per entry; re-entry counts as a new visit. |
| Occupancy | People currently inside a place's modeled area. |
| Completed purchases | Committed transactions only. |
| Units sold | Sum of committed quantities. |
| Revenue | Sum of transaction totals; no revenue for mere interest or free services. |
| Service completions | Finished valid service assignments. |
| Queue length | Current authoritative waiting list length. |
| Queue abandonment | Leaving before service begins, with a reason such as patience, closure, or threat. |
| Interrupted services | Active services cancelled before completion, tracked separately from queue abandonment. |
| Mean queue wait | Entry to service start for people who started service; unavailable if there are no samples. |
| Goal completions | Goals whose engine-validated completion condition was satisfied. |

Compare equal simulated durations from the same baseline and show event timings. Expose per-place results and relevant environment totals. Show absolute differences; percentages with a zero baseline should be unavailable. This is an illustrative scenario comparison, not a statistically validated causal estimate.

## 11 Integration boundaries

Fixed requirements: live research during setup; meaningful Baseten use for event interpretation; Jev through Cloudflare Workers AI for individual decisions; authoritative engine validation; server-side credentials; rendering independent of AI latency and asset coverage.

Engineers choose the backend framework, search provider, Baseten model, storage, pathfinding, transport, deployment topology, concurrency, and observability. Agree the renderer with Julian. Durable Objects, Agents SDK, databases, WebSockets, and polling are options, not mandates. Model training and custom GPU deployment are not required.

| Logical operation | Expected result |
| --- | --- |
| Create environment from description | Setup ID, progress, research results, validated configuration, and summary. |
| Read setup or current state | Coherent current snapshot and status. |
| Start run | Frozen baseline and already situated, paused population. |
| Submit event | Interpretation, bounded processing progress, completed 30-second recording or explained failure. |
| Receive updates | Processing progress; completed recording and revision metadata. |
| Play or seek recording | Historical person/place/resource state without inference. |
| Finish run | Frozen comparison metrics. |
| Reset baseline | New run identity with exactly restored starting configuration. |
| Regenerate environment | New setup attempt from revised description; isolate the old setup/run. |
| Compare runs | Equal-duration outcomes with inputs and timings. |

A refresh/reconnect can request a new snapshot. The MVP may remain single-user and session-scoped. Backend state must be observable without a matching scene, so tests and generic renderers can use the same contracts.

## 12 Reliability and performance

- Use bounded research and inference concurrency, timeouts, and retries. Setup must not wait indefinitely for missing data.
- Validate generated references, capabilities, paths, capacities, timing, stock, and budgets. Repair simple layout/configuration errors before ready status.
- Preserve current behavior during a transient decision failure and record the failure; do not label a fallback as a successful Jev decision.
- Bound decision latency with timeouts during processing. Once a segment is ready, playback must animate independently of model requests.
- Prevent stale actions after regeneration, reset, a newer decision, or a conflicting urgent event.
- Make transactions and service completions idempotent, and keep queues and active assignments consistent.
- Freeze source-derived configuration within a run. Do not let web changes alter a comparison midstream.
- Missing assets use generic 3D fallbacks without removing operational capabilities.

Suggested engineering targets: roughly 40 people at 30 FPS on the demo machine; immediate local progress after submission; visible processing progress immediately after submission, followed by playback when the bounded segment is complete; a bounded initial setup budget, such as 60–90 seconds, followed by a labeled partial-research fallback if needed. These are targets to benchmark, not verified promises.

## 13 Demonstration and generality checks

The main presentation leads with a few business situations and ends with one chaotic event. A compact onboarding demonstration establishes the broader capability before focusing on a polished environment.

| Scenario | Example | Expected demonstration |
| --- | --- | --- |
| Environment setup | Describe a real plaza or an amusement park in one sentence. | Live research, assumption summary, generated places, generic 3D layout, and active people. |
| Promotion | The gift shop has 20 percent off souvenirs for five minutes. Announce it across the park. | Relevant people redirect; products, queues, stock, and revenue change. |
| Operational constraint | One gift-shop cashier is unavailable for five minutes. | Queue/service behavior and different individual responses are inspectable. |
| Alternative | Reset and repeat the promotion with an extra service slot. | Same baseline, equal-duration comparison of purchases, revenue, waits, and abandonment. |
| Chaos finale | A dinosaur enters the central plaza. | Prepared asset plus the ordinary event/perception/decision pipeline; people may flee, redirect, or exit. |

The mall/Zara scene may still be the polished business demo. Use whichever configuration is most complete, but do not substitute a hardcoded scene for working description-driven setup.

Verify another domain before submission. An airport terminal with labeled gate zones and a gate-change announcement is a useful generality check: affected passengers who learn the information redirect; unrelated people continue. Do not claim this implements complete boarding or airport operations. At least one non-retail place must perform a generic timed service to prove the backend is not just renamed stores.

Demo fixtures should contain varied goals and constraints. They must not script the model's decisions or guarantee a preferred business outcome. Any prerecorded fallback must be labeled as such.

## 14 Suggested ownership and build order

| Owner | Primary work |
| --- | --- |
| Julian | One-field onboarding, progress/summary UI, generated scene rendering, prepared assets, place/person selection, side panes, comparison view, and demo narrative. |
| Engineer A | Capability-based simulation, layout validation/navigation, services/queues, transactions, metrics, baseline/reset, and coherent state contracts. |
| Engineer B | Research orchestration, provenance, environment synthesis, Baseten event interpretation, Jev context/decisions, scheduling, and model failure handling. |

Ownership is flexible. All three agree shared IDs, coordinates, capabilities, and one fixture before parallel implementation. Coding agents must not redefine the contracts independently.

Build sequence:

1. Agree the common configuration/state contracts and verify live search/retrieval, Baseten, and Cloudflare Jev access.
2. Deliver a thin slice: one description, a small researched configuration with assumptions, a generic 3D scene, ten people, one live decision, and one completed interaction.
3. Complete retail and generic timed service behavior, place/person panels, and resource integrity. Scale to the target population after this works.
4. Add broad event interpretation, generic visuals, awareness, and the prepared business scenarios.
5. Complete baseline reset and sequential comparison; test a second environment type through the same backend.
6. Connect the dinosaur asset to the same pipeline, validate failure states, freeze, and rehearse.

If time is tight, reduce the represented area, research breadth, number of places/products/people, and visual detail. Do not silently cut research, single-description setup, generated environments, person/store inspection, or the two required inference integrations. Keep the scope general by composing fewer supported mechanics well.

## 15 Acceptance criteria

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| AC01 | Minimal onboarding | One short description is sufficient; no ownership, type selection, map, or extra mandatory fields. |
| AC02 | Actual research | A normal setup retrieves external evidence and records source URLs and retrieval times. |
| AC03 | Missing information | Unknown stock, service times, capacities, or layout details receive valid labeled assumptions and do not block setup indefinitely. |
| AC04 | Honest identity and coverage | Ambiguous locations, fictional layouts, and reduced venue coverage are shown without fabricated factual claims. |
| AC05 | Generated scene | A previously unprepared environment description produces a navigable 3D scene using primitives/assets; missing custom models do not prevent simulation. |
| AC06 | Domain generality | At least two environment types work through the same contracts; one non-retail place completes a generic timed service. |
| AC07 | Arbitrary event input | New phrasing and an unprepared event are interpreted using supported mechanics or clearly disclosed approximation. |
| AC08 | Individual decisions | Live Jev decisions use person-specific goals, constraints, and available actions rather than a universal scripted response. |
| AC09 | Awareness | A local event or target change does not redirect a person before it learns the relevant information. |
| AC10 | Person inspector | Clicking a person highlights it and updates actual state in the side pane, including after exit. |
| AC11 | Place inspector | Clicking a store shows changing stock/prices/purchases/revenue; non-retail places show relevant service metrics. |
| AC12 | Purchase integrity | Concurrent attempts for the last unit yield at most one committed purchase; stock and budgets remain nonnegative. |
| AC13 | Reusable capacity | Timed service capacity returns after completion; consumable stock remains depleted after purchase. |
| AC14 | Queue and interruption | Abandonment, closure, service completion, and threat responses preserve queue/assignment consistency without duplicate completions. |
| AC15 | Event lifecycle | Effects expire correctly, recorded history persists, and completed transactions remain intact. |
| AC16 | Baseline reset | Reset restores the same configuration and population without new research; old responses cannot mutate the new run. |
| AC17 | Comparison | Two runs display equal-duration, consistently computed outcomes and intervention timing. |
| AC18 | Finale | The dinosaur visual is connected to normal backend semantics and live person decisions. |
| AC19 | Required integrations | Baseten and Cloudflare-mediated Jev both perform their runtime roles; secrets remain server-side. |
| AC20 | Graceful failure | Retrieval, model, invalid configuration, and asset failures produce truthful fallbacks or clear errors without crashing the workspace. |
| AC21 | Situated opening | People begin at relevant destinations with assumed initial activities, frozen with zero Jev calls and no arrival sequence. |
| AC22 | Bounded event processing | Each event computes 30 simulated seconds behind a progress indicator; the visible scene stays frozen until its recording is ready. |
| AC23 | Playback controls | Completed segments play automatically, pause at the end, and support pause/resume, slower/faster speed, and backward/forward seeking with no inference. |
| AC24 | Historical consistency | Inspectors, budgets, stock and metrics match the selected recorded time; new events extend the latest state, and refresh restores a paused recording. |

Prioritize checks for source/assumption separation, generated-layout reachability, last-unit purchase races, reusable service capacity, stale responses after regeneration/reset, and the complete onboarding-to-event experience. Verify visual performance on the presentation machine.

## 16 Handoff to coding agents

This document supersedes the mall-only scope. Build a configurable venue engine and a generic renderer, with the mall as one configuration. Use the named supported capabilities as an initial contract, not a mandate for a particular framework or class hierarchy.

Preserve separation among research evidence, assumed configuration, individual perception, selected action, authoritative execution, and visual presentation. Do not generate arbitrary executable code to add a new domain mechanic. Do not hardcode real-world forecasts, successful model choices, or universal reactions.

Document startup commands, environment variables, search provider, model access, capability mappings, coordinate conventions, source/assumption handling, known approximations, and reset/regeneration procedures in the project README. Development mocks are acceptable, but the demo must include working research, Baseten, and Jev paths with truthful fallback indicators.

Implementation references:

- [Baseten Hack the North guide](https://github.com/basetenlabs/Hack-the-North-2026)
- [Baseten Model APIs](https://docs.baseten.co/inference/model-apis/overview)
- [Jev through Cloudflare AI](https://developers.cloudflare.com/ai/models/typesafe/jev/)
- [TypeSafe typed decisions](https://docs.typesafe.ai/introduction)

There are no blocking product questions. Begin with the shared configuration fixture and live integration checks.
