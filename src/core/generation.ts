import { z } from "zod";
import {
  capabilities,
  type Environment,
  type Goal,
  type Person,
  type Source,
  type Provenance,
} from "./types";

export const generatedSchema = z.object({
  name: z.string().min(1).max(100),
  summary: z.string().max(600),
  coverage: z.string().max(600),
  assumptions: z.array(z.string().max(400)).max(16),
  places: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        typeLabel: z.string().max(60),
        description: z.string().max(240),
        tags: z.array(z.string().max(30)).max(6),
        capabilities: z.array(z.enum(capabilities)).min(1).max(9),
        capacity: z.number().int().min(1).max(100),
        products: z
          .array(
            z.object({
              name: z.string().max(60),
              category: z.string().max(30),
              priceCents: z.number().int().min(0).max(100000),
              stock: z.number().int().min(0).max(1000),
            }),
          )
          .max(3),
        serviceLabel: z.string().max(70),
        serviceSeconds: z.number().int().min(2).max(30),
        serviceSlots: z.number().int().min(1).max(10),
        interruptible: z.boolean(),
        asset: z.enum([
          "building",
          "stall",
          "gate",
          "attraction",
          "rest",
          "open",
        ]),
        sourceIds: z.array(z.string().max(30)).max(5),
        evidenceNote: z.string().max(400),
      }),
    )
    .min(6)
    .max(8),
});
export type Generated = z.infer<typeof generatedSchema>;
export const eventSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(500),
  durationSeconds: z.number().int().min(1).max(3600),
  awareness: z.enum(["announcement", "local"]),
  radius: z.number().min(1).max(100),
  placeId: z.string().nullable(),
  visual: z.enum(["dinosaur", "marker"]),
  approximationNotes: z.array(z.string().max(300)).max(8),
  effects: z
    .array(
      z.object({
        kind: z.enum([
          "discount",
          "stock",
          "availability",
          "service_capacity",
          "service_duration",
          "attraction",
          "threat",
          "announcement",
          "goal_update",
        ]),
        targetId: z.string().nullable(),
        value: z.number(),
        subjectKey: z.string().nullable(),
      }),
    )
    .max(8),
});

