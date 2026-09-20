"use client";
import { Flag, Pause, Play, SkipBack, SkipForward } from "lucide-react";
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
  const chapters = segments.filter((s) => s.runId === p.run?.runId);
  const readyChapters = chapters.filter((s) => s.status === "ready");
  const currentSegment = readyChapters.findLast(
    (s) => s.status === "ready" && s.startTime <= p.cursor,
  );
  return (
    <div className="timeline" aria-label="Recorded simulation playback">
      <div className="timeline-controls">
        <button
          type="button"
          onClick={() => p.seek(p.start)}
          disabled={!p.hasFrames || !!p.processing || p.loading}
          aria-label="Rewind to start"
        >
          <SkipBack size={15} />
        </button>
        <button
          type="button"
          className="play-toggle"
          onClick={p.toggle}
          disabled={!p.hasFrames || !!p.processing || p.loading}
          aria-label={p.playing ? "Pause playback" : "Play recording"}
        >
          {p.playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          type="button"
          onClick={() => p.seek(p.end)}
          disabled={!p.hasFrames || !!p.processing || p.loading}
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
      <div className="timeline-scrubber">
        <div className="timeline-markers" aria-label="Event checkpoints">
          {readyChapters.map((s) => (
            <button
              type="button"
              key={s.id}
              style={{
                left: `${(100 * (s.startTime - p.start)) / Math.max(0.1, p.end - p.start)}%`,
              }}
              aria-label={`Checkpoint ${chapters.indexOf(s) + 1}: ${s.originalText}, ${stamp(s.startTime)}`}
              aria-current={currentSegment?.id === s.id ? "step" : undefined}
              title={`${stamp(s.startTime)} · ${s.originalText}`}
              disabled={!!p.processing || !p.loadedSegmentIds.includes(s.id)}
              onClick={() => p.seek(s.startTime)}
            >
              <Flag size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
        <input
          type="range"
          aria-label="Simulation timeline"
          min={p.start}
          max={Math.max(p.start + 0.1, p.end)}
          step="0.1"
          value={p.cursor}
          disabled={!p.hasFrames || !!p.processing || p.loading}
          onChange={(e) => p.seek(Number(e.target.value))}
        />
      </div>
      <div className="timeline-chapter-heading">
        <b>Chapters</b>
        <span>Each event starts a new chapter</span>
      </div>
      <nav className="timeline-segments" aria-label="Event chapters">
        {chapters.map((s, i) => (
          <button
            type="button"
            key={s.id}
            title={s.status === "failed" ? s.message : s.originalText}
            aria-current={currentSegment?.id === s.id ? "step" : undefined}
            disabled={
              !!p.processing ||
              s.status !== "ready" ||
              !p.loadedSegmentIds.includes(s.id)
            }
            onClick={() => p.seek(s.startTime)}
          >
            <span className="chapter-meta">
              Chapter {i + 1} · {stamp(s.startTime)}
              {s.status === "failed"
                ? " · Failed"
                : s.status !== "ready"
                  ? " · Processing"
                  : !p.loadedSegmentIds.includes(s.id)
                    ? " · Loading"
                    : `–${stamp(s.endTime)}`}
            </span>
            <span className="chapter-title">{s.originalText}</span>
          </button>
        ))}
        {!chapters.length && (
          <span>Submit an event to record the next 30 simulated seconds.</span>
        )}
      </nav>
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
