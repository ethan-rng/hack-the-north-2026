import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import {
  activateEvent,
  applyDecision,
  createTicket,
  newRun,
  resultFor,
  tick,
  uid,
} from "../src/core/engine";
import type { DecisionTicket, Event, SessionSnapshot } from "../src/core/types";
import { decide, interpretEvent, researchEnvironment, type AIEnv } from "./ai";

interface Bindings extends AIEnv {
  SESSIONS: DurableObjectNamespace<SimulationSession>;
  ASSETS: Fetcher;
}
const initial = (): SessionSnapshot => ({
  setup: { id: "", status: "idle", description: "", message: "", startedAt: 0 },
  results: [],
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
  // Counts live promises too, so resetting cannot start a second inference batch
  // while requests from the discarded run are still finishing.
  private inFlight = 0;
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)",
    );
  }
  private load(): SessionSnapshot {
    const row = this.ctx.storage.sql
      .exec<{ data: string }>("SELECT data FROM session WHERE id=1")
      .toArray()[0];
    return row ? JSON.parse(row.data) : initial();
  }
  private save(state: SessionSnapshot, broadcast = true) {
    this.ctx.storage.sql.exec(
      "INSERT INTO session (id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      JSON.stringify(state),
    );
    if (!broadcast) return;
    const payload = JSON.stringify(state);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        ws.close(1011, "Reconnect for current state");
      }
    }
  }
  getSnapshot() {
    return this.load();
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
    this.save(state);
    await this.ctx.storage.setAlarm(Date.now() + 85000);
    this.ctx.waitUntil(this.build(description, state.setup.id));
    return state;
  }
  private async build(description: string, setupId: string) {
    try {
      const environment = await researchEnvironment(
        this.env,
        description,
        setupId,
        (message) => {
          const state = this.load();
          if (state.setup.id !== setupId) return;
          state.setup.status = "building";
          state.setup.message = message;
          this.save(state);
        },
      );
      const state = this.load();
      if (state.setup.id !== setupId || state.setup.status === "failed") return;
      state.environment = environment;
      state.setup.status = "ready";
      state.setup.message = "Environment validated and ready";
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
    if (!reset && state.run) return state;
    if (state.run && state.run.status === "running") {
      // A shortened baseline sets the exact horizon of the next run. Later reset requests
      // retain the completed baseline; incomplete alternatives never become comparable results.
      if (!state.results.length && state.run.time >= 10)
        state.results.push(resultFor(state.run, "Run A"));
    }
    const duration = state.results[0]?.duration ?? 180;
    state.run = newRun(state.environment, duration);
    this.save(state);
    await this.ctx.storage.setAlarm(Date.now() + 1000);
    return state;
  }
  finish() {
    const state = this.load();
    if (!state.run) return failure(409, "No run to finish");
    if (state.run.time < 10)
      return failure(409, "Let the simulation run for at least ten seconds");
    if (state.results.length && state.run.time < state.results[0].duration)
      return failure(
        409,
        `This run must reach the same ${state.results[0].duration}-second duration as Run A`,
      );
    state.run.status = "finished";
    for (const p of state.run.people) delete p.pending;
    for (const e of state.run.events)
      if (e.status === "interpreting") {
        e.status = "failed";
        e.approximationNotes = [
          "The run ended before interpretation completed. No effects applied.",
        ];
      }
    this.recordResult(state);
    this.save(state);
    return state;
  }
  private recordResult(state: SessionSnapshot) {
    if (!state.run || state.results.some((r) => r.runId === state.run!.runId))
      return;
    const result = resultFor(
      state.run,
      state.results.length ? "Run B" : "Run A",
    );
    state.results = state.results.length
      ? [state.results[0], result]
      : [result];
  }
  async submitEvent(text: string) {
    const state = this.load(),
      run = state.run;
    if (!run || run.status !== "running")
      return failure(409, "Start a run before adding an event");
    if (
      run.events.length >= 30 ||
      run.events.filter((e) => e.status === "interpreting").length >= 2
    )
      return failure(
        429,
        "Event limit reached; wait for current interpretations or reset the run",
      );
    const event: Event = {
      id: uid(),
      originalText: text,
      title: "Interpreting event…",
      description: "",
      status: "interpreting",
      startTimeSeconds: run.time,
      durationSeconds: 300,
      awareness: "local",
      radius: 12,
      position: { x: 0, z: 0 },
      effects: [],
      approximationNotes: [],
      visual: "marker",
      submittedAt: Date.now(),
    };
    run.events.push(event);
    this.save(state);
    this.ctx.waitUntil(this.compileEvent(run.runId, event.id));
    return event;
  }
  private async compileEvent(runId: string, eventId: string) {
    const input = this.load(),
      event = input.run!.events.find((e) => e.id === eventId)!;
    try {
      await interpretEvent(this.env, input.environment!, input.run!, event);
      const state = this.load();
      if (state.run?.runId !== runId || state.run.status !== "running") return;
      const index = state.run.events.findIndex((e) => e.id === eventId);
      if (index < 0 || state.run.events[index].status !== "interpreting")
        return;
      state.run.events[index] = event;
      activateEvent(state.environment!, state.run, event);
      this.save(state);
    } catch {
      const state = this.load();
      if (state.run?.runId !== runId) return;
      const failed = state.run.events.find((e) => e.id === eventId);
      if (failed) {
        failed.status = "failed";
        failed.title = "Event interpretation unavailable";
        failed.approximationNotes = [
          "Baseten could not interpret this event within 20 seconds. No effects were applied; try again.",
        ];
        this.save(state);
      }
    }
  }
  async alarm() {
    const state = this.load(),
      run = state.run;
    if (
      ["researching", "building"].includes(state.setup.status) &&
      Date.now() - state.setup.startedAt >= 80000
    ) {
      state.setup.status = "failed";
      state.setup.message = "Setup exceeded its time budget. Please retry.";
      this.save(state);
      return;
    }
    if (!run || !state.environment || run.status !== "running") return;
    const now = Date.now();
    // Retried alarms don't double-tick; suspended sessions catch up in bounded steps.
    const steps = Math.min(3, Math.floor((now - run.lastTickAt) / 1000));
    for (let i = 0; i < steps; i++) tick(state.environment, run);
    if (steps) run.lastTickAt += steps * 1000;
    for (const event of run.events)
      if (event.status === "interpreting" && now - event.submittedAt > 25000) {
        event.status = "failed";
        event.approximationNotes = [
          "Interpretation interrupted or timed out. No effects applied.",
        ];
      }
    const tickets: DecisionTicket[] = [];
    const pending = run.people.filter(
      (p) => p.pending && now - p.pending.issuedAt < 25000,
    ).length;
    if (run.status === "running")
      for (const p of [...run.people].sort(
        (a, b) => a.nextDecisionAt - b.nextDecisionAt,
      )) {
        if (tickets.length + Math.max(pending, this.inFlight) >= 4) break;
        const ticket = createTicket(state.environment, run, p);
        if (ticket) tickets.push(ticket);
      }
    if (state.run?.status === "finished") this.recordResult(state);
    this.save(state);
    if (run.status === "running")
      await this.ctx.storage.setAlarm(Date.now() + 1000);
    for (const ticket of tickets) this.ctx.waitUntil(this.makeDecision(ticket));
  }
  private async makeDecision(ticket: DecisionTicket) {
    let answer: string | undefined;
    this.inFlight++;
    try {
      answer = await decide(this.env, ticket);
    } catch {
      /* preserve current action; engine records failure */
    } finally {
      this.inFlight--;
    }
    const state = this.load();
    if (state.run?.runId !== ticket.runId || !state.environment) return;
    applyDecision(state.environment, state.run, ticket, answer);
    this.save(state, false);
  }
  fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return json({ error: "WebSocket required" }, 426);
    if (this.ctx.getWebSockets().length >= 5)
      return json({ error: "Too many connections" }, 429);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].send(JSON.stringify(this.load()));
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
        const { text } = z
          .object({ text: z.string().trim().min(3).max(1000) })
          .parse(await body(request));
        response = rpcJson(await stub.submitEvent(text), 202);
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