function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const names = [
  "Alex",
  "Sam",
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Taylor",
  "Jamie",
  "Avery",
  "Quinn",
  "Parker",
  "Charlie",
  "Drew",
  "Sky",
  "Reese",
  "Rowan",
  "Sage",
  "River",
  "Finley",
  "Cameron",
  "Kai",
  "Noor",
  "Arlo",
  "Ellis",
  "Remy",
  "Blake",
  "Jules",
  "Eden",
  "Robin",
  "Shay",
  "Emery",
  "Kit",
  "Lane",
  "Marley",
  "Rory",
  "Frankie",
  "Hayden",
  "Dakota",
  "Indigo",
  "Micah",
];
const colors = [
  "#fcbf74",
  "#7d9db9",
  "#bd967f",
  "#a8ac80",
  "#dd8d7d",
  "#a99ec4",
  "#8ebbad",
  "#d2b26c",
];
export function compileEnvironment(
  generated: Generated,
  description: string,
  sources: Source[],
  researchStatus: Environment["researchStatus"],
  setupId: string,
  seed = 4242,
): Environment {
  const data = generatedSchema.parse(generated),
    rng = random(seed);
  const provenance: Provenance[] = [
    {
      targetPath: "description",
      basis: "user_provided",
      sourceIds: [],
      note: "Scenario instructions take precedence over source material.",
    },
    {
      targetPath: "layout,population,places.*.capacity,products.*,services.*",
      basis: "assumed",
      sourceIds: [],
      note: "Approximate single-floor layout; 40 synthetic people; all budgets, prices in simulation cents, stock, capacities, timings and preferences are illustrative assumptions, not observed operational data.",
    },
  ];
  const env: Environment = {
    setupId,
    baselineId: crypto.randomUUID(),
    seed,
    description,
    name: data.name,
    summary: data.summary,
    coverage: data.coverage,
    researchStatus,
    sources,
    provenance,
    assumptions: [
      ...data.assumptions,
      "Layout is an approximate connected single-floor arrangement, not a measured map.",
      "40 synthetic people; budgets, prices, stock, capacity, service times and preferences are assumed.",
      "Free non-retail services use independent timed slots. No synchronized rides, screening or boarding rules.",
      "Results illustrate this scenario; they do not forecast real sales or evacuation safety.",
    ],
    places: [],
    products: [],
    services: [],
    exit: { x: -26, z: 0 },
    population: [],
    presentation: {},
  };
  data.places.forEach((input, index) => {
    const id = `place-${index + 1}`,
      row = index < 4 ? -1 : 1,
      x = -18 + (index % 4) * 12;
    const caps = new Set(input.capabilities);
    caps.add("visit");
    caps.add("wait");
    if (input.products.length) {
      caps.add("purchase");
      caps.add("browse");
      caps.add("queue");
    } else caps.delete("purchase");
    if (input.products.some((p) => p.category === "food")) caps.add("eat");
    if (caps.has("receive_service")) caps.add("queue");
    env.places.push({
      id,
      name: input.name,
      typeLabel: input.typeLabel,
      description: input.description,
      tags: input.tags,
      capabilities: [...caps],
      admissionCapacity: input.capacity,
      position: { x, z: row * 10 },
      entry: { x, z: row * 5 },
    });
    env.presentation[id] = { color: colors[index], asset: input.asset };
    input.products.forEach((product, i) =>
      env.products.push({
        id: `${id}-product-${i + 1}`,
        placeId: id,
        name: product.name,
        category: product.category,
        basePriceCents: product.priceCents,
        stockUnits: product.stock,
      }),
    );
    if (input.products.length)
      env.services.push({
        id: `${id}-checkout`,
        placeId: id,
        label: `${input.name} checkout`,
        kind: "checkout",
        slotCount: input.serviceSlots,
        durationSeconds: input.serviceSeconds,
        interruptible: true,
      });
    if (caps.has("receive_service"))
      env.services.push({
        id: `${id}-service`,
        placeId: id,
        label: input.serviceLabel || input.typeLabel,
        kind: "timed",
        slotCount: input.serviceSlots,
        durationSeconds: input.serviceSeconds,
        interruptible: input.interruptible,
      });
    const sourceIds = input.sourceIds.filter((id) =>
      sources.some((s) => s.id === id),
    );
    provenance.push({
      targetPath: `places.${id}.name,description`,
      basis: sourceIds.length ? "researched" : "inferred",
      sourceIds,
      note:
        input.evidenceNote ||
        "Illustrative place inferred from the scenario, not independently verified.",
    });
  });
  // Ensure every scene can demonstrate a generic service, without imposing a venue category.
  if (!env.services.some((s) => s.kind === "timed")) {
    const place =
      env.places.find((p) => !p.capabilities.includes("purchase")) ??
      env.places.at(-1)!;
    place.capabilities.push("receive_service", "queue");
    env.services.push({
      id: `${place.id}-service`,
      placeId: place.id,
      label: `${place.name} visit session`,
      kind: "timed",
      durationSeconds: 12,
      slotCount: 3,
      interruptible: false,
    });
    env.assumptions.push(
      `${place.name} includes an assumed free 12-second visit session to approximate its activity.`,
    );
  }
  const categories = [
    ...new Set(
      env.products
        .map((p) => p.category)
        .concat(env.places.flatMap((p) => p.tags)),
    ),
  ].slice(0, 16);
  const retail = env.places.filter((p) => p.capabilities.includes("purchase"));
  const timed = env.places.filter((p) =>
    p.capabilities.includes("receive_service"),
  );
  const gates = env.places.filter((p) =>
    /\bgate\b/i.test([p.name, p.typeLabel, ...p.tags].join(" ")),
  );
  env.population = names.map((name, i) => {
    const target = env.places[i % env.places.length];
    let goals: Goal[] = [
      {
        id: `g-${i}-visit`,
        kind: "visit",
        targetId: target.id,
        description: `Visit ${target.name}`,
        priority: 0.7,
        status: "pending",
      },
    ];
    if (i % 4 === 0 && retail.length) {
      const shop = retail[i % retail.length];
      goals = [
        {
          id: `g-${i}-buy`,
          kind: "buy",
          targetId: shop.id,
          description: `Buy one item at ${shop.name}`,
          priority: 0.9,
          status: "pending",
        },
      ];
    }
    if (i % 4 === 1) {
      const service = timed[i % timed.length];
      goals = [
        {
          id: `g-${i}-service`,
          kind: "receive_service",
          targetId: service.id,
          description: `Receive service at ${service.name}`,
          priority: 0.95,
          status: "pending",
        },
      ];
    }
    if (i % 4 === 2 && env.products.some((p) => p.category === "food"))
      goals.push({
        id: `g-${i}-eat`,
        kind: "eat",
        description: "Find food, buy it and eat",
        priority: 0.9,
        status: "pending",
      });
    if (gates.length && i % 3 === 0)
      goals = [
        {
          id: `g-${i}-reach`,
          kind: "reach",
          description: `Reach ${gates[0].name} for journey CC101`,
          targetId: gates[0].id,
          subjectKey: "CC101",
          deadlineSeconds: 150,
          priority: 1,
          status: "pending",
        },
        {
          id: `g-${i}-wait`,
          kind: "wait_until",
          description: "Wait at the assigned gate until 150 seconds",
          targetId: gates[0].id,
          subjectKey: "CC101",
          deadlineSeconds: 150,
          priority: 0.8,
          status: "pending",
        },
      ];
    goals.push({
      id: `g-${i}-exit`,
      kind: "exit",
      description:
        "Leave after goals are satisfied or departure time approaches",
      priority: 0.2,
      status: "pending",
    });
    const person: Person = {
      id: `person-${i + 1}`,
      displayName: name,
      roleLabel: gates.length ? "Passenger" : "Visitor",
      interests: Object.fromEntries(
        categories.map((c) => [c, Math.round(rng() * 100) / 100]),
      ),
      goals,
      budgetRemainingCents: 1000 + Math.floor(rng() * 8000),
      priceSensitivity: rng(),
      crowdTolerance: rng(),
      maxQueueWaitSeconds: 12 + Math.round(rng() * 40),
      departureTimeSeconds: 120 + Math.round(rng() * 60),
      hunger: 0.1 + rng() * 0.6,
      fatigue: rng() * 0.35,
      stress: 0,
      mood: "neutral",
      position: { x: -23 + rng() * 46, z: -2 + rng() * 4 },
      presence: "inside",
      currentAction: null,
      knownEventIds: [],
      knownFacts: [],
      recentExperiences: [],
      purchaseIds: [],
      interactionIds: [],
      foodHeld: 0,
      decisionVersion: 0,
      nextDecisionAt: i * 0.2,
    };
    env.presentation[person.id] = {
      color: colors[i % colors.length],
      asset: "person",
    };
    return person;
  });
  return env;
}
export function fallbackConfiguration(description: string): Generated {
  const labels = [
    "Welcome point",
    "Market stall",
    "Food stand",
    "Visitor service",
    "Rest garden",
    "Gathering space",
  ];
  return {
    name: "An illustrative environment",
    summary: `Assumption-based interpretation of: ${description.slice(0, 180)}`,
    coverage:
      "A synthetic six-place interpretation. No real venue roster or layout is asserted; generation was unavailable.",
    assumptions: [
      "Model configuration was unavailable. These generic places approximate the requested scenario using supported mechanics.",
    ],
    places: labels.map((name, i) => ({
      name,
      typeLabel: i === 3 ? "Timed visitor service" : "Illustrative place",
      description: `Assumed ${name.toLowerCase()}`,
      tags: [i === 2 ? "food" : "leisure"],
      capabilities:
        i === 3
          ? ["visit", "receive_service", "queue"]
          : i === 4
            ? ["visit", "rest", "wait"]
            : ["visit", "wait"],
      capacity: 12,
      products:
        i === 1 || i === 2
          ? [
              {
                name: i === 2 ? "Snack" : "Souvenir",
                category: i === 2 ? "food" : "souvenir",
                priceCents: 500,
                stock: 20,
              },
            ]
          : [],
      serviceLabel: "Visitor session",
      serviceSeconds: 10,
      serviceSlots: 2,
      interruptible: i !== 3,
      asset: i === 4 ? "rest" : i === 3 ? "attraction" : "stall",
      sourceIds: [],
      evidenceNote: "Assumed generic fallback.",
    })),
  };
}
