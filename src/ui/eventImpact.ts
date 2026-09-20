import type {
  EffectKind,
  Environment,
  Metrics,
  Person,
  Recording,
  ReplayFrame,
  Segment,
} from "@/core/types";

export type ImpactMetric = {
  label: string;
  before: string;
  after: string;
  delta: string;
  direction: "up" | "down" | "flat";
};

export type ImpactStory = {
  name: string;
  detail: string;
};

export type EventImpact = {
  segmentId: string;
  headline: string;
  summary: string;
  metrics: ImpactMetric[];
  consequences: string[];
  stories: ImpactStory[];
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const total = (frame: ReplayFrame, key: keyof Metrics) =>
  Object.values(frame.metrics).reduce((sum, metrics) => sum + metrics[key], 0);
const queued = (frame: ReplayFrame) =>
  Object.values(frame.services).reduce(
    (sum, service) => sum + service.queue.length,
    0,
  );
const inside = (frame: ReplayFrame) =>
  frame.people.filter((person) => person.presence === "inside").length;
const people = (count: number) => `${count} ${count === 1 ? "person" : "people"}`;
const change = (before: number, after: number, format = (n: number) => `${n}`) => {
  const value = after - before;
  return {
    before: format(before),
    after: format(after),
    delta: value === 0 ? "No change" : `${value > 0 ? "+" : "−"}${format(Math.abs(value))}`,
    direction: value === 0 ? "flat" : value > 0 ? "up" : "down",
  } as const;
};

function actionDetail(person: Person) {
  switch (person.currentAction?.type) {
    case "flee":
      return "ran from the disruption";
    case "eat":
      return "stopped to eat";
    case "purchase":
      return "made a purchase";
    case "join_queue":
      return "joined a queue";
    case "receive_service":
      return "received service";
    case "rest":
      return "took a break";
    case "socialize":
      return "joined a group";
    default:
      return person.currentAction?.label.toLowerCase() ?? "changed course";
  }
}

function headline(kind: EffectKind | undefined, target: string | undefined) {
  switch (kind) {
    case "threat":
      return "Safety alert sends the crowd into motion";
    case "discount":
      return target ? `Promotion pulls visitors toward ${target}` : "Promotion reshapes customer flow";
    case "availability":
      return target ? `${target} closure redirects visitors` : "Closure redirects visitors across the venue";
    case "service_capacity":
    case "service_duration":
      return "Service change reshapes queue pressure";
    case "attraction":
      return "New attraction draws the crowd";
    default:
      return "A new event changes crowd behavior";
  }
}

export function buildEventImpact(
  environment: Environment,
  segment: Segment,
  recording: Recording,
): EventImpact | null {
  const before = recording.frames[0];
  const after = recording.frames.at(-1);
  if (!before || !after) return null;
  const event = after.events.find((candidate) => candidate.id === segment.eventId);
  const byId = new Map(before.people.map((person) => [person.id, person]));
  const places = new Map(environment.places.map((place) => [place.id, place.name]));
  const moved = after.people.filter((person) => {
    const prior = byId.get(person.id);
    return (
      prior?.presence === "inside" &&
      person.presence === "inside" &&
      prior.placeId !== person.placeId
    );
  });
  const destinations = new Map<string, number>();
  for (const person of moved) {
    if (!person.placeId) continue;
    destinations.set(person.placeId, (destinations.get(person.placeId) ?? 0) + 1);
  }
  const [topDestinationId, topDestinationCount = 0] = [...destinations.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] ?? [];
  const exited = after.people.filter(
    (person) =>
      byId.get(person.id)?.presence === "inside" && person.presence === "exited",
  );
  const reentered = after.people.filter(
    (person) =>
      byId.get(person.id)?.presence === "exited" && person.presence === "inside",
  );
  const fleeing = after.people.filter(
    (person) => person.currentAction?.type === "flee",
  );
  const newlyStressed = after.people.filter((person) => {
    const prior = byId.get(person.id);
    return person.stress >= 0.75 && (prior?.stress ?? 0) < 0.75;
  });
  const decisionDelta = after.jevAccepted - before.jevAccepted;
  const queueBefore = queued(before);
  const queueAfter = queued(after);
  const purchaseBefore = total(before, "purchases");
  const purchaseAfter = total(after, "purchases");
  const revenueBefore = total(before, "revenue");
  const revenueAfter = total(after, "revenue");
  const consequences: string[] = [];
  if (fleeing.length) consequences.push(`${people(fleeing.length)} ${fleeing.length === 1 ? "is" : "are"} running away`);
  if (exited.length) consequences.push(`${people(exited.length)} left the venue`);
  if (reentered.length) consequences.push(`${people(reentered.length)} came back inside`);
  if (topDestinationId && topDestinationCount)
    consequences.push(
      `${people(topDestinationCount)} rerouted to ${places.get(topDestinationId) ?? "a new destination"}`,
    );
  if (newlyStressed.length)
    consequences.push(`${people(newlyStressed.length)} reached high stress`);
  if (queueAfter !== queueBefore)
    consequences.push(
      `Queue pressure ${queueAfter > queueBefore ? "rose" : "fell"} by ${Math.abs(queueAfter - queueBefore)}`,
    );
  if (purchaseAfter !== purchaseBefore)
    consequences.push(`${Math.abs(purchaseAfter - purchaseBefore)} purchases were completed`);
  if (!consequences.length)
    consequences.push(
      `${Math.max(0, decisionDelta)} individual Jev decisions shaped the response`,
    );

  const stories = after.people
    .map((person) => {
      const prior = byId.get(person.id);
      if (!prior) return null;
      let score = 0;
      let detail = "";
      if (prior.presence === "inside" && person.presence === "exited") {
        score = 5;
        detail = "left the venue";
      } else if (person.currentAction?.type === "flee") {
        score = 4;
        detail = actionDetail(person);
      } else if (
        prior.presence === "inside" &&
        person.presence === "inside" &&
        prior.placeId !== person.placeId
      ) {
        score = 3;
        const destination = person.placeId ? places.get(person.placeId) : undefined;
        detail = destination ? `headed to ${destination}` : "changed destinations";
      } else if (prior.mood !== person.mood || prior.stress !== person.stress) {
        score = 2;
        detail = person.mood ? `became ${person.mood}` : actionDetail(person);
      } else if (prior.currentAction?.type !== person.currentAction?.type) {
        score = 1;
        detail = actionDetail(person);
      }
      return score ? { name: person.displayName, detail, score } : null;
    })
    .filter((story): story is ImpactStory & { score: number } => !!story)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 2)
    .map(({ name, detail }) => ({ name, detail }));

  const targetId = event?.effects.find((effect) => effect.targetId)?.targetId;
  const target = targetId ? places.get(targetId) : undefined;
  const keyEffect = event?.effects[0]?.kind;
  const firstResponse = consequences.slice(0, 2).join(". ");
  return {
    segmentId: segment.id,
    headline: headline(keyEffect, target),
    summary: `${event?.title ?? segment.originalText} reached everyone. ${firstResponse}.`,
    metrics: [
      {
        label: "People inside",
        ...change(inside(before), inside(after)),
      },
      { label: "People queued", ...change(queueBefore, queueAfter) },
      { label: "Purchases", ...change(purchaseBefore, purchaseAfter) },
      {
        label: "Revenue",
        ...change(revenueBefore, revenueAfter, money),
      },
    ],
    consequences,
    stories,
  };
}
