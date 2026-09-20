"use client";
import { scenePalette, type VisualContext } from "@/core/visualContext";

type Bounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  center: [number, number];
};
function Block({
  at,
  size,
  color,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={at} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function Greenery({
  x,
  z,
  kind,
  color,
}: {
  x: number;
  z: number;
  kind: VisualContext["vegetation"];
  color: string;
}) {
  if (kind === "sparse") return null;
  const palm = kind === "palm",
    planter = kind === "planters";
  const height = palm ? 3.8 : planter ? 1.1 : 2;
  return (
    <group position={[x, 0, z]}>
      {planter && (
        <Block at={[0, 0.25, 0]} size={[1.3, 0.5, 1.3]} color="#979a91" />
      )}
      <Block
        at={[0, height / 2, 0]}
        size={[0.2, height, 0.2]}
        color="#87725b"
      />
      {palm ? (
        Array.from({ length: 6 }, (_, i) => (
          <group
            key={i}
            rotation={[0, (i * Math.PI) / 3, 0]}
            position={[0, height, 0]}
          >
            <mesh
              position={[0.8, -0.15, 0]}
              rotation={[0, 0, -0.22]}
              castShadow
            >
              <boxGeometry args={[2, 0.1, 0.45]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))
      ) : kind === "conifer" ? (
        [0, 0.65, 1.25].map((y, i) => (
          <mesh key={i} position={[0, height + y, 0]} castShadow>
            <coneGeometry args={[1.25 - i * 0.25, 1.8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))
      ) : (
        <mesh position={[0, height + (planter ? 0.35 : 0.7), 0]} castShadow>
          <icosahedronGeometry args={[planter ? 0.85 : 1.5, 1]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
function BackgroundBuilding({
  x,
  z,
  index,
  context,
}: {
  x: number;
  z: number;
  index: number;
  context: VisualContext;
}) {
  const palette = scenePalette(context);
  const low =
    context.setting === "rural" ||
    context.setting === "suburban" ||
    context.setting === "coastal";
  const historic = context.architecture === "historic";
  const width = low ? 6 : 7 + (index % 3);
  const depth = low ? 5 : 7;
  const floors =
    context.setting === "airport"
      ? 1
      : low
        ? 1 + (index % 2)
        : historic
          ? 2 + (index % 2)
          : 3 + (index % 4);
  const height = floors * 2.2;
  const pitched =
    low &&
    (context.architecture === "timber" ||
      historic ||
      context.architecture === "mediterranean");
  return (
    <group position={[x, -0.15, z]}>
      <Block
        at={[0, height / 2, 0]}
        size={[width, height, depth]}
        color={palette.wall}
      />
      {pitched ? (
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[(side * width) / 4, height + width * 0.1, 0]}
            rotation={[0, 0, -side * 0.4]}
            castShadow
          >
            <boxGeometry args={[width * 0.56, 0.25, depth + 0.6]} />
            <meshStandardMaterial color={palette.roof} />
          </mesh>
        ))
      ) : (
        <Block
          at={[0, height + 0.1, 0]}
          size={[width + 0.25, 0.25, depth + 0.25]}
          color={palette.roof}
        />
      )}
      {Array.from({ length: floors }, (_, floor) =>
        [-1, 0, 1].map((column) => (
          <mesh
            key={`${floor}-${column}`}
            position={[
              (column * width) / 3.5,
              1.3 + floor * 2.2,
              depth / 2 + 0.02,
            ]}
          >
            <planeGeometry args={[width / 5, 1.15]} />
            <meshStandardMaterial
              color={palette.glass}
              metalness={0.15}
              roughness={0.3}
            />
          </mesh>
        )),
      )}
      <Block
        at={[0, 0.8, depth / 2 + 0.05]}
        size={[0.9, 1.6, 0.12]}
        color={palette.roof}
      />
    </group>
  );
}
/** Decorative context stays beyond the simulation footprint and never adds destinations. */
export default function SettingBackdrop({
  scene,
  context,
  seed,
}: {
  scene: Bounds;
  context: VisualContext;
  seed: number;
}) {
  const palette = scenePalette(context);
  const indoor = context.setting === "interior";
  const airport = context.setting === "airport";
  const coastal = context.setting === "coastal";
  const built = ["urban", "suburban", "rural", "coastal"].includes(
    context.setting,
  );
  const count = Math.min(12, Math.max(4, Math.floor(scene.width / 13)));
  return (
    <group>
      {!indoor && (
        <Block
          at={[scene.center[0], -0.3, scene.center[1]]}
          size={[scene.width + 80, 0.2, scene.depth + 65]}
          color={palette.ground}
        />
      )}
      {indoor && (
        <>
          {Array.from(
            { length: Math.min(48, Math.ceil(scene.width / 5)) },
            (_, i) => (
              <Block
                key={`tile-x-${i}`}
                at={[scene.minX + i * 5, -0.08, scene.center[1]]}
                size={[0.025, 0.015, scene.depth]}
                color="#c5c3bb"
              />
            ),
          )}
          {Array.from(
            { length: Math.min(48, Math.ceil(scene.depth / 5)) },
            (_, i) => (
              <Block
                key={`tile-z-${i}`}
                at={[scene.center[0], -0.08, scene.minZ + i * 5]}
                size={[scene.width, 0.015, 0.025]}
                color="#c5c3bb"
              />
            ),
          )}
          <Block
            at={[scene.center[0], 0.4, scene.minZ - 0.5]}
            size={[scene.width + 1, 1, 0.6]}
            color={palette.trim}
          />
          <Block
            at={[scene.minX - 0.5, 0.4, scene.center[1]]}
            size={[0.6, 1, scene.depth]}
            color={palette.trim}
          />
        </>
      )}
      {(built || airport) && (
        <>
          <Block
            at={[scene.center[0], -0.15, scene.minZ - 7]}
            size={[scene.width + 35, 0.1, airport ? 12 : 7]}
            color={airport ? "#747d80" : "#686d6d"}
          />
          {Array.from({ length: count * 2 }, (_, i) => (
            <Block
              key={`lane-${i}`}
              at={[
                scene.minX - 12 + (i * (scene.width + 25)) / (count * 2),
                -0.08,
                scene.minZ - 7,
              ]}
              size={[2, 0.025, 0.14]}
              color={airport ? "#e6c35d" : "#ddd9c6"}
            />
          ))}
          <Block
            at={[scene.center[0], -0.08, scene.minZ - 2]}
            size={[scene.width + 30, 0.15, 2]}
            color={palette.paving}
          />
        </>
      )}
      {airport && (
        <>
          <Block
            at={[scene.center[0], -0.17, scene.minZ - 20]}
            size={[scene.width + 40, 0.08, 14]}
            color="#909897"
          />
          {[0.2, 0.5, 0.8].map((ratio, i) => (
            <group
              key={i}
              position={[scene.minX + scene.width * ratio, 0, scene.minZ - 20]}
            >
              <Block
                at={[0, -0.09, 0]}
                size={[0.15, 0.02, 10]}
                color="#e6c35d"
              />
              <Block at={[0, 0.45, 0]} size={[1.1, 0.65, 6]} color="#e0e4e2" />
              <Block
                at={[0, 0.65, 0.5]}
                size={[6, 0.15, 1.5]}
                color="#d1d8d8"
              />
              <Block
                at={[0, 1.15, -2.3]}
                size={[0.2, 1.4, 1.2]}
                color="#607d8c"
              />
            </group>
          ))}
        </>
      )}
      {coastal && (
        <>
          <Block
            at={[scene.center[0], -0.23, scene.minZ - 25]}
            size={[scene.width + 80, 0.1, 20]}
            color="#7fa9b4"
          />
          {[0, 1, 2].map((i) => (
            <Block
              key={i}
              at={[scene.center[0] + i * 4, -0.16, scene.minZ - 20 - i * 4]}
              size={[scene.width * 0.65, 0.01, 0.08]}
              color="#bed7d7"
            />
          ))}
        </>
      )}
      {built &&
        Array.from({ length: count }, (_, i) => (
          <BackgroundBuilding
            key={i}
            x={scene.minX + i * (scene.width / Math.max(1, count - 1))}
            z={coastal ? scene.maxZ + 18 : scene.minZ - 20 - (i % 2) * 3}
            index={i + Math.abs(seed % 7)}
            context={context}
          />
        ))}
      {[0.08, 0.3, 0.52, 0.74, 0.94].flatMap((ratio, i) => [
        <Greenery
          key={`north-${i}`}
          x={scene.minX + scene.width * ratio}
          z={scene.minZ + 1.5}
          kind={context.vegetation}
          color={palette.foliage}
        />,
        <Greenery
          key={`west-${i}`}
          x={scene.minX + 1.5}
          z={scene.minZ + scene.depth * ratio}
          kind={context.vegetation}
          color={palette.foliage}
        />,
      ])}
      {context.setting === "park" &&
        Array.from({ length: 10 }, (_, i) => (
          <Greenery
            key={`grove-${i}`}
            x={scene.minX - 8 - (i % 3) * 4}
            z={scene.minZ + (i / 10) * scene.depth}
            kind={context.vegetation}
            color={palette.foliage}
          />
        ))}
    </group>
  );
}
