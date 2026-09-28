import { DurableObject } from "cloudflare:workers";
import {
  BUDGET_LIMIT_NANODOLLARS,
  MODEL_PRICES,
  type BudgetModel,
  type BudgetStatus,
  type TokenUsage,
} from "../shared/ai-budget";

type Ledger = {
  spent: number;
  reserved: number;
  stopped: number;
  started_at: number;
};
/** The coordination unit is this project's one lifetime allowance. No public reset. */
export class ProjectAiBudget extends DurableObject<unknown> {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS budget (
      id INTEGER PRIMARY KEY CHECK(id=1), spent INTEGER NOT NULL,
      reserved INTEGER NOT NULL, stopped INTEGER NOT NULL, started_at INTEGER NOT NULL)`);
    ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO budget VALUES (1,0,0,0,?)",
      Date.now(),
    );
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, model TEXT NOT NULL, amount INTEGER NOT NULL)`);
  }
  private ledger(): Ledger {
    return this.ctx.storage.sql
      .exec<Ledger>(
        "SELECT spent,reserved,stopped,started_at FROM budget WHERE id=1",
      )
      .one();
  }
  status(): BudgetStatus {
    const row = this.ledger();
    return {
      limitUsd: BUDGET_LIMIT_NANODOLLARS / 1e9,
      accountedUsd: row.spent / 1e9,
      reservedUsd: row.reserved / 1e9,
      remainingUsd:
        Math.max(0, BUDGET_LIMIT_NANODOLLARS - row.spent - row.reserved) / 1e9,
      exhausted: !!row.stopped || row.spent >= BUDGET_LIMIT_NANODOLLARS,
      startedAt: row.started_at,
    };
  }
  reserve(model: BudgetModel) {
    if (!Object.hasOwn(MODEL_PRICES, model))
      throw new Error("Unbudgeted AI model");
    const price = MODEL_PRICES[model];
    const amount = price.context * (price.input + price.output);
    return this.ctx.storage.transactionSync(() => {
      const row = this.ledger();
      if (row.stopped || row.spent + amount > BUDGET_LIMIT_NANODOLLARS) {
        // Permanent stop: refunds from in-flight work never restart the project.
        this.ctx.storage.sql.exec("UPDATE budget SET stopped=1 WHERE id=1");
        return { id: null, status: this.status() };
      }
      if (row.spent + row.reserved + amount > BUDGET_LIMIT_NANODOLLARS)
        return { id: null, status: this.status(), busy: true };
      const id = crypto.randomUUID();
      this.ctx.storage.sql.exec(
        "INSERT INTO reservations VALUES (?,?,?)",
        id,
        model,
        amount,
      );
      this.ctx.storage.sql.exec(
        "UPDATE budget SET reserved=reserved+? WHERE id=1",
        amount,
      );
      return { id, status: this.status() };
    });
  }
  settle(id: string, usage: TokenUsage | null) {
    return this.ctx.storage.transactionSync(() => {
      const reservation = this.ctx.storage.sql
        .exec<{ model: BudgetModel; amount: number }>(
          "SELECT model,amount FROM reservations WHERE id=?",
          id,
        )
        .toArray()[0];
      if (!reservation) return this.status(); // Idempotent completion.
      const price = MODEL_PRICES[reservation.model];
      let amount = reservation.amount;
      const valid =
        usage &&
        Number.isSafeInteger(usage.input) &&
        Number.isSafeInteger(usage.output) &&
        usage.input >= 0 &&
        usage.output >= 0 &&
        usage.input <= price.context &&
        usage.output <= price.context;
      if (valid)
        amount = usage.input * price.input + usage.output * price.output;
      if (usage && !valid)
        this.ctx.storage.sql.exec("UPDATE budget SET stopped=1 WHERE id=1");
      this.ctx.storage.sql.exec(
        "UPDATE budget SET reserved=reserved-?,spent=spent+? WHERE id=1",
        reservation.amount,
        amount,
      );
      this.ctx.storage.sql.exec("DELETE FROM reservations WHERE id=?", id);
      return this.status();
    });
  }
}
