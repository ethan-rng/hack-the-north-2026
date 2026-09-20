import { z } from "zod";
import { spatialLayout, supportedEvidence } from "./spatial";
import { contextualPopulation } from "./population";

const evidenceSchema = z.object({
  sourceIds: z.array(z.string().max(30)).min(1).max(5),
  quote: z.string().min(1).max(600),
});
import {
  capabilities,
  type Environment,
  type Goal,
  type Person,
  type PlaceConnection,
  type Point,
  type Source,
  type Provenance,
} from "./types";

export const generatedSchema = z.object({
  venueKind: z
    .enum(["airport", "mall", "neighborhood", "park", "small_venue", "generic"])
    .optional(),
  name: z.string().min(1).max(100),
  summary: z.string().max(600),
  coverage: z.string().max(600),
  assumptions: z.array(z.string().max(400)).max(16),
  places: z
    .array(
      z.object({
        zone: z.string().max(60).optional(),
        footprint: z
          .object({
            width: z.number().min(4).max(24),
            depth: z.number().min(4).max(24),
          })
          .optional(),
        geographic: z
          .object({
            latitude: z.number().min(-85).max(85),
            longitude: z.number().min(-180).max(180),
            evidence: evidenceSchema,
          })
          .optional(),
        fieldEvidence: z
          .array(
            z.object({
              field: z.enum([
                "name",
                "description",
                "zone",
                "operatingHours",
                "address",
                "permit",
                "accessibility",
                "capacityNote",
                "parkingSpots",
                "amenities",
              ]),
              evidence: evidenceSchema,
            }),
          )
          .max(12)
          .optional(),
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
          "parking_lot",
          "parking_garage",
        ]),
        sourceIds: z.array(z.string().max(30)).max(5),
        evidenceNote: z.string().max(400),
        operatingHours: z.string().max(80).optional(),
        permit: z.string().max(80).optional(),
        accessibility: z.string().max(120).optional(),
        capacityNote: z.string().max(120).optional(),
        address: z.string().max(120).optional(),
        parkingSpots: z.number().int().min(0).max(9999).optional(),
        amenities: z.array(z.string().max(40)).max(8).optional(),
        styleId: z.string().max(40).optional(),
        competitorOf: z.string().max(40).optional(),
      }),
    )
    .min(6)
    .max(24),
  connections: z
    .array(
      z.object({
        fromPlace: z.number().int().min(1).max(24),
        toPlace: z.number().int().min(1).max(24),
        weight: z.number().int().min(1).max(3),
      }),
    )
    .min(5)
    .max(60),
  populationSize: z.number().int().min(20).max(160).optional(),
});
export type Generated = z.infer<typeof generatedSchema>;
export const eventSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(500),
  durationSeconds: z.number().int().min(1).max(3600),
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

type IndexedConnection = { from: number; to: number; weight: number };

