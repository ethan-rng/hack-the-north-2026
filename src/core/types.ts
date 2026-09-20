export type Point = { x: number; z: number };
export const capabilities = [
  "visit",
  "browse",
  "purchase",
  "queue",
  "receive_service",
  "wait",
  "rest",
  "eat",
  "exit",
] as const;
export type Capability = (typeof capabilities)[number];
export type GoalKind =
  "buy" | "eat" | "visit" | "receive_service" | "reach" | "wait_until" | "exit";
export interface Goal {
  id: string;
  kind: GoalKind;
  description: string;
  targetId?: string;
  targetCategory?: string;
  subjectKey?: string;
  deadlineSeconds?: number;
  priority: number;
  status: "pending" | "completed";
}
export interface Source {
  id: string;
  url: string;
  title: string;
  retrievedAt: string;
  excerpt: string;
}
export interface Provenance {
  targetPath: string;
  basis: "user_provided" | "researched" | "inferred" | "assumed";
  sourceIds: string[];
  note: string;
}
export interface Product {
  id: string;
  placeId: string;
  name: string;
  category: string;
  basePriceCents: number;
  stockUnits: number;
}
export interface PlaceDetails {
  operatingHours?: string;
  permit?: string;
  accessibility?: string;
  capacityNote?: string;
  address?: string;
  parkingSpots?: number;
  amenities?: string[];
}
export interface Place {
  id: string;
  name: string;
  typeLabel: string;
  description: string;
  tags: string[];
  capabilities: Capability[];
  admissionCapacity: number;
  position: Point;
  entry: Point;
  details?: PlaceDetails;
}
export interface Service {
  id: string;
  placeId: string;
  label: string;
  kind: "checkout" | "timed";
  slotCount: number;
  durationSeconds: number;
  interruptible: boolean;
}
export interface Environment {
  setupId: string;
  baselineId: string;
  seed: number;
  description: string;
  name: string;
  summary: string;
  coverage: string;
  researchStatus: "succeeded" | "partial" | "unavailable";
  sources: Source[];
  provenance: Provenance[];
  assumptions: string[];
  places: Place[];
  products: Product[];
  services: Service[];
  exit: Point;
  population: Person[];
  presentation: Record<string, { color: string; asset: string }>;
}
export type ActionType =
  | "move"
  | "browse"
  | "join_queue"
  | "purchase"
  | "receive_service"
  | "eat"
  | "rest"
  | "flee"
  | "leave"
  | "wait";
export interface Choice {
  id: string;
  type: ActionType;
  targetId?: string;
  serviceId?: string;
  productId?: string;
  label: string;
}
export interface Action extends Choice {
  actionId: string;
  decisionId: string;
  runId: string;
  basedOnRevision: number;
  startedAt: number;
  endsAt?: number;
  path?: Point[];
  status: "active" | "completed" | "cancelled";
}
export interface DecisionTicket {
  id: string;
  runId: string;
  personId: string;
  version: number;
  basedOnRevision: number;
  at: number;
  issuedAt: number;
  choices: Choice[];
  context: Record<string, unknown>;
}
export interface Person {
  id: string;
  displayName: string;
  roleLabel: string;
  interests: Record<string, number>;
  goals: Goal[];
  budgetRemainingCents: number | null;
  priceSensitivity: number;
  crowdTolerance: number;
  maxQueueWaitSeconds: number;
  departureTimeSeconds: number;
  hunger: number;
  fatigue: number;
  stress: number;
  mood: string;
  position: Point;
  placeId?: string;
  presence: "inside" | "exited";
  currentAction: Action | null;
  knownEventIds: string[];
  knownFacts: { subjectKey: string; targetId: string; learnedAt: number }[];
  recentExperiences: string[];
  purchaseIds: string[];
  interactionIds: string[];
  foodHeld: number;
  decisionVersion: number;
  nextDecisionAt: number;
  pending?: DecisionTicket;
  lastDecision?: {
    provider: "Jev";
    choice: string;
    at: number;
    inputRevision: number;
    runId: string;
    context?: Record<string, unknown>;
  };
  decisionError?: string;
}
export type EffectKind =
  | "discount"
  | "stock"
  | "availability"
  | "service_capacity"
  | "service_duration"
  | "attraction"
  | "threat"
  | "announcement"
  | "goal_update";
export interface Effect {
  kind: EffectKind;
  targetId: string | null;
  value: number;
  subjectKey: string | null;
}
export interface Event {
  id: string;
  originalText: string;
  title: string;
  description: string;
  status: "interpreting" | "active" | "completed" | "unsupported" | "failed";
  startTimeSeconds: number;
  durationSeconds: number;
  position: Point;
  effects: Effect[];
  approximationNotes: string[];
  visual: "dinosaur" | "marker";
  submittedAt: number;
}
export interface Assignment {
  personId: string;
  actionId: string;
  productId?: string;
  startedAt: number;
  endsAt: number;
}
export interface ServiceState {
  queue: {
    personId: string;
    actionId: string;
    productId?: string;
    joinedAt: number;
  }[];
  active: Assignment[];
}
export interface Transaction {
  id: string;
  runId: string;
  actionId: string;
  personId: string;
  placeId: string;
  productId: string;
  quantity: 1;
  totalCents: number;
  at: number;
}
export interface Interaction {
  id: string;
  personId: string;
  placeId: string;
  type: string;
  at: number;
  outcome: string;
}
export interface Metrics {
  visits: number;
  purchases: number;
  unitsSold: number;
  revenue: number;
  serviceCompletions: number;
  abandonment: number;
  interrupted: number;
  waitTotal: number;
  waitSamples: number;
  goalsCompleted: number;
}
export interface DecisionRecord {
  id: string;
  personId: string;
  at: number;
  outcome: "accepted" | "failed" | "stale";
  choice?: string;
  inputRevision: number;
}
export interface Run {
  runId: string;
  baselineId: string;
  status: "running" | "paused" | "finished";
  time: number;
  revision: number;
  duration: number;
  people: Person[];
  products: Product[];
  services: Record<string, ServiceState>;
  metrics: Record<string, Metrics>;
  unassignedGoalCompletions: number;
  events: Event[];
  transactions: Transaction[];
  interactions: Interaction[];
  decisions: DecisionRecord[];
  jevAccepted: number;
  jevFailed: number;
  lastTickAt: number;
}
export interface Result {
  runId: string;
  baselineId: string;
  duration: number;
  label: string;
  metrics: Record<string, Metrics>;
  totals: Metrics;
  events: { title: string; at: number }[];
}
export interface SessionSnapshot {
  setup: {
    id: string;
    status: "idle" | "researching" | "building" | "ready" | "failed";
    message: string;
    description: string;
    startedAt: number;
  };
  environment?: Environment;
  run?: Run;
  results: Result[];
  segments: Segment[];
}

export interface Segment {
  id: string;
  runId: string;
  eventId: string;
  originalText: string;
  status: "interpreting" | "processing" | "ready" | "failed";
  startTime: number;
  endTime: number;
  ticksDone: number;
  duration: number;
  callsMade: number;
  callLimit: number;
  startedAt: number;
  message: string;
}
export type ReplayFrame = Pick<
  Run,
  | "runId"
  | "time"
  | "revision"
  | "people"
  | "products"
  | "services"
  | "metrics"
  | "unassignedGoalCompletions"
  | "events"
  | "jevAccepted"
  | "jevFailed"
>;
export interface Recording {
  segmentId: string;
  runId: string;
  frames: ReplayFrame[];
}
