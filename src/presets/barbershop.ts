import type { SimSpec, CustomerModel } from "@/sim/schema";

export const barbershopCustomerModel: CustomerModel = {
  location: "Kensington Market, Toronto, ON",
  segments: [
    {
      id: "regulars",
      share: 0.55,
      fields: {
        age_band: {
          dist: { "18-24": 0.15, "25-44": 0.55, "45-64": 0.25, "65+": 0.05 },
          source: "estimate",
          confidence: "medium",
        },
        budget_per_visit: { median: 35, min: 20, max: 60, source: "estimate", confidence: "medium" },
        visit_purpose: {
          dist: { grab_and_go: 0.7, social: 0.2, treat: 0.1, study_or_work: 0 },
          source: "owner",
          confidence: "high",
        },
        price_sensitivity: { mean: 2.8, source: "estimate", confidence: "medium" },
        visits_per_week: { median: 0.3, min: 0.2, max: 1, source: "estimate", confidence: "medium" },
        preferred_times: {
          dist: { morning: 0.15, midday: 0.35, afternoon: 0.4, evening: 0.1 },
          source: "estimate",
          confidence: "medium",
        },
      },
    },
    {
      id: "walk_ins",
      share: 0.3,
      fields: {
        age_band: {
          dist: { "18-24": 0.25, "25-44": 0.5, "45-64": 0.2, "65+": 0.05 },
          source: "estimate",
          confidence: "low",
        },
        budget_per_visit: { median: 30, min: 15, max: 55, source: "estimate", confidence: "low" },
        visit_purpose: {
          dist: { grab_and_go: 0.85, treat: 0.15, social: 0, study_or_work: 0 },
          source: "estimate",
          confidence: "medium",
        },
        price_sensitivity: { mean: 3.6, source: "estimate", confidence: "low" },
        visits_per_week: { median: 0.15, min: 0.1, max: 0.4, source: "estimate", confidence: "low" },
        preferred_times: {
          dist: { morning: 0.2, midday: 0.3, afternoon: 0.35, evening: 0.15 },
          source: "estimate",
          confidence: "low",
        },
      },
    },
    {
      id: "premium_seekers",
      share: 0.15,
      fields: {
        age_band: {
          dist: { "25-44": 0.6, "45-64": 0.35, "65+": 0.05, "18-24": 0 },
          source: "estimate",
          confidence: "low",
        },
        budget_per_visit: { median: 60, min: 40, max: 90, source: "estimate", confidence: "medium" },
        visit_purpose: {
          dist: { treat: 0.5, grab_and_go: 0.35, social: 0.15, study_or_work: 0 },
          source: "estimate",
          confidence: "low",
        },
        price_sensitivity: { mean: 1.8, source: "estimate", confidence: "low" },
        visits_per_week: { median: 0.25, min: 0.1, max: 0.5, source: "estimate", confidence: "low" },
        preferred_times: {
          dist: { morning: 0.05, midday: 0.2, afternoon: 0.45, evening: 0.3 },
          source: "estimate",
          confidence: "low",
        },
      },
    },
  ],
};

export const barbershopSpec: SimSpec = {
  business: {
    name: "Sharp & Co.",
    type: "barbershop",
    location: "Kensington Market, Toronto, ON",
    hours: { open: "10:00", close: "20:00" },
    menu: [
      { id: "cut", name: "Cut", price: 35, prep_min: 30 },
      { id: "beard", name: "Beard trim", price: 15, prep_min: 10 },
      { id: "cut_beard", name: "Cut + beard", price: 45, prep_min: 40 },
      { id: "kids_cut", name: "Kids cut", price: 25, prep_min: 20 },
    ],
    staff: [{ role: "barber", count: 2 }],
  },
  places: [
    { id: "home_area", kind: "residential" },
    { id: "office_zone", kind: "office" },
    { id: "sharp_co", kind: "our_business" },
    { id: "chain_barber", kind: "competitor", prices: { cut: 22, beard: 12, cut_beard: 30, kids_cut: 20 } },
  ],
  customer_model: barbershopCustomerModel,
  population: 40,
  days: 5,
  tick_minutes: 30,
  change: {
    label: "Add a $60 hot-towel shave",
    patch: [
      { path: "business.menu.premium_shave", value: { id: "premium_shave", name: "Hot-towel shave", price: 60, prep_min: 25 } },
    ],
  },
  decisions: ["go_out", "destination", "order", "wait_or_leave", "satisfaction"],
  metrics: ["revenue", "visits", "orders_by_item", "avg_wait_min", "walkouts", "avg_satisfaction", "rival_visits", "revenue_by_segment"],
  seed: 42,
};
