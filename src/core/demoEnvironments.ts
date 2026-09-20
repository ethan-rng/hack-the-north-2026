import { compileEnvironment, type Generated } from "./generation";
import type { DemoKind, Environment, Event, Run, Source } from "./types";

const words = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
export function demoKindForDescription(description: string): DemoKind | undefined {
  if (/\byorkdale\b/i.test(description)) return "yorkdale";
  if (/\bmars\s+(?:base|rover)\b/i.test(description)) return "mars";
  return undefined;
}

const officialYorkdaleSources = (): Source[] => {
  const retrievedAt = new Date().toISOString();
  return [
    { id: "yd-directory", title: "Yorkdale Shopping Centre", url: "https://yorkdale.com/", retrievedAt, excerpt: "Yorkdale Shopping Centre is located at 3401 Dufferin Street in Toronto, Ontario.", topic: "identity" },
    { id: "yd-levis", title: "Levi's® | Yorkdale Shopping Centre", url: "https://yorkdale.com/store/levis", retrievedAt, excerpt: "Levi’s® inside Yorkdale Shopping Centre.", topic: "roster" },
    { id: "yd-zara", title: "Zara | Yorkdale Shopping Centre", url: "https://yorkdale.com/store/zara", retrievedAt, excerpt: "Zara inside Yorkdale Shopping Centre.", topic: "roster" },
    { id: "yd-yogen", title: "Yogen Früz | Yorkdale Shopping Centre", url: "https://yorkdale.com/store/yogen-fruz", retrievedAt, excerpt: "Yogen Früz® is a world leader in the frozen yogurt category offering made-to-order healthy frozen treats.", topic: "roster" },
  ];
};
const officialMarsSources = (): Source[] => {
  const retrievedAt = new Date().toISOString();
  return [
    {
      id: "mars-facts",
      title: "Mars: Facts | NASA Science",
      url: "https://science.nasa.gov/mars/facts/",
      retrievedAt,
      excerpt:
        "Mars is a dusty, cold desert world with a very thin atmosphere.",
      topic: "identity",
    },
    {
      id: "mars-gravity",
      title: "Mars Fact Sheet | NASA NSSDC",
      url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
      retrievedAt,
      excerpt:
        "Mars mean surface gravity is 3.73 m/s², about 0.380 of Earth's.",
      topic: "operations",
    },
    {
      id: "mars-rover",
      title: "Mars 2020: Perseverance Rover | NASA Science",
      url: "https://science.nasa.gov/mission/mars-2020-perseverance/",
      retrievedAt,
      excerpt:
        "NASA's Perseverance rover explores Mars and collects rock and regolith samples.",
      topic: "roster",
    },
  ];
};
export function curatedDemoSources(kind: DemoKind): Source[] {
  return kind === "yorkdale" ? officialYorkdaleSources() : officialMarsSources();
}

type PlaceInput = Generated["places"][number];
const shop = (
  name: string,
  styleId: NonNullable<PlaceInput["styleId"]>,
  products: PlaceInput["products"],
  extra: Partial<PlaceInput> = {},
): PlaceInput => ({
  name,
  typeLabel: "Retail store",
  description: name + " is a curated storefront in this original mall scene.",
  tags: ["shopping", "retail"],
  capabilities: ["visit", "browse", "purchase", "queue", "wait"],
  capacity: 40,
  products,
  serviceLabel: "Checkout",
  serviceSeconds: 5,
  serviceSlots: 3,
  interruptible: true,
  asset: "building",
  sourceIds: [],
  evidenceNote: "Curated demo tenant; prices, stock and services are illustrative.",
  styleId,
  ...extra,
});