function connectedGraph(data: Generated): IndexedConnection[] {
  const count = data.places.length;
  const parent = Array.from({ length: count }, (_, index) => index);
  const find = (value: number): number => {
    while (parent[value] !== value) {
      parent[value] = parent[parent[value]];
      value = parent[value];
    }
    return value;
  };
  const join = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };
  const seen = new Set<string>();
  const connections: IndexedConnection[] = [];
  for (const input of data.connections) {
    const from = input.fromPlace - 1;
    const to = input.toPlace - 1;
    if (from < 0 || to < 0 || from >= count || to >= count || from === to)
      continue;
    const key = from < to ? `${from}:${to}` : `${to}:${from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    connections.push({ from, to, weight: input.weight });
    join(from, to);
  }
  // Invalid or sparse model output is repaired into one traversable graph.
  for (let index = 1; index < count; index++) {
    if (find(index - 1) === find(index)) continue;
    const key = `${index - 1}:${index}`;
    if (!seen.has(key)) {
      seen.add(key);
      connections.push({ from: index - 1, to: index, weight: 2 });
    }
    join(index - 1, index);
  }
  return connections;
}

function graphLayout(
  count: number,
  connections: IndexedConnection[],
  seed: number,
): Point[] {
  const rng = random(seed ^ 0x51f15e);
  const radius = 13 + count * 1.2;
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const offset = (rng() - 0.5) * 1.5;
    return {
      x: Math.cos(angle) * (radius + offset),
      z: Math.sin(angle) * (radius + offset),
    };
  });
  for (let iteration = 0; iteration < 220; iteration++) {
    const forces = points.map(() => ({ x: 0, z: 0 }));
    for (let a = 0; a < count; a++)
      for (let b = a + 1; b < count; b++) {
        const dx = points[b].x - points[a].x;
        const dz = points[b].z - points[a].z;
        const length = Math.max(0.1, Math.hypot(dx, dz));
        const strength =
          length < 12 ? (12 - length) * 0.09 : Math.min(0.025, 0.7 / length);
        const fx = (dx / length) * strength;
        const fz = (dz / length) * strength;
        forces[a].x -= fx;
        forces[a].z -= fz;
        forces[b].x += fx;
        forces[b].z += fz;
      }
    for (const connection of connections) {
      const a = points[connection.from];
      const b = points[connection.to];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.max(0.1, Math.hypot(dx, dz));
      const desired = 12 + (connection.weight - 1) * 4;
      const strength = (length - desired) * 0.035;
      const fx = (dx / length) * strength;
      const fz = (dz / length) * strength;
      forces[connection.from].x += fx;
      forces[connection.from].z += fz;
      forces[connection.to].x -= fx;
      forces[connection.to].z -= fz;
    }
    for (let index = 0; index < count; index++) {
      forces[index].x -= points[index].x * 0.002;
      forces[index].z -= points[index].z * 0.002;
      points[index].x += Math.max(-0.45, Math.min(0.45, forces[index].x));
      points[index].z += Math.max(-0.45, Math.min(0.45, forces[index].z));
    }
  }
  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / count,
      z: sum.z + point.z / count,
    }),
    { x: 0, z: 0 },
  );
  return points.map((point) => ({
    x: Math.round((point.x - center.x) * 10) / 10,
    z: Math.round((point.z - center.z) * 10) / 10,
  }));
}

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
  const indexedConnections = connectedGraph(data);
  const spatial = spatialLayout(
    data,
    description,
    sources,
    graphLayout(data.places.length, indexedConnections, seed),
  );
  const layout = spatial.places;
  const provenance: Provenance[] = [
    {
      targetPath: "description",
      basis: "user_provided",
      sourceIds: [],
      note: "Scenario instructions take precedence over source material.",
    },
    {
      targetPath: "population,places.*.capacity,products.*,services.*",
      basis: "assumed",
      sourceIds: [],
      note: "Synthetic visitor cohorts, budgets, prices in simulation cents, stock, capacities, timings and preferences are illustrative assumptions, not observed operational data.",
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
      ...spatial.info.notes,
      "Population cohorts and arrival schedules are synthetic; budgets, prices, stock, capacity, service times and preferences are assumed. Groups share purposes but make individual decisions.",
      "Free non-retail services use independent timed slots. No synchronized rides, screening or boarding rules.",
      "Results illustrate this scenario; they do not forecast real sales or evacuation safety.",
    ],
    places: [],
    connections: [],
    products: [],
    services: [],
    exit: spatial.exit,
    layout: spatial.info,
    population: [],
    presentation: {},
  };
  data.places.forEach((input, index) => {
    const id = `place-${index + 1}`;
    const { position, entry, footprint, zone, geographic } = layout[index];
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
    const details: NonNullable<import("./types").Place["details"]> = {};
    if (input.operatingHours) details.operatingHours = input.operatingHours;
    if (input.permit) details.permit = input.permit;
    if (input.accessibility) details.accessibility = input.accessibility;
    if (input.capacityNote) details.capacityNote = input.capacityNote;
    if (input.address) details.address = input.address;
    if (typeof input.parkingSpots === "number")
      details.parkingSpots = input.parkingSpots;
    if (input.amenities && input.amenities.length)
      details.amenities = input.amenities;
    if (input.competitorOf) details.competitorOf = input.competitorOf;
    env.places.push({
      id,
      name: input.name,
      typeLabel: input.typeLabel,
      description: input.description,
      tags: input.tags,
      capabilities: [...caps],
      admissionCapacity: input.capacity,
      position,
      entry,
      footprint,
      zone,
      geographic,
      ...(Object.keys(details).length ? { details } : {}),
    });
    env.presentation[id] = {
      color: colors[index % colors.length],
      asset: input.asset,
      ...(input.styleId ? { styleId: input.styleId } : {}),
    };
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
    const fields = [
      "name",
      "description",
      "zone",
      ...Object.keys(details),
    ] as const;
    for (const field of fields) {
      const evidence = input.fieldEvidence?.find(
        (item) => item.field === field,
      )?.evidence;
      const sourceIds = supportedEvidence(evidence, sources);
      provenance.push({
        targetPath: `places.${id}.${field === "name" || field === "description" || field === "zone" ? field : `details.${field}`}`,
        basis: sourceIds.length ? "researched" : "assumed",
        sourceIds,
        note: sourceIds.length
          ? evidence!.quote
          : "Illustrative value; no field-specific supporting excerpt was retrieved.",
      });
    }
    provenance.push({
      targetPath: `places.${id}.position`,
      basis: geographic ? "researched" : "assumed",
      sourceIds: geographic?.sourceIds ?? [],
      note: geographic
        ? "Projected from coordinates explicitly present in retrieved evidence. Footprint and paths remain illustrative."
        : "Placed by the venue template; not a measured location.",
    });
    provenance.push({
      targetPath: `places.${id}.footprint,entry`,
      basis: "assumed",
      sourceIds: [],
      note: "Illustrative dimensions and entrance oriented toward circulation; not a surveyed building outline.",
    });
  });
  env.connections = indexedConnections.map(
    (connection, index): PlaceConnection => ({
      id: `connection-${index + 1}`,
      fromPlaceId: `place-${connection.from + 1}`,
      toPlaceId: `place-${connection.to + 1}`,
      weight: connection.weight,
      path: spatial.route(connection.from, connection.to),
    }),
  );
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
  const hasFood = env.products.some((p) => p.category === "food");
  const goalRng = random(seed ^ 0x6a09e667);
  const desiredPopulation = Math.min(
    160,
    Math.max(20, data.populationSize ?? 40),
  );
  const roster = Array.from({ length: desiredPopulation }, (_, i) => {
    const base = names[i % names.length];
    const cycle = Math.floor(i / names.length);
    return cycle === 0 ? base : `${base} ${cycle + 1}`;
  });
  env.population = roster.map((name, i) => {
    const taskCount = 2 + Math.floor(goalRng() * 4);
    const candidates: Goal[] = Array.from(
      { length: Math.min(3, env.places.length) },
      (_, offset): Goal => {
        const target = env.places[(i + offset) % env.places.length];
        return {
          id: `g-${i}-visit-${offset + 1}`,
          kind: "visit",
          targetId: target.id,
          description: `Visit ${target.name}`,
          priority: 0.7,
          status: "pending",
        };
      },
    );
    if (retail.length) {
      const shop = retail[i % retail.length];
      candidates.push({
        id: `g-${i}-buy`,
        kind: "buy",
        targetId: shop.id,
        description: `Buy one item at ${shop.name}`,
        priority: 0.9,
        status: "pending",
      });
    }
    if (timed.length) {
      const service = timed[i % timed.length];
      candidates.push({
        id: `g-${i}-service`,
        kind: "receive_service",
        targetId: service.id,
        description: `Receive service at ${service.name}`,
        priority: 0.95,
        status: "pending",
      });
    }
    if (hasFood)
      candidates.push({
        id: `g-${i}-eat`,
        kind: "eat",
        description: "Find food, buy it and eat",
        priority: 0.9,
        status: "pending",
      });
    // Shuffle deterministically so a seed reproduces both task count and mix.
    for (let index = candidates.length - 1; index > 0; index--) {
      const swap = Math.floor(goalRng() * (index + 1));
      [candidates[index], candidates[swap]] = [
        candidates[swap],
        candidates[index],
      ];
    }
    let goals = candidates.slice(0, taskCount);
    if (gates.length && i % 3 === 0) {
      const journeyGoals: Goal[] = [
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
      goals = [
        ...journeyGoals,
        ...candidates.slice(0, Math.max(0, taskCount - journeyGoals.length)),
      ];
    }
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
      hunger: 0.1 + rng() * 0.6,
      fatigue: rng() * 0.35,
      stress: 0,
      mood: "neutral",
      position: {
        x: env.exit.x + 2 + rng() * 5,
        z: env.exit.z - 2 + rng() * 4,
      },
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
  if (spatial.info.venueKind !== "generic") {
    env.population = contextualPopulation(
      env,
      env.population,
      random(seed ^ 0x7f4a7c15),
    );
  }
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
    connections: [
      { fromPlace: 1, toPlace: 2, weight: 1 },
      { fromPlace: 2, toPlace: 3, weight: 2 },
      { fromPlace: 3, toPlace: 4, weight: 1 },
      { fromPlace: 4, toPlace: 5, weight: 2 },
      { fromPlace: 5, toPlace: 6, weight: 1 },
      { fromPlace: 6, toPlace: 1, weight: 3 },
      { fromPlace: 2, toPlace: 5, weight: 2 },
    ],
  };
}
