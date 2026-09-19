import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.JEV_BASE_URL;
const key = process.env.JEV_API_KEY;
assert.ok(base && key, "Load .env.team or set JEV_BASE_URL and JEV_API_KEY first");
const input = JSON.parse(await readFile(new URL("../examples/decision.json", import.meta.url), "utf8"));
const start = Date.now();
const response = await fetch(`${base}/v1/jev`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify(input),
  signal: AbortSignal.timeout(30_000),
});
const result = await response.json();
assert.equal(response.status, 200, JSON.stringify(result));
assert.ok(Object.hasOwn(input.questions.nextAction.criteria, result.answers?.nextAction?.choice), "Model must choose an offered action");
console.log(JSON.stringify({ latencyMs: Date.now() - start, requestId: response.headers.get("x-request-id"), ...result }, null, 2));