const yorkdale = (): Generated => ({
  venueKind: "mall",
  name: "Yorkdale shopping mall",
  summary: "A curated original mall scene informed by Yorkdale's public merchant directory.",
  coverage: "Featured tenants are verified through Yorkdale's public directory. The layout, visitor population, stock, prices and operations are illustrative.",
  assumptions: [
    "This is an original mall layout, not a reproduction of Yorkdale’s floor plan.",
    "The featured tenant roster and sources are preselected for a fast, reliable demo.",
  ],
  places: [
    {
      name: "Food Court", typeLabel: "Dining hall", description: "A bright central dining area with shared seating and food counters.", tags: ["food", "dining"], capabilities: ["visit", "wait", "rest", "eat", "receive_service", "queue"], capacity: 90,
      products: [{ name: "Lunch special", category: "food", priceCents: 1299, stock: 120 }], serviceLabel: "Food court service", serviceSeconds: 10, serviceSlots: 8, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Illustrative mall amenity.", styleId: "restaurant",
    },
    shop("Yogen Früz", "ice-cream-parlor", [{ name: "Ice cream", category: "food", priceCents: 650, stock: 140 }, { name: "Frozen yogurt", category: "food", priceCents: 700, stock: 90 }], { description: "Frozen yogurt and ice-cream treats beside the food court.", tags: ["food", "ice cream", "frozen yogurt"], zone: "Food court", sourceIds: ["yd-yogen"], fieldEvidence: [{ field: "name", evidence: { sourceIds: ["yd-yogen"], quote: "Yogen Früz® is a world leader in the frozen yogurt category offering made-to-order healthy frozen treats." } }] }),
    shop("Levi's", "modern-cube", [{ name: "Jeans", category: "apparel", priceCents: 9800, stock: 110 }, { name: "T-shirt", category: "apparel", priceCents: 3200, stock: 85 }], { description: "Denim and apparel storefront with a focused jeans wall.", sourceIds: ["yd-levis"], fieldEvidence: [{ field: "name", evidence: { sourceIds: ["yd-levis"], quote: "Levi’s® inside Yorkdale Shopping Centre." } }] }),
    shop("Zara", "modern-box", [{ name: "Underwear", category: "apparel", priceCents: 1800, stock: 180 }, { name: "Jacket", category: "apparel", priceCents: 8900, stock: 64 }], { description: "Fashion storefront with apparel essentials and seasonal collections.", sourceIds: ["yd-zara"], fieldEvidence: [{ field: "name", evidence: { sourceIds: ["yd-zara"], quote: "Zara inside Yorkdale Shopping Centre." } }] }),
    shop("Aritzia", "corner-shop", [{ name: "Knitwear", category: "apparel", priceCents: 7800, stock: 70 }]),
    shop("Apple", "glass-tower", [{ name: "Accessories", category: "electronics", priceCents: 4500, stock: 95 }]),
    shop("UNIQLO", "bookstore", [{ name: "Outerwear", category: "apparel", priceCents: 6900, stock: 76 }]),
    shop("lululemon", "gym", [{ name: "Activewear", category: "apparel", priceCents: 7200, stock: 83 }]),
    {
      name: "Cineplex", typeLabel: "Cinema", description: "Multi-screen cinema with a lobby and timed show entry.", tags: ["entertainment", "cinema"], capabilities: ["visit", "wait", "receive_service", "queue"], capacity: 70,
      products: [], serviceLabel: "Cinema entry", serviceSeconds: 18, serviceSlots: 5, interruptible: false, asset: "attraction", sourceIds: [], evidenceNote: "Illustrative mall entertainment venue.", styleId: "cinema",
    },
    {
      name: "Guest Services", typeLabel: "Information desk", description: "Mall assistance, directions and accessibility support.", tags: ["services", "information"], capabilities: ["visit", "wait", "receive_service", "queue"], capacity: 18,
      products: [], serviceLabel: "Guest services", serviceSeconds: 12, serviceSlots: 3, interruptible: true, asset: "stall", sourceIds: [], evidenceNote: "Illustrative mall amenity.", styleId: "kiosk",
    },
    {
      name: "Atrium Lounge", typeLabel: "Rest area", description: "Open seating for resting and meeting friends.", tags: ["rest", "seating"], capabilities: ["visit", "wait", "rest"], capacity: 36,
      products: [], serviceLabel: "Rest", serviceSeconds: 10, serviceSlots: 6, interruptible: true, asset: "rest", sourceIds: [], evidenceNote: "Illustrative mall amenity.", styleId: "park-pavilion",
    },
    {
      name: "South Parking", typeLabel: "Parking garage", description: "Illustrative vehicle arrival and departure point.", tags: ["parking", "arrival"], capabilities: ["visit", "wait"], capacity: 50,
      products: [], serviceLabel: "Arrival", serviceSeconds: 8, serviceSlots: 4, interruptible: true, asset: "parking_garage", sourceIds: [], evidenceNote: "Illustrative mall amenity.", styleId: "parking-garage", parkingSpots: 700,
    },
  ],
  connections: [
    { fromPlace: 1, toPlace: 2, weight: 1 }, { fromPlace: 1, toPlace: 3, weight: 2 }, { fromPlace: 1, toPlace: 4, weight: 2 }, { fromPlace: 1, toPlace: 11, weight: 1 },
    { fromPlace: 2, toPlace: 3, weight: 1 }, { fromPlace: 3, toPlace: 5, weight: 1 }, { fromPlace: 4, toPlace: 6, weight: 1 }, { fromPlace: 5, toPlace: 7, weight: 1 },
    { fromPlace: 6, toPlace: 8, weight: 1 }, { fromPlace: 7, toPlace: 9, weight: 2 }, { fromPlace: 8, toPlace: 10, weight: 2 }, { fromPlace: 9, toPlace: 11, weight: 1 },
    { fromPlace: 10, toPlace: 11, weight: 1 }, { fromPlace: 11, toPlace: 12, weight: 3 },
  ],
  populationSize: 120,
});

