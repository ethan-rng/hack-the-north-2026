import type { JevClient, JevQuestion, JevRequest, JevAnswer } from "@/jev/client";

const MAX_QUESTIONS_PER_REQUEST = 30;
const TOKEN_BUDGET = 10_000;

// Rough token estimate: 4 chars per token.
function estTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

export async function batchAsk(
  jev: JevClient,
  state: string,
  questions: JevQuestion[],
): Promise<Map<string, JevAnswer>> {
  const answers = new Map<string, JevAnswer>();
  if (questions.length === 0) return answers;

  const stateTokens = estTokens(state);
  const batches: JevQuestion[][] = [];
  let current: JevQuestion[] = [];
  let currentTokens = stateTokens;
  for (const q of questions) {
    const qTokens = estTokens(q.instructions) + (q.options?.length ?? 2) * 4;
    if (
      current.length >= MAX_QUESTIONS_PER_REQUEST ||
      currentTokens + qTokens > TOKEN_BUDGET
    ) {
      batches.push(current);
      current = [];
      currentTokens = stateTokens;
    }
    current.push(q);
    currentTokens += qTokens;
  }
  if (current.length) batches.push(current);

  const results = await Promise.all(
    batches.map((qs) => {
      const req: JevRequest = { state, questions: qs };
      return jev.ask(req);
    }),
  );
  for (const arr of results) for (const a of arr) answers.set(a.agentId, a);
  return answers;
}
