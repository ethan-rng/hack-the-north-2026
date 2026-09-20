"use client";
import dynamic from "next/dynamic";
import { usePlayback } from "@/ui/usePlayback";
import Timeline from "@/ui/Timeline";
import { settlePopulation } from "@/core/playback";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Compass,
  ExternalLink,
  Globe2,
  Layers3,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type {
  Environment,
  Event,
  Metrics,
  Person,
  Place,
  Result,
  Run,
  SessionSnapshot,
} from "@/core/types";
import {
  comparable,
  difference,
  effectivePrice,
  occupancy,
  placeOpen,
  resultFor,
  serviceSettings,
} from "@/core/engine";
import { compileEnvironment, fallbackConfiguration } from "@/core/generation";
const World = dynamic(() => import("@/ui/World"), {
  ssr: false,
  loading: () => (
    <div className="world-loading">
      <LoaderCircle className="spin" /> Preparing the scene
    </div>
  ),
});
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
function formatError(e: unknown): string {
  if (e instanceof ApiError) {
    const parts: string[] = [];
    if (e.status) parts.push(`[${e.status}]`);
    parts.push(e.message);
    if (Array.isArray(e.issues) && e.issues.length)
      parts.push(`Issues: ${e.issues.map((i) => String(i)).join("; ")}`);
    if (e.bodyPreview) parts.push(`Body: ${e.bodyPreview}`);
    return parts.join(" · ");
  }
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return typeof e === "string" ? e : "Request failed";
}
class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
    public issues?: unknown,
    public bodyPreview?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(path: string, data?: unknown): Promise<any> {
  const url = `/api/${path}`;
  const method = data === undefined ? "GET" : "POST";
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: data === undefined ? {} : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[api] network failure ${method} ${url}`, e);
    throw new ApiError(0, path, `Network error reaching ${url}: ${detail}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.toLowerCase().includes("application/json");
  let text = "";
  try {
    text = await response.text();
  } catch (e) {
    console.error(`[api] could not read body ${method} ${url}`, e);
    throw new ApiError(
      response.status,
      path,
      `Could not read response body (status ${response.status})`,
    );
  }
  let payload: unknown = undefined;
  if (text && isJson) {
    try {
      payload = JSON.parse(text);
    } catch (e) {
      console.error(
        `[api] response claimed JSON but did not parse ${method} ${url}`,
        { text: text.slice(0, 400), error: e },
      );
      throw new ApiError(
        response.status,
        path,
        `Server sent invalid JSON (status ${response.status})`,
        undefined,
        text.slice(0, 200),
      );
    }
  }
  if (!response.ok) {
    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : undefined;
    const serverMessage =
      typeof record?.error === "string" ? record.error : undefined;
    const issues = record && "issues" in record ? record.issues : undefined;
    const preview = !isJson && text ? text.slice(0, 200) : undefined;
    const message =
      serverMessage ??
      (preview
        ? `HTTP ${response.status} at ${url} · non-JSON response: ${preview.slice(0, 120)}${preview.length > 120 ? "…" : ""}`
        : `HTTP ${response.status} at ${url}`);
    console.error(`[api] ${response.status} ${method} ${url}`, {
      serverMessage,
      issues,
      preview,
      contentType,
    });
    throw new ApiError(response.status, path, message, issues, preview);
  }
  if (!isJson) {
    console.warn(
      `[api] ${method} ${url} returned ${response.status} without JSON content-type (${contentType || "none"})`,
    );
  }
  return payload;
}
function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <CircleDot size={22} />
      </span>
      crowd<span className="brand-light">control</span>
      <span className="beta">LAB</span>
    </span>
  );
}
function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Sources({ env }: { env: Environment }) {
  return (
    <div className="sources">
      <p className="eyebrow">RESEARCH & ASSUMPTIONS</p>
      <h2>A useful model, with its limits in view.</h2>
      <p>{env.coverage}</p>
      <span
        className={`tag ${env.researchStatus === "unavailable" ? "warning" : ""}`}
      >
        {env.researchStatus === "succeeded"
          ? "Live sources retrieved"
          : env.researchStatus === "partial"
            ? "Research retrieved · configuration fallback"
            : "Research unavailable · assumptions only"}
      </span>
      <h3>What we assumed</h3>
      <ul>
        {env.assumptions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <h3>External sources</h3>
      {env.sources.length === 0 && (
        <p>No usable external evidence was retrieved for this setup.</p>
      )}
      {env.sources.map((s) => (
        <div className="source-card" key={s.id}>
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.title}
            <ExternalLink size={13} />
          </a>
          <small>Retrieved {new Date(s.retrievedAt).toLocaleString()}</small>
          <details>
            <summary>Retrieved evidence</summary>
            <p className="excerpt">{s.excerpt}</p>
          </details>
        </div>
      ))}
      <h3>Where each detail came from</h3>
      {env.provenance.map((p, i) => (
        <div className="provenance" key={i}>
          <span className="tag">{p.basis.replaceAll("_", " ")}</span>
          <code>{p.targetPath}</code>
          <p>{p.note}</p>
          {p.sourceIds.map((id) => {
            const source = env.sources.find((s) => s.id === id);
            return source ? (
              <a key={id} href={source.url} target="_blank" rel="noreferrer">
                {source.title} ↗
              </a>
            ) : null;
          })}
        </div>
      ))}
    </div>
  );
}
function PersonInspector({
  person: p,
  env,
  run,
}: {
  person: Person;
  env: Environment;
  run: Run;
}) {
  const place = env.places.find((l) => l.id === p.placeId);
  return (
    <>
      <div
        className="entity-icon"
        style={{ background: env?.presentation?.[p.id]?.color ?? "#95a591" }}
      >
        <Users size={24} />
      </div>
      <p className="eyebrow">
        {p.roleLabel} / {p.id.replace("person-", "#")}
      </p>
      <h2>{p.displayName}</h2>
      <div className="inline-tags">
        <span className="tag">{p.presence}</span>
        <span className="tag">{p.mood}</span>
      </div>
      <section>
        <h3>Right now</h3>
        <p className="current-action">
          {p.presence === "exited"
            ? "Outside — can choose to re-enter"
            : (p.currentAction?.label ?? "Observing the environment")}
        </p>
        <p className="muted">
          {place
            ? `At ${place.name}`
            : `Position ${p.position.x.toFixed(1)}, ${p.position.z.toFixed(1)}`}
        </p>
        {p.pending && (
          <small className="pending">
            <LoaderCircle size={12} className="spin" /> Jev is considering the
            next action
          </small>
        )}
        {p.decisionError && <p className="notice">{p.decisionError}</p>}
      </section>
      <section>
        <h3>Goals</h3>
        {p.goals.map((g) => (
          <div className="goal" key={g.id}>
            {g.status === "completed" ? (
              <Check size={15} />
            ) : (
              <CircleDot size={15} />
            )}
            <span>
              {g.description}
              {g.targetId && (
                <small>
                  Target: {env.places.find((l) => l.id === g.targetId)?.name}
                </small>
              )}
              {g.subjectKey && (
                <small>
                  Journey {g.subjectKey}
                  {g.deadlineSeconds !== undefined
                    ? ` · deadline ${time(g.deadlineSeconds)}`
                    : ""}
                </small>
              )}
            </span>
          </div>
        ))}
      </section>
      <section>
        <div className="metrics-grid">
          <Metric
            label="Budget left"
            value={
              p.budgetRemainingCents === null
                ? "N/A"
                : money(p.budgetRemainingCents)
            }
          />
          <Metric label="Queue patience" value={`${p.maxQueueWaitSeconds}s`} />
        </div>
        {(
          [
            ["Hunger", p.hunger],
            ["Fatigue", p.fatigue],
            ["Stress", p.stress],
            ["Price sensitivity", p.priceSensitivity],
            ["Crowd tolerance", p.crowdTolerance],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div className="need" key={label}>
            <span>{label}</span>
            <div>
              <i style={{ width: `${value * 100}%` }} />
            </div>
            <small>{Math.round(value * 100)}%</small>
          </div>
        ))}
      </section>
      <section>
        <h3>Interests</h3>
        <div className="inline-tags">
          {Object.entries(p.interests)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, score]) => (
              <span className="tag" key={name}>
                {name} {Math.round(score * 100)}%
              </span>
            ))}
        </div>
      </section>
      <section>
        <h3>What {p.displayName} knows</h3>
        {p.knownEventIds.length ? (
          p.knownEventIds.map((id) => (
            <p key={id} className="knowledge">
              {run.events.find((e) => e.id === id)?.title}
            </p>
          ))
        ) : (
          <p className="muted">No events received yet.</p>
        )}
      </section>
      <section>
        <h3>Recent experiences</h3>
        {p.recentExperiences
          .slice(-6)
          .reverse()
          .map((entry, i) => (
            <p className="experience" key={i}>
              {entry}
            </p>
          ))}
      </section>
      {p.lastDecision && (
        <details>
          <summary>Last accepted Jev decision</summary>
          <p>{p.lastDecision.choice}</p>
          <small>
            At {time(p.lastDecision.at)} · input revision{" "}
            {p.lastDecision.inputRevision}
          </small>
          {p.lastDecision.context && (
            <pre>{JSON.stringify(p.lastDecision.context, null, 2)}</pre>
          )}
        </details>
      )}
    </>
  );
}
function PlaceInspector({
  place: p,
  env,
  run,
}: {
  place: Place;
  env: Environment;
  run: Run;
}) {
  const m = run.metrics[p.id],
    products = run.products.filter((x) => x.placeId === p.id);
  return (
    <>
      <div
        className="entity-icon"
        style={{ background: env?.presentation?.[p.id]?.color ?? "#95a591" }}
      >
        <MapPin size={24} />
      </div>
      <p className="eyebrow">{p.typeLabel}</p>
      <h2>{p.name}</h2>
      <p>{p.description}</p>
      <div className="inline-tags">
        <span className={`tag ${placeOpen(run, p.id) ? "" : "warning"}`}>
          {placeOpen(run, p.id) ? "Open" : "Closed to new arrivals"}
        </span>
        {p.capabilities.map((c) => (
          <span key={c} className="tag">
            {c.replaceAll("_", " ")}
          </span>
        ))}
      </div>
      <section>
        <div className="metrics-grid">
          <Metric label="Visits" value={m.visits} />
          <Metric
            label="Occupancy"
            value={`${occupancy(run, p.id)} / ${p.admissionCapacity}`}
          />
          {products.length > 0 && (
            <>
              <Metric label="Revenue" value={money(m.revenue)} />
              <Metric
                label="Purchases / units"
                value={`${m.purchases} / ${m.unitsSold}`}
              />
            </>
          )}
        </div>
      </section>
      {products.length > 0 && (
        <section>
          <h3>Products & inventory</h3>
          {products.map((product) => (
            <div className="product" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <small>
                  {product.category} · {product.stockUnits} left
                </small>
              </div>
              <div>
                {effectivePrice(run, product.id) !== product.basePriceCents && (
                  <del>{money(product.basePriceCents)}</del>
                )}
                <strong>{money(effectivePrice(run, product.id))}</strong>
              </div>
            </div>
          ))}
        </section>
      )}
      <section>
        <h3>Service points</h3>
        {env.services
          .filter((s) => s.placeId === p.id)
          .map((s) => {
            const state = run.services[s.id],
              settings = serviceSettings(run, s);
            return (
              <div className="service-card" key={s.id}>
                <strong>{s.label}</strong>
                <small>
                  {s.kind === "timed"
                    ? "Free timed service"
                    : "Single-item checkout"}{" "}
                  · {settings.duration}s ·{" "}
                  {s.interruptible
                    ? "interruptible"
                    : "finishes before reacting"}
                </small>
                <div className="metrics-grid">
                  <Metric label="Waiting" value={state.queue.length} />
                  <Metric
                    label="Busy / slots"
                    value={`${state.active.length} / ${settings.slots}`}
                  />
                </div>
                {!placeOpen(run, p.id) && (
                  <span className="tag">
                    {state.active.length
                      ? "Draining active services"
                      : "Closed"}
                  </span>
                )}
              </div>
            );
          })}
        {!env.services.some((s) => s.placeId === p.id) && (
          <p className="muted">An open area with no timed service.</p>
        )}
        <div className="metrics-grid">
          <Metric label="Completions" value={m.serviceCompletions} />
          <Metric
            label="Mean queue wait"
            value={
              m.waitSamples
                ? `${(m.waitTotal / m.waitSamples).toFixed(1)}s`
                : "—"
            }
          />
          <Metric label="Abandonments" value={m.abandonment} />
          <Metric label="Interrupted" value={m.interrupted} />
        </div>
      </section>
    </>
  );
}
const rows: {
  label: string;
  key: keyof Metrics;
  format?: (v: number) => string;
}[] = [
  { label: "Visits", key: "visits" },
  { label: "Purchases", key: "purchases" },
  { label: "Units sold", key: "unitsSold" },
  { label: "Revenue", key: "revenue", format: money },
  { label: "Service completions", key: "serviceCompletions" },
  { label: "Queue abandonment", key: "abandonment" },
  { label: "Interrupted services", key: "interrupted" },
  { label: "Goals completed", key: "goalsCompleted" },
];
function Comparison({ results, env }: { results: Result[]; env: Environment }) {
  const [place, setPlace] = useState("all");
  const [a, b] = results;
  if (!a)
    return (
      <>
        <p className="eyebrow">RUN COMPARISON</p>
        <h2>One baseline. Two possibilities.</h2>
        <p>
          Finish your first run, then reset to restore the same people,
          products, knowledge and starting positions. Process the same number of
          30-second event segments in each run to compare equal durations.
        </p>
      </>
    );
  const valid = b && comparable(a, b),
    am = place === "all" ? a.totals : a.metrics[place],
    bm = b ? (place === "all" ? b.totals : b.metrics[place]) : undefined;
  return (
    <>
      <p className="eyebrow">RUN COMPARISON</p>
      <h2>What changed?</h2>
      <p>
        Run A: {time(a.duration)}
        {b ? ` · Run B: ${time(b.duration)}` : ""} · identical starting state.
        Fresh Jev choices can vary.
      </p>
      <label className="select-label">
        Compare{" "}
        <select value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="all">Entire environment</option>
          {env.places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {!valid && (
        <p className="notice">
          {b
            ? "These runs have different durations. Reset and process the same number of 30-second segments as Run A before finishing."
            : "Run A is saved. Reset and process the same number of 30-second segments, then finish Run B to compare."}
        </p>
      )}
      <table className="comparison">
        <thead>
          <tr>
            <th>Metric</th>
            <th>A</th>
            <th>B</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const x = am[row.key],
              y = bm?.[row.key],
              diff = y === undefined ? null : difference(x, y),
              format = row.format ?? String;
            return (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{format(x)}</td>
                <td>{valid && y !== undefined ? format(y) : "—"}</td>
                <td>
                  {valid && diff ? (
                    <>
                      {diff.absolute > 0 ? "+" : ""}
                      {format(diff.absolute)}
                      <small>
                        {diff.percent === null
                          ? "N/A · zero baseline"
                          : `${diff.percent.toFixed(1)}%`}
                      </small>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
          <tr>
            <td>Mean queue wait</td>
            <td>
              {am.waitSamples
                ? `${(am.waitTotal / am.waitSamples).toFixed(1)}s`
                : "—"}
            </td>
            <td>
              {valid && bm?.waitSamples
                ? `${(bm.waitTotal / bm.waitSamples).toFixed(1)}s`
                : "—"}
            </td>
            <td>
              {valid && am.waitSamples && bm?.waitSamples
                ? `${(bm.waitTotal / bm.waitSamples - am.waitTotal / am.waitSamples).toFixed(1)}s`
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
      <h3>Interventions & timing</h3>
      {results.map((r) => (
        <div className="service-card" key={r.runId}>
          <strong>{r.label}</strong>
          {r.events.length ? (
            r.events.map((e, i) => (
              <p key={i}>
                {time(e.at)} — {e.title}
              </p>
            ))
          ) : (
            <p className="muted">No interventions.</p>
          )}
        </div>
      ))}
      <p className="muted">
        Illustrative outcomes under modeled assumptions. This is not a
        statistically validated causal estimate.
      </p>
    </>
  );
}
function EventCard({ event }: { event: Event }) {
  return (
    <details
      className={`event-card ${event.status}`}
      open={event.status === "failed" || event.status === "unsupported"}
    >
      <summary>
        <span className="event-dot" />
        <span>
          {event.title}
          <small>
            {event.status} · {time(event.startTimeSeconds)}
          </small>
        </span>
        <ChevronDown size={13} />
      </summary>
      <p>{event.description || event.originalText}</p>
      <small>Global event · {event.durationSeconds}s</small>
      {event.approximationNotes.map((n, i) => (
        <p className="muted" key={i}>
          {n}
        </p>
      ))}
      {event.effects.length > 0 && (
        <details>
          <summary>Applied mechanics</summary>
          <pre>{JSON.stringify(event.effects, null, 2)}</pre>
        </details>
      )}
    </details>
  );
}
// Keep the scene metrics above the composer as chapter/status rows change its height.
function observeComposer(node: HTMLFormElement | null) {
  if (!node) return;
  const root = node.closest("main");
  const measure = () =>
    root?.style.setProperty("--composer-height", `${node.offsetHeight}px`);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(node);
  return () => observer.disconnect();
}

export default function Page() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>();
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<Environment>();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState("");
  const [panel, setPanel] = useState<
    "entity" | "sources" | "compare" | "events"
  >("entity");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [connected, setConnected] = useState(false);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<"places" | "people">("places");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setPreview(
      settlePopulation(
        compileEnvironment(
          fallbackConfiguration("Illustrative preview"),
          "Illustrative preview",
          [],
          "unavailable",
          "preview",
        ),
      ),
    );
    let alive = true,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (!alive) return;
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/live`,
      );
      socket.onopen = () => {
        if (alive) setConnected(true);
      };
      socket.onmessage = (e) => {
        if (alive && e.data !== "pong") {
          try {
            setSnapshot(JSON.parse(e.data));
          } catch {}
        }
      };
      socket.onclose = (event) => {
        if (alive) {
          if (event.code !== 1000 && event.code !== 1001)
            console.warn(
              `[ws] closed code=${event.code} reason=${event.reason || "(none)"} clean=${event.wasClean}`,
            );
          setConnected(false);
          retry = setTimeout(connect, 2500);
        }
      };
      socket.onerror = (event) => {
        console.error(`[ws] error at ${socket?.url}`, event);
        socket?.close();
      };
    };
    api("session")
      .then((state) => {
        if (alive) {
          setSnapshot(state);
          setDescription((draft) => draft || state.setup.description);
          connect();
        }
      })
      .catch((e) => {
        if (alive) {
          console.error("[init] session load failed", e);
          setError(formatError(e));
        }
      });
    const poll = setInterval(() => {
      if (alive && socket?.readyState !== WebSocket.OPEN)
        api("session")
          .then((s) => {
            if (alive) setSnapshot(s);
          })
          .catch((e) => console.warn("[poll] session poll failed", e));
    }, 5000);
    return () => {
      alive = false;
      clearTimeout(retry);
      clearInterval(poll);
      socket?.close();
    };
  }, []);
  const playback = usePlayback(snapshot);
  const env = snapshot?.environment,
    latestRun = snapshot?.run,
    run = playback.run;
  const processing = playback.processing;
  const canSubmit =
    !!latestRun &&
    latestRun.status !== "finished" &&
    !processing &&
    !playback.playing &&
    !playback.historical &&
    !playback.loading;
  const generating =
    snapshot?.setup.status === "researching" ||
    snapshot?.setup.status === "building";
  const setupView = !env || editing || generating;
  const select = (id: string) => {
    setSelected(id);
    setPanel("entity");
  };
  async function command(name: string, data: unknown = {}) {
    setBusy(name);
    setError("");
    try {
      const result = await api(name, data);
      if (name !== "events") setSnapshot(result);
      return result;
    } catch (e) {
      console.error(`[command:${name}] failed`, e);
      setError(formatError(e));
      return false;
    } finally {
      setBusy("");
    }
  }
  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!snapshot) return;
    if (await command("setup", { description })) {
      setEditing(false);
      setSelected("");
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const segment = await command("events", {
      text,
      runId: latestRun!.runId,
      expectedTime: latestRun!.time,
    });
    if (segment) {
      playback.onSubmitted(segment.id);
      setText("");
      setPanel("events");
    }
  }
  const person = run?.people.find((p) => p.id === selected),
    place = env?.places.find((p) => p.id === selected);
  const totals = run ? resultFor(run, "Live").totals : null;
  return (
    <main className={setupView ? "app onboarding" : "app workspace"}>
      <header className="topbar">
        <button
          className="brand-button"
          onClick={() => {
            if (env) {
              setEditing(true);
              setDescription(env.description);
            }
          }}
          aria-label="Describe a new environment"
        >
          <Brand />
        </button>
        <div className="topbar-right">
          {env && !setupView && (
            <>
              <span className="session-name">{env.name}</span>
              <button
                className="text-button"
                onClick={() =>
                  setPanel(panel === "sources" ? "entity" : "sources")
                }
              >
                <Globe2 size={15} /> Sources & assumptions
              </button>
            </>
          )}
          <span className="live-badge">
            <i className={connected ? "online" : "offline"} />
            {processing
              ? "PROCESSING"
              : playback.playing
                ? "RECORDED PLAYBACK"
                : "SCENARIO PAUSED"}
          </span>
        </div>
      </header>
      {error && (
        <div className="error-toast" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
      {setupView ? (
        <div className="onboarding-content">
          <div className="onboarding-copy">
            <span className="eyebrow">
              <span className="tiny-dot" /> SMALL WORLDS. BIG WHAT-IFS.
            </span>
            <h1>
              A place.
              <br />
              Its people.
              <br />
              <em>Your what if.</em>
            </h1>
            <p className="intro">
              Turn a description into a living world. Change something, follow
              the people, and see what happens next.
            </p>
            <form onSubmit={generate}>
              <label htmlFor="description">
                What kind of place are we exploring?
              </label>
              <div className="description-box">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A busy amusement park with two popular rides, food stalls, and a gift shop…"
                  minLength={5}
                  maxLength={1000}
                  required
                  disabled={generating}
                  rows={3}
                />
                <div className="description-footer">
                  <span>
                    <Globe2 size={13} /> Grounded in live research
                  </span>
                  <button
                    className="primary"
                    disabled={!snapshot || !!busy || generating}
                  >
                    {generating ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                    {generating ? "Creating" : "Create world"}
                  </button>
                </div>
              </div>
            </form>
            {generating ? (
              <div className="setup-progress" role="status">
                <div className="progress-track">
                  <span />
                </div>
                <strong>
                  {snapshot?.setup.status === "researching"
                    ? "01 · Researching the environment"
                    : "02 · Building your world"}
                </strong>
                <p>{snapshot?.setup.message}</p>
                <small>
                  Bounded research and generation; usually under 80 seconds.
                </small>
              </div>
            ) : (
              <>
                <div className="suggestions">
                  <span>Try a starting point</span>
                  {[
                    "An amusement park with rides and a gift shop",
                    "Toronto Pearson Terminal 1 with gates and shops",
                    "A bustling night market with food stalls",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDescription(s)}
                    >
                      {s}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
                {snapshot?.setup.status === "failed" && (
                  <p className="notice">{snapshot.setup.message}</p>
                )}
                {editing && (
                  <button
                    className="text-button"
                    onClick={() => setEditing(false)}
                  >
                    Return to current world
                  </button>
                )}
              </>
            )}
            <p className="onboarding-footnote">
              Researched context. Assumed operations. Possibilities, not
              predictions.
            </p>
          </div>
          <div className="preview-pane">
            {preview && (
              <World environment={preview} preview onSelect={() => {}} />
            )}
            <div className="preview-caption">
              <span className="tag">
                <Layers3 size={13} /> Illustrative preview
              </span>
              <p>Every person has somewhere to be.</p>
              <small>Your description creates a new environment.</small>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`world-pane ${!run ? "summary-world" : ""}`}>
            <World
              key={run?.runId ?? env!.setupId}
              environment={env!}
              run={run}
              selected={selected}
              onSelect={select}
            />
            {run && (
              <>
                <div className="world-top">
                  <div className="run-chip">
                    <span className="tiny-dot" />
                    <strong>
                      {processing
                        ? "Processing event"
                        : playback.playing
                          ? "Playing recording"
                          : "Scenario paused"}
                    </strong>
                    <span>{time(playback.cursor)} recorded</span>
                  </div>
                  <div className="world-actions">
                    <button
                      onClick={() => setPanel("compare")}
                      title="Compare runs"
                    >
                      <Layers3 size={16} /> Compare
                    </button>
                    <button
                      disabled={!!busy || !!processing}
                      onClick={async () => {
                        if (await command("reset")) setPanel("entity");
                      }}
                    >
                      <RotateCcw size={15} /> Reset baseline
                    </button>
                    {latestRun?.status !== "finished" &&
                      latestRun &&
                      latestRun.time > 0 && (
                        <button
                          disabled={
                            !!busy ||
                            !!processing ||
                            playback.playing ||
                            playback.historical
                          }
                          onClick={async () => {
                            if (await command("finish")) setPanel("compare");
                          }}
                        >
                          Finish run
                        </button>
                      )}
                  </div>
                </div>
                {processing && (
                  <div className="processing-overlay" role="status">
                    <LoaderCircle className="spin" size={26} />
                    <h2>
                      {processing.status === "interpreting"
                        ? "Understanding your event"
                        : "Processing what happens next"}
                    </h2>
                    <p>{processing.message}</p>
                    <progress
                      max={processing.duration}
                      value={processing.ticksDone}
                    />
                    <small>
                      {processing.ticksDone} / {processing.duration} simulated
                      seconds · {processing.callsMade} / {processing.callLimit}{" "}
                      Jev calls
                    </small>
                    <p className="muted">
                      The scene stays frozen. Your recording will play when it
                      is ready.
                    </p>
                  </div>
                )}
                {playback.loading && !processing && (
                  <div className="recording-loading" role="status">
                    <LoaderCircle size={16} className="spin" /> Loading recorded
                    playback…
                  </div>
                )}
                <div className="world-metrics">
                  <Metric
                    label="People inside"
                    value={
                      run.people.filter((p) => p.presence === "inside").length
                    }
                  />
                  <Metric label="Purchases" value={totals!.purchases} />
                  <Metric label="Revenue" value={money(totals!.revenue)} />
                  <Metric
                    label="Services completed"
                    value={totals!.serviceCompletions}
                  />
                </div>
                <div className="map-help">
                  <Compass size={14} /> Drag to orbit · scroll to zoom · click
                  to inspect
                </div>
                <div className="integration-status">
                  {run.jevAccepted} Jev choices accepted
                  {run.jevFailed > 0
                    ? ` · ${run.jevFailed} failed decisions recorded`
                    : ""}{" "}
                  · {processing ? "Computing" : "Playback uses no inference"} ·{" "}
                  {connected ? "Connected" : "Reconnecting"}
                </div>
              </>
            )}
          </div>
          {!run ? (
            <div className="summary-overlay">
              <div className="summary-card">
                <span className="eyebrow">
                  <Check size={14} /> YOUR WORLD IS READY
                </span>
                <h1>{env!.name}</h1>
                <p>
                  People are already at their destinations. The scene stays
                  paused until you introduce an event.
                </p>
                <p>{env!.summary}</p>
                <div className="summary-stats">
                  <span>
                    <MapPin size={16} />
                    {env!.places.length} places
                  </span>
                  <span>
                    <Users size={16} />
                    40 people
                  </span>
                  <span>
                    <Globe2 size={16} />
                    {env!.sources.length} sources
                  </span>
                </div>
                <div className="inline-tags">
                  {env!.places.map((p) => (
                    <span key={p.id} className="tag">
                      {p.name}
                    </span>
                  ))}
                </div>
                <p className="notice">
                  Approximate layout · Synthetic population · Assumed operating
                  parameters
                  {env!.researchStatus !== "succeeded"
                    ? ` · ${env!.researchStatus === "unavailable" ? "Research unavailable" : "Partial setup fallback"}`
                    : ""}
                </p>
                <details>
                  <summary>Sources, assumptions & included area</summary>
                  <Sources env={env!} />
                </details>
                <div className="summary-actions">
                  <button
                    className="text-button"
                    onClick={() => setEditing(true)}
                  >
                    Revise description
                  </button>
                  <button
                    className="primary"
                    disabled={!!busy}
                    onClick={() => command("start")}
                  >
                    Explore scenario <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <nav className="entity-list" aria-label="Environment entities">
                <div className="segmented">
                  <button
                    className={list === "places" ? "active" : ""}
                    onClick={() => setList("places")}
                  >
                    Places
                  </button>
                  <button
                    className={list === "people" ? "active" : ""}
                    onClick={() => setList("people")}
                  >
                    People
                  </button>
                </div>
                <div className="entity-scroll">
                  {list === "places"
                    ? env!.places.map((p) => (
                        <button
                          className={selected === p.id ? "selected" : ""}
                          key={p.id}
                          onClick={() => select(p.id)}
                        >
                          <span
                            className="entity-swatch"
                            style={{
                              background:
                                env?.presentation?.[p.id]?.color ?? "#95a591",
                            }}
                          />
                          <span>
                            {p.name}
                            <small>{p.typeLabel}</small>
                          </span>
                          <span className="entity-count">
                            {occupancy(run, p.id)}
                          </span>
                        </button>
                      ))
                    : run.people.map((p) => (
                        <button
                          key={p.id}
                          className={selected === p.id ? "selected" : ""}
                          onClick={() => select(p.id)}
                        >
                          <span
                            className="entity-swatch person-swatch"
                            style={{
                              background:
                                env?.presentation?.[p.id]?.color ?? "#95a591",
                            }}
                          />
                          <span>
                            {p.displayName}
                            <small>
                              {p.presence === "exited"
                                ? "Exited"
                                : (p.currentAction?.type.replaceAll("_", " ") ??
                                  "Observing")}
                            </small>
                          </span>
                        </button>
                      ))}
                </div>
                <button
                  className="new-world text-button"
                  onClick={() => setEditing(true)}
                >
                  Describe another place <ArrowUpRight size={13} />
                </button>
              </nav>
              <aside className="inspector">
                <div className="inspector-tabs">
                  <button
                    className={panel === "entity" ? "active" : ""}
                    onClick={() => setPanel("entity")}
                  >
                    Inspect
                  </button>
                  <button
                    className={panel === "events" ? "active" : ""}
                    onClick={() => setPanel("events")}
                  >
                    Events <span>{run.events.length}</span>
                  </button>
                  <button
                    className={panel === "compare" ? "active" : ""}
                    onClick={() => setPanel("compare")}
                  >
                    Compare
                  </button>
                </div>
                <div className="inspector-content">
                  {panel === "sources" ? (
                    <Sources env={env!} />
                  ) : panel === "compare" ? (
                    <Comparison results={snapshot!.results} env={env!} />
                  ) : panel === "events" ? (
                    <>
                      <p className="eyebrow">THE RIPPLE EFFECT</p>
                      <h2>Changes to this world.</h2>
                      <p>
                        Every event reaches everyone in the scenario. People
                        react according to their own goals and situation.
                      </p>
                      {run.events.length ? (
                        [...run.events]
                          .reverse()
                          .map((e) => <EventCard key={e.id} event={e} />)
                      ) : (
                        <div className="empty-state">
                          <Sparkles size={28} />
                          <h3>Make something happen.</h3>
                          <p>
                            Try a promotion, a service change, or a very
                            unexpected visitor.
                          </p>
                        </div>
                      )}
                    </>
                  ) : person ? (
                    <PersonInspector person={person} env={env!} run={run} />
                  ) : place ? (
                    <PlaceInspector place={place} env={env!} run={run} />
                  ) : (
                    <>
                      <p className="eyebrow">A WORLD IN MOTION</p>
                      <h2>Follow the little things.</h2>
                      <p>
                        Click a person to follow their goals and choices. Pick a
                        place to see its queues, stock and activity.
                      </p>
                      <div className="empty-illustration">
                        <Users size={48} strokeWidth={1.1} />
                        <MapPin size={36} strokeWidth={1.1} />
                      </div>
                      <h3>What will you change?</h3>
                      <p>
                        People make individual decisions. An offer, closure or
                        announcement can change what they know and where they
                        go.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => setPanel("sources")}
                      >
                        Explore the assumptions <ArrowUpRight size={14} />
                      </button>
                    </>
                  )}
                </div>
              </aside>
              <form
                ref={observeComposer}
                className="event-composer"
                onSubmit={submit}
              >
                <Timeline
                  playback={playback}
                  segments={snapshot?.segments ?? []}
                />
                {playback.historical && !playback.playing && !processing && (
                  <p className="timeline-note">
                    You are viewing recorded history.{" "}
                    <button
                      type="button"
                      onClick={() => playback.seek(playback.end)}
                    >
                      Return to latest state to add an event
                    </button>
                  </p>
                )}
                {(snapshot?.segments ?? [])
                  .filter((s) => s.status === "failed")
                  .slice(-1)
                  .map((s) => (
                    <p className="notice" role="alert" key={s.id}>
                      {s.message}
                    </p>
                  ))}
                <div className="event-prompt">
                  <Sparkles size={18} />
                  <textarea
                    ref={input}
                    aria-label="Describe an event"
                    placeholder={
                      latestRun?.status === "finished"
                        ? "Run complete. Reset the baseline to try another scenario."
                        : processing
                          ? "Processing your event…"
                          : "Describe an event to process the next 30 seconds…"
                    }
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (text.trim().length >= 3 && !busy && canSubmit)
                          e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={1}
                    minLength={3}
                    maxLength={1000}
                    required
                    disabled={!canSubmit}
                  />
                  <button
                    className="primary"
                    disabled={!!busy || !canSubmit || text.trim().length < 3}
                  >
                    {busy === "events" ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                    <span>Process event</span>
                  </button>
                </div>
                <div className="event-suggestions">
                  <span>TRY</span>
                  {[
                    env!.places.find((p) => p.capabilities.includes("purchase"))
                      ? `Announce 20% off at ${env!.places.find((p) => p.capabilities.includes("purchase"))!.name} for five minutes`
                      : "Announce a gathering at the central plaza",
                    "A dinosaur enters the central plaza",
                  ].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => {
                        setText(s);
                        input.current?.focus();
                      }}
                    >
                      {s}
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              </form>
            </>
          )}
        </>
      )}
    </main>
  );
}
