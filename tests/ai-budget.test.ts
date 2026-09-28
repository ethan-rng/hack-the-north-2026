import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: DurableObjectState,
      public env: unknown,
    ) {}
  },
}));
import { ProjectAiBudget } from "../cloudflare/budget";
import app from "../cloudflare/index";
import jev from "../services/jev-worker/src/index";
import legacy from "../worker/src/index";
import {
  BUDGET_MESSAGE,
  BUDGET_LIMIT_NANODOLLARS,
  MODEL_PRICES,
  PROJECT_BUDGET_ID,
  ProjectBudgetError,
  BudgetUnavailableError,
  withCloudflareBudget,
  responseUsage,
  type BudgetEnv,
  type BudgetService,
} from "../shared/ai-budget";
import { interpretEvent } from "../cloudflare/ai";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import { newRun } from "../src/core/engine";

const dbs: DatabaseSync[] = [];
afterEach(() => {
  dbs.splice(0).forEach((db) => db.close());
  vi.unstubAllGlobals();
});
function fixture() {
  const db = new DatabaseSync(":memory:");
  dbs.push(db);
  const sql = {
    exec(query: string, ...bindings: (string | number)[]) {
      const statement = db.prepare(query);
      const rows = statement.columns().length
        ? statement.all(...bindings)
        : (statement.run(...bindings), []);
      return {
        one: () => {
          if (rows.length !== 1) throw new Error("Expected one row");
          return rows[0];
        },
        toArray: () => rows,
      };
    },
  };
  const ctx = {
    storage: {
      sql,
      transactionSync<T>(action: () => T) {
        db.exec("BEGIN");
        try {
          const result = action();
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
  } as unknown as DurableObjectState;
  const budget = new ProjectAiBudget(ctx, {});
  const service: BudgetService = {
    status: async () => budget.status(),
    reserve: async (model) => budget.reserve(model),
    settle: async (id, usage) => budget.settle(id, usage),
  };
  const getByName = vi.fn((name: string) => {
    expect(name).toBe(PROJECT_BUDGET_ID);
    return service;
  });
  const env: BudgetEnv = { AI_BUDGET: { getByName } };
  return { db, ctx, budget, env, getByName };
}
function exhaustedFixture() {
  const result = fixture();
  result.db.prepare("UPDATE budget SET spent=?").run(BUDGET_LIMIT_NANODOLLARS);
  return result;
}

describe("one-time project AI budget", () => {
  it("atomically reserves concurrent calls without admitting more than $5", async () => {
    const { budget, ctx } = fixture();
    const price = MODEL_PRICES["@cf/openai/gpt-oss-120b"];
    const max = price.context * (price.input + price.output);
    const results = await Promise.all(
      Array.from({ length: 100 }, async () =>
        budget.reserve("@cf/openai/gpt-oss-120b"),
      ),
    );
    const allowed = results.filter((r) => r.id);
    expect(allowed).toHaveLength(Math.floor(BUDGET_LIMIT_NANODOLLARS / max));
    expect(budget.status().reservedUsd).toBeLessThanOrEqual(5);
    expect(results.filter((r) => r.busy)).toHaveLength(100 - allowed.length);
    expect(budget.status().exhausted).toBe(false);
    budget.settle(allowed[0].id!, { input: 100, output: 1 });
    const restarted = new ProjectAiBudget(ctx, {});
    expect(restarted.status().exhausted).toBe(false);
    expect(restarted.reserve("typesafe/jev").id).not.toBeNull();
  });
  it("permanently stops before a request could exceed the remaining allowance", () => {
    const { db, budget, ctx } = fixture();
    db.prepare("UPDATE budget SET spent=?").run(BUDGET_LIMIT_NANODOLLARS - 100);
    expect(budget.reserve("typesafe/jev").id).toBeNull();
    expect(new ProjectAiBudget(ctx, {}).status().exhausted).toBe(true);
  });
  it("settles provider token usage exactly once and shares the balance across callers", async () => {
    const { budget, env, ctx } = fixture();
    const first = await withCloudflareBudget(env, "typesafe/jev", async () => ({
      state: "Completed",
      result: { usage: { input_tokens: 1000, output_tokens: 40 } },
    }));
    expect(first.state).toBe("Completed");
    expect(budget.status().accountedUsd).toBe(0.000042);
    const r = budget.reserve("@cf/openai/gpt-oss-120b");
    budget.settle(r.id!, { input: 1000, output: 100 });
    budget.settle(r.id!, { input: 0, output: 0 });
    expect(new ProjectAiBudget(ctx, {}).status().accountedUsd).toBe(0.000467);
    expect(budget.status().reservedUsd).toBe(0);
  });
  it("charges the full reservation on upstream errors or missing usage", async () => {
    const { budget, env } = fixture();
    await expect(
      withCloudflareBudget(env, "typesafe/jev", async () => {
        throw new Error("timeout");
      }),
    ).rejects.toThrow("timeout");
    await withCloudflareBudget(env, "typesafe/jev", async () => ({
      answers: {},
    }));
    expect(budget.status().accountedUsd).toBe(0.002688);
    expect(budget.status().reservedUsd).toBe(0);
  });
  it("does not refund an abandoned reservation after object recreation", () => {
    const { budget, ctx } = fixture();
    budget.reserve("typesafe/jev");
    expect(new ProjectAiBudget(ctx, {}).status().reservedUsd).toBe(0.001344);
  });
  it("never calls AI if the budget is exhausted or its storage is unavailable", async () => {
    const { env } = exhaustedFixture();
    const call = vi.fn();
    await expect(
      withCloudflareBudget(env, "typesafe/jev", call),
    ).rejects.toBeInstanceOf(ProjectBudgetError);
    const broken = {
      AI_BUDGET: {
        getByName: () => {
          throw new Error("storage down");
        },
      },
    };
    await expect(
      withCloudflareBudget(broken, "typesafe/jev", call),
    ).rejects.toBeInstanceOf(BudgetUnavailableError);
    expect(call).not.toHaveBeenCalled();
  });
  it("rejects unknown models and malformed usage; accepts both provider usage formats", () => {
    const { budget } = fixture();
    expect(() => budget.reserve("unknown" as never)).toThrow("Unbudgeted");
    expect(
      responseUsage({ usage: { prompt_tokens: 7, completion_tokens: 3 } }),
    ).toEqual({ input: 7, output: 3 });
    expect(
      responseUsage({ usage: { input_tokens: -1, output_tokens: 0 } }),
    ).toBeNull();
    const r = budget.reserve("typesafe/jev");
    budget.settle(r.id!, { input: NaN, output: 1 });
    expect(budget.status().exhausted).toBe(true);
    expect(budget.status().accountedUsd).toBe(0.001344);
  });
  it("returns the budget message across fresh cookies and keeps saved-data reads available", async () => {
    const { env } = exhaustedFixture();
    const getByName = vi.fn(() => ({
      getSnapshot: async () => ({ saved: true }),
    }));
    const bindings = { ...env, SESSIONS: { getByName } } as never;
    for (const cookie of [
      undefined,
      "cc_session=" + "a".repeat(64),
      "cc_session=" + "b".repeat(64),
    ]) {
      const response = await app.fetch(
        new Request("https://example.org/api/setup", {
          method: "POST",
          headers: cookie ? { Cookie: cookie } : {},
        }),
        bindings,
      );
      expect(response.status).toBe(402);
      expect((await response.json()).error).toBe(BUDGET_MESSAGE);
    }
    expect(getByName).not.toHaveBeenCalled();
    const response = await app.fetch(
      new Request("https://example.org/api/session"),
      bindings,
    );
    expect(response.status).toBe(200);
  });
  it("blocks the legacy and authenticated Jev services before inference", async () => {
    const { env } = exhaustedFixture();
    const run = vi.fn();
    // Node lacks the Workers timingSafeEqual extension; constant comparison is sufficient for this test fixture.
    Object.defineProperty(crypto.subtle, "timingSafeEqual", {
      configurable: true,
      value: (a: ArrayBuffer, b: ArrayBuffer) =>
        Buffer.from(a).equals(Buffer.from(b)),
    });
    const protectedResponse = await jev.fetch(
      new Request("https://example.org/v1/jev", {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: "test",
          questions: {
            action: {
              type: "choice",
              instructions: "Choose",
              criteria: { one: "One", two: "Two" },
            },
          },
        }),
      }),
      { ...env, JEV_API_KEY: "test", AI: { run } } as never,
      {} as never,
    );
    expect(protectedResponse.status).toBe(402);
    expect((await protectedResponse.json()).message).toBe(BUDGET_MESSAGE);
    const legacyResponse = await legacy.fetch(
      new Request("https://example.org/jev", {
        method: "POST",
        body: JSON.stringify({
          state: "test",
          questions: [
            {
              agentId: "a",
              type: "choice",
              instructions: "Choose",
              options: ["one", "two"],
            },
          ],
        }),
      }),
      {
        ...env,
        AI: { run },
        JEV_RATE_PER_SEC: "18",
        JEV_BURST: "30",
        JEV_MAX_RETRIES: "0",
      } as never,
    );
    expect(legacyResponse.status).toBe(402);
    expect(run).not.toHaveBeenCalled();
  });
  it("does not fall back to Baseten or another provider after budget exhaustion", async () => {
    const { env } = exhaustedFixture();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const environment = compileEnvironment(
      fallbackConfiguration("Test mall"),
      "Test mall",
      [],
      "unavailable",
      "test",
    );
    await expect(
      interpretEvent(
        {
          ...env,
          BASETEN_API_KEY: "test",
          BASETEN_MODEL: "test",
          AI_GATEWAY_ID: "test",
          AI: { run: vi.fn() },
        } as never,
        environment,
        newRun(environment),
        { originalText: "A sale" } as never,
      ),
    ).rejects.toBeInstanceOf(ProjectBudgetError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
