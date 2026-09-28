/** One project allowance, shared across every Worker and browser session. */
export const PROJECT_BUDGET_ID = "commotion-cloudflare-ai-v1";
export const BUDGET_MESSAGE =
  "The allocated budget for this project has been reached. No further AI requests can be processed.";
export const BUDGET_UNAVAILABLE_MESSAGE =
  "AI requests are temporarily unavailable because the project budget could not be verified.";
export const BUDGET_LIMIT_NANODOLLARS = 5_000_000_000;

// Published Cloudflare prices/context limits, checked 2026-09-28. Integer USD/1e9.
// Reserve the entire model context for BOTH input and output, then settle usage.
// This deliberately overestimates rather than guessing token counts from text.
export const MODEL_PRICES = {
  "typesafe/jev": { context: 32_000, input: 42, output: 0 },
  "@cf/openai/gpt-oss-120b": { context: 128_000, input: 350, output: 750 },
} as const;
export type BudgetModel = keyof typeof MODEL_PRICES;
export type TokenUsage = { input: number; output: number };
export type BudgetStatus = {
  limitUsd: number;
  accountedUsd: number;
  reservedUsd: number;
  remainingUsd: number;
  exhausted: boolean;
  startedAt: number;
};
export interface BudgetService {
  status(): Promise<BudgetStatus>;
  reserve(
    model: BudgetModel,
  ): Promise<{ id: string | null; status: BudgetStatus; busy?: boolean }>;
  settle(id: string, usage: TokenUsage | null): Promise<BudgetStatus>;
}
export interface BudgetEnv {
  AI_BUDGET: { getByName(name: string): BudgetService };
}
export class ProjectBudgetError extends Error {
  readonly code = "project_budget_exhausted";
  readonly status = 402;
  constructor() {
    super(BUDGET_MESSAGE);
    this.name = "ProjectBudgetError";
  }
}
export class BudgetUnavailableError extends Error {
  readonly code = "project_budget_unavailable";
  readonly status = 503;
  constructor() {
    super(BUDGET_UNAVAILABLE_MESSAGE);
    this.name = "BudgetUnavailableError";
  }
}
export class BudgetBusyError extends Error {
  readonly code = "project_budget_reserved";
  readonly status = 429;
  constructor() {
    super(
      "The remaining project budget is reserved for AI requests already in progress. Please try again shortly.",
    );
    this.name = "BudgetBusyError";
  }
}
export function isBudgetError(
  error: unknown,
): error is ProjectBudgetError | BudgetUnavailableError | BudgetBusyError {
  return (
    error instanceof ProjectBudgetError ||
    error instanceof BudgetUnavailableError ||
    error instanceof BudgetBusyError
  );
}
export function budgetErrorResponse(
  error: ProjectBudgetError | BudgetUnavailableError | BudgetBusyError,
) {
  return Response.json(
    { error: error.message, code: error.code, message: error.message },
    { status: error.status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function getProjectBudget(env: BudgetEnv): Promise<BudgetStatus> {
  try {
    return await env.AI_BUDGET.getByName(PROJECT_BUDGET_ID).status();
  } catch {
    throw new BudgetUnavailableError();
  }
}
export async function assertProjectBudget(env: BudgetEnv): Promise<void> {
  if ((await getProjectBudget(env)).exhausted) throw new ProjectBudgetError();
}
export function responseUsage(response: unknown): TokenUsage | null {
  if (!response || typeof response !== "object") return null;
  const value = response as Record<string, unknown>;
  if (value.state === "Completed") return responseUsage(value.result);
  const usage = value.usage;
  if (!usage || typeof usage !== "object") return null;
  const record = usage as Record<string, unknown>;
  const input = record.input_tokens ?? record.prompt_tokens;
  const output = record.output_tokens ?? record.completion_tokens;
  if (
    typeof input !== "number" ||
    typeof output !== "number" ||
    !Number.isSafeInteger(input) ||
    !Number.isSafeInteger(output) ||
    input < 0 ||
    output < 0
  )
    return null;
  return { input, output };
}
export async function withCloudflareBudget<T>(
  env: BudgetEnv,
  model: BudgetModel,
  invoke: () => Promise<T>,
): Promise<T> {
  let service: BudgetService;
  let reservation: Awaited<ReturnType<BudgetService["reserve"]>>;
  try {
    service = env.AI_BUDGET.getByName(PROJECT_BUDGET_ID);
    reservation = await service.reserve(model);
  } catch {
    throw new BudgetUnavailableError();
  }
  if (!reservation.id) {
    if (reservation.busy) throw new BudgetBusyError();
    throw new ProjectBudgetError();
  }
  let result: T;
  try {
    result = await invoke();
  } catch (error) {
    // An upstream timeout/error may still be billed. Never refund uncertain work.
    try {
      await service.settle(reservation.id, null);
    } catch {
      throw new BudgetUnavailableError();
    }
    throw error;
  }
  try {
    await service.settle(reservation.id, responseUsage(result));
  } catch {
    throw new BudgetUnavailableError();
  }
  return result;
}
