"use client";

import { useEffect, useRef, useState } from "react";

export type Speed = 1 | 4 | 16;

interface Props {
  totalTicks: number;
  onTickChange: (tick: number) => void;
}

export function ReplayControls({ totalTicks, onTickChange }: Props) {
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState<Speed>(4);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    onTickChange(tick);
  }, [tick, onTickChange]);

  useEffect(() => {
    if (!playing) return;
    const step = (t: number) => {
      if (!lastTime.current) lastTime.current = t;
      const dt = t - lastTime.current;
      const perTickMs = 400 / speed;
      if (dt >= perTickMs) {
        lastTime.current = t;
        setTick((prev) => {
          const next = prev + 1;
          if (next >= totalTicks) {
            setPlaying(false);
            return totalTicks - 1;
          }
          return next;
        });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      lastTime.current = 0;
    };
  }, [playing, speed, totalTicks]);

  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
      <button
        onClick={() => setPlaying((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
      >
        {playing ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="0.5" /><rect x="6" y="1" width="3" height="8" rx="0.5" /></svg>
            Pause
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4z" /></svg>
            Play
          </>
        )}
      </button>
      <div className="flex overflow-hidden rounded-full border border-[var(--color-app-border-strong)]">
        {([1, 4, 16] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
              speed === s
                ? "bg-[var(--color-accent)] text-white"
                : "bg-transparent text-[var(--color-ink-muted)] hover:bg-[var(--color-app-bg)]"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalTicks - 1)}
        value={tick}
        onChange={(e) => {
          setPlaying(false);
          setTick(Number(e.target.value));
        }}
        className="flex-1 min-w-[240px] accent-[var(--color-accent)]"
      />
      <div className="w-28 text-right text-xs text-[var(--color-ink-subtle)] tabular-nums">
        tick {tick} / {totalTicks - 1}
      </div>
    </div>
  );
}
