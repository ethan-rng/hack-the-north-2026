import { hashSeed, mulberry32 } from "@/lib/rng";
import type { JevAnswer, JevClient, JevQuestion, JevRequest } from "./client";
import { optionsFor } from "./client";

// Deterministic, seeded fake used until real Jev is wired.
// The same (state, agentId, question) always produces the same probabilities.
export class MockJevClient implements JevClient {
  constructor(private readonly seedSalt = "mock-jev") {}

  async ask(req: JevRequest): Promise<JevAnswer[]> {
    return req.questions.map((q) => this.answer(req.state, q));
  }

  private answer(state: string, q: JevQuestion): JevAnswer {
    const rng = mulberry32(hashSeed(`${this.seedSalt}|${state}|${q.agentId}|${q.type}`));
    const opts = optionsFor(q);
    const raw = opts.map(() => rng());
    // Skew slightly by question type to keep results plausible-looking.
    const biased = raw.map((r, i) => bias(q, opts[i], r));
    const total = biased.reduce((a, b) => a + b, 0);
    const probabilities: Record<string, number> = {};
    opts.forEach((o, i) => {
      probabilities[o] = biased[i] / total;
    });
    return { agentId: q.agentId, probabilities };
  }
}

function bias(q: JevQuestion, option: string, r: number): number {
  if (q.type === "noul" && option === "yes") return r + 0.15;
  if (q.type === "score") {
    // gentle central tendency around 3-4
    const n = Number(option);
    const center = 1 - Math.abs(n - 3.5) / 4;
    return r * center + 0.05;
  }
  if (q.type === "choice") {
    if (option === "our_business") return r + 0.25;
    if (option === "somewhere_else") return r * 0.4;
  }
  return r + 0.05;
}
