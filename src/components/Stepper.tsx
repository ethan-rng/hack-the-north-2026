"use client";

export type StepState = "idle" | "running" | "done" | "error" | "skipped";

export interface Step {
  id: string;
  label: string;
  hint?: string;
  state: StepState;
  ms?: number;
}

interface Props {
  steps: Step[];
  detail?: string;
}

export function Stepper({ steps, detail }: Props) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2 last:flex-none">
            <StepDot state={s.state} index={i + 1} />
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium leading-none ${
                  s.state === "done"
                    ? "text-[var(--color-ink)]"
                    : s.state === "running"
                      ? "text-[var(--color-ink)]"
                      : s.state === "error"
                        ? "text-[var(--color-negative)]"
                        : "text-[var(--color-ink-subtle)]"
                }`}
              >
                {s.label}
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-ink-subtle)] leading-none tabular-nums">
                {s.state === "done" && s.ms !== undefined
                  ? `${(s.ms / 1000).toFixed(1)}s`
                  : s.state === "running"
                    ? "in progress"
                    : s.state === "error"
                      ? "failed"
                      : s.state === "skipped"
                        ? "skipped"
                        : s.hint ?? " "}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-2 h-px flex-1 min-w-[16px] max-w-[60px]">
                <div
                  className="h-px w-full transition-colors"
                  style={{
                    background:
                      s.state === "done"
                        ? "var(--color-accent)"
                        : "var(--color-app-border-strong)",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {detail && (
        <div className="mt-3 border-t border-[var(--color-app-border)] pt-3 text-xs text-[var(--color-ink-muted)]">
          {detail}
        </div>
      )}
    </div>
  );
}

function StepDot({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-accent)] text-white">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (state === "running") {
    return (
      <div className="relative grid h-6 w-6 place-items-center">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent)]/20" />
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="14 40" />
        </svg>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-negative)] text-white">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (state === "skipped") {
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full border-2 border-dashed border-[var(--color-app-border-strong)] text-[10px] text-[var(--color-ink-subtle)]">
        —
      </div>
    );
  }
  return (
    <div className="grid h-6 w-6 place-items-center rounded-full border border-[var(--color-app-border-strong)] text-[10px] font-medium text-[var(--color-ink-subtle)]">
      {index}
    </div>
  );
}
