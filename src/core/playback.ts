import { newRun, choicesFor, createTicket, tick, uid } from "./engine";
import type {
  DecisionTicket,
  Environment,
  Recording,
  ReplayFrame,
  Run,
  Segment,
} from "./types";

export const SEGMENT_SECONDS = 30;
export const MAX_SEGMENT_CALLS = 240;

/** Start in an established venue without using inference or fabricating sales. */
export function settlePopulation(env: Environment): Environment {
  const settled = structuredClone(env);
  const counts: Record<string, number> = {};
  for (const [i, p] of settled.population.entries()) {
    if (p.presence === "not_arrived") continue;
    const preferredId = p.goals.find((g) => g.targetId)?.targetId;
    const available = settled.places.filter(
      (place) => (counts[place.id] ?? 0) < place.admissionCapacity,
    );
    const place =
      available.find((place) => place.id === preferredId) ??
      available[i % Math.max(1, available.length)];
    p.currentAction = null;
    delete p.pending;
    delete p.lastDecision;
    delete p.decisionError;
    p.nextDecisionAt = 0;
    if (!place) {
      delete p.placeId;
      continue;
    }
    counts[place.id] = (counts[place.id] ?? 0) + 1;
    p.position = { ...place.entry };
    p.placeId = place.id;
    p.recentExperiences = [`Already at ${place.name} when this scenario opens`];
    for (const goal of p.goals)
      if (goal.targetId === place.id && ["visit", "reach"].includes(goal.kind))
        goal.status = "completed";
  }
  const note =
    "The opening population is already distributed through the venue. Initial placement and activities are assumed; scheduled groups arrive during simulation, and no historical sales are fabricated.";
  if (!settled.assumptions.includes(note)) settled.assumptions.push(note);
  return settled;
}
export function newScenario(env: Environment): Run {
  const run = newRun(env, 86400);
  run.status = "paused";
  for (const [i, p] of run.people.entries()) {
    if (p.presence === "not_arrived") continue;
    const place = env.places.find((place) => place.id === p.placeId);
    const type = place?.capabilities.includes("browse")
      ? "browse"
      : place?.capabilities.includes("rest")
        ? "rest"
        : "wait";
    p.currentAction = {
      id: type,
      type,
      label: `${type === "browse" ? "Browsing" : type === "rest" ? "Resting" : "Waiting"}${place ? ` at ${place.name}` : ""}`,
      targetId: place?.id,
      actionId: `initial:${p.id}`,
      decisionId: "initial-placement",
      runId: run.runId,
      basedOnRevision: 0,
      startedAt: 0,
      endsAt: 3 + (i % 6),
      status: "active",
    };
  }
  return run;
}
export function newSegment(
  run: Run,
  text: string,
  duration = SEGMENT_SECONDS,
): Segment {
  return {
    id: uid(),
    runId: run.runId,
    eventId: uid(),
    originalText: text,
    status: "interpreting",
    startTime: run.time,
    endTime: run.time,
    ticksDone: 0,
    duration,
    callsMade: 0,
    callLimit: MAX_SEGMENT_CALLS,
    startedAt: Date.now(),
    message: "Interpreting your event…",
  };
}
export function captureFrame(run: Run): ReplayFrame {
  const people = structuredClone(run.people);
  for (const p of people) {
    delete p.pending;
    if (p.lastDecision) delete p.lastDecision.context;
  }
  return {
    runId: run.runId,
    time: run.time,
    revision: run.revision,
    people,
    products: structuredClone(run.products),
    services: structuredClone(run.services),
    metrics: structuredClone(run.metrics),
    unassignedGoalCompletions: run.unassignedGoalCompletions,
    events: structuredClone(run.events),
    jevAccepted: run.jevAccepted,
    jevFailed: run.jevFailed,
  };
}

/** Advance virtual time only after everyone due at that instant has had a decision opportunity.
 * Persist tickets before dispatch. Recover interrupted calls without exceeding the call budget. */
export function advanceSegment(
  env: Environment,
  run: Run,
  segment: Segment,
  record: (frame: ReplayFrame) => void,
): DecisionTicket[] {
  if (segment.status !== "processing") return [];
  for (let step = 0; step <= segment.duration; step++) {
    for (const p of run.people)
      if (p.pending && Date.now() - p.pending.issuedAt >= 25000) {
        delete p.pending;
        p.decisionVersion++;
        p.nextDecisionAt = run.time + 8;
        p.decisionError =
          "Decision was interrupted or timed out; current activity preserved.";
        run.jevFailed++;
      }
    if (run.people.some((p) => p.pending)) return [];
    if (segment.ticksDone >= segment.duration) {
      finishSegment(run, segment);
      record(captureFrame(run));
      return [];
    }
    const tickets: DecisionTicket[] = [];
    if (Date.now() - segment.startedAt < 180000) {
      for (const p of [...run.people].sort(
        (a, b) => a.nextDecisionAt - b.nextDecisionAt,
      )) {
        if (
          tickets.length >= 4 ||
          segment.callsMade + tickets.length >= segment.callLimit
        )
          break;
        if (p.nextDecisionAt > run.time || choicesFor(env, run, p).length < 2)
          continue;
        const ticket = createTicket(env, run, p);
        if (ticket) tickets.push(ticket);
      }
    } else
      segment.message =
        "Processing time limit reached. Remaining time uses existing activities.";
    if (tickets.length) {
      segment.callsMade += tickets.length;
      return tickets;
    }
    tick(env, run, 1);
    segment.ticksDone++;
    segment.endTime = run.time;
    record(captureFrame(run));
  }
  return [];
}
export function finishSegment(run: Run, segment: Segment) {
  run.status = "paused";
  for (const p of run.people) delete p.pending;
  segment.status = "ready";
  segment.endTime = run.time;
  if (segment.callsMade >= segment.callLimit)
    segment.message =
      "Ready. Decision budget reached; remaining time used existing activities.";
  else if (!segment.message.startsWith("Processing time limit"))
    segment.message =
      "Ready to play. No inference calls are made during playback.";
}
export function mergeRecordings(recordings: Recording[]): ReplayFrame[] {
  const frames = new Map<number, ReplayFrame>();
  for (const recording of [...recordings].sort(
    (a, b) => (a.frames[0]?.time ?? 0) - (b.frames[0]?.time ?? 0),
  ))
    for (const frame of recording.frames) frames.set(frame.time, frame);
  return [...frames.values()].sort((a, b) => a.time - b.time);
}
/** Money, stock, goals and events come from the last completed frame; only positions interpolate. */
export function sampleRecording(
  frames: ReplayFrame[],
  cursor: number,
): ReplayFrame | undefined {
  if (!frames.length) return undefined;
  let low = 0,
    high = frames.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (frames[mid].time <= cursor) low = mid;
    else high = mid - 1;
  }
  const a = frames[low],
    b = frames[low + 1];
  if (!b || cursor <= a.time) return a;
  const blend = Math.min(1, (cursor - a.time) / (b.time - a.time));
  const nextPeople = new Map(b.people.map((p) => [p.id, p]));
  return {
    ...a,
    people: a.people.map((p) => {
      const next = nextPeople.get(p.id);
      return !next || p.presence !== "inside"
        ? p
        : {
            ...p,
            position: {
              x: p.position.x + (next.position.x - p.position.x) * blend,
              z: p.position.z + (next.position.z - p.position.z) * blend,
            },
          };
    }),
  };
}
