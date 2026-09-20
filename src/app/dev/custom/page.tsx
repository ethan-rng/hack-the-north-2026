"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useState, type FormEvent } from "react";
import { BuildingModel, type Primitive } from "@/ui/buildings/primitives";

const SAMPLE_BRIEFS = [
  "beach cabana with striped canopy on wooden posts",
  "customs declaration hall with two curved counters and a big screen",
  "research reactor cooling stack with steam vent and access catwalk",
  "night market noodle stall with paper lanterns and stool row",
  "co-working loft with big skylights and a rooftop planter",
];

export default function CustomBuildingPage() {
  const [brief, setBrief] = useState(SAMPLE_BRIEFS[0]);
  const [primitives, setPrimitives] = useState<Primitive[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setPrimitives(null);
    const started = performance.now();
    try {
      const response = await fetch("/api/dev/building", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.primitives) {
        setError(payload.error || `HTTP ${response.status}`);
      } else {
        setPrimitives(payload.primitives as Primitive[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setDuration(performance.now() - started);
    }
  }

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gridTemplateRows: "auto 1fr",
        height: "100vh",
        background: "#eef1e8",
        fontFamily: "system-ui, sans-serif",
        color: "#2b2f2b",
      }}
    >
      <header
        style={{
          gridColumn: "1 / 3",
          padding: "12px 20px",
          borderBottom: "1px solid #cfd4c6",
          background: "#f5f7ee",
          display: "flex",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <strong>Dynamic Building — Scratch</strong>
        <small style={{ color: "#6b7264" }}>
          Baseten generates a validated primitive array from your brief.
        </small>
      </header>
      <aside
        style={{
          borderRight: "1px solid #cfd4c6",
          background: "#f5f7ee",
          padding: 16,
          overflowY: "auto",
        }}
      >
        <form onSubmit={submit}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#6b7264",
              marginBottom: 4,
              letterSpacing: 0.5,
            }}
          >
            BRIEF
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            minLength={4}
            maxLength={300}
            style={{
              width: "100%",
              border: "1px solid #b9bfb0",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 13,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <button
            disabled={busy || brief.trim().length < 4}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "9px 12px",
              border: "1px solid #4b6b3a",
              background: "#4b6b3a",
              color: "#fbfaf5",
              borderRadius: 6,
              fontSize: 13,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </form>
        <p style={{ fontSize: 11, color: "#6b7264", marginTop: 14 }}>
          Try one of these:
        </p>
        {SAMPLE_BRIEFS.map((s) => (
          <button
            key={s}
            onClick={() => setBrief(s)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 8px",
              margin: "4px 0",
              border: "1px solid #d9ddcd",
              background: "#fbfaf5",
              borderRadius: 4,
              fontSize: 11,
              cursor: "pointer",
              color: "#4b5b4a",
            }}
          >
            {s}
          </button>
        ))}
        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 10,
              background: "#f9ebe1",
              border: "1px solid #e6c8b5",
              borderRadius: 6,
              color: "#9b5e3e",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
        {primitives && (
          <div style={{ marginTop: 16, fontSize: 11, color: "#6b7264" }}>
            <div>
              <b>{primitives.length}</b> primitives ·{" "}
              {duration ? `${Math.round(duration)}ms` : ""}
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 11 }}>
                Show JSON
              </summary>
              <pre
                style={{
                  fontSize: 10,
                  background: "#f0f2e9",
                  padding: 8,
                  borderRadius: 4,
                  marginTop: 6,
                  maxHeight: 300,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(primitives, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </aside>
      <div style={{ position: "relative" }}>
        <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
          <color attach="background" args={["#eef1e8"]} />
          <ambientLight intensity={1.5} />
          <directionalLight
            position={[15, 25, 12]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-14}
            shadow-camera-right={14}
            shadow-camera-top={14}
            shadow-camera-bottom={-14}
          />
          <OrthographicCamera
            makeDefault
            position={[14, 14, 16]}
            zoom={26}
            near={0.1}
            far={200}
          />
          <OrbitControls
            makeDefault
            target={[0, 2, 0]}
            enablePan
            minZoom={8}
            maxZoom={80}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.15}
          />
          <mesh
            receiveShadow
            position={[0, -0.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#c9d0c1" />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
            <boxGeometry args={[9, 0.12, 7]} />
            <meshStandardMaterial color="#d7dac9" />
          </mesh>
          {primitives && (
            <BuildingModel primitives={primitives} fallbackColor="#95a591" />
          )}
        </Canvas>
      </div>
    </main>
  );
}
