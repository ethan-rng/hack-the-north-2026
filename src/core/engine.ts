import type {
  Action,
  Choice,
  DecisionTicket,
  Effect,
  Environment,
  Event,
  Metrics,
  Person,
  Point,
  Result,
  Run,
  Service,
} from "./types";

export const emptyMetrics = (): Metrics => ({
  visits: 0,
  purchases: 0,
  unitsSold: 0,
  revenue: 0,
  serviceCompletions: 0,
  abandonment: 0,
  interrupted: 0,
  waitTotal: 0,
  waitSamples: 0,
  goalsCompleted: 0,
});
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function shortestPlacePath(
  env: Environment,
  fromPlaceId: string,
  toPlaceId: string,
): string[] {
  if (fromPlaceId === toPlaceId) return [];
  const distances = new Map(env.places.map((place) => [place.id, Infinity]));
  const previous = new Map<string, string>();
  const unvisited = new Set(env.places.map((place) => place.id));
  distances.set(fromPlaceId, 0);
  while (unvisited.size) {
    let current: string | undefined;
    let best = Infinity;
    for (const placeId of unvisited) {
      const candidate = distances.get(placeId) ?? Infinity;
      if (candidate < best) {
        current = placeId;
        best = candidate;
      }
    }
    if (!current || current === toPlaceId) break;
    unvisited.delete(current);
    for (const connection of env.connections ?? []) {
      const neighbor =
        connection.fromPlaceId === current
          ? connection.toPlaceId
          : connection.toPlaceId === current
            ? connection.fromPlaceId
            : undefined;
      if (!neighbor || !unvisited.has(neighbor)) continue;
      const candidate = best + connection.weight;
      if (candidate < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, candidate);
        previous.set(neighbor, current);
      }
    }
  }
  if (!previous.has(toPlaceId)) return [toPlaceId];
  const path = [toPlaceId];
  while (path[0] !== fromPlaceId) {
    const prior = previous.get(path[0]);
    if (!prior) return [toPlaceId];
    path.unshift(prior);
  }
  return path.slice(1);
}
export const clamp = (n: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, n));
export const uid = () => crypto.randomUUID();
export function newRun(env: Environment, duration = 180): Run {
  return {
    runId: uid(),
    baselineId: env.baselineId,
    status: "running",
    time: 0,
    revision: 0,
    duration,
    people: structuredClone(env.population),
    products: structuredClone(env.products),
    services: Object.fromEntries(
      env.services.map((s) => [s.id, { queue: [], active: [] }]),
    ),
    metrics: Object.fromEntries(env.places.map((p) => [p.id, emptyMetrics()])),
    unassignedGoalCompletions: 0,
    events: [],
    transactions: [],
    interactions: [],
    decisions: [],
    jevAccepted: 0,
    jevFailed: 0,
    lastTickAt: Date.now(),
  };
}
export function effects(
  run: Run,
  kind: Effect["kind"],
  targetId?: string,
): Effect[] {
  return run.events
    .filter((e) => e.status === "active")
    .flatMap((e) => e.effects)
    .filter((e) => e.kind === kind && (!targetId || e.targetId === targetId));
}
export function placeOpen(run: Run, placeId: string) {
  return !effects(run, "availability", placeId).some((e) => e.value <= 0);
}
export function effectivePrice(run: Run, productId: string) {
  const product = run.products.find((p) => p.id === productId);
  if (!product) return 0;
  const discounts = effects(run, "discount")
    .filter((e) => e.targetId === product.id || e.targetId === product.placeId)
    .map((e) => e.value);
  return Math.round(
    product.basePriceCents *
      (1 - clamp(Math.max(0, ...discounts), 0, 100) / 100),
  );
}
export function serviceSettings(run: Run, service: Service) {
  const capacity = effects(run, "service_capacity")
    .filter((e) => e.targetId === service.id || e.targetId === service.placeId)
    .at(-1);
  const duration = effects(run, "service_duration")
    .filter((e) => e.targetId === service.id || e.targetId === service.placeId)
    .at(-1);
  return {
    slots: capacity ? capacity.value : service.slotCount,
    duration: duration ? duration.value : service.durationSeconds,
  };
}
export function occupancy(run: Run, id: string) {
  return run.people.filter((p) => p.presence === "inside" && p.placeId === id)
    .length;
}
function remember(p: Person, message: string) {
  p.recentExperiences = [...p.recentExperiences.slice(-11), message];
}
function reconsider(p: Person, run: Run) {
  p.decisionVersion++;
  delete p.pending;
  p.nextDecisionAt = run.time;
}
function completeGoal(
  p: Person,
  run: Run,
  kind: string,
  placeId?: string,
  category?: string,
) {
  for (const goal of p.goals) {
    if (goal.status === "completed" || goal.kind !== kind) continue;
    if (goal.targetId && goal.targetId !== placeId) continue;
    if (goal.targetCategory && goal.targetCategory !== category) continue;
    goal.status = "completed";
    const metrics = run.metrics[placeId ?? p.placeId ?? ""];
    if (metrics) metrics.goalsCompleted++;
    else
      run.unassignedGoalCompletions = (run.unassignedGoalCompletions ?? 0) + 1;
    remember(p, `Goal completed: ${goal.description}`);
  }
}
function freeMembership(
  env: Environment,
  run: Run,
  p: Person,
  reason: string,
): boolean {
  // A non-interruptible assignment owns the person until completion.
  if (
    env.services.some(
      (s) =>
        !s.interruptible &&
        run.services[s.id].active.some((a) => a.personId === p.id),
    )
  )
    return false;
  for (const service of env.services) {
    const state = run.services[service.id];
    if (state.queue.some((q) => q.personId === p.id)) {
      state.queue = state.queue.filter((q) => q.personId !== p.id);
      run.metrics[service.placeId].abandonment++;
      remember(p, `Left ${service.label} queue: ${reason}`);
    }
    if (state.active.some((a) => a.personId === p.id)) {
      state.active = state.active.filter((a) => a.personId !== p.id);
      run.metrics[service.placeId].interrupted++;
      remember(p, `Interrupted ${service.label}: ${reason}`);
    }
  }
  return true;
}
function endAction(p: Person, run: Run) {
  if (p.currentAction) p.currentAction.status = "completed";
  p.currentAction = null;
  reconsider(p, run);
}
export function choicesFor(env: Environment, run: Run, p: Person): Choice[] {
  if (p.presence === "exited")
    return [
      { id: "wait", type: "wait", label: "Stay outside for now" },
      {
        id: "reenter",
        type: "reenter",
        label: "Re-enter through the entrance and walk into the venue",
      },
    ];
  if (
    env.services.some(
      (s) =>
        !s.interruptible &&
        run.services[s.id].active.some((a) => a.personId === p.id),
    )
  )
    return [];
  const choices: Choice[] = [
    { id: "wait", type: "wait", label: "Wait here briefly and observe" },
    {
      id: "leave",
      type: "leave",
      label: "Walk to the exit and leave the environment",
    },
  ];
  const threatened = run.events.some(
    (e) =>
      e.status === "active" &&
      p.knownEventIds.includes(e.id) &&
      e.effects.some((f) => f.kind === "threat"),
  );
  if (threatened)
    choices.push({
      id: "flee",
      type: "flee",
      label: "Move quickly to the exit to escape a perceived threat",
    });
  if (p.foodHeld > 0)
    choices.push({
      id: "eat",
      type: "eat",
      label: "Eat purchased food to satisfy hunger",
    });
  for (const place of env.places) {
    if (!placeOpen(run, place.id)) continue;
    if (p.placeId !== place.id) {
      if (occupancy(run, place.id) < place.admissionCapacity)
        choices.push({
          id: `move:${place.id}`,
          type: "move",
          targetId: place.id,
          label: `Walk to ${place.name}: ${place.description}`,
        });
      continue;
    }
    if (place.capabilities.includes("browse"))
      choices.push({
        id: "browse",
        type: "browse",
        targetId: place.id,
        label: "Browse offerings for six seconds",
      });
    if (place.capabilities.includes("rest"))
      choices.push({
        id: "rest",
        type: "rest",
        targetId: place.id,
        label: "Rest for ten seconds to reduce fatigue",
      });
    const alreadyServing = env.services.some((s) =>
      run.services[s.id].active.some((a) => a.personId === p.id),
    );
    const alreadyQueued = env.services.some((s) =>
      run.services[s.id].queue.some((q) => q.personId === p.id),
    );
    if (alreadyServing || alreadyQueued) {
      choices.push({
        id: "continue",
        type: "wait",
        label: "Keep the current queue position or service assignment",
      });
      continue;
    }
    for (const service of env.services.filter(
      (s) => s.placeId === place.id && serviceSettings(run, s).slots > 0,
    )) {
      if (
        service.kind === "timed" &&
        place.capabilities.includes("receive_service")
      )
        choices.push({
          id: `service:${service.id}`,
          type: "join_queue",
          targetId: place.id,
          serviceId: service.id,
          label: `Join ${service.label}, ${run.services[service.id].queue.length} waiting, ${serviceSettings(run, service).duration}s service`,
        });
      if (
        service.kind === "checkout" &&
        place.capabilities.includes("purchase")
      ) {
        for (const product of run.products.filter(
          (x) => x.placeId === place.id && x.stockUnits > 0,
        )) {
          if (
            p.budgetRemainingCents !== null &&
            p.budgetRemainingCents >= effectivePrice(run, product.id)
          )
            choices.push({
              id: `buy:${product.id}`,
              type: "purchase",
              targetId: place.id,
              serviceId: service.id,
              productId: product.id,
              label: `Queue to buy ${product.name} (${product.category}) for ${(effectivePrice(run, product.id) / 100).toFixed(2)}, ${product.stockUnits} in stock`,
            });
        }
      }
    }
  }
  return choices.slice(0, 32);
}
export function createTicket(
  env: Environment,
  run: Run,
  p: Person,
): DecisionTicket | null {
  if (run.status !== "running") return null;
  if (p.pending && Date.now() - p.pending.issuedAt < 25_000) return null;
  if (p.nextDecisionAt > run.time) return null;
  const choices = choicesFor(env, run, p);
  if (choices.length < 2) return null;
  const perceived = run.events
    .filter((e) => p.knownEventIds.includes(e.id))
    .map((e) => ({
      title: e.title,
      description: e.description,
      active: e.status === "active",
      effects: e.effects,
    }));
  const ticket: DecisionTicket = {
    id: uid(),
    runId: run.runId,
    personId: p.id,
    version: ++p.decisionVersion,
    basedOnRevision: run.revision,
    at: run.time,
    issuedAt: Date.now(),
    choices,
    context: {
      time: run.time,
      person: {
        name: p.displayName,
        presence: p.presence,
        goals: p.goals,
        interests: p.interests,
        budgetCents: p.budgetRemainingCents,
        priceSensitivity: p.priceSensitivity,
        crowdTolerance: p.crowdTolerance,
        patienceSeconds: p.maxQueueWaitSeconds,
        departureTime: p.departureTimeSeconds,
        hunger: p.hunger,
        fatigue: p.fatigue,
        stress: p.stress,
        mood: p.mood,
        currentAction: p.currentAction?.label,
        currentPlace: p.placeId,
        foodHeld: p.foodHeld,
        recentExperiences: p.recentExperiences,
        knownFacts: p.knownFacts,
      },
      perceivedEvents: perceived,
      places: env.places.map((place) => ({
        id: place.id,
        name: place.name,
        tags: place.tags,
        capabilities: place.capabilities,
        ...(p.placeId === place.id
          ? {
              occupancy: occupancy(run, place.id),
              queues: env.services
                .filter((s) => s.placeId === place.id)
                .map((s) => ({
                  id: s.id,
                  waiting: run.services[s.id].queue.length,
                })),
            }
          : {}),
      })),
    },
  };
  p.pending = ticket;
  return ticket;
}
function logDecision(
  run: Run,
  ticket: DecisionTicket,
  outcome: "accepted" | "failed" | "stale",
  choice?: string,
) {
  run.decisions.push({
    id: ticket.id,
    personId: ticket.personId,
    at: run.time,
    outcome,
    choice,
    inputRevision: ticket.basedOnRevision,
  });
  if (run.decisions.length > 2000) run.decisions.shift();
}
export function applyDecision(
  env: Environment,
  run: Run,
  ticket: DecisionTicket,
  choiceId?: string,
) {
  const p = run.people.find((p) => p.id === ticket.personId);
  if (
    run.status !== "running" ||
    ticket.runId !== run.runId ||
    !p ||
    p.decisionVersion !== ticket.version ||
    p.pending?.id !== ticket.id
  )
    return false;
  delete p.pending;
  const chosen = ticket.choices.find((c) => c.id === choiceId);
  if (!chosen) {
    p.decisionError =
      "Jev did not return a valid choice; current activity preserved. Retrying.";
    p.nextDecisionAt = run.time + 8;
    run.jevFailed++;
    logDecision(run, ticket, "failed");
    return false;
  }
  if (!choicesFor(env, run, p).some((c) => c.id === chosen.id)) {
    logDecision(run, ticket, "stale", chosen.id);
    p.nextDecisionAt = run.time + 1;
    return false;
  }
  if (
    chosen.id !== "continue" &&
    !freeMembership(
      env,
      run,
      p,
      chosen.type === "flee" ? "perceived threat" : "new decision",
    )
  )
    return false;
  p.lastDecision = {
    provider: "Jev",
    choice: chosen.label,
    at: run.time,
    inputRevision: ticket.basedOnRevision,
    runId: run.runId,
    context: ticket.context,
  };
  delete p.decisionError;
  p.nextDecisionAt = run.time + 12;
  run.jevAccepted++;
  logDecision(run, ticket, "accepted", chosen.id);
  if (chosen.id === "continue") return true;
  const action: Action = {
    ...chosen,
    actionId: uid(),
    decisionId: ticket.id,
    runId: run.runId,
    basedOnRevision: ticket.basedOnRevision,
    startedAt: run.time,
    status: "active",
  };
  p.currentAction = action;
  if (["move", "leave", "flee", "reenter"].includes(chosen.type)) {
    const fromPlaceId = p.placeId;
    if (chosen.type === "reenter") {
      p.presence = "inside";
      p.position = { ...env.exit };
      remember(p, "Re-entered the environment");
    }
    const target =
      chosen.type === "move"
        ? env.places.find((x) => x.id === chosen.targetId)!.entry
        : chosen.type === "reenter"
          ? { x: 0, z: 0 }
          : env.exit;
    action.path =
      chosen.type === "move" && fromPlaceId
        ? shortestPlacePath(env, fromPlaceId, chosen.targetId!).map(
            (placeId) => ({
              ...env.places.find((place) => place.id === placeId)!.entry,
            }),
          )
        : [{ ...target }];

    delete p.placeId;
    p.nextDecisionAt = 1e9;
    if (chosen.type === "flee") p.mood = "frightened";
  } else if (chosen.serviceId) {
    run.services[chosen.serviceId].queue.push({
      personId: p.id,
      actionId: action.actionId,
      productId: chosen.productId,
      joinedAt: run.time,
    });
    p.nextDecisionAt = run.time + Math.min(p.maxQueueWaitSeconds, 15);
  } else {
    action.endsAt =
      run.time +
      ({ browse: 6, eat: 8, rest: 10, wait: 5 }[chosen.type as "browse"] ?? 5);
    p.nextDecisionAt = 1e9;
  }
  run.revision++;
  return true;
}
export function activateEvent(env: Environment, run: Run, event: Event) {
  if (event.status !== "interpreting") return;
  const proposedCount = event.effects.length;
  event.effects = event.effects.filter((effect) => {
    if (
      !["announcement", "threat", "attraction"].includes(effect.kind) &&
      !effect.targetId
    )
      return false;
    const place = env.places.find((p) => p.id === effect.targetId);
    const product = run.products.find((p) => p.id === effect.targetId);
    const service = env.services.find((s) => s.id === effect.targetId);
    if (effect.kind === "goal_update")
      return (
        !!place &&
        !!effect.subjectKey &&
        run.people.some((p) =>
          p.goals.some((g) => g.subjectKey === effect.subjectKey),
        )
      );
    if (effect.kind === "discount")
      return (
        (!!product ||
          (!!place && run.products.some((p) => p.placeId === place.id))) &&
        effect.value >= 0 &&
        effect.value <= 100
      );
    if (effect.kind === "stock")
      return (
        !!product &&
        Number.isInteger(effect.value) &&
        effect.value >= -10000 &&
        effect.value <= 10000
      );
    if (effect.kind === "availability")
      return !!place && [0, 1].includes(effect.value);
    if (effect.kind === "service_capacity")
      return (
        (!!service ||
          (!!place && env.services.some((s) => s.placeId === place.id))) &&
        Number.isInteger(effect.value) &&
        effect.value >= 0 &&
        effect.value <= 20
      );
    if (effect.kind === "service_duration")
      return (
        (!!service ||
          (!!place && env.services.some((s) => s.placeId === place.id))) &&
        effect.value >= 1 &&
        effect.value <= 600
      );
    return !effect.targetId || !!place;
  });
  if (event.effects.length < proposedCount)
    event.approximationNotes.push(
      `${proposedCount - event.effects.length} proposed effects were rejected because their targets or parameters were invalid.`,
    );
  if (!event.effects.length) {
    event.status = "unsupported";
    event.approximationNotes.push(
      "No executable effects resolved to valid targets.",
    );
    return;
  }
  event.status = "active";
  event.startTimeSeconds = run.time;
  for (const effect of event.effects) {
    if (effect.kind === "stock") {
      const product = run.products.find((p) => p.id === effect.targetId)!;
      product.stockUnits = Math.max(0, product.stockUnits + effect.value);
    }
  }
  perceiveEvents(env, run);
  run.revision++;
}
function perceiveEvents(env: Environment, run: Run) {
  for (const event of run.events.filter((e) => e.status === "active")) {
    for (const p of run.people) {
      if (p.knownEventIds.includes(event.id)) continue;
      // Global events also reach people outside, who can decide to return.
      // Legacy stored awareness/radius fields are intentionally ignored.
      p.knownEventIds.push(event.id);
      remember(p, `Learned: ${event.title}`);
      let relevant = false;
      for (const effect of event.effects) {
        if (effect.kind === "goal_update") {
          for (const goal of p.goals.filter(
            (g) => g.subjectKey === effect.subjectKey && g.status === "pending",
          )) {
            goal.targetId = effect.targetId!;
            if (effect.value > 0)
              goal.deadlineSeconds = event.startTimeSeconds + effect.value;
            p.knownFacts.push({
              subjectKey: effect.subjectKey!,
              targetId: effect.targetId!,
              learnedAt: run.time,
            });
            relevant = true;
          }
        } else relevant = true;
        if (effect.kind === "threat") {
          p.stress = clamp(p.stress + 0.4 * (1 - p.crowdTolerance / 2));
          p.mood = "frightened";
        }
      }
      if (
        relevant &&
        !env.services.some(
          (s) =>
            !s.interruptible &&
            run.services[s.id].active.some((a) => a.personId === p.id),
        )
      )
        reconsider(p, run);
    }
  }
}
function recordInteraction(
  run: Run,
  p: Person,
  actionId: string,
  placeId: string,
  type: string,
  outcome: string,
) {
  const id = `interaction:${actionId}`;
  if (p.interactionIds.includes(id)) return;
  p.interactionIds.push(id);
  run.interactions.push({
    id,
    personId: p.id,
    placeId,
    type,
    at: run.time,
    outcome,
  });
  remember(p, outcome);
}
function processServices(env: Environment, run: Run) {
  for (const service of env.services) {
    const state = run.services[service.id],
      metrics = run.metrics[service.placeId];
    for (const assignment of [...state.active]) {
      const p = run.people.find((p) => p.id === assignment.personId)!;
      const open = placeOpen(run, service.placeId);
      if (!open && service.interruptible) {
        freeMembership(env, run, p, "place closed");
        endAction(p, run);
        continue;
      }
      if (assignment.endsAt > run.time) continue;
      state.active = state.active.filter(
        (a) => a.actionId !== assignment.actionId,
      );
      const interactionId = `interaction:${assignment.actionId}`;
      if (p.interactionIds.includes(interactionId)) {
        endAction(p, run);
        continue;
      }
      if (service.kind === "checkout") {
        const product = run.products.find((x) => x.id === assignment.productId);
        const price = product ? effectivePrice(run, product.id) : 0;
        if (
          !open ||
          !product ||
          product.stockUnits < 1 ||
          p.budgetRemainingCents === null ||
          p.budgetRemainingCents < price
        ) {
          recordInteraction(
            run,
            p,
            assignment.actionId,
            service.placeId,
            "purchase",
            "Purchase unavailable: stock, price, budget or place status changed",
          );
          p.mood = "frustrated";
        } else if (
          !run.transactions.some((t) => t.id === assignment.actionId)
        ) {
          product.stockUnits--;
          p.budgetRemainingCents -= price;
          run.transactions.push({
            id: assignment.actionId,
            runId: run.runId,
            actionId: assignment.actionId,
            personId: p.id,
            placeId: service.placeId,
            productId: product.id,
            quantity: 1,
            totalCents: price,
            at: run.time,
          });
          p.purchaseIds.push(assignment.actionId);
          metrics.purchases++;
          metrics.unitsSold++;
          metrics.revenue += price;
          metrics.serviceCompletions++;
          if (product.category === "food") p.foodHeld++;
          recordInteraction(
            run,
            p,
            assignment.actionId,
            service.placeId,
            "purchase",
            `Bought ${product.name} for ${(price / 100).toFixed(2)}`,
          );
          completeGoal(p, run, "buy", service.placeId, product.category);
          p.mood = "pleased";
        }
      } else {
        metrics.serviceCompletions++;
        recordInteraction(
          run,
          p,
          assignment.actionId,
          service.placeId,
          "receive_service",
          `Completed ${service.label}`,
        );
        completeGoal(p, run, "receive_service", service.placeId);
        p.mood = "pleased";
      }
      endAction(p, run);
    }
    for (const queued of [...state.queue]) {
      const p = run.people.find((p) => p.id === queued.personId)!;
      if (
        !placeOpen(run, service.placeId) ||
        run.time - queued.joinedAt >= p.maxQueueWaitSeconds
      ) {
        freeMembership(
          env,
          run,
          p,
          !placeOpen(run, service.placeId)
            ? "place closed"
            : "patience exceeded",
        );
        endAction(p, run);
        p.mood = "frustrated";
      }
    }
    const settings = serviceSettings(run, service);
    while (
      placeOpen(run, service.placeId) &&
      state.active.length < settings.slots &&
      state.queue.length
    ) {
      const queued = state.queue.shift()!;
      const p = run.people.find((p) => p.id === queued.personId)!;
      state.active.push({
        ...queued,
        startedAt: run.time,
        endsAt: run.time + settings.duration,
      });
      metrics.waitSamples++;
      metrics.waitTotal += run.time - queued.joinedAt;
      if (p.currentAction) {
        p.currentAction.type =
          service.kind === "checkout" ? "purchase" : "receive_service";
        p.currentAction.label = `Receiving ${service.label}`;
      }
      p.nextDecisionAt = 1e9;
      p.decisionVersion++;
      delete p.pending;
    }
  }
}
export function tick(env: Environment, run: Run, seconds = 1) {
  if (run.status !== "running") return;
  const dt = Math.min(seconds, run.duration - run.time);
  run.time = Math.min(run.duration, run.time + dt);
  run.revision++;
  for (const event of run.events)
    if (
      event.status === "active" &&
      event.startTimeSeconds + event.durationSeconds <= run.time
    )
      event.status = "completed";
  perceiveEvents(env, run);
  for (const p of run.people) {
    if (p.presence === "exited") {
      if (
        p.currentAction?.endsAt !== undefined &&
        p.currentAction.endsAt <= run.time
      )
        endAction(p, run);
      continue;
    }
    p.hunger = clamp(p.hunger + dt * 0.0008);
    p.fatigue = clamp(p.fatigue + dt * 0.0006);
    p.stress = clamp(p.stress - dt * 0.002);
    for (const goal of p.goals)
      if (
        goal.kind === "wait_until" &&
        goal.status === "pending" &&
        goal.deadlineSeconds !== undefined &&
        run.time >= goal.deadlineSeconds &&
        (!goal.targetId || goal.targetId === p.placeId)
      )
        completeGoal(p, run, "wait_until", goal.targetId);
    if (
      p.placeId &&
      !placeOpen(run, p.placeId) &&
      !env.services.some((s) =>
        run.services[s.id].active.some((a) => a.personId === p.id),
      )
    ) {
      delete p.placeId;
      endAction(p, run);
    }
    const a = p.currentAction;
    if (!a) continue;
    if (a.path) {
      let remaining = dt * (a.type === "flee" ? 4 : 2);
      while (a.path.length && remaining > 0) {
        const next = a.path[0],
          dist = distance(p.position, next);
        if (dist <= remaining) {
          p.position = { ...next };
          a.path.shift();
          remaining -= dist;
        } else {
          p.position.x += ((next.x - p.position.x) * remaining) / dist;
          p.position.z += ((next.z - p.position.z) * remaining) / dist;
          remaining = 0;
        }
      }
      if (!a.path.length) {
        if (a.type === "leave" || a.type === "flee") {
          p.presence = "exited";
          completeGoal(p, run, "exit");
          remember(p, "Exited the environment");
        } else if (a.type === "reenter") {
          remember(p, "Returned to the venue");
        } else {
          const place = env.places.find((x) => x.id === a.targetId)!;
          if (
            placeOpen(run, place.id) &&
            occupancy(run, place.id) < place.admissionCapacity
          ) {
            p.placeId = place.id;
            run.metrics[place.id].visits++;
            completeGoal(p, run, "visit", place.id);
            completeGoal(p, run, "reach", place.id);
            remember(p, `Entered ${place.name}`);
          } else remember(p, `Could not enter ${place.name}: closed or full`);
        }
        endAction(p, run);
        if (p.presence === "exited") p.nextDecisionAt = run.time + 5;
      }
    } else if (a.endsAt !== undefined && a.endsAt <= run.time) {
      if (a.type === "eat" && p.foodHeld > 0) {
        p.foodHeld--;
        p.hunger = clamp(p.hunger - 0.65);
        completeGoal(p, run, "eat");
      }
      if (a.type === "rest") p.fatigue = clamp(p.fatigue - 0.4);
      remember(p, `Finished ${a.type}`);
      endAction(p, run);
    }
  }
  processServices(env, run);
  if (run.time >= run.duration) {
    run.status = "finished";
    for (const p of run.people) delete p.pending;
    for (const e of run.events)
      if (e.status === "interpreting") {
        e.status = "failed";
        e.approximationNotes = [
          "The run ended before interpretation completed. No effects applied.",
        ];
      }
  }
}
export function resultFor(run: Run, label: string): Result {
  const totals = emptyMetrics();
  totals.goalsCompleted = run.unassignedGoalCompletions ?? 0;
  for (const metrics of Object.values(run.metrics))
    for (const key of Object.keys(totals) as (keyof Metrics)[])
      totals[key] += metrics[key];
  return {
    runId: run.runId,
    baselineId: run.baselineId,
    label,
    duration: run.time,
    metrics: structuredClone(run.metrics),
    totals,
    events: run.events
      .filter((e) => e.status === "active" || e.status === "completed")
      .map((e) => ({ title: e.title, at: e.startTimeSeconds })),
  };
}
export function comparable(a: Result, b: Result) {
  return a.baselineId === b.baselineId && a.duration === b.duration;
}
export function difference(a: number, b: number) {
  return { absolute: b - a, percent: a === 0 ? null : ((b - a) / a) * 100 };
}
