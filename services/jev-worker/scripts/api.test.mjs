import test from "node:test";
import assert from "node:assert/strict";

const base = process.env.JEV_BASE_URL;
const key = process.env.JEV_API_KEY;
assert.ok(base && key, "Load .env.team or set JEV_BASE_URL and JEV_API_KEY first");
const send = (body, options = {}) => fetch(`${base}/v1/jev`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...options.headers },
  body,
});

test("health is reachable without inference", async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).model, "typesafe/jev");
});
test("missing and incorrect keys are rejected", async () => {
  for (const authorization of ["", "Bearer incorrect"]) {
    const response = await send("{}", { headers: { Authorization: authorization } });
    assert.equal(response.status, 401);
  }
});
test("invalid JSON and missing questions are rejected", async () => {
  for (const body of ["{", JSON.stringify({ state: {} }), JSON.stringify({ state: {}, questions: {} })]) {
    assert.equal((await send(body)).status, 400);
  }
});
test("invalid question types and empty choices are rejected", async () => {
  for (const question of [{ type: "chat", instructions: "hi" }, { type: "choice", instructions: "choose", criteria: {} }]) {
    assert.equal((await send(JSON.stringify({ state: {}, questions: { action: question } }))).status, 400);
  }
});
test("large requests are rejected", async () => {
  assert.equal((await send(JSON.stringify({ state: "x".repeat(65537) }))).status, 413);
});
test("wrong methods and content types are rejected", async () => {
  assert.equal((await fetch(`${base}/v1/jev`)).status, 405);
  assert.equal((await send("{}", { headers: { "Content-Type": "text/plain" } })).status, 415);
});
