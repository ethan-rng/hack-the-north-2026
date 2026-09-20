"use client";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { usePlayback } from "./usePlayback";
import type { Segment } from "@/core/types";
const stamp = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export default function Timeline({
  playback: p,
  segments,
}: {
  playback: ReturnType<typeof usePlayback>;
  segments: Segment[];
}) {
  const currentSegment = segments.findLast(
    (s) => s.status === "ready" && s.startTime <= p.cursor,
  );
  return (
    <div className="timeline" aria-label="Recorded simulation playback">
      <div className="timeline-controls">
        <button
          type="button"
          onClick={() => p.seek(p.start)}
          disabled={!p.hasFrames || !!p.processing}
          aria-label="Rewind to start"
        >
          <SkipBack size={15} />
        </button>
        <button
          type="button"
          className="play-toggle"
          onClick={p.toggle}
          disabled={!p.hasFrames || !!p.processing}
          aria-label={p.playing ? "Pause playback" : "Play recording"}
        >
          {p.playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          type="button"
          onClick={() => p.seek(p.end)}
          disabled={!p.hasFrames || !!p.processing}
          aria-label="Jump to latest state"
        >
          <SkipForward size={15} />
        </button>
        <span className="timeline-time">
          <b>{stamp(p.cursor)}</b> / {stamp(p.end)}
        </span>
        <label>
          Speed{" "}
          <select
            aria-label="Playback speed"
            value={p.speed}
            onChange={(e) => p.setSpeed(Number(e.target.value))}
          >
            {[0.25, 0.5, 1, 2, 4].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
        <span className="timeline-status">
          {p.processing
            ? "Computing next segment"
            : p.playing
              ? "Playing recording"
              : "Paused"}
        </span>
      </div>
      <input
        type="range"
        aria-label="Simulation timeline"
        min={p.start}
        max={Math.max(p.start + 0.1, p.end)}
        step="0.1"
        value={p.cursor}
        disabled={!p.hasFrames || !!p.processing}
        onChange={(e) => p.seek(Number(e.target.value))}
      />
      <div className="timeline-segments">
        {segments
          .filter((s) => s.status === "ready")
          .map((s, i) => (
            <button
              type="button"
              key={s.id}
              title={s.originalText}
              disabled={!!p.processing}
              onClick={() => p.seek(s.startTime)}
            >
              {stamp(s.startTime)} · Event {i + 1}
            </button>
          ))}
        {!p.hasFrames && (
          <span>Submit an event to record the next 30 simulated seconds.</span>
        )}
      </div>
      {currentSegment &&
        /limit|budget reached/i.test(currentSegment.message) && (
          <p role="status">{currentSegment.message}</p>
        )}
      {p.loadError && (
        <p role="alert">
          {p.loadError}{" "}
          <button type="button" onClick={p.retry}>
            Retry loading
          </button>
        </p>
      )}
    </div>
  );
}
