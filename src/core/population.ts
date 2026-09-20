import type { Environment, Goal, Person, Place } from "./types";

type Profile = {
  role: string;
  purpose: string;
  groupSize: number;
  budget: number;
  patience: number;
  hunger: number;
  sensitivity: number;
  stay: number;
  target?: Place;
};
/** Cohorts share an itinerary and correlated traits, but retain individual choices. */
export function contextualPopulation(
  env: Environment,
  people: Person[],
  rng: () => number,
): Person[] {
  const food = env.places.filter((p) =>
    env.products.some(
      (product) => product.placeId === p.id && product.category === "food",
    ),
  );
  const shops = env.places.filter((p) => p.capabilities.includes("purchase"));
  const services = env.places.filter((p) =>
    p.capabilities.includes("receive_service"),
  );
  const gates = env.places.filter((p) =>
    /\bgate\b/i.test(`${p.name} ${p.typeLabel} ${p.tags.join(" ")}`),
  );
  const pick = (list: Place[], index: number) =>
    list.length ? list[index % list.length] : undefined;
  const kind = env.layout?.venueKind;
  let group = -1,
    remaining = 0,
    profile: Profile,
    arrival = 0,
    destination: Place | undefined;
  return people.map((person) => {
    if (!remaining) {
      group++;
      const mode = group % 3;
      const family = mode === 0;
      profile = {
        role: family
          ? "Family visitor"
          : mode === 1
            ? "Lunch-break worker"
            : "Leisure visitor",
        purpose: family
          ? "Spend time together and visit attractions"
          : mode === 1
            ? "Get a meal before returning to work"
            : "Explore and browse",
        groupSize: family ? 2 + Math.floor(rng() * 3) : mode === 1 ? 1 : 2,
        budget: family ? 5000 : mode === 1 ? 1800 : 3500,
        patience: family ? 35 : mode === 1 ? 12 : 28,
        hunger: mode === 1 ? 0.8 : 0.3,
        sensitivity: mode === 1 ? 0.75 : 0.45,
        stay: mode === 1 ? 120 : 480,
        target: pick(mode === 1 ? food : family ? services : shops, group),
      };
      if (kind === "airport") {
        profile.role = family
          ? "Family passenger"
          : mode === 1
            ? "Business passenger"
            : "Leisure passenger";
        profile.purpose = "Reach the assigned gate before departure";
        profile.target = pick(gates, group) ?? pick(services, group);
        profile.patience = mode === 1 ? 15 : 30;
        profile.budget = mode === 1 ? 6500 : 3500;
        profile.stay = 150 + Math.max(0, gates.indexOf(profile.target!)) * 45;
      } else if (kind === "mall" && mode !== 1) {
        profile.role = family ? "Family shopper" : "Browsing shopper";
        profile.purpose = family
          ? "Shop together and get food"
          : "Compare shops and browse";
        profile.target = pick(shops, group);
      } else if (kind === "neighborhood" && mode !== 1) {
        profile.role = family ? "Local household" : "Neighborhood visitor";
        profile.purpose = family
          ? "Run local errands together"
          : "Explore neighborhood businesses";
        profile.target = pick(shops, group) ?? pick(services, group);
      } else if (kind === "small_venue") {
        profile.role = mode === 1 ? "Customer on a break" : "Regular customer";
        profile.purpose = services.length
          ? "Visit for a service and refreshments"
          : "Buy something and relax";
        profile.target =
          pick(mode === 1 ? food : services, group) ?? pick(shops, group);
        profile.stay = mode === 1 ? 90 : 240;
      }
      destination = profile.target ?? env.places[group % env.places.length];
      remaining = profile.groupSize;
      // Most visitors are present when opened. Later groups enter together during playback.
      arrival =
        group > 0 && group % 5 === 0
          ? 10 + (group % 3) * 10
          : -(30 + Math.floor(rng() * 90));
    }
    remaining--;
    const target = destination!;
    const departure =
      (kind === "airport" ? 0 : Math.max(0, arrival)) + profile!.stay;
    const goal = (
      suffix: string,
      kind: Goal["kind"],
      description: string,
      targetId?: string,
    ): Goal => ({
      id: `${person.id}-${suffix}`,
      kind,
      description,
      targetId,
      priority: 0.9,
      status: "pending",
    });
    let goals: Goal[];
    if (kind === "airport" && gates.includes(target)) {
      const subjectKey = `CC${101 + gates.indexOf(target)}`;
      goals = [
        {
          ...goal(
            "gate",
            "reach",
            `Reach ${target.name} for journey ${subjectKey}`,
            target.id,
          ),
          subjectKey,
          deadlineSeconds: departure,
          priority: 1,
        },
        {
          ...goal(
            "departure",
            "wait_until",
            `Wait at ${target.name} until departure`,
            target.id,
          ),
          subjectKey,
          deadlineSeconds: departure,
        },
      ];
    } else {
      const task = target.capabilities.includes("purchase")
        ? "buy"
        : target.capabilities.includes("receive_service")
          ? "receive_service"
          : "visit";
      goals = [
        goal(
          "purpose",
          task,
          `${task === "buy" ? "Shop" : task === "receive_service" ? "Receive service" : "Visit"} at ${target.name}`,
          target.id,
        ),
      ];
    }
    if (food.length && (profile!.hunger > 0.5 || group % 2 === 0))
      goals.push(goal("meal", "eat", "Buy food and eat with the group"));
    if (goals.length < 2 || group % 3 === 2) {
      const other = env.places[(group + 1) % env.places.length];
      goals.push(
        goal("visit", "visit", `Visit ${other.name} with the group`, other.id),
      );
    }
    return {
      ...person,
      roleLabel: profile!.role,
      groupId: `group-${group + 1}`,
      purpose: profile!.purpose,
      arrivalSeconds: arrival,
      departureSeconds: departure,
      presence: arrival > 0 ? "not_arrived" : "inside",
      nextDecisionAt: Math.max(0, arrival),
      goals,
      budgetRemainingCents: Math.round(profile!.budget * (0.85 + rng() * 0.3)),
      priceSensitivity: Math.max(
        0,
        Math.min(1, profile!.sensitivity + (rng() - 0.5) * 0.15),
      ),
      maxQueueWaitSeconds: Math.round(profile!.patience * (0.9 + rng() * 0.2)),
      hunger: Math.max(0, Math.min(1, profile!.hunger + (rng() - 0.5) * 0.15)),
      crowdTolerance: group % 3 === 0 ? 0.45 + rng() * 0.15 : 0.6 + rng() * 0.2,
      interests: Object.fromEntries(
        Object.keys(person.interests).map((category) => [
          category,
          target.tags.includes(category) ||
          (category === "food" && profile!.hunger > 0.5)
            ? 0.75 + rng() * 0.25
            : rng() * 0.4,
        ]),
      ),
    };
  });
}
