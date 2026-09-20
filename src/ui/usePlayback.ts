"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { mergeRecordings, sampleRecording } from "@/core/playback";
import type { Recording, Run, SessionSnapshot } from "@/core/types";

export function usePlayback(snapshot?: SessionSnapshot) {
  const latest = snapshot?.run;
  const runId = latest?.runId;
  const initial = useRef<Run | undefined>(undefined);
  if (initial.current?.runId !== runId) initial.current = latest;
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [requested, setRequested] = useState<string>();
  const consumed = useRef<string | undefined>(undefined);
  const position = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const segments = snapshot?.segments ?? [];
  const readyIds = segments
    .filter((s) => s.runId === runId && s.status === "ready")
    .map((s) => s.id)
    .join(",");
  const frames = useMemo(
    () =>
      mergeRecordings(
        Object.values(recordings).filter((r) => r.runId === runId),
      ),
    [recordings, runId],
  );
  const start = frames[0]?.time ?? 0;
  const end = frames.at(-1)?.time ?? latest?.time ?? 0;
  const seek = (time: number) => {
    setPlaying(false);
    position.current = Math.max(start, Math.min(end, time));
    setCursor(position.current);
  };
  useEffect(() => {
    setRecordings({});
    setPlaying(false);
    setRequested(undefined);
    consumed.current = undefined;
    position.current = latest?.time ?? 0;
    setCursor(position.current);
    setLoadError("");
  }, [runId]); // A new baseline owns a separate timeline.
  useEffect(() => {
    const missing = readyIds.split(",").filter((id) => id && !recordings[id]);
    if (!missing.length) return;
    const controller = new AbortController();
    let alive = true;
    Promise.all(
      missing.map(async (id) => {
        const response = await fetch(
          `/api/recording?segmentId=${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            "Recorded playback could not load. Retry to view it.",
          );
        return response.json() as Promise<Recording>;
      }),
    )
      .then((results) => {
        if (alive) {
          setRecordings((previous) => ({
            ...previous,
            ...Object.fromEntries(results.map((r) => [r.segmentId, r])),
          }));
          setLoadError("");
        }
      })
      .catch((error) => {
        if (alive && error.name !== "AbortError") setLoadError(error.message);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [readyIds, runId, recordings, retry]);
  useEffect(() => {
    if (!requested || consumed.current === requested || !recordings[requested])
      return;
    consumed.current = requested;
    const recording = recordings[requested];
    position.current = recording.frames[0]?.time ?? 0;
    setCursor(position.current);
    setPlaying(true);
  }, [requested, recordings]);
  useEffect(() => {
    if (!playing || !frames.length) return;
    let frame = 0,
      previous = performance.now();
    const advance = (now: number) => {
      if (now - previous >= 32) {
        position.current = Math.min(
          end,
          position.current + Math.min(0.25, (now - previous) / 1000) * speed,
        );
        previous = now;
        setCursor(position.current);
        if (position.current >= end) {
          setPlaying(false);
          return;
        }
      }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, end, frames.length]);
  const frame = useMemo(
    () => sampleRecording(frames, cursor),
    [frames, cursor],
  );
  const run: Run | undefined =
    frame && latest
      ? {
          ...latest,
          ...frame,
          status: "paused",
          transactions: [],
          interactions: [],
          decisions: [],
        }
      : initial.current;
  const processing = segments.find(
    (s) => s.status === "processing" || s.status === "interpreting",
  );
  const loading = readyIds.split(",").some((id) => id && !recordings[id]);
  return {
    run,
    cursor,
    playing,
    speed,
    setSpeed,
    processing,
    loading,
    loadError,
    retry: () => setRetry((n) => n + 1),
    start,
    end,
    hasFrames: frames.length > 1,
    recordings,
    loadedSegmentIds: Object.values(recordings)
      .filter((recording) => recording.runId === runId)
      .map((recording) => recording.segmentId),
    historical: cursor < (latest?.time ?? 0) - 0.05,
    seek,
    onSubmitted: (id: string) => {
      setPlaying(false);
      setRequested(id);
    },
    playSegment: (id: string) => {
      const recording = recordings[id];
      if (!recording) return;
      position.current = recording.frames[0]?.time ?? start;
      setCursor(position.current);
      setPlaying(true);
    },
    toggle: () => {
      if (!frames.length) return;
      if (position.current >= end) {
        position.current = start;
        setCursor(start);
      }
      setPlaying((value) => !value);
    },
  };
}
