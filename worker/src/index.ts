// Cloudflare Worker: rate-limited proxy in front of Workers AI's typesafe/jev
// model. Next.js POSTs { state, questions[] }; the worker translates to Jev's
// { state, questions: { <id>: {...} } } shape, calls env.AI.run(), and returns
// { answers: [{ agentId, probabilities }] } so the sim can sample as usual.

export interface Env {
  AI: Ai;
  JEV_RATE_PER_SEC: string;
  JEV_BURST: string;
  JEV_MAX_RETRIES: string;
  CORS_ALLOWED_ORIGIN: string;
}

type JevDecisionType = "noul" | "choice" | "score";
interface JevQuestion {
  agentId: string;
  instructions: string;
  type: JevDecisionType;
  options?: string[];
}
interface JevAnswer {
  agentId: string;
  probabilities: Record<string, number>;
}
interface ProxyRequest {
  state: string;
  questions: JevQuestion[];
}
interface ProxyResponse {
  answers: JevAnswer[];
}

// Token bucket per isolate. Cloudflare may spin up several isolates under
// load; for a hackathon demo (single client) this is close enough.
const bucket: { tokens: number; last: number } = { tokens: 30, last: Date.now() };

async function acquire(rate: number, cap: number): Promise<void> {
  const now = Date.now();
  const dt = (now - bucket.last) / 1000;
  bucket.tokens = Math.min(cap, bucket.tokens + dt * rate);
  bucket.last = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return;
  }
  const waitMs = ((1 - bucket.tokens) / rate) * 1000;
  await sleep(waitMs);
  bucket.tokens = 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function corsHeaders(env: Env): HeadersInit {
  return {
    "access-control-allow-origin": env.CORS_ALLOWED_ORIGIN ?? "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok", { status: 200, headers: corsHeaders(env) });
    if (url.pathname !== "/jev" || req.method !== "POST") return json({ error: "not found" }, 404, env);

    let body: ProxyRequest;
    try {
      body = (await req.json()) as ProxyRequest;
    } catch {
      return json({ error: "invalid json" }, 400, env);
    }
    if (!body?.questions?.length) return json({ error: "questions[] required" }, 400, env);

    const rate = Number(env.JEV_RATE_PER_SEC ?? "18");
    const burst = Number(env.JEV_BURST ?? "30");
    const maxRetries = Number(env.JEV_MAX_RETRIES ?? "3");

    const jevQuestions = toJevQuestions(body.questions);

    let attempt = 0;
    let backoffMs = 250;
    while (true) {
      await acquire(rate, burst);
      try {
        const raw = await env.AI.run("typesafe/jev" as never, {
          state: body.state,
          questions: jevQuestions,
        } as never);
        const answers = fromJevAnswers(body.questions, raw);
        return json({ answers } satisfies ProxyResponse, 200, env);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt >= maxRetries) return json({ error: `workers-ai failed: ${msg}` }, 502, env);
        await sleep(backoffMs);
        backoffMs = Math.min(4000, backoffMs * 2);
        attempt += 1;
      }
    }
  },
};

// Convert our flat array into Jev's { <questionId>: {...} } shape, adding
// per-type criteria descriptions so Jev has enough to judge.
function toJevQuestions(qs: JevQuestion[]): Record<string, JevBody> {
  const out: Record<string, JevBody> = {};
  for (const q of qs) {
    if (q.type === "noul") {
      out[q.agentId] = {
        type: "noul",
        instructions: q.instructions,
        criteria: {
          true: "The behavior described in the instructions would apply to this customer right now",
          false: "It would not apply — the customer would not do this",
        },
      };
    } else if (q.type === "score") {
      out[q.agentId] = {
        type: "score",
        instructions: q.instructions,
        criteria: {
          "1": "very poor",
          "2": "poor",
          "3": "neutral",
          "4": "good",
          "5": "excellent",
        },
      };
    } else {
      const opts = q.options ?? [];
      const criteria: Record<string, string> = {};
      for (const o of opts) criteria[o] = o.replace(/_/g, " ");
      out[q.agentId] = {
        type: "choice",
        instructions: q.instructions,
        criteria,
      };
    }
  }
  return out;
}

interface JevBody {
  type: "noul" | "choice" | "score";
  instructions: string;
  criteria: Record<string, string>;
}

interface NoulResult {
  type: "noul";
  noul: number;
}
interface ChoiceResult {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}
interface ScoreResult {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}
type JevResult = NoulResult | ChoiceResult | ScoreResult;

// Convert Jev's per-type response into our uniform { probabilities } shape.
function fromJevAnswers(qs: JevQuestion[], raw: unknown): JevAnswer[] {
  const answers = (raw as { answers?: Record<string, JevResult> })?.answers ?? {};
  return qs.map((q) => {
    const r = answers[q.agentId];
    return { agentId: q.agentId, probabilities: probsFor(q, r) };
  });
}

function probsFor(q: JevQuestion, r: JevResult | undefined): Record<string, number> {
  if (!r) return uniformFor(q);
  if (r.type === "noul") return { yes: clamp01(r.noul), no: clamp01(1 - r.noul) };
  if (r.type === "score" || r.type === "choice") {
    const out: Record<string, number> = {};
    let total = 0;
    for (const [k, v] of Object.entries(r.probabilities ?? {})) {
      const n = clamp01(Number(v));
      out[k] = n;
      total += n;
    }
    if (total === 0) return uniformFor(q);
    for (const k of Object.keys(out)) out[k] /= total;
    return out;
  }
  return uniformFor(q);
}

function uniformFor(q: JevQuestion): Record<string, number> {
  const opts = q.type === "noul" ? ["yes", "no"] : q.type === "score" ? ["1", "2", "3", "4", "5"] : q.options ?? [];
  if (opts.length === 0) return {};
  const p = 1 / opts.length;
  const out: Record<string, number> = {};
  for (const o of opts) out[o] = p;
  return out;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function json(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(env) },
  });
}
