import { z } from "zod";

// Every research-derived value carries provenance.
export const SourceInfo = z.object({
  source: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});
export type SourceInfo = z.infer<typeof SourceInfo>;

const CategoryDist = z.object({
  dist: z.record(z.string(), z.number()),
  source: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

const RangeField = z.object({
  median: z.number(),
  min: z.number(),
  max: z.number(),
  source: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

const ScoreField = z.object({
  mean: z.number().min(1).max(5),
  source: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const SegmentFields = z.object({
  age_band: CategoryDist,
  budget_per_visit: RangeField,
  visit_purpose: CategoryDist,
  price_sensitivity: ScoreField,
  visits_per_week: RangeField,
  preferred_times: CategoryDist,
});
export type SegmentFields = z.infer<typeof SegmentFields>;

export const Segment = z.object({
  id: z.string(),
  share: z.number().min(0).max(1),
  fields: SegmentFields,
});
export type Segment = z.infer<typeof Segment>;

export const CustomerModel = z.object({
  location: z.string(),
  segments: z.array(Segment).min(1).max(6),
});
export type CustomerModel = z.infer<typeof CustomerModel>;

const MenuItem = z.object({
  id: z.string(),
  name: z.string().optional(),
  price: z.number().nonnegative(),
  prep_min: z.number().nonnegative(),
});

const StaffRole = z.object({
  role: z.string(),
  count: z.number().int().nonnegative(),
});

export const Business = z.object({
  name: z.string(),
  type: z.string(),
  location: z.string(),
  hours: z.object({
    open: z.string(),
    close: z.string(),
  }),
  menu: z.array(MenuItem),
  staff: z.array(StaffRole),
  promo: z
    .object({
      description: z.string(),
      day_of_week: z.number().int().min(0).max(6).optional(),
      discount_pct: z.number().min(0).max(1).optional(),
      buy_x_get_y: z
        .object({ buy: z.number().int().positive(), free: z.number().int().positive() })
        .optional(),
      item_id: z.string().optional(),
    })
    .optional(),
});
export type Business = z.infer<typeof Business>;

export const Place = z.object({
  id: z.string(),
  kind: z.enum(["residential", "school", "office", "gym", "transit", "competitor", "our_business"]),
  menu_ref: z.string().optional(),
  prices: z.record(z.string(), z.number()).optional(),
});
export type Place = z.infer<typeof Place>;

export const Patch = z.object({
  path: z.string(),
  value: z.unknown(),
});

export const Change = z.object({
  label: z.string(),
  patch: z.array(Patch),
});
export type Change = z.infer<typeof Change>;

export const DecisionType = z.enum([
  "go_out",
  "destination",
  "order",
  "wait_or_leave",
  "satisfaction",
  "notice_ad",
]);
export type DecisionType = z.infer<typeof DecisionType>;

export const MetricKey = z.enum([
  "revenue",
  "visits",
  "orders_by_item",
  "avg_wait_min",
  "walkouts",
  "avg_satisfaction",
  "rival_visits",
  "revenue_by_segment",
]);
export type MetricKey = z.infer<typeof MetricKey>;

export const SimSpec = z.object({
  business: Business,
  places: z.array(Place),
  customer_model: CustomerModel,
  population: z.number().int().min(1).max(100),
  days: z.number().int().min(1).max(5),
  tick_minutes: z.number().int().min(5).max(60),
  change: Change,
  decisions: z.array(DecisionType).min(1),
  metrics: z.array(MetricKey).min(1),
  seed: z.number().int().optional(),
});
export type SimSpec = z.infer<typeof SimSpec>;

// The engine emits one Event per agent action per tick.
export const Event = z.object({
  tick: z.number().int().nonnegative(),
  minute: z.number().int().nonnegative(),
  day: z.number().int().nonnegative(),
  agentId: z.string(),
  segmentId: z.string(),
  kind: z.enum([
    "spawn",
    "go_out",
    "arrive",
    "queue",
    "order",
    "walkout",
    "leave",
    "notice_ad",
    "rival_choice",
  ]),
  place_id: z.string().optional(),
  item_id: z.string().optional(),
  amount: z.number().optional(),
  wait_min: z.number().optional(),
  satisfaction: z.number().min(1).max(5).optional(),
  probs: z.record(z.string(), z.number()).optional(),
  chosen: z.string().optional(),
});
export type Event = z.infer<typeof Event>;

export const MetricsSummary = z.object({
  revenue: z.number(),
  visits: z.number(),
  walkouts: z.number(),
  avg_wait_min: z.number(),
  avg_satisfaction: z.number(),
  rival_visits: z.number(),
  orders_by_item: z.record(z.string(), z.number()),
  revenue_by_segment: z.record(z.string(), z.number()),
  visits_by_day: z.array(z.number()),
  revenue_by_day: z.array(z.number()),
});
export type MetricsSummary = z.infer<typeof MetricsSummary>;

export const RunResult = z.object({
  runId: z.string(),
  seed: z.number(),
  spec: SimSpec,
  baseline: z.object({
    metrics: MetricsSummary,
    events: z.array(Event),
  }),
  what_if: z.object({
    metrics: MetricsSummary,
    events: z.array(Event),
  }),
  summary: z.string().optional(),
});
export type RunResult = z.infer<typeof RunResult>;
