export type JevDecisionType = "noul" | "choice" | "score";

export interface JevQuestion {
  agentId: string;
  instructions: string;
  type: JevDecisionType;
  options?: string[];
}

export interface JevRequest {
  state: string;
  questions: JevQuestion[];
}

export interface JevAnswer {
  agentId: string;
  probabilities: Record<string, number>;
}

export interface JevClient {
  ask(req: JevRequest): Promise<JevAnswer[]>;
}

export const NOUL_OPTIONS = ["yes", "no"] as const;
export const SCORE_OPTIONS = ["1", "2", "3", "4", "5"] as const;

export function optionsFor(q: JevQuestion): string[] {
  if (q.type === "noul") return [...NOUL_OPTIONS];
  if (q.type === "score") return [...SCORE_OPTIONS];
  if (!q.options || q.options.length === 0) {
    throw new Error(`choice question ${q.agentId} missing options`);
  }
  return q.options;
}
