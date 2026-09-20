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
      // 1x = one tick per 400ms real time.
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
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
      <button
        onClick={() => setPlaying((p) => !p)}
        className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <div className="flex gap-1">
        {([1, 4, 16] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              speed === s ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {s}x
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
        className="flex-1 min-w-[240px]"
      />
      <div className="w-24 text-right text-xs text-zinc-600 tabular-nums">
        tick {tick} / {totalTicks - 1}
      </div>
    </div>
  );
}
