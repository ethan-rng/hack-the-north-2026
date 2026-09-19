import { SimSpec, CustomerModel } from "./schema";
import type { SimSpec as SimSpecT, CustomerModel as CustomerModelT } from "./schema";

export type ValidationIssue = { path: string; message: string };
export type ValidationResult<T> =
  | { ok: true; value: T; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] };

const SHARE_TOLERANCE = 0.01;
const MAX_POPULATION = 100;
const MAX_DAYS = 5;
const MAX_CHOICE_OPTIONS = 20;

export function validateSimSpec(input: unknown): ValidationResult<SimSpecT> {
  const parsed = SimSpec.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
  }
  const spec = parsed.data;
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (spec.population > MAX_POPULATION) {
    issues.push({ path: "population", message: `population must be <= ${MAX_POPULATION}` });
  }
  if (spec.days > MAX_DAYS) {
    issues.push({ path: "days", message: `days must be <= ${MAX_DAYS}` });
  }

  const cm = validateCustomerModel(spec.customer_model);
  if (!cm.ok) return { ok: false, issues: cm.issues.map((i) => ({ ...i, path: `customer_model.${i.path}` })) };
  warnings.push(...cm.warnings.map((w) => ({ ...w, path: `customer_model.${w.path}` })));

  const placeIds = new Set(spec.places.map((p) => p.id));
  const ourBusiness = spec.places.find((p) => p.kind === "our_business");
  if (!ourBusiness) issues.push({ path: "places", message: "at least one place with kind=our_business is required" });

  for (const p of spec.places) {
    if (p.menu_ref && !spec.business.menu.some((m) => m.id === p.menu_ref) && p.menu_ref !== "rival_menu") {
      warnings.push({ path: `places.${p.id}`, message: `menu_ref '${p.menu_ref}' not found in business menu` });
    }
  }

  for (const patch of spec.change.patch) {
    if (patch.path.startsWith("customer_model")) {
      issues.push({
        path: `change.patch`,
        message: "patch cannot modify customer_model; edits must go through the research step",
      });
    }
  }

  const decisionSet = new Set(spec.decisions);
  if (decisionSet.size !== spec.decisions.length) {
    warnings.push({ path: "decisions", message: "duplicate decision types" });
  }

  const menuIds = new Set(spec.business.menu.map((m) => m.id));
  if (menuIds.size !== spec.business.menu.length) {
    issues.push({ path: "business.menu", message: "menu ids must be unique" });
  }

  // Choice list caps are enforced at Jev batching time (destination/order use dynamic sizes).
  if (spec.business.menu.length + 1 > MAX_CHOICE_OPTIONS) {
    warnings.push({
      path: "business.menu",
      message: `menu has ${spec.business.menu.length} items; order choices are capped at ${MAX_CHOICE_OPTIONS}`,
    });
  }
  if (spec.places.length > MAX_CHOICE_OPTIONS) {
    warnings.push({
      path: "places",
      message: `destination choices are capped at ${MAX_CHOICE_OPTIONS}`,
    });
  }

  void placeIds;

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: spec, warnings };
}

export function validateCustomerModel(input: unknown): ValidationResult<CustomerModelT> {
  const parsed = CustomerModel.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
  }
  const cm = parsed.data;
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const totalShare = cm.segments.reduce((s, seg) => s + seg.share, 0);
  if (Math.abs(totalShare - 1) > SHARE_TOLERANCE) {
    issues.push({
      path: "segments",
      message: `segment shares must sum to 1 (got ${totalShare.toFixed(3)})`,
    });
  }

  const ids = new Set<string>();
  for (const seg of cm.segments) {
    if (ids.has(seg.id)) issues.push({ path: `segments.${seg.id}`, message: "duplicate segment id" });
    ids.add(seg.id);
    const catFields: (keyof typeof seg.fields)[] = ["age_band", "visit_purpose", "preferred_times"];
    for (const key of catFields) {
      const field = seg.fields[key] as { dist: Record<string, number> };
      const total = Object.values(field.dist).reduce((a, b) => a + b, 0);
      if (Math.abs(total - 1) > SHARE_TOLERANCE) {
        issues.push({
          path: `segments.${seg.id}.fields.${key}`,
          message: `distribution must sum to 1 (got ${total.toFixed(3)})`,
        });
      }
    }
    const bpv = seg.fields.budget_per_visit;
    if (!(bpv.min <= bpv.median && bpv.median <= bpv.max)) {
      issues.push({
        path: `segments.${seg.id}.fields.budget_per_visit`,
        message: "must satisfy min <= median <= max",
      });
    }
    const vpw = seg.fields.visits_per_week;
    if (!(vpw.min <= vpw.median && vpw.median <= vpw.max)) {
      issues.push({
        path: `segments.${seg.id}.fields.visits_per_week`,
        message: "must satisfy min <= median <= max",
      });
    }
    for (const key of Object.keys(seg.fields) as (keyof typeof seg.fields)[]) {
      const field = seg.fields[key] as { confidence: string };
      if (field.confidence === "low") {
        warnings.push({
          path: `segments.${seg.id}.fields.${key}`,
          message: "low confidence — flag in report",
        });
      }
    }
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: cm, warnings };
}
