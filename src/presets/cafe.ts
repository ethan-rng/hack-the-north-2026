import type { SimSpec, CustomerModel } from "@/sim/schema";

export const cafeCustomerModel: CustomerModel = {
  location: "N1H postal area, Guelph, ON",
  segments: [
    {
      id: "students",
      share: 0.4,
      fields: {
        age_band: {
          dist: { "18-24": 0.85, "25-44": 0.15 },
          source: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm",
          confidence: "high",
        },
        budget_per_visit: {
          median: 6,
          min: 3,
          max: 10,
          source: "estimate",
          confidence: "low",
        },
        visit_purpose: {
          dist: { study_or_work: 0.55, grab_and_go: 0.3, social: 0.15 },
          source: "owner",
          confidence: "high",
        },
        price_sensitivity: {
          mean: 4.2,
          source: "https://www.example.com/student-price-sensitivity",
          confidence: "medium",
        },
        visits_per_week: {
          median: 3,
          min: 1,
          max: 7,
          source: "https://www.example.com/uog-cafe-survey",
          confidence: "medium",
        },
        preferred_times: {
          dist: { morning: 0.2, midday: 0.3, afternoon: 0.4, evening: 0.1 },
          source: "owner",
          confidence: "high",
        },
      },
    },
    {
      id: "office_workers",
      share: 0.35,
      fields: {
        age_band: {
          dist: { "25-44": 0.6, "45-64": 0.35, "65+": 0.05 },
          source: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm",
          confidence: "high",
        },
        budget_per_visit: {
          median: 8,
          min: 4,
          max: 18,
          source: "estimate",
          confidence: "medium",
        },
        visit_purpose: {
          dist: { grab_and_go: 0.6, study_or_work: 0.25, social: 0.15 },
          source: "estimate",
          confidence: "medium",
        },
        price_sensitivity: {
          mean: 3.0,
          source: "estimate",
          confidence: "low",
        },
        visits_per_week: {
          median: 4,
          min: 1,
          max: 10,
          source: "estimate",
          confidence: "medium",
        },
        preferred_times: {
          dist: { morning: 0.55, midday: 0.25, afternoon: 0.15, evening: 0.05 },
          source: "estimate",
          confidence: "medium",
        },
      },
    },
    {
      id: "locals",
      share: 0.25,
      fields: {
        age_band: {
          dist: { "25-44": 0.35, "45-64": 0.4, "65+": 0.25 },
          source: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm",
          confidence: "high",
        },
        budget_per_visit: {
          median: 7,
          min: 3,
          max: 15,
          source: "estimate",
          confidence: "medium",
        },
        visit_purpose: {
          dist: { social: 0.5, grab_and_go: 0.3, study_or_work: 0.2 },
          source: "estimate",
          confidence: "medium",
        },
        price_sensitivity: {
          mean: 3.5,
          source: "estimate",
          confidence: "low",
        },
        visits_per_week: {
          median: 2,
          min: 0.5,
          max: 5,
          source: "estimate",
          confidence: "medium",
        },
        preferred_times: {
          dist: { morning: 0.3, midday: 0.3, afternoon: 0.3, evening: 0.1 },
          source: "estimate",
          confidence: "medium",
        },
      },
    },
  ],
};

export const cafeSpec: SimSpec = {
  business: {
    name: "Bean There",
    type: "cafe",
    location: "N1H postal area, Guelph, ON",
    hours: { open: "07:00", close: "17:00" },
    menu: [
      { id: "latte", name: "Latte", price: 5.0, prep_min: 3 },
      { id: "drip", name: "Drip coffee", price: 2.75, prep_min: 1 },
      { id: "muffin", name: "Muffin", price: 3.5, prep_min: 0 },
      { id: "bagel", name: "Bagel & cream cheese", price: 4.25, prep_min: 2 },
      { id: "matcha", name: "Matcha latte", price: 5.5, prep_min: 3 },
    ],
    staff: [{ role: "barista", count: 2 }],
  },
  places: [
    { id: "home_area", kind: "residential" },
    { id: "campus", kind: "school" },
    { id: "office_zone", kind: "office" },
    { id: "bean_there", kind: "our_business" },
    {
      id: "rival_cafe",
      kind: "competitor",
      menu_ref: "rival_menu",
      prices: { latte: 4.75, drip: 2.5, muffin: 3.25 },
    },
  ],
  customer_model: cafeCustomerModel,
  population: 60,
  days: 3,
  tick_minutes: 15,
  change: {
    label: "Latte from $5.00 to $5.50",
    patch: [{ path: "business.menu.latte.price", value: 5.5 }],
  },
  decisions: ["go_out", "destination", "order", "wait_or_leave", "satisfaction"],
  metrics: [
    "revenue",
    "visits",
    "orders_by_item",
    "avg_wait_min",
    "walkouts",
    "avg_satisfaction",
    "rival_visits",
    "revenue_by_segment",
  ],
  seed: 42,
};
