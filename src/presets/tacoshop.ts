import type { SimSpec, CustomerModel } from "@/sim/schema";

export const tacoshopCustomerModel: CustomerModel = {
  location: "Mission District, San Francisco, CA",
  segments: [
    {
      id: "office_workers",
      share: 0.35,
      fields: {
        age_band: {
          dist: { "25-44": 0.65, "18-24": 0.15, "45-64": 0.18, "65+": 0.02 },
          source: "estimate",
          confidence: "medium",
        },
        budget_per_visit: { median: 14, min: 8, max: 25, source: "estimate", confidence: "medium" },
        visit_purpose: {
          dist: { grab_and_go: 0.75, social: 0.2, treat: 0.05, study_or_work: 0 },
          source: "estimate",
          confidence: "medium",
        },
        price_sensitivity: { mean: 3.2, source: "estimate", confidence: "low" },
        visits_per_week: { median: 2, min: 0.5, max: 5, source: "estimate", confidence: "medium" },
        preferred_times: {
          dist: { morning: 0.05, midday: 0.65, afternoon: 0.2, evening: 0.1 },
          source: "owner",
          confidence: "high",
        },
      },
    },
    {
      id: "night_crowd",
      share: 0.4,
      fields: {
        age_band: {
          dist: { "18-24": 0.35, "25-44": 0.5, "45-64": 0.13, "65+": 0.02 },
          source: "estimate",
          confidence: "medium",
        },
        budget_per_visit: { median: 18, min: 10, max: 35, source: "estimate", confidence: "medium" },
        visit_purpose: {
          dist: { social: 0.55, grab_and_go: 0.3, treat: 0.15, study_or_work: 0 },
          source: "estimate",
          confidence: "medium",
        },
        price_sensitivity: { mean: 3.0, source: "estimate", confidence: "low" },
        visits_per_week: { median: 1, min: 0.5, max: 4, source: "estimate", confidence: "medium" },
        preferred_times: {
          dist: { morning: 0, midday: 0.1, afternoon: 0.2, evening: 0.7 },
          source: "owner",
          confidence: "high",
        },
      },
    },
    {
      id: "families",
      share: 0.25,
      fields: {
        age_band: {
          dist: { "25-44": 0.45, "45-64": 0.35, "18-24": 0.05, "65+": 0.15 },
          source: "estimate",
          confidence: "low",
        },
        budget_per_visit: { median: 30, min: 18, max: 60, source: "estimate", confidence: "medium" },
        visit_purpose: {
          dist: { social: 0.7, grab_and_go: 0.2, treat: 0.1, study_or_work: 0 },
          source: "estimate",
          confidence: "medium",
        },
        price_sensitivity: { mean: 3.5, source: "estimate", confidence: "low" },
        visits_per_week: { median: 0.5, min: 0.2, max: 2, source: "estimate", confidence: "low" },
        preferred_times: {
          dist: { morning: 0.05, midday: 0.35, afternoon: 0.25, evening: 0.35 },
          source: "estimate",
          confidence: "low",
        },
      },
    },
  ],
};

export const tacoshopSpec: SimSpec = {
  business: {
    name: "El Taquito",
    type: "taco_shop",
    location: "Mission District, San Francisco, CA",
    hours: { open: "11:00", close: "22:00" },
    menu: [
      { id: "carnitas_taco", name: "Carnitas taco", price: 4.5, prep_min: 2 },
      { id: "al_pastor_taco", name: "Al pastor taco", price: 4.5, prep_min: 2 },
      { id: "burrito", name: "Burrito", price: 12, prep_min: 5 },
      { id: "quesadilla", name: "Quesadilla", price: 9, prep_min: 4 },
      { id: "horchata", name: "Horchata", price: 4, prep_min: 1 },
    ],
    staff: [{ role: "cook", count: 2 }, { role: "cashier", count: 1 }],
  },
  places: [
    { id: "home_area", kind: "residential" },
    { id: "office_zone", kind: "office" },
    { id: "transit_hub", kind: "transit" },
    { id: "el_taquito", kind: "our_business" },
    { id: "rival_burrito", kind: "competitor", prices: { burrito: 10, al_pastor_taco: 4 } },
  ],
  customer_model: tacoshopCustomerModel,
  population: 70,
  days: 3,
  tick_minutes: 15,
  change: {
    label: "Open until midnight instead of 10 PM",
    patch: [{ path: "business.hours.close", value: "24:00" }],
  },
  decisions: ["go_out", "destination", "order", "wait_or_leave", "satisfaction"],
  metrics: ["revenue", "visits", "orders_by_item", "avg_wait_min", "walkouts", "avg_satisfaction", "rival_visits", "revenue_by_segment"],
  seed: 42,
};
