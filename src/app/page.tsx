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
  ExternalLink,
  Globe2,
  Layers3,
  LoaderCircle,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
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
type HeatMode = "off" | "traffic" | "occupancy" | "revenue" | "wait";
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
function Sparkline({
  points,
  width = 60,
  height = 18,
  color = "#4b6b3a",
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = points[points.length - 1];
  const lastY = height - ((last - min) / range) * height;
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx={width} cy={lastY} r="1.6" fill={color} />
    </svg>
  );
}
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
      {p.details && (
        <section>
          <h3>Details</h3>
          <dl className="detail-grid">
            {p.details.operatingHours && (
              <>
                <dt>Hours</dt>
                <dd>{p.details.operatingHours}</dd>
              </>
            )}
            {p.details.address && (
              <>
                <dt>Address</dt>
                <dd>{p.details.address}</dd>
              </>
            )}
            {p.details.permit && (
              <>
                <dt>Permit</dt>
                <dd>{p.details.permit}</dd>
              </>
            )}
            {p.details.accessibility && (
              <>
                <dt>Accessibility</dt>
                <dd>{p.details.accessibility}</dd>
              </>
            )}
            {p.details.capacityNote && (
              <>
                <dt>Capacity note</dt>
                <dd>{p.details.capacityNote}</dd>
              </>
            )}
            {typeof p.details.parkingSpots === "number" && (
              <>
                <dt>Parking spots</dt>
                <dd>{p.details.parkingSpots}</dd>
              </>
            )}
          </dl>
          {p.details.amenities && p.details.amenities.length > 0 && (
            <div className="inline-tags" style={{ marginTop: 8 }}>
              {p.details.amenities.map((a) => (
                <span key={a} className="tag">
                  {a}
                </span>
              ))}
            </div>
          )}
        </section>
      )}
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
// Reserve a separate scene viewport above the controls as chapter/status rows change height.
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [heatMode, setHeatMode] = useState<HeatMode>("off");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState<null | "places" | "people">(null);
  const [eventLog, setEventLog] = useState<
    { at: number; text: string; kind: string }[]
  >([]);
  const [history, setHistory] = useState<{
    people: number[];
    purchases: number[];
    revenue: number[];
    services: number[];
  }>({ people: [], purchases: [], revenue: [], services: [] });
  const [paletteQuery, setPaletteQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tickerCollapsed, setTickerCollapsed] = useState(false);
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
          setConnected(false);
          if (event.code !== 1000 && event.code !== 1001)
            console.warn(
              `[ws] closed code=${event.code} reason=${event.reason || "(none)"} clean=${event.wasClean}`,
            );
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
  async function submitText(eventText: string) {
    if (!canSubmit) return;
    const segment = await command("events", {
      text: eventText,
      runId: latestRun!.runId,
      expectedTime: latestRun!.time,
    });
    if (segment) {
      playback.onSubmitted(segment.id);
      setText("");
      setPanel("events");
    }
    return !!segment;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    await submitText(text);
  }
  const person = run?.people.find((p) => p.id === selected),
    place = env?.places.find((p) => p.id === selected);
  const totals = run ? resultFor(run, "Live").totals : null;
  useEffect(() => {
    if (!run || !totals) return;
    const people = run.people.filter((p) => p.presence === "inside").length;
    setHistory((h) => {
      const push = (a: number[], v: number) => {
        const next = a.length > 60 ? a.slice(-60) : a.slice();
        next.push(v);
        return next;
      };
      return {
        people: push(h.people, people),
        purchases: push(h.purchases, totals.purchases),
        revenue: push(h.revenue, totals.revenue),
        services: push(h.services, totals.serviceCompletions),
      };
    });
  }, [run?.runId, run?.time, totals?.purchases, totals?.revenue]);
  useEffect(() => {
    if (!run) return;
    const notable: { at: number; text: string; kind: string }[] = [];
    for (const p of run.people) {
      if (p.lastDecision)
        notable.push({
          at: p.lastDecision.at,
          text: `${p.displayName}: ${p.lastDecision.choice}`,
          kind: "decision",
        });
    }
    for (const e of run.events)
      notable.push({
        at: e.startTimeSeconds,
        text: `${e.title} · ${e.status}`,
        kind: e.status === "failed" ? "warn" : "event",
      });
    notable.sort((a, b) => b.at - a.at);
    setEventLog(notable.slice(0, 40));
  }, [run?.runId, run?.time, run?.events.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setGridOpen(null);
        setShortcutsOpen(false);
        return;
      }
      if (inField) return;
      if (e.key === "F1") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "F2") {
        e.preventDefault();
        setGridOpen(gridOpen === "places" ? null : "places");
      } else if (e.key === "F3") {
        e.preventDefault();
        setGridOpen(gridOpen === "people" ? null : "people");
      } else if (e.key === "F4") {
        e.preventDefault();
        setPanel("events");
      } else if (e.key === "F5") {
        e.preventDefault();
        setPanel("compare");
      } else if (e.key === "F6") {
        e.preventDefault();
        setPanel(panel === "sources" ? "entity" : "sources");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gridOpen, panel]);
  async function runPaletteCommand(raw: string): Promise<string | null> {
    const q = raw.trim();
    if (!q) return null;
    const parts = q.toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const rest = q.slice(cmd.length).trim();
    const findPlace = (query: string) =>
      env?.places.find(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.id.toLowerCase() === query.toLowerCase(),
      );
    const findPerson = (query: string) =>
      run?.people.find(
        (p) =>
          p.displayName.toLowerCase().includes(query.toLowerCase()) ||
          p.id.toLowerCase() === query.toLowerCase(),
      );
    if (cmd === "close") {
      const p = findPlace(rest);
      if (!p) return "No place matched";
      setText(`Close ${p.name} for 5 minutes`);
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "discount") {
      const m = rest.match(/^(\d+)\s+(.+)$/);
      if (!m) return "Usage: discount 20 gate-b4";
      const p = findPlace(m[2]);
      if (!p) return "No place matched";
      setText(`Announce ${m[1]}% off at ${p.name} for 5 minutes`);
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "capacity") {
      const m = rest.match(/^(\d+)\s+(.+)$/);
      if (!m) return "Usage: capacity 2 security";
      const p = findPlace(m[2]);
      if (!p) return "No place matched";
      setText(
        `Set service capacity at ${p.name} to ${m[1]} slots for 5 minutes`,
      );
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "announce") {
      if (!rest) return "Usage: announce <message>";
      setText(`Announce: ${rest}`);
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "heat") {
      const modes: HeatMode[] = [
        "off",
        "traffic",
        "occupancy",
        "revenue",
        "wait",
      ];
      if (!(modes as string[]).includes(rest))
        return `Usage: heat ${modes.join("|")}`;
      setHeatMode(rest as HeatMode);
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "focus" || cmd === "select") {
      const p = findPlace(rest) ?? findPerson(rest);
      if (!p) return "Nothing matched";
      setSelected(p.id);
      setPanel("entity");
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "find") {
      const p = findPlace(rest) ?? findPerson(rest);
      if (!p) return "Nothing matched";
      setSelected(p.id);
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "compare" || q === "compare") {
      setPanel("compare");
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "grid") {
      setGridOpen(rest === "people" ? "people" : "places");
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "reset") {
      command("reset");
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "sources") {
      setPanel("sources");
      setPaletteOpen(false);
      return null;
    }
    if (cmd === "help" || cmd === "?") {
      setShortcutsOpen(true);
      setPaletteOpen(false);
      return null;
    }
    if (!canSubmit)
      return "Return to the latest running simulation before adding an event";
    if (q.length < 3) return "Describe the event in at least 3 characters";
    const submitted = await submitText(q);
    if (!submitted) return "Could not process this event";
    setPaletteOpen(false);
    return null;
  }
  return (
    <main
      className={
        setupView
          ? "app onboarding"
          : `app workspace ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`
      }
    >
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
              heatMode={heatMode}
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
                    <div
                      className="heat-toggle"
                      role="group"
                      aria-label="Heatmap overlay"
                    >
                      {(
                        [
                          ["off", "Off"],
                          ["traffic", "Traffic"],
                          ["occupancy", "Live"],
                          ["revenue", "Revenue"],
                          ["wait", "Wait"],
                        ] as [HeatMode, string][]
                      ).map(([m, label]) => (
                        <button
                          key={m}
                          className={heatMode === m ? "active" : ""}
                          onClick={() => setHeatMode(m)}
                          title={`Heatmap: ${label}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setGridOpen(gridOpen ? null : "places")}
                      title="Places data grid (F2)"
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setPaletteOpen(true)}
                      title="Command palette (⌘K)"
                    >
                      ⌘K
                    </button>
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
                <div className="world-metrics z-100">
                  <div className="metric with-spark">
                    <span>People inside</span>
                    <strong>
                      {run.people.filter((p) => p.presence === "inside").length}
                    </strong>
                    <Sparkline points={history.people} color="#4b6b3a" />
                  </div>
                  <div className="metric with-spark">
                    <span>Purchases</span>
                    <strong>{totals!.purchases}</strong>
                    <Sparkline points={history.purchases} color="#c25c4c" />
                  </div>
                  <div className="metric with-spark">
                    <span>Revenue</span>
                    <strong>{money(totals!.revenue)}</strong>
                    <Sparkline points={history.revenue} color="#b48a3d" />
                  </div>
                  <div className="metric with-spark">
                    <span>Services completed</span>
                    <strong>{totals!.serviceCompletions}</strong>
                    <Sparkline points={history.services} color="#5f8391" />
                  </div>
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
              <button
                type="button"
                className="entity-list-toggle"
                aria-controls="environment-entities"
                aria-expanded={sidebarOpen}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                title={
                  sidebarOpen ? "Collapse sidebar" : "Browse places and people"
                }
                onClick={() => setSidebarOpen((open) => !open)}
              >
                {sidebarOpen ? (
                  <PanelLeftClose size={17} />
                ) : (
                  <PanelLeftOpen size={17} />
                )}
              </button>
              <nav
                id="environment-entities"
                className={`entity-list ${sidebarOpen ? "open" : "closed"}`}
                aria-label="Environment entities"
                aria-hidden={!sidebarOpen}
                inert={!sidebarOpen}
              >
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
                <p
                  className="timeline-note"
                  style={{
                    visibility:
                      playback.historical && !playback.playing && !processing
                        ? "visible"
                        : "hidden",
                  }}
                  aria-hidden={
                    !playback.historical || playback.playing || !!processing
                  }
                >
                  You are viewing recorded history.{" "}
                  <button
                    type="button"
                    onClick={() => playback.seek(playback.end)}
                  >
                    Return to latest state to add an event
                  </button>
                </p>
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
              </form>
            </>
          )}
        </>
      )}
      {run && !setupView && (
        <>
          <TerminalTicker
            log={eventLog}
            collapsed={tickerCollapsed}
            onToggle={() => setTickerCollapsed((v) => !v)}
          />
          {gridOpen === "places" && env && (
            <PlacesGrid
              env={env}
              run={run}
              onSelect={(id) => {
                setSelected(id);
                setPanel("entity");
                setGridOpen(null);
              }}
              onClose={() => setGridOpen(null)}
            />
          )}
          {gridOpen === "people" && env && (
            <PeopleGrid
              env={env}
              run={run}
              onSelect={(id) => {
                setSelected(id);
                setPanel("entity");
                setGridOpen(null);
              }}
              onClose={() => setGridOpen(null)}
            />
          )}
        </>
      )}
      {paletteOpen && (
        <CommandPalette
          env={env}
          run={run}
          query={paletteQuery}
          setQuery={setPaletteQuery}
          onSubmit={runPaletteCommand}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {shortcutsOpen && (
        <ShortcutsHelp onClose={() => setShortcutsOpen(false)} />
      )}
    </main>
  );
}
function TerminalTicker({
  log,
  collapsed,
  onToggle,
}: {
  log: { at: number; text: string; kind: string }[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`terminal-ticker ${collapsed ? "collapsed" : ""}`}>
      <button
        className="ticker-toggle"
        onClick={onToggle}
        aria-label="Toggle ticker"
      >
        <span className="tiny-dot" />
        TICKER · {log.length}
      </button>
      {!collapsed && (
        <div className="ticker-list">
          {log.length === 0 && <em>No activity yet.</em>}
          {log.map((entry, i) => (
            <span key={i} className={`ticker-item ${entry.kind}`}>
              <b>{time(entry.at)}</b> {entry.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
function PlacesGrid({
  env,
  run,
  onSelect,
  onClose,
}: {
  env: Environment;
  run: Run;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [sort, setSort] = useState<
    "name" | "occupancy" | "visits" | "revenue" | "wait"
  >("occupancy");
  const rows = env.places
    .map((p) => {
      const m = run.metrics[p.id];
      return {
        p,
        occupancy: occupancy(run, p.id),
        visits: m?.visits ?? 0,
        revenue: m?.revenue ?? 0,
        wait: m && m.waitSamples ? m.waitTotal / m.waitSamples : 0,
        purchases: m?.purchases ?? 0,
        abandonment: m?.abandonment ?? 0,
      };
    })
    .sort((a, b) => {
      if (sort === "name") return a.p.name.localeCompare(b.p.name);
      return (
        (b as unknown as Record<string, number>)[sort] -
        (a as unknown as Record<string, number>)[sort]
      );
    });
  return (
    <div className="grid-modal" onClick={onClose}>
      <div className="grid-panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>PLACES · F2</strong>
          <button onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </header>
        <table className="dense-table">
          <thead>
            <tr>
              <th onClick={() => setSort("name")}>Name</th>
              <th>Type</th>
              <th onClick={() => setSort("occupancy")}>Live</th>
              <th>Cap</th>
              <th onClick={() => setSort("visits")}>Visits</th>
              <th onClick={() => setSort("revenue")}>Revenue</th>
              <th onClick={() => setSort("wait")}>Wait (s)</th>
              <th>Purch</th>
              <th>Abandon</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(
              ({
                p,
                occupancy: occ,
                visits,
                revenue,
                wait,
                purchases,
                abandonment,
              }) => (
                <tr key={p.id} onClick={() => onSelect(p.id)}>
                  <td>{p.name}</td>
                  <td>{p.typeLabel}</td>
                  <td className="num">{occ}</td>
                  <td className="num muted">{p.admissionCapacity}</td>
                  <td className="num">{visits}</td>
                  <td className="num">{money(revenue)}</td>
                  <td className="num">{wait ? wait.toFixed(1) : "—"}</td>
                  <td className="num">{purchases}</td>
                  <td className="num">{abandonment}</td>
                  <td>
                    <span
                      className={`tag ${placeOpen(run, p.id) ? "" : "warning"}`}
                    >
                      {placeOpen(run, p.id) ? "Open" : "Closed"}
                    </span>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function PeopleGrid({
  env,
  run,
  onSelect,
  onClose,
}: {
  env: Environment;
  run: Run;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const rows = run.people
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return (
    <div className="grid-modal" onClick={onClose}>
      <div className="grid-panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>PEOPLE · F3</strong>
          <button onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </header>
        <table className="dense-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>State</th>
              <th>Mood</th>
              <th>Where</th>
              <th className="num">Budget</th>
              <th className="num">Stress</th>
              <th className="num">Hunger</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const at = env.places.find((l) => l.id === p.placeId);
              return (
                <tr key={p.id} onClick={() => onSelect(p.id)}>
                  <td>{p.displayName}</td>
                  <td>{p.roleLabel}</td>
                  <td>{p.presence}</td>
                  <td>{p.mood}</td>
                  <td>{at?.name ?? "—"}</td>
                  <td className="num">
                    {p.budgetRemainingCents === null
                      ? "—"
                      : money(p.budgetRemainingCents)}
                  </td>
                  <td className="num">{Math.round(p.stress * 100)}%</td>
                  <td className="num">{Math.round(p.hunger * 100)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function CommandPalette({
  env,
  run,
  query,
  setQuery,
  onSubmit,
  onClose,
}: {
  env?: Environment;
  run?: Run;
  query: string;
  setQuery: (s: string) => void;
  onSubmit: (raw: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const suggestions = ((): { text: string; hint: string }[] => {
    const q = query.trim().toLowerCase();
    const base = [
      { text: "close [place]", hint: "close a place for 5 min" },
      { text: "discount 20 [place]", hint: "announce 20% off" },
      { text: "capacity 2 [place]", hint: "set service slots" },
      { text: "announce [message]", hint: "broadcast announcement" },
      {
        text: "heat traffic|occupancy|revenue|wait|off",
        hint: "toggle heatmap",
      },
      { text: "focus [place|person]", hint: "select entity" },
      { text: "find [query]", hint: "jump to entity" },
      { text: "compare", hint: "open comparison" },
      { text: "grid places|people", hint: "open data grid" },
      { text: "sources", hint: "open sources & assumptions" },
      { text: "reset", hint: "reset baseline" },
    ];
    if (!q) return base;
    const matches: { text: string; hint: string }[] = base.filter((c) =>
      c.text.toLowerCase().includes(q),
    );
    if (env)
      for (const p of env.places) {
        if (p.name.toLowerCase().includes(q))
          matches.push({ text: `focus ${p.name}`, hint: p.typeLabel });
      }
    if (run)
      for (const p of run.people.slice(0, 8)) {
        if (p.displayName.toLowerCase().includes(q))
          matches.push({ text: `focus ${p.displayName}`, hint: p.roleLabel });
      }
    return matches.slice(0, 12);
  })();
  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const err = await onSubmit(query);
            setError(err);
            if (!err) setQuery("");
          }}
        >
          <input
            autoFocus
            placeholder="Type a command or describe an event…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
          />
        </form>
        {error && <div className="palette-error">{error}</div>}
        <ul className="palette-list">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={async () => {
                const err = await onSubmit(
                  s.text.replace(/\[.*?\]/g, "").trim(),
                );
                setError(err);
              }}
            >
              <code>{s.text}</code>
              <span>{s.hint}</span>
            </li>
          ))}
        </ul>
        <footer>Type naturally or choose a command · ↵ to run · ESC to close</footer>
      </div>
    </div>
  );
}
function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["⌘/Ctrl + K", "Open command palette"],
    ["F1", "This help"],
    ["F2", "Places data grid"],
    ["F3", "People data grid"],
    ["F4", "Events panel"],
    ["F5", "Compare runs"],
    ["F6", "Sources & assumptions"],
    ["ESC", "Close overlays"],
  ];
  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette shortcuts" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>KEYBOARD SHORTCUTS</strong>
          <button onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </header>
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th>
                  <code>{k}</code>
                </th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
