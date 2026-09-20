import { afterEach, describe, expect, it, vi } from "vitest";
import { interpretEvent, WORKERS_AI_FALLBACK_MODEL } from "../cloudflare/ai";
import { newRun } from "../src/core/engine";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import type { Event } from "../src/core/types";

const interpretedEvent = {
  title: "Food prices fall",
  description: "A global food promotion is announced.",
  durationSeconds: 300,
  placeId: null,
  visual: "marker",
  approximationNotes: [],
  effects: [
    {
      kind: "announcement",
      targetId: null,
      value: 0,
      subjectKey: null,
    },
  ],
};

function fixture() {
  const environment = compileEnvironment(
    fallbackConfiguration("Test mall"),
    "Test mall",
    [],
    "unavailable",
    "ai-fallback-test",
  );
  const run = newRun(environment);
  const event: Event = {
    id: "event-1",
    originalText: "Food is 50% off",
    title: "Interpreting event…",
    description: "",
    status: "interpreting",
    startTimeSeconds: 0,
    durationSeconds: 300,
    position: { x: 0, z: 0 },
    effects: [],
    approximationNotes: [],
    visual: "marker",
    submittedAt: 0,
  };
  return { environment, run, event };
}

afterEach(() => vi.unstubAllGlobals());

describe("structured AI failover", () => {
  it("uses Baseten when its structured response is valid", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(interpretedEvent) } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const workersRun = vi.fn();
    const ai = { run: workersRun } as unknown as Ai;
    const { environment, run, event } = fixture();

    await interpretEvent(
      {
        BASETEN_API_KEY: "configured",
        BASETEN_MODEL: "openai/gpt-oss-120b",
        AI_GATEWAY_ID: "crowd-control",
        AI: ai,
      },
      environment,
      run,
      event,
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(workersRun).not.toHaveBeenCalled();
    expect(event.title).toBe("Food prices fall");
    expect(event.approximationNotes).toEqual([]);
  });

  it("falls back to the equivalent Workers AI model when Baseten fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    );
    const workersRun = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(interpretedEvent) } }],
    });
    const ai = { run: workersRun } as unknown as Ai;
    const { environment, run, event } = fixture();

    await interpretEvent(
      {
        BASETEN_API_KEY: "configured",
        BASETEN_MODEL: "openai/gpt-oss-120b",
        AI_GATEWAY_ID: "crowd-control",
        AI: ai,
      },
      environment,
      run,
      event,
    );

    expect(workersRun).toHaveBeenCalledOnce();
    expect(workersRun.mock.calls[0][0]).toBe(WORKERS_AI_FALLBACK_MODEL);
    expect(event.title).toBe("Food prices fall");
    expect(event.approximationNotes).toContain(
      "Baseten was unavailable, so Cloudflare Workers AI interpreted this event.",
    );
  });
});
