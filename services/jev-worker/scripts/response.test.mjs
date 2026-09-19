import test from "node:test";
import assert from "node:assert/strict";
import { normalizeJevResponse } from "../src/jev-response.ts";

const answer = {
  model: "jev-1.13.0",
  answers: { nextAction: { type: "choice", choice: "move_to_food", confidence: 1 } },
  usage: { input_tokens: 619, output_tokens: 48 },
};

test("accepts native Jev output", () => {
  assert.deepEqual(normalizeJevResponse(answer), answer);
});
test("unwraps the observed Cloudflare completed result without leaking gateway metadata", () => {
  assert.deepEqual(normalizeJevResponse({ state: "Completed", result: answer, gatewayMetadata: { keySource: "Unified" } }), answer);
});
test("does not treat failed, pending, or malformed output as a successful decision", () => {
  for (const value of [
    { state: "Failed", result: answer },
    { state: "Pending", result: answer },
    { state: "Completed", result: null },
    { state: "Completed", result: { answers: {} } },
    { answers: [] },
    {},
  ]) assert.throws(() => normalizeJevResponse(value));
});
