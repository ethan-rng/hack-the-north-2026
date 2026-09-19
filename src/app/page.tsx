"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionChips } from "@/components/QuestionChips";
import { Stepper, type Step } from "@/components/Stepper";

type Preset = "cafe" | "barbershop" | "tacoshop";

type StepId = "research" | "plan" | "simulate" | "summarize";

const STEP_META: Record<StepId, { label: string; hint: string; runningDetail: string }> = {
  research: {
    label: "Research",
    hint: "~15–30s",
    runningDetail: "Looking up who shops in this neighbourhood using web search + census + industry data.",
  },
  plan: {
    label: "Plan",
    hint: "~5–15s",
    runningDetail: "Classifying the question into a template and drafting the simulation spec.",
  },
  simulate: {
    label: "Simulate",
    hint: "~15–40s",
    runningDetail: "Running baseline and what-if worlds side by side — 60 agents × 3 days, one Jev decision per agent per tick.",
  },
  summarize: {
    label: "Summarize",
    hint: "~3–8s",
    runningDetail: "Writing the plain-English report from the computed metrics.",
  },
};

type Status =
  | { kind: "idle" }
  | { kind: "running"; steps: Step[] }
  | { kind: "clarify"; message: string; steps: Step[] }
  | { kind: "error"; message: string; steps: Step[] };

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preset, setPreset] = useState<Preset>("cafe");

  const [question, setQuestion] = useState("Should I raise my latte from $5.00 to $5.50?");
  const [businessType, setBusinessType] = useState("cafe");
  const [businessDescription, setBusinessDescription] = useState(
    "Small café near a university, 8 menu items, 2 baristas, open 7 to 5. Regulars are mostly students and office workers.",
  );
  const [location, setLocation] = useState("N1H postal area, Guelph, ON");

  async function runPipeline(mode: "ask" | "preset") {
    const stepIds: StepId[] =
      mode === "ask"
        ? ["research", "plan", "simulate", "summarize"]
        : ["simulate", "summarize"];
    const steps: Step[] = stepIds.map((id) => ({
      id,
      label: STEP_META[id].label,
      hint: STEP_META[id].hint,
      state: "idle",
    }));
    const startedAt: Partial<Record<StepId, number>> = {};

    const setStep = (id: StepId, patch: Partial<Step>) => {
      const idx = steps.findIndex((s) => s.id === id);
      if (idx >= 0) steps[idx] = { ...steps[idx], ...patch };
      setStatus({ kind: "running", steps: [...steps] });
    };
    const startStep = (id: StepId) => {
      startedAt[id] = Date.now();
      setStep(id, { state: "running" });
    };
    const finishStep = (id: StepId) => {
      const s = startedAt[id];
      setStep(id, { state: "done", ms: s ? Date.now() - s : undefined });
    };
    const errorStep = (id: StepId) => setStep(id, { state: "error" });

    try {
      let runId: string;
      if (mode === "ask") {
        // 1. Research
        startStep("research");
        const rRes = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessType, location, ownerNotes: businessDescription }),
        });
        const rBody = await safeJson(rRes);
        if (!rRes.ok) {
          errorStep("research");
          throw new Error(formatError(rRes.status, rBody));
        }
        finishStep("research");
        const customer_model = rBody.customer_model;

        // 2. Plan
        startStep("plan");
        const pRes = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, businessDescription, location, customer_model }),
        });
        const pBody = await safeJson(pRes);
        if (!pRes.ok) {
          errorStep("plan");
          throw new Error(formatError(pRes.status, pBody));
        }
        if (pBody.clarify) {
          setStep("plan", { state: "error" });
          setStatus({ kind: "clarify", message: String(pBody.clarify), steps: [...steps] });
          return;
        }
        finishStep("plan");
        const spec = pBody.spec;

        // 3. Simulate
        startStep("simulate");
        const sRes = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec, generateSummary: false }),
        });
        const sBody = await safeJson(sRes);
        if (!sRes.ok) {
          errorStep("simulate");
          throw new Error(formatError(sRes.status, sBody));
        }
        finishStep("simulate");
        runId = String(sBody.runId);
      } else {
        // Preset path: only simulate + summarize.
        startStep("simulate");
        const sRes = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preset, generateSummary: false }),
        });
        const sBody = await safeJson(sRes);
        if (!sRes.ok) {
          errorStep("simulate");
          throw new Error(formatError(sRes.status, sBody));
        }
        finishStep("simulate");
        runId = String(sBody.runId);
      }

      // Last step: summarize
      startStep("summarize");
      const smRes = await fetch(`/api/summarize/${runId}`, { method: "POST" });
      const smBody = await safeJson(smRes);
      if (!smRes.ok) {
        errorStep("summarize");
        throw new Error(formatError(smRes.status, smBody));
      }
      finishStep("summarize");

      // Small pause so the completed stepper is visible.
      await new Promise((r) => setTimeout(r, 350));
      router.push(`/report/${runId}`);
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
        steps: [...steps],
      });
    }
  }

  const busy = status.kind === "running";
  const currentRunning = status.kind === "running" ? status.steps.find((s) => s.state === "running") : undefined;
  const runningDetail = currentRunning ? STEP_META[currentRunning.id as StepId].runningDetail : undefined;

  return (
    <>
      {busy && <div className="progress-bar" />}
      <main className="mx-auto flex min-h-full max-w-3xl flex-col items-start px-6 py-16">
        <div className="mb-2 flex items-center gap-2">
          <span className="eyebrow">Simulation</span>
          <span className="rounded-full bg-[var(--color-info-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-info)]">
            beta
          </span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-ink)]">What If Town</h1>
        <p className="mt-3 max-w-lg text-lg text-[var(--color-ink-muted)]">
          Ask a plain-English question about your business. Watch a simulated neighbourhood play it out
          baseline vs. what-if.
        </p>

        <section className="mt-8 w-full space-y-4 card p-6">
          <div>
            <label className="eyebrow">Business description</label>
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={2}
              className="input mt-2"
              disabled={busy}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow">Business type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={busy}
                className="input mt-2"
              >
                <option value="cafe">Café</option>
                <option value="barbershop">Barbershop</option>
                <option value="taco_shop">Taco shop</option>
                <option value="bakery">Bakery</option>
                <option value="restaurant">Restaurant</option>
                <option value="bike_shop">Bike shop</option>
              </select>
            </div>
            <div>
              <label className="eyebrow">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={busy}
                className="input mt-2"
              />
            </div>
          </div>
          <div>
            <label className="eyebrow">Your question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              className="input mt-2"
              disabled={busy}
            />
            <div className="mt-3">
              <QuestionChips onPick={setQuestion} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={() => runPipeline("ask")} disabled={busy} className="btn-primary">
              {busy ? "Working…" : "Ask"}
            </button>
            <div className="flex items-center rounded-full border border-[var(--color-app-border-strong)]">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as Preset)}
                disabled={busy}
                className="rounded-l-full bg-transparent py-2 pl-4 pr-2 text-sm focus:outline-none"
              >
                <option value="cafe">Café preset</option>
                <option value="barbershop">Barbershop preset</option>
                <option value="tacoshop">Taco shop preset</option>
              </select>
              <button
                onClick={() => runPipeline("preset")}
                disabled={busy}
                className="rounded-r-full border-l border-[var(--color-app-border-strong)] px-4 py-2 text-sm font-medium hover:bg-[color-mix(in_srgb,var(--color-app-bg)_60%,white)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Run
              </button>
            </div>
            <div className="ml-auto flex items-center gap-4 text-sm text-[var(--color-ink-muted)]">
              <a href="/runs" className="underline decoration-[var(--color-app-border-strong)] underline-offset-4 hover:text-[var(--color-ink)]">
                Past runs
              </a>
              <a href="/report/cached" className="underline decoration-[var(--color-app-border-strong)] underline-offset-4 hover:text-[var(--color-ink)]">
                Cached demo →
              </a>
            </div>
          </div>
        </section>

        {status.kind !== "idle" && (
          <section className="mt-6 w-full">
            <Stepper steps={status.steps} detail={runningDetail} />
            {status.kind === "clarify" && (
              <div className="mt-3 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning)]">
                <div className="mb-1 text-xs font-medium uppercase tracking-wider">Planner needs one clarification</div>
                {status.message}
              </div>
            )}
            {status.kind === "error" && (
              <pre className="mt-3 whitespace-pre-wrap rounded-md border border-[var(--color-negative)]/30 bg-[var(--color-negative-soft)] p-3 text-sm text-[var(--color-negative)] font-sans">
                {status.message}
              </pre>
            )}
          </section>
        )}

        <p className="mt-6 text-xs text-[var(--color-ink-subtle)]">
          Mock Jev by default. Set <code>USE_MOCK_JEV=false</code> and{" "}
          <code>JEV_WORKER_URL</code> in <code>.env.local</code> to hit real Jev via the Cloudflare Worker.
        </p>
      </main>
    </>
  );
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 400) };
  }
}

function formatError(status: number, body: Record<string, unknown>): string {
  const err = (body.error as string) ?? (body.raw as string) ?? `HTTP ${status}`;
  const hint = body.hint ? `\n\n${body.hint}` : "";
  const detail = body.detail && body.detail !== err ? `\n\n${body.detail}` : "";
  return `${err}${detail}${hint}`;
}
