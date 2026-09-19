import { z } from "zod";

const MODEL = "typesafe/jev";
const MAX_BYTES = 64 * 1024;
const label = z.string().min(1).max(128);
const description = z.string().min(1).max(4000);
const question = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("choice"),
    instructions: description,
    criteria: z.record(label, description).refine(
      (v) => Object.keys(v).length >= 2 && Object.keys(v).length <= 32,
      "Provide 2–32 choices",
    ),
  }),
  z.strictObject({
    type: z.literal("score"),
    instructions: description,
    criteria: z.array(description).min(2).max(32),
  }),
  z.strictObject({
    type: z.literal("noul"),
    instructions: description,
    criteria: z.strictObject({ true: description, false: description }).optional(),
  }),
]);
export const inputSchema = z.strictObject({
  state: z.union([z.string().min(1), z.record(z.string(), z.unknown()), z.array(z.unknown())]),
  questions: z.record(label, question).refine(
    (v) => Object.keys(v).length >= 1 && Object.keys(v).length <= 16,
    "Provide 1–16 questions",
  ),
});

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Use Content-Type: application/json");
  }
  if (Number(request.headers.get("content-length")) > MAX_BYTES) {
    throw new HttpError(413, "payload_too_large", "Maximum request size is 64 KiB");
  }
  if (!request.body) throw new HttpError(400, "invalid_json", "A JSON body is required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new HttpError(413, "payload_too_large", "Maximum request size is 64 KiB");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "invalid_json", "Body must be valid JSON");
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const start = Date.now();
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store", "X-Request-Id": requestId, ...extra },
      });
    try {
      const path = new URL(request.url).pathname;
      if (path === "/health" && request.method === "GET") {
        return json({ status: "ok", service: "crowd-control-jev", model: MODEL });
      }
      if (path !== "/v1/jev") return json({ error: "not_found" }, 404);
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
      if (!env.JEV_API_KEY) throw new HttpError(503, "not_configured", "Endpoint key is not configured");

      const supplied = request.headers.get("authorization") ?? "";
      const encoder = new TextEncoder();
      const [actual, expected] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
        crypto.subtle.digest("SHA-256", encoder.encode(`Bearer ${env.JEV_API_KEY}`)),
      ]);
      if (!crypto.subtle.timingSafeEqual(actual, expected)) {
        return json({ error: "unauthorized" }, 401, { "WWW-Authenticate": "Bearer" });
      }
      const parsed = inputSchema.safeParse(await readJson(request));
      if (!parsed.success) {
        return json({ error: "invalid_input", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) }, 400);
      }

      const signal = AbortSignal.timeout(20_000);
      let result: Record<string, unknown>;
      try {
        result = await env.AI.run(MODEL, parsed.data, {
          signal,
          gateway: { id: env.AI_GATEWAY_ID, skipCache: true },
        });
      } catch {
        // Do not log state, credentials, or upstream errors that may echo inputs.
        throw new HttpError(signal.aborted ? 504 : 502, signal.aborted ? "inference_timeout" : "inference_failed",
          "Jev inference did not complete; preserve the person's current behavior and retry later");
      }
      if (!result.answers || typeof result.answers !== "object" || Array.isArray(result.answers)) {
        throw new HttpError(502, "invalid_model_response", "Jev returned no structured answers");
      }
      console.log(JSON.stringify({ event: "jev_completed", requestId, durationMs: Date.now() - start }));
      return json(result);
    } catch (error) {
      const known = error instanceof HttpError;
      const status = known ? error.status : 500;
      const code = known ? error.code : "internal_error";
      console.error(JSON.stringify({ event: "jev_failed", requestId, status, code, durationMs: Date.now() - start }));
      return json({ error: code, message: known ? error.message : "Unexpected service failure", requestId }, status);
    }
  },
} satisfies ExportedHandler<Env>;