const mars = (): Generated => ({
  venueKind: "generic",
  name: "Ares Outpost",
  summary: "A compact Mars research base with habitable modules, a landing pad and an emergency safehouse.",
  coverage: "This fictional environment uses illustrative base systems, movement paths and operational assumptions.",
  assumptions: ["Mars terrain, low-gravity motion and the base layout are stylized for the demo.", "There are 30 fictional astronauts."],
  places: [
    { name: "Safehouse Bunker", typeLabel: "Emergency shelter", description: "Pressurized underground shelter designated for emergency muster.", tags: ["safehouse", "bunker", "emergency"], capabilities: ["visit", "wait", "rest"], capacity: 80, products: [], serviceLabel: "Emergency shelter", serviceSeconds: 8, serviceSlots: 10, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Fictional demo safehouse.", styleId: "control-tower" },
    { name: "Habitat Aurora", typeLabel: "Crew habitat", description: "Living quarters for the outpost crew.", tags: ["habitat", "crew"], capabilities: ["visit", "wait", "rest"], capacity: 24, products: [], serviceLabel: "Habitat rest", serviceSeconds: 10, serviceSlots: 8, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "greenhouse" },
    { name: "Command Dome", typeLabel: "Mission control", description: "Communications and mission coordination center.", tags: ["command", "communications"], capabilities: ["visit", "wait", "receive_service", "queue"], capacity: 18, products: [], serviceLabel: "Mission briefing", serviceSeconds: 14, serviceSlots: 4, interruptible: false, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "radar-dome" },
    { name: "Hydroponics Lab", typeLabel: "Food production", description: "Controlled crop module supplying crew meals.", tags: ["food", "hydroponics"], capabilities: ["visit", "wait", "receive_service", "queue", "eat"], capacity: 16, products: [{ name: "Mars-grown meal", category: "food", priceCents: 0, stock: 100 }], serviceLabel: "Meal collection", serviceSeconds: 8, serviceSlots: 5, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "greenhouse" },
    { name: "Research Lab", typeLabel: "Science module", description: "Planetary samples and experiment workspace.", tags: ["research", "science"], capabilities: ["visit", "wait", "receive_service", "queue"], capacity: 15, products: [], serviceLabel: "Research shift", serviceSeconds: 16, serviceSlots: 4, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "modern-cube" },
    { name: "Rover Bay", typeLabel: "Vehicle hangar", description: "Pressurized rover maintenance and EVA staging bay.", tags: ["rover", "eva"], capabilities: ["visit", "wait", "receive_service", "queue"], capacity: 16, products: [], serviceLabel: "EVA prep", serviceSeconds: 18, serviceSlots: 4, interruptible: false, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "hangar" },
    { name: "Comms Array", typeLabel: "Communications mast", description: "Deep-space communication and navigation equipment.", tags: ["communications", "antenna"], capabilities: ["visit", "wait"], capacity: 8, products: [], serviceLabel: "Comms check", serviceSeconds: 10, serviceSlots: 2, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "airship-mast" },
    { name: "Solar Field", typeLabel: "Power generation", description: "Solar panels supplying the base power loop.", tags: ["power", "solar"], capabilities: ["visit", "wait"], capacity: 10, products: [], serviceLabel: "Power inspection", serviceSeconds: 12, serviceSlots: 2, interruptible: true, asset: "open", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "solar-farm" },
    { name: "Landing Pad", typeLabel: "Landing zone", description: "Marked pad for cargo craft and unexpected visitors.", tags: ["landing", "pad", "arrival"], capabilities: ["visit", "wait"], capacity: 20, products: [], serviceLabel: "Landing operations", serviceSeconds: 12, serviceSlots: 3, interruptible: true, asset: "open", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "space-launch" },
    { name: "Observatory", typeLabel: "Observation dome", description: "Astronomy and weather observation station.", tags: ["observatory", "science"], capabilities: ["visit", "wait", "receive_service", "queue"], capacity: 12, products: [], serviceLabel: "Observation shift", serviceSeconds: 14, serviceSlots: 3, interruptible: true, asset: "building", sourceIds: [], evidenceNote: "Fictional Mars module.", styleId: "observatory" },
  ],
  connections: [
    { fromPlace: 1, toPlace: 2, weight: 1 }, { fromPlace: 1, toPlace: 3, weight: 1 }, { fromPlace: 1, toPlace: 4, weight: 2 }, { fromPlace: 2, toPlace: 5, weight: 1 },
    { fromPlace: 3, toPlace: 6, weight: 1 }, { fromPlace: 4, toPlace: 7, weight: 2 }, { fromPlace: 5, toPlace: 8, weight: 2 }, { fromPlace: 6, toPlace: 9, weight: 2 },
    { fromPlace: 7, toPlace: 10, weight: 2 }, { fromPlace: 8, toPlace: 9, weight: 1 }, { fromPlace: 9, toPlace: 10, weight: 2 },
  ],
  populationSize: 30,
});

function arrangeYorkdale(environment: Environment) {
  const placements: Record<string, { x: number; z: number; entryX: number; entryZ: number }> = {
    "Food Court": { x: 0, z: 0, entryX: 0, entryZ: -7 },
    "Yogen Früz": { x: -13, z: -6, entryX: -7, entryZ: -5 },
    "Levi's": { x: -20, z: 8, entryX: -13, entryZ: 8 },
    Zara: { x: 20, z: 8, entryX: 13, entryZ: 8 },
    Aritzia: { x: -29, z: 19, entryX: -22, entryZ: 18 },
    Apple: { x: 29, z: 19, entryX: 22, entryZ: 18 },
    UNIQLO: { x: -18, z: 31, entryX: -12, entryZ: 29 },
    lululemon: { x: 18, z: 31, entryX: 12, entryZ: 29 },
    Cineplex: { x: 0, z: 39, entryX: 0, entryZ: 32 },
    "Guest Services": { x: 0, z: -15, entryX: 0, entryZ: -9 },
    "Atrium Lounge": { x: 0, z: 17, entryX: 0, entryZ: 12 },
    "South Parking": { x: -31, z: -20, entryX: -22, entryZ: -14 },
  };
  for (const place of environment.places) {
    const next = placements[place.name];
    if (!next) continue;
    place.position = { x: next.x, z: next.z };
    place.entry = { x: next.entryX, z: next.entryZ };
    if (place.footprint)
      place.footprint.rotation = Math.atan2(
        place.entry.x - place.position.x,
        place.entry.z - place.position.z,
      );
  }
  const byId = new Map(environment.places.map((place) => [place.id, place]));
  environment.connections = environment.connections.map((connection) => {
    const from = byId.get(connection.fromPlaceId)!;
    const to = byId.get(connection.toPlaceId)!;
    const bend = {
      x: Math.abs(from.entry.x - to.entry.x) > Math.abs(from.entry.z - to.entry.z)
        ? (from.entry.x + to.entry.x) / 2
        : from.entry.x,
      z: Math.abs(from.entry.x - to.entry.x) > Math.abs(from.entry.z - to.entry.z)
        ? from.entry.z
        : (from.entry.z + to.entry.z) / 2,
    };
    return {
      ...connection,
      path: [from.entry, bend, to.entry],
    };
  });
  environment.exit = { x: -35, z: -28 };
  environment.layout?.notes.push(
    "The Yorkdale demo uses an original three-wing mall layout around a central atrium; it is not a floor-plan reproduction.",
  );
}

export function buildDemoEnvironment(kind: DemoKind, description: string, researched: Source[], researchStatus: Environment["researchStatus"], setupId: string): Environment {
  const curatedSources = curatedDemoSources(kind);
  const curatedIds = new Set(curatedSources.map((source) => source.id));
  const sources = [
    ...curatedSources,
    ...researched.filter((source) => !curatedIds.has(source.id)),
  ];
  const environment = compileEnvironment(kind === "yorkdale" ? yorkdale() : mars(), description, sources, researchStatus, setupId, kind === "yorkdale" ? 20260920 : 342021);
  if (kind === "yorkdale") {
    arrangeYorkdale(environment);
    environment.demo = { kind };
    environment.assumptions.unshift("This curated demo uses preselected official Yorkdale directory sources. The highlighted tenant roster is stabilized for reliability.");
  } else {
    const bunker = environment.places.find((place) => place.name === "Safehouse Bunker");
    environment.demo = { kind, safePlaceId: bunker?.id };
    environment.population = environment.population.map((person, index) => ({
      ...person,
      displayName: "Astronaut " + String(index + 1).padStart(2, "0"),
      roleLabel: index % 3 === 0 ? "EVA specialist" : "Mars mission specialist",
      purpose: "Maintain the Mars outpost and return safely to the bunker during an emergency.",
    }));
    environment.assumptions.unshift("This curated demo uses preselected NASA Mars and rover sources. The base itself is fictional and its layout is illustrative.");
  }
  return environment;
}

const findPlace = (environment: Environment, query: string) =>
  environment.places.find((place) => words(place.name).includes(words(query)));
const findProduct = (run: Run, name: string) =>
  run.products.find((product) => words(product.name) === words(name));
function promotion(event: Event, place: NonNullable<ReturnType<typeof findPlace>>, productId: string, percent: number, title: string) {
  Object.assign(event, {
    title,
    description: percent + "% off is active at " + place.name + ". Every shopper knows about the offer; Jev decides who changes plans.",
    durationSeconds: 300,
    position: place.entry,
    visual: "marker" as const,
    effects: [{ kind: "discount" as const, targetId: productId, value: percent, subjectKey: null }],
    approximationNotes: ["Curated demo promotion matched against the selected store and product. Jev still decides how each shopper responds."],
  });
}

/** Curated effects make the planned demo reliable; every other event uses the normal interpreter. */
export function applyCuratedDemoEvent(environment: Environment, run: Run, event: Event): boolean {
  const text = words(event.originalText);
  if (environment.demo?.kind === "yorkdale") {
    const matches = [
      { when: (value: string) => (value.includes("ice cream") || value.includes("yogen")), place: "Yogen", product: "Ice cream", percent: 50, title: "Yogen Früz deal sends shoppers toward the food court" },
      { when: (value: string) => value.includes("levi") && value.includes("jean"), place: "Levi", product: "Jeans", percent: 20, title: "Levi's jeans offer draws a new wave of shoppers" },
      { when: (value: string) => value.includes("zara") && value.includes("underwear"), place: "Zara", product: "Underwear", percent: 30, title: "Zara underwear sale changes the mall’s traffic pattern" },
    ];
    const match = matches.find((candidate) => candidate.when(text));
    const place = match && findPlace(environment, match.place);
    const product = match && findProduct(run, match.product);
    if (match && place && product) {
      promotion(event, place, product.id, match.percent, match.title);
      return true;
    }
  }
  if (environment.demo?.kind === "mars" && text.includes("alien")) {
    const landingPad = findPlace(environment, "Landing Pad");
    if (!landingPad) return false;
    Object.assign(event, {
      title: "ALIEN CRAFT TOUCHES DOWN — CREW RACES FOR COVER",
      description: "A large unidentified craft has landed at the outpost. The landing pad is dangerous; each astronaut decides how to react.",
      durationSeconds: 300,
      position: landingPad.entry,
      visual: "ufo" as const,
      effects: [{ kind: "threat" as const, targetId: landingPad.id, value: 1, subjectKey: null }],
      approximationNotes: ["Curated demo sequence: UFO arrival and aliens are visualized at the landing pad. Jev still chooses each astronaut’s response."],
    });
    return true;
  }
  return false;
}
