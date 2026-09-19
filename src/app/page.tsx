"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionChips } from "@/components/QuestionChips";

type Status =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "clarify"; message: string }
  | { kind: "error"; message: string };

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preset, setPreset] = useState<"cafe" | "barbershop" | "tacoshop">("cafe");

  const [question, setQuestion] = useState("Should I raise my latte from $5.00 to $5.50?");
  const [businessType, setBusinessType] = useState("cafe");
  const [businessDescription, setBusinessDescription] = useState(
    "Small café near a university, 8 menu items, 2 baristas, open 7 to 5. Regulars are mostly students and office workers.",
  );
  const [location, setLocation] = useState("N1H postal area, Guelph, ON");

  async function runPreset() {
    setStatus({ kind: "running", label: `Running ${preset} preset…` });
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const { runId } = await res.json();
      router.push(`/report/${runId}`);
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function ask() {
    setStatus({ kind: "running", label: "Researching neighbourhood…" });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, businessType, businessDescription, location }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (body.clarify) {
        setStatus({ kind: "clarify", message: body.clarify });
        return;
      }
      router.push(`/report/${body.runId}`);
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  const busy = status.kind === "running";

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col items-start px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">What If Town</h1>
      <p className="mt-3 max-w-lg text-lg text-zinc-600">
        Ask a plain-English question about your business. Watch a simulated neighbourhood play it out
        baseline vs. what-if.
      </p>

      <section className="mt-8 w-full space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Business description
          </label>
          <textarea
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Business type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
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
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <div className="mt-2">
            <QuestionChips onPick={setQuestion} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={ask}
            disabled={busy}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {busy ? status.label : "Ask"}
          </button>
          <div className="flex items-center gap-1">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as typeof preset)}
              disabled={busy}
              className="rounded-l-full border border-r-0 border-zinc-300 bg-white py-2 pl-4 pr-2 text-sm"
            >
              <option value="cafe">Café preset</option>
              <option value="barbershop">Barbershop preset</option>
              <option value="tacoshop">Taco shop preset</option>
            </select>
            <button
              onClick={runPreset}
              disabled={busy}
              className="rounded-r-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Run
            </button>
          </div>
          <a
            href="/report/cached"
            className="ml-auto text-sm text-zinc-600 underline hover:text-zinc-900"
          >
            Play cached demo →
          </a>
        </div>
        {status.kind === "clarify" && (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Planner needs one clarification: {status.message}
          </p>
        )}
        {status.kind === "error" && (
          <p className="mt-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {status.message}
          </p>
        )}
      </section>

      <p className="mt-6 text-xs text-zinc-500">
        Mock Jev by default. Set <code>USE_MOCK_JEV=false</code> and{" "}
        <code>JEV_WORKER_URL</code> in <code>.env.local</code> to hit real Jev via the Cloudflare Worker.
        Set <code>ANTHROPIC_API_KEY</code> for real research/planner/report.
      </p>
    </main>
  );
}
