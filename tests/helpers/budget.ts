import type { BudgetEnv, BudgetStatus } from "../../shared/ai-budget";
// Provider unit tests have no Cloudflare storage. Budget behavior has its own tests.
export const availableBudget: BudgetStatus = {
  limitUsd: 5,
  accountedUsd: 0,
  reservedUsd: 0,
  remainingUsd: 5,
  exhausted: false,
  startedAt: 0,
};
export function mockBudgetBinding(): BudgetEnv["AI_BUDGET"] {
  return {
    getByName: () => ({
      status: async () => availableBudget,
      reserve: async () => ({
        id: crypto.randomUUID(),
        status: availableBudget,
      }),
      settle: async () => availableBudget,
    }),
  };
}
