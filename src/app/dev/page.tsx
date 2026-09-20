"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { BuildingModel } from "@/ui/buildings/primitives";
import type { BuildingCategory } from "@/ui/buildings/primitives";
import { categories, styles } from "@/ui/buildings/styles";

const PALETTE = [
  "#95a591",
  "#c8956b",
  "#7ba0a7",
  "#c9b478",
  "#a97a7a",
  "#88a37a",
  "#c67c5b",
  "#8e91b3",
  "#c8a08d",
  "#6b8f8a",
];

const GRID_COLS = 10;
const CELL = 16;

function Pad({ selected, hover }: { selected: boolean; hover: boolean }) {
  const color = selected ? "#203e48" : hover ? "#b3c1a1" : "#d7dac9";
  return (
    <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
      <boxGeometry args={[9, 0.24, 7]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function CameraFocus({ target }: { target: [number, number, number] | null }) {
  const controls = useThree((s) => s.controls) as
    | { target: { set: (x: number, y: number, z: number) => void }; update: () => void }
    | null;
  useEffect(() => {
    if (target && controls) {
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    }
  }, [target, controls]);
  return null;
}

export default function DevPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | BuildingCategory>("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [hoverId, setHoverId] = useState<string>();
  const [colorIndex, setColorIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState<string>();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return styles.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!term) return true;
      return (
        s.id.toLowerCase().includes(term) ||
        s.label.toLowerCase().includes(term) ||
        (s.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [search, category]);

  const color = PALETTE[colorIndex];

  const layout = useMemo(() => {
    const rows = Math.max(1, Math.ceil(filtered.length / GRID_COLS));
    return filtered.map((style, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = (col - (GRID_COLS - 1) / 2) * CELL;
      const z = (row - (rows - 1) / 2) * CELL;
      return { style, x, z };
    });
  }, [filtered]);

  const rows = Math.max(1, Math.ceil(filtered.length / GRID_COLS));

  const focusTarget = useMemo<[number, number, number] | null>(() => {
    if (!selectedId) return null;
    const item = layout.find((l) => l.style.id === selectedId);
    return item ? [item.x, 0, item.z] : null;
  }, [selectedId, layout]);

  const selected = selectedId
    ? styles.find((s) => s.id === selectedId)
    : undefined;

  const selectedPrimitives = useMemo(
    () => (selected ? selected.build({ color, closed }) : []),
    [selected, color, closed],
  );

  useEffect(() => {
    if (!selectedId) return;
    const btn = listRef.current?.querySelector(
      `[data-style="${selectedId}"]`,
    ) as HTMLElement | null;
    btn?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const hover = hoverId ?? selectedId;
  const hoverLabel = hover
    ? styles.find((s) => s.id === hover)?.label
    : undefined;

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gridTemplateRows: "auto 1fr auto",
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
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          background: "#f5f7ee",
        }}
      >
        <div>
          <strong style={{ fontSize: 16 }}>Building Library</strong>
          <small style={{ color: "#6b7264", marginLeft: 8 }}>
            {styles.length} styles · {filtered.length} shown
          </small>
        </div>
        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid #b9bfb0",
            borderRadius: 6,
            minWidth: 200,
          }}
        />
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as "all" | BuildingCategory)
          }
          style={{
            padding: "6px 10px",
            border: "1px solid #b9bfb0",
            borderRadius: 6,
          }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#6b7264" }}>Color</span>
          {PALETTE.map((p, i) => (
            <button
              key={p}
              onClick={() => setColorIndex(i)}
              aria-label={`Color ${p}`}
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border:
                  i === colorIndex ? "2px solid #2b2f2b" : "1px solid #b9bfb0",
                background: p,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>Closed</span>
        </label>
      </header>

      <aside
        ref={listRef}
        style={{
          borderRight: "1px solid #cfd4c6",
          background: "#f5f7ee",
          overflowY: "auto",
          padding: "8px 0",
        }}
      >
        {filtered.map((s) => (
          <button
            key={s.id}
            data-style={s.id}
            onClick={() => setSelectedId(s.id)}
            onMouseEnter={() => setHoverId(s.id)}
            onMouseLeave={() => setHoverId(undefined)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 14px",
              border: 0,
              background:
                selectedId === s.id
                  ? "#dfe6d0"
                  : hoverId === s.id
                    ? "#eaefdd"
                    : "transparent",
              cursor: "pointer",
              borderLeft:
                selectedId === s.id
                  ? "3px solid #4b6b3a"
                  : "3px solid transparent",
              fontSize: 13,
            }}
          >
            <strong style={{ display: "block" }}>{s.label}</strong>
            <small style={{ color: "#6b7264", fontSize: 11 }}>
              {s.category} · {s.id}
            </small>
          </button>
        ))}
        {filtered.length === 0 && (
          <p style={{ padding: "12px 14px", color: "#6b7264", fontSize: 13 }}>
            No styles match this filter.
          </p>
        )}
      </aside>

      <div style={{ position: "relative", minWidth: 0 }}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          onPointerMissed={() => setSelectedId(undefined)}
        >
          <color attach="background" args={["#eef1e8"]} />
          <ambientLight intensity={1.4} />
          <directionalLight
            position={[40, 80, 30]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-140}
            shadow-camera-right={140}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
            shadow-normalBias={0.08}
          />
          <OrthographicCamera
            makeDefault
            position={[0, 60, 90]}
            zoom={7}
            near={0.1}
            far={600}
          />
          <OrbitControls
            makeDefault
            enablePan
            minZoom={1}
            maxZoom={60}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.15}
          />
          <CameraFocus target={focusTarget} />
          <mesh
            receiveShadow
            position={[0, -0.4, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[GRID_COLS * CELL + 30, rows * CELL + 30]} />
            <meshStandardMaterial color="#c9d0c1" />
          </mesh>
          {layout.map(({ style, x, z }) => {
            const isSelected = selectedId === style.id;
            const isHover = hoverId === style.id;
            return (
              <group
                key={style.id}
                position={[x, 0, z]}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(style.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoverId(style.id);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  setHoverId((h) => (h === style.id ? undefined : h));
                  document.body.style.cursor = "";
                }}
              >
                <Pad selected={isSelected} hover={isHover} />
                <BuildingModel
                  primitives={style.build({ color, closed })}
                  fallbackColor={color}
                />
              </group>
            );
          })}
        </Canvas>

        {hoverLabel && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid #cfd4c6",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
              pointerEvents: "none",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            {hoverLabel}
          </div>
        )}

        {selected && (
          <aside
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 320,
              padding: 16,
              background: "rgba(255,255,255,0.97)",
              border: "1px solid #cfd4c6",
              borderRadius: 10,
              boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            }}
          >
            <button
              onClick={() => setSelectedId(undefined)}
              style={{
                position: "absolute",
                top: 8,
                right: 10,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 18,
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{selected.label}</h2>
            <div
              style={{
                fontSize: 12,
                color: "#6b7264",
                marginBottom: 12,
                display: "flex",
                gap: 8,
              }}
            >
              <span
                style={{
                  background: "#e6ecdc",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {selected.category}
              </span>
              <code
                style={{
                  background: "#f0f2e9",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {selected.id}
              </code>
            </div>
            {selected.description && (
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#3a3f38",
                  marginTop: 0,
                }}
              >
                {selected.description}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selected.id).then(() => {
                    setCopied(selected.id);
                    setTimeout(
                      () =>
                        setCopied((c) => (c === selected.id ? undefined : c)),
                      1500,
                    );
                  });
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid #b9bfb0",
                  background: "#f5f7ee",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {copied === selected.id ? "Copied!" : "Copy id"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(JSON.stringify(selectedPrimitives, null, 2))
                    .then(() => {
                      setCopied(selected.id + "-json");
                      setTimeout(
                        () =>
                          setCopied((c) =>
                            c === selected.id + "-json" ? undefined : c,
                          ),
                        1500,
                      );
                    });
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid #b9bfb0",
                  background: "#f5f7ee",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {copied === selected.id + "-json" ? "Copied!" : "Copy JSON"}
              </button>
            </div>
            <p
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "#6b7264",
              }}
            >
              {selectedPrimitives.length} primitive
              {selectedPrimitives.length === 1 ? "" : "s"}
            </p>
          </aside>
        )}
      </div>
      <footer
        style={{
          gridColumn: "1 / 3",
          padding: "8px 20px",
          fontSize: 12,
          color: "#6b7264",
          borderTop: "1px solid #cfd4c6",
          background: "#f5f7ee",
        }}
      >
        Drag to orbit · scroll to zoom · click a tile or list entry to inspect
      </footer>
    </main>
  );
}
