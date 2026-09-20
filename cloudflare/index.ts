import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import {
  activateEvent,
  applyDecision,
  resultFor,
  uid,
} from "../src/core/engine";
import {
  advanceSegment,
  captureFrame,
  newScenario,
  newSegment,
  settlePopulation,
} from "../src/core/playback";
import type {
  Event,
  Recording,
  ReplayFrame,
  Run,
  SessionSnapshot,
} from "../src/core/types";
import { decide, interpretEvent, researchEnvironment, type AIEnv } from "./ai";

interface Bindings extends AIEnv {
  SESSIONS: DurableObjectNamespace<SimulationSession>;
  ASSETS: Fetcher;
}
interface StoredSession extends SessionSnapshot {
  job?: { segmentId: string; working: Run };
}
const initial = (): StoredSession => ({
  setup: { id: "", status: "idle", description: "", message: "", startedAt: 0 },
  results: [],
  segments: [],
});
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const failure = (status: number, error: string) => ({ status, error });
function rpcJson(data: unknown, status = 200) {
  if (data && typeof data === "object" && "error" in data && "status" in data)
    return json(data, Number(data.status));
  return json(data, status);
}
class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class SimulationSession extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS frames (run_id TEXT NOT NULL, segment_id TEXT NOT NULL, time INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(run_id, segment_id, time))",
    );
  }
  private load(): StoredSession {
    const row = this.ctx.storage.sql
      .exec<{ data: string }>("SELECT data FROM session WHERE id=1")
      .toArray()[0];
    const state: StoredSession = row ? JSON.parse(row.data) : initial();
    state.segments ??= [];
    // Existing live sessions become stationary after upgrading; no old alarm keeps inference running.
    if (state.run?.status === "running" && !state.job)
      state.run.status = "paused";
    return state;
  }
  private publicState(state: StoredSession): SessionSnapshot {
    const { job: _job, ...snapshot } = state;
    return snapshot;
  }
  private save(state: StoredSession) {
    this.ctx.storage.sql.exec(
      "INSERT INTO session (id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      JSON.stringify(state),
    );
    const payload = JSON.stringify(this.publicState(state));
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        ws.close(1011, "Reconnect for current state");
      }
    }
  }
  private record(segmentId: string, frame: ReplayFrame) {
    this.ctx.storage.sql.exec(
      "INSERT INTO frames(run_id,segment_id,time,data) VALUES(?,?,?,?) ON CONFLICT(run_id,segment_id,time) DO UPDATE SET data=excluded.data",
      frame.runId,
      segmentId,
      frame.time,
      JSON.stringify(frame),
    );
  }
  getSnapshot() {
    return this.publicState(this.load());
  }
  getRecording(segmentId: string) {
    const state = this.load();
    const segment = state.segments.find(
      (s) => s.id === segmentId && s.runId === state.run?.runId,
    );
    if (!segment || segment.status !== "ready")
      return failure(404, "Recording is not available");
    const frames = this.ctx.storage.sql
      .exec<{ data: string }>(
        "SELECT data FROM frames WHERE run_id=? AND segment_id=? ORDER BY time",
        segment.runId,
        segment.id,
      )
      .toArray()
      .map((row) => JSON.parse(row.data) as ReplayFrame);
    return { segmentId, runId: segment.runId, frames } satisfies Recording;
  }
  async generate(description: string) {
    const previous = this.load();
    if (["researching", "building"].includes(previous.setup.status))
      return failure(409, "An environment is already being generated");
    if (Date.now() - previous.setup.startedAt < 15000)
      return failure(429, "Please wait a moment before regenerating");
    const state = initial();
    state.setup = {
      id: uid(),
      description,
      status: "researching",
      message: "Searching for external evidence…",
      startedAt: Date.now(),
    };
    this.ctx.storage.sql.exec("DELETE FROM frames");
    this.save(state);
    await this.ctx.storage.setAlarm(Date.now() + 85000);
    this.ctx.waitUntil(this.build(description, state.setup.id));
    return this.publicState(state);
  }
  private async build(description: string, setupId: string) {
    try {
      const environment = await researchEnvironment(
        this.env,
        description,
        setupId,
        (message) => {
          const state = this.load();
          if (state.setup.id !== setupId || state.setup.status === "failed")
            return;
          state.setup.status = "building";
          state.setup.message = message;
          this.save(state);
        },
      );
      const state = this.load();
      if (state.setup.id !== setupId || state.setup.status === "failed") return;
      state.environment = settlePopulation(environment);
      state.setup.status = "ready";
      state.setup.message = "Your populated scenario is ready";
      this.save(state);
    } catch {
      const state = this.load();
      if (state.setup.id !== setupId) return;
      state.setup.status = "failed";
      state.setup.message =
        "Setup could not finish. Revise the description or try again.";
      this.save(state);
    }
  }
  async start(reset: boolean) {
    const state = this.load();
    if (!state.environment || state.setup.status !== "ready")
      return failure(409, "Generate an environment first");
    if (state.job)
      return failure(
        409,
        "Wait for event processing to finish before resetting",
      );
    if (!reset && state.run) return this.publicState(state);
    if (state.run && state.run.time > 0 && !state.results.length)
      state.results.push(resultFor(state.run, "Run A"));
    state.environment = settlePopulation(state.environment);
    state.run = newScenario(state.environment);
    state.segments = [];
    this.ctx.storage.sql.exec("DELETE FROM frames");
    this.save(state);
    await this.ctx.storage.deleteAlarm();
    return this.publicState(state);
  }
  finish() {
    const state = this.load();
    if (state.job)
      return failure(409, "Wait for the current segment to finish processing");
    if (!state.run || state.run.time === 0)
      return failure(409, "Process an event before finishing this run");
    state.run.status = "finished";
    if (!state.results.some((r) => r.runId === state.run!.runId)) {
      const result = resultFor(
        state.run,
        state.results.length ? "Run B" : "Run A",
      );
      state.results = state.results.length
        ? [state.results[0], result]
        : [result];
    }
    this.save(state);
    return this.publicState(state);
  }
  async submitEvent(text: string, runId?: string, expectedTime?: number) {
    const state = this.load(),
      run = state.run;
    if (!run || run.status === "finished")
      return failure(409, "Open a scenario or reset before adding an event");
    if (state.job) return failure(409, "An event is already processing");
    if (
      (runId && runId !== run.runId) ||
      (expectedTime !== undefined && expectedTime !== run.time)
    )
      return failure(
        409,
        "The scenario has changed. Return to the latest recorded state.",
      );
    if (state.segments.length >= 30)
      return failure(
        429,
        "This run has 30 event segments. Reset to start a new run.",
      );
    const segment = newSegment(run, text);
    const working = structuredClone(run);
    working.status = "running";
    working.duration = run.time + segment.duration + 1;
    const event: Event = {
      id: segment.eventId,
      originalText: text,
      title: "Interpreting event…",
      description: "",
      status: "interpreting",
      startTimeSeconds: run.time,
      durationSeconds: 300,
      position: { x: 0, z: 0 },
      effects: [],
      approximationNotes: [],
      visual: "marker",
      submittedAt: Date.now(),
    };
    working.events.push(event);
    state.segments.push(segment);
    state.job = { segmentId: segment.id, working };
    this.save(state);
    await this.ctx.storage.setAlarm(Date.now() + 25000);
    this.ctx.waitUntil(this.compileEvent(segment.id));
    return segment;
  }
  private failSegment(state: StoredSession, message: string) {
    const segment = state.segments.find((s) => s.id === state.job?.segmentId);
    if (segment) {
      segment.status = "failed";
      segment.message = message;
      this.ctx.storage.sql.exec(
        "DELETE FROM frames WHERE segment_id=?",
        segment.id,
      );
    }
    delete state.job;
    this.save(state);
  }
  private async compileEvent(segmentId: string) {
    const input = this.load();
    if (input.job?.segmentId !== segmentId || !input.environment) return;
    const event = input.job.working.events.at(-1)!;
    try {
      await interpretEvent(
        this.env,
        input.environment,
        input.job.working,
        event,
      );
      const state = this.load();
      if (state.job?.segmentId !== segmentId) return;
      const segment = state.segments.find((s) => s.id === segmentId)!;
      const index = state.job.working.events.findIndex(
        (e) => e.id === event.id,
      );
      state.job.working.events[index] = event;
      activateEvent(state.environment!, state.job.working, event);
      if (event.status !== "active") {
        this.failSegment(
          state,
          `Event unsupported: ${event.approximationNotes.join(" ")}`,
        );
        return;
      }
      segment.status = "processing";
      segment.message = "Computing 30 simulated seconds…";
      this.record(segmentId, captureFrame(state.job.working));
      this.save(state);
      await this.ctx.storage.setAlarm(Date.now() + 10);
    } catch {
      const state = this.load();
      if (state.job?.segmentId !== segmentId) return;
      this.failSegment(
        state,
        "Event interpretation was unavailable or timed out. Your scenario has not changed; try again.",
      );
    }
  }
  async alarm() {
    const state = this.load();
    if (
      ["researching", "building"].includes(state.setup.status) &&
      Date.now() - state.setup.startedAt >= 80000
    ) {
      state.setup.status = "failed";
      state.setup.message = "Setup exceeded its time budget. Please retry.";
      this.save(state);
      return;
    }
    if (!state.job || !state.environment) return; // No idle or playback inference.
    const segment = state.segments.find((s) => s.id === state.job!.segmentId)!;
    if (segment.status === "interpreting") {
      this.failSegment(
        state,
        "Event interpretation timed out. No state was changed.",
      );
      return;
    }
    const working = state.job.working;
    const tickets = advanceSegment(
      state.environment,
      working,
      segment,
      (frame) => this.record(segment.id, frame),
    );
    if (segment.status === "ready") {
      state.run = working;
      delete state.job;
      this.save(state);
      return;
    }
    this.save(state); // Reservation and budget survive eviction/retry before external I/O.
    if (tickets.length) {
      const results = await Promise.allSettled(
        tickets.map((ticket) => decide(this.env, ticket)),
      );
      const latest = this.load();
      if (
        latest.job?.segmentId !== segment.id ||
        latest.run?.runId !== working.runId
      )
        return;
      results.forEach((result, i) =>
        applyDecision(
          latest.environment!,
          latest.job!.working,
          tickets[i],
          result.status === "fulfilled" ? result.value : undefined,
        ),
      );
      this.record(segment.id, captureFrame(latest.job.working));
      this.save(latest);
    }
    await this.ctx.storage.setAlarm(Date.now() + (tickets.length ? 10 : 1000));
  }
  fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return json({ error: "WebSocket required" }, 426);
    if (this.ctx.getWebSockets().length >= 5)
      return json({ error: "Too many connections" }, 429);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].send(JSON.stringify(this.getSnapshot()));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === "ping") ws.send("pong");
  }
  webSocketClose(ws: WebSocket, code: number) {
    ws.close(code);
  }
  webSocketError(ws: WebSocket) {
    ws.close(1011, "Reconnect");
  }
}
async function body(request: Request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new RequestError(415, "Use application/json");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Missing body");
  let bytes = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 4096) {
        await reader.cancel();
        throw new RequestError(413, "Request is too large");
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (e) {
    if (e instanceof RequestError) throw e;
    throw new RequestError(400, "Invalid JSON");
  } finally {
    reader.releaseLock();
  }
}
export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin)
        return json({ error: "Use the same origin" }, 403);
      if (url.pathname === "/api/health")
        return json({
          status: "ok",
          research: "Baseten + Exa",
          decisions: "Cloudflare Workers AI / typesafe/jev",
          configured: !!env.BASETEN_API_KEY,
        });
      let session = request.headers
        .get("Cookie")
        ?.match(/(?:^|;\s*)cc_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      const newSession = !session;
      if (!session)
        session = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
      const stub = env.SESSIONS.getByName(session);
      if (url.pathname === "/api/live")
        return newSession
          ? json({ error: "Open a session first" }, 401)
          : stub.fetch(request);
      let response: Response;
      if (url.pathname === "/api/session" && request.method === "GET")
        response = rpcJson(await stub.getSnapshot());
      else if (url.pathname === "/api/recording" && request.method === "GET")
        response = rpcJson(
          await stub.getRecording(
            z.string().uuid().parse(url.searchParams.get("segmentId")),
          ),
        );
      else if (request.method !== "POST")
        response = json({ error: "Not found" }, 404);
      else if (url.pathname === "/api/setup") {
        const { description } = z
          .object({ description: z.string().trim().min(5).max(1000) })
          .parse(await body(request));
        response = rpcJson(await stub.generate(description), 202);
      } else if (url.pathname === "/api/start")
        response = rpcJson(await stub.start(false));
      else if (url.pathname === "/api/reset")
        response = rpcJson(await stub.start(true));
      else if (url.pathname === "/api/finish")
        response = rpcJson(await stub.finish());
      else if (url.pathname === "/api/events") {
        const { text, runId, expectedTime } = z
          .object({
            text: z.string().trim().min(3).max(1000),
            runId: z.string().uuid().optional(),
            expectedTime: z.number().int().nonnegative().optional(),
          })
          .parse(await body(request));
        response = rpcJson(
          await stub.submitEvent(text, runId, expectedTime),
          202,
        );
      } else response = json({ error: "Not found" }, 404);
      if (newSession)
        response.headers.append(
          "Set-Cookie",
          `cc_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`,
        );
      return response;
    } catch (error) {
      if (error instanceof z.ZodError)
        return json(
          {
            error: "Invalid input",
            issues: error.issues.map((i) => i.message),
          },
          400,
        );
      // Expected RPC failures use structured results; unexpected failures stay generic.
      if (error instanceof Error)
        return json(
          {
            error:
              error instanceof RequestError
                ? error.message
                : "Unexpected request failure",
          },
          error instanceof RequestError ? error.status : 500,
        );
      return json({ error: "Request could not complete" }, 500);
    }
  },
} satisfies ExportedHandler<Bindings>;
