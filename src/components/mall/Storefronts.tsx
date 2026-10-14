import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Text, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  InstancedMesh,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  type Texture,
} from "three";
import { Crt } from "../cave/CaveWorld";
import { CRT_FEED, createSharedCrtUniforms } from "../cave/crtMaterial";
import type { FeedTextures } from "../IslandFeed";
import { MODEL, useFittedModel, type FittedModel } from "../stockroom/models";
import MallDoor from "./MallDoor";
import {
  BAY,
  BAY_ZS,
  CEILING_Y,
  GALLERY_Y,
  HALF_W,
  SHOPS,
  SHOP_DEPTH,
  SOFFIT_Y,
  storeyY,
  type Shop,
} from "./constants";
import {
  makeFasciaTexture,
  makeIslandPosterTexture,
  makeNeonTexture,
  makeSaleTexture,
  makeShutterTexture,
  makeSignTexture,
  makeVacantTexture,
} from "./textures";

// The shops round the atrium. Each bay is a shopfront in the mall's long
// walls: an opening under a fascia with the shop's name, closed for the
// night by a roll-down shutter, or glass onto a dark (or not so dark) shop,
// or whitewashed and to let. Built in the bay's own frame: x along the wall,
// y up from the storey's floor, +z out into the mall.

const OPENING_W = BAY - 0.6;
const OPENING_H = 3.8;

function storeyHeight(storey: 0 | 1) {
  return storey === 0 ? SOFFIT_Y : CEILING_Y - GALLERY_Y;
}

function useMaterials<T extends Record<string, Material | null>>(make: () => T, deps: unknown[]): T {
  const m = useMemo(make, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () =>
      Object.values(m).forEach((mat) => {
        if (!mat) return;
        ((mat as MeshStandardMaterial).map as Texture | null)?.dispose();
        mat.dispose();
      }),
    [m],
  );
  return m;
}

// Materials every bay shares.
function useShared() {
  return useMaterials(
    () => ({
      plaster: new MeshStandardMaterial({ color: "#bfb6b4", roughness: 0.9 }),
      marble: new MeshStandardMaterial({ color: "#ddd4cf", roughness: 0.28 }),
      frame: new MeshStandardMaterial({ color: "#2a2730", metalness: 0.7, roughness: 0.4 }),
      shutter: (() => {
        const map = makeShutterTexture();
        map.repeat.set(OPENING_W / 2, OPENING_H);
        return new MeshStandardMaterial({ map, metalness: 0.55, roughness: 0.45 });
      })(),
      glass: new MeshStandardMaterial({
        color: "#9db6c6",
        metalness: 0.35,
        roughness: 0.04,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: DoubleSide,
      }),
    }),
    [],
  );
}
type Shared = ReturnType<typeof useShared>;

export default function Storefronts({
  active,
  feed,
}: {
  active: boolean;
  feed: FeedTextures | null;
}) {
  const shared = useShared();
  return (
    <group name="storefronts">
      <Pilasters material={shared.marble} />
      {SHOPS.map((s) => (
        <group
          key={s.unit}
          name={`unit-${s.unit}`}
          position={[s.side * HALF_W, storeyY(s.storey), s.z]}
          rotation={[0, (-s.side * Math.PI) / 2, 0]}>
          <Bay shop={s} shared={shared} />
          {s.kind === "grille" && <Shutter shared={shared} />}
          {s.kind === "vacant" && <Vacant unit={s.unit} />}
          {s.kind === "glass" && <Glass shared={shared} />}
          {s.unit === "G02" && <VenusWindow />}
          {s.unit === "G09" && <SunsetWindow />}
          {s.unit === "U03" && <MusicBoxWindow />}
          {s.kind === "agency" && <Agency shared={shared} />}
          {s.kind === "tv" && <TvWindow shared={shared} feed={feed} />}
          {s.kind === "hotel" && <HotelEntrance />}
          {s.neon && s.neon !== "plato" && <ShopNeon kind={s.neon} active={active} />}
        </group>
      ))}
    </group>
  );
}

// Marble-clad piers between the bays, both walls, both storeys.
function Pilasters({ material }: { material: Material }) {
  const ref = useRef<InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (const storey of [0, 1] as const) {
      for (const side of [-1, 1]) {
        for (let k = 0; k <= BAY_ZS.length; k++) {
          const h = storeyHeight(storey);
          out.push([side * (HALF_W - 0.15), storeyY(storey) + h / 2, BAY_ZS[0] - BAY / 2 + k * BAY, h]);
        }
      }
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const o = new Object3D();
    spots.forEach(([x, y, z, h], i) => {
      o.position.set(x, y, z);
      o.scale.set(1, h, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spots]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, spots.length]} castShadow receiveShadow>
      <boxGeometry args={[0.5, 1, 0.7]} />
    </instancedMesh>
  );
}

// The fascia and the bulkhead above the opening.
function Bay({ shop, shared }: { shop: Shop; shared: Shared }) {
  const h = storeyHeight(shop.storey);
  const m = useMaterials(
    () => ({
      fascia: shop.kind === "hotel" ? null : new MeshStandardMaterial({
        map: makeFasciaTexture(shop),
        roughness: 0.45,
        metalness: 0.3,
      }),
    }),
    [shop],
  );
  return (
    <>
      <mesh position={[0, (OPENING_H + h) / 2, -0.05]} material={shared.plaster} receiveShadow>
        <planeGeometry args={[BAY, h - OPENING_H]} />
      </mesh>
      {m.fascia && (
        <>
          <mesh position={[0, OPENING_H + 0.62, 0.06]} material={shared.frame}>
            <boxGeometry args={[OPENING_W, 0.95, 0.1]} />
          </mesh>
          <mesh position={[0, OPENING_H + 0.62, 0.112]} material={m.fascia}>
            <planeGeometry args={[OPENING_W - 0.1, (OPENING_W - 0.1) / 8]} />
          </mesh>
        </>
      )}
    </>
  );
}

function Shutter({ shared }: { shared: Shared }) {
  return (
    <>
      <mesh position={[0, OPENING_H / 2, 0]} material={shared.shutter} receiveShadow>
        <planeGeometry args={[OPENING_W, OPENING_H]} />
      </mesh>
      {/* The roller housing and the bottom bar. */}
      <mesh position={[0, OPENING_H - 0.12, 0.12]} material={shared.frame}>
        <boxGeometry args={[OPENING_W, 0.24, 0.24]} />
      </mesh>
      <mesh position={[0, 0.04, 0.03]} material={shared.frame}>
        <boxGeometry args={[OPENING_W, 0.08, 0.06]} />
      </mesh>
    </>
  );
}

function Vacant({ unit }: { unit: string }) {
  const m = useMaterials(
    () => ({ wash: new MeshStandardMaterial({ map: makeVacantTexture(unit), roughness: 0.6 }) }),
    [unit],
  );
  return (
    <mesh position={[0, OPENING_H / 2, 0]} material={m.wash}>
      <planeGeometry args={[OPENING_W, OPENING_H]} />
    </mesh>
  );
}

// A dark shop behind glass: the room, the glass, and its mullions.
function Room({ color, emissive }: { color: string; emissive?: string }) {
  const m = useMaterials(
    () => ({
      room: new MeshStandardMaterial({
        color,
        roughness: 0.85,
        side: BackSide,
        ...(emissive && { emissive: new Color(emissive) }),
      }),
    }),
    [color, emissive],
  );
  return (
    <mesh position={[0, OPENING_H / 2, -SHOP_DEPTH / 2 - 0.02]} material={m.room} receiveShadow>
      <boxGeometry args={[OPENING_W, OPENING_H, SHOP_DEPTH]} />
    </mesh>
  );
}

function Glazing({ shared, gaps = [] }: { shared: Shared; gaps?: [number, number][] }) {
  // Panes between the mullions, except where a door stands.
  const mullions = [-OPENING_W / 2, -OPENING_W / 6, OPENING_W / 6, OPENING_W / 2];
  const panes = useMemo(() => {
    const out: [number, number][] = [];
    let x0 = -OPENING_W / 2;
    for (const [g0, g1] of [...gaps, [OPENING_W / 2, OPENING_W / 2] as [number, number]]) {
      if (g0 > x0) out.push([x0, g0]);
      x0 = g1;
    }
    return out;
  }, [gaps]);
  return (
    <>
      {panes.map(([x0, x1]) => (
        <mesh key={x0} position={[(x0 + x1) / 2, OPENING_H / 2, 0]} material={shared.glass}>
          <planeGeometry args={[x1 - x0, OPENING_H]} />
        </mesh>
      ))}
      {mullions
        .filter((x) => !gaps.some(([g0, g1]) => x > g0 && x < g1))
        .map((x) => (
          <mesh key={x} position={[x, OPENING_H / 2, 0]} material={shared.frame}>
            <boxGeometry args={[0.08, OPENING_H, 0.12]} />
          </mesh>
        ))}
      <mesh position={[0, 0.1, 0]} material={shared.frame}>
        <boxGeometry args={[OPENING_W, 0.2, 0.14]} />
      </mesh>
      <mesh position={[0, OPENING_H - 0.04, 0]} material={shared.frame}>
        <boxGeometry args={[OPENING_W, 0.08, 0.14]} />
      </mesh>
    </>
  );
}

function Glass({ shared }: { shared: Shared }) {
  return (
    <>
      <Room color="#2a2633" />
      <Glazing shared={shared} />
    </>
  );
}

function Fitted({
  model,
  position,
  rotation = [0, 0, 0],
}: {
  model: FittedModel;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const object = useMemo(() => model.clone(), [model]);
  return (
    <group position={position} rotation={rotation}>
      <primitive object={object} position={model.offset} scale={model.scale} />
    </group>
  );
}

// ── Neon ───────────────────────────────────────────────────────────────────

interface NeonSpec {
  text: string;
  color: string;
  // Width of the sign in metres (the texture is 4:1), and where it hangs.
  width: number;
  position: [number, number, number];
  font?: string;
  weight?: string;
  spacing?: number;
  light: { color: string; intensity: number; position: [number, number, number] };
  flicker?: boolean;
}

const SERIF = 'Didot, "Bodoni 72", Georgia, "Times New Roman", serif';

const NEON: Record<Exclude<Shop["neon"], undefined | "plato">, NeonSpec[]> = {
  // In the window, over the mannequins.
  venus: [
    {
      text: "Venus",
      color: "#c79bff",
      width: 3.2,
      position: [0, 3.05, -0.35],
      font: SERIF,
      weight: "400",
      spacing: 0.08,
      light: { color: "#b98cff", intensity: 14, position: [0, 2.6, -1.6] },
    },
  ],
  sunset: [
    {
      text: "SUNSET",
      color: "#ff8a4c",
      width: 3.4,
      position: [0, 3.15, -0.4],
      light: { color: "#ff6a8a", intensity: 16, position: [0, 2.4, -1.4] },
    },
    {
      text: "OUTLET",
      color: "#ff5cb0",
      width: 2.4,
      position: [0, 2.55, -0.4],
      light: { color: "#ff5cb0", intensity: 0, position: [0, 0, 0] },
    },
  ],
  // On the fascia, over the shutter. One tube is failing.
  helios: [
    {
      text: "HELIOS TANNING",
      color: "#ffa23a",
      width: 5.6,
      position: [0, OPENING_H + 0.62, 0.3],
      light: { color: "#ff9a40", intensity: 12, position: [0, OPENING_H + 0.2, 1.4] },
      flicker: true,
    },
  ],
  arcadia: [
    {
      text: "ARCADIA",
      color: "#3ff0e0",
      width: 4.4,
      position: [0, OPENING_H + 0.62, 0.3],
      light: { color: "#3ff0e0", intensity: 12, position: [0, OPENING_H, 1.6] },
    },
  ],
  // A small OPEN sign hung inside the door, in front of the shutter.
  open: [
    {
      text: "OPEN",
      color: "#ff3346",
      width: 1.3,
      position: [1.6, 2.1, 0.25],
      spacing: 0.1,
      light: { color: "#ff3346", intensity: 3, position: [1.6, 2.0, 0.9] },
    },
  ],
};

function ShopNeon({ kind, active }: { kind: Exclude<Shop["neon"], undefined | "plato">; active: boolean }) {
  return (
    <>
      {NEON[kind].map((spec) => (
        <NeonSign key={spec.text} spec={spec} active={active} />
      ))}
    </>
  );
}

function NeonSign({ spec, active }: { spec: NeonSpec; active: boolean }) {
  const m = useMaterials(
    () => ({
      tube: new MeshBasicMaterial({
        map: makeNeonTexture(spec.text, spec.color, {
          font: spec.font,
          weight: spec.weight,
          spacing: spec.spacing,
        }),
        color: new Color(2.6, 2.6, 2.6),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [spec],
  );
  const light = useRef<PointLight>(null);
  const base = useMemo(() => m.tube.color.clone(), [m]);
  useFrame(({ clock }) => {
    if (!spec.flicker || !active) return;
    // Mostly on; now and then it stutters for a moment.
    const t = clock.getElapsedTime();
    const burst = Math.sin(t * 0.7) * Math.sin(t * 1.9) > 0.55;
    const on = !burst || Math.sin(t * 53) * Math.sin(t * 31) > 0.1;
    const k = on ? 1 : 0.08;
    m.tube.color.copy(base).multiplyScalar(k);
    if (light.current) light.current.intensity = spec.light.intensity * k;
  });
  return (
    <>
      <mesh position={spec.position} material={m.tube}>
        <planeGeometry args={[spec.width, spec.width / 4]} />
      </mesh>
      {spec.light.intensity > 0 && (
        <pointLight
          ref={light}
          position={spec.light.position}
          color={spec.light.color}
          intensity={spec.light.intensity}
          distance={14}
          decay={2}
        />
      )}
    </>
  );
}

// ── The shops with something in the window ────────────────────────────────

// Three Venuses on plinths, waving at the concourse, in the lilac light.
function VenusWindow() {
  const venus = useFittedModel(MODEL.venus, 1.95);
  const m = useMaterials(
    () => ({ plinth: new MeshStandardMaterial({ color: "#f2ecef", roughness: 0.3 }) }),
    [],
  );
  return (
    <>
      {[-2.2, 0, 2.2].map((x, i) => (
        <group key={x} position={[x, 0, -1.3 - (i === 1 ? 0.5 : 0)]}>
          <mesh position={[0, 0.15, 0]} material={m.plinth} castShadow receiveShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.3, 32]} />
          </mesh>
          <Fitted model={venus} position={[0, 0.3, 0]} rotation={[0, (i - 1) * 0.25, 0]} />
        </group>
      ))}
    </>
  );
}

// Empty rails, and bills in the window.
function SunsetWindow() {
  const m = useMaterials(
    () => ({
      chrome: new MeshStandardMaterial({ color: "#d8d6d4", metalness: 1, roughness: 0.2 }),
      bill: new MeshStandardMaterial({
        map: makeSaleTexture(["GOLDEN HOUR", "70%", "OFF"], "#e2336f"),
        roughness: 0.6,
      }),
      bill2: new MeshStandardMaterial({
        map: makeSaleTexture(["EVERYTHING", "MUST GO"], "#f07a2a"),
        roughness: 0.6,
      }),
      hanger: new MeshStandardMaterial({ color: "#2b2730", roughness: 0.5 }),
    }),
    [],
  );
  return (
    <>
      {[-1.6, 1.8].map((x, i) => (
        <group key={x} position={[x, 0, -2.4 - i * 0.6]}>
          {[-0.8, 0.8].map((dx) => (
            <mesh key={dx} position={[dx, 0.75, 0]} material={m.chrome}>
              <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
            <cylinderGeometry args={[0.02, 0.02, 1.7, 8]} />
          </mesh>
          {/* Three empty hangers, pushed to one end. */}
          {[0, 0.05, 0.1].map((dx) => (
            <mesh key={dx} position={[0.55 + dx, 1.38, 0]} rotation={[0, Math.PI / 2, 0]} material={m.hanger}>
              <torusGeometry args={[0.18, 0.008, 4, 3]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-2.4, 1.3, -0.06]} material={m.bill}>
        <planeGeometry args={[1.2, 1.2]} />
      </mesh>
      <mesh position={[2.4, 1.3, -0.06]} material={m.bill2}>
        <planeGeometry args={[1.2, 1.2]} />
      </mesh>
    </>
  );
}

// Boomboxes, stacked, the island's model.
function MusicBoxWindow() {
  const boombox = useFittedModel("/models/misc/retro-boombox.002.glb", 0.5);
  const m = useMaterials(
    () => ({ plinth: new MeshStandardMaterial({ color: "#1b1a22", roughness: 0.4 }) }),
    [],
  );
  return (
    <group position={[0, 0, -1.2]}>
      <mesh position={[0, 0.3, 0]} material={m.plinth}>
        <boxGeometry args={[3, 0.6, 1.2]} />
      </mesh>
      {[
        [-0.8, 0.6],
        [0.8, 0.6],
        [0, 0.6],
        [-0.4, 1.1],
        [0.4, 1.1],
        [0, 1.6],
      ].map(([x, y], i) => (
        <Fitted key={i} model={boombox} position={[x, y, 0]} rotation={[0, Math.PI, 0]} />
      ))}
    </group>
  );
}

// Television City: a wall of sets in the window, all showing the island.
function TvWindow({ shared, feed }: { shared: Shared; feed: FeedTextures | null }) {
  const uniforms = useMemo(() => createSharedCrtUniforms(), []);
  useEffect(() => {
    uniforms.uFeed.value = feed?.feed ?? null;
    uniforms.uOverlay.value = feed?.overlay ?? null;
    uniforms.uHasFeed.value = feed ? 1 : 0;
  }, [feed, uniforms]);
  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
  });
  const m = useMaterials(
    () => ({ shelf: new MeshStandardMaterial({ color: "#16151b", roughness: 0.6 }) }),
    [],
  );
  const sets: [number, number][] = [];
  for (const y of [0.55, 1.45]) for (const x of [-2.4, -0.8, 0.8, 2.4]) sets.push([x, y]);
  return (
    <>
      <Room color="#1a1a24" />
      <Glazing shared={shared} />
      {[0.5, 1.4].map((y) => (
        <mesh key={y} position={[0, y, -1.0]} material={m.shelf}>
          <boxGeometry args={[6.4, 0.06, 1.0]} />
        </mesh>
      ))}
      {sets.map(([x, y], i) => (
        <group key={i} position={[x, y + 0.03, -1.0]} scale={0.55}>
          <Crt shared={uniforms} seed={40 + i} mode={CRT_FEED} bodyColor={i % 3 ? "#2c2a31" : "#c4b9a4"} />
        </group>
      ))}
      {/* The sets' glow, from inside the shop. */}
      <pointLight position={[0, 1.2, -0.3]} color="#8fb4ff" intensity={3} distance={7} decay={2} />
    </>
  );
}

// Plato's Cove Holidays: the one shop with its lights still on. Posters of
// the island, a desk, a scale model of the island in the window, the island's
// own neon, and the shop door, which leads there.
function Agency({ shared }: { shared: Shared }) {
  // Fitted at the island's own size; the model's group scales it down.
  const column = useFittedModel(MODEL.column, 10);
  const { scene: chairScene } = useGLTF("/models/chair/platic-chair.glb");
  const chair = useMemo(() => chairScene.clone(true), [chairScene]);
  const m = useMaterials(
    () => ({
      poster: new MeshStandardMaterial({ map: makeIslandPosterTexture(0), roughness: 0.5 }),
      poster2: new MeshStandardMaterial({ map: makeIslandPosterTexture(1), roughness: 0.5 }),
      desk: new MeshStandardMaterial({ color: "#efe6ea", roughness: 0.4 }),
      tile: new MeshStandardMaterial({ color: "#f0c6d8", roughness: 0.3 }),
      pool: new MeshStandardMaterial({ color: "#35c3cf", roughness: 0.05, metalness: 0.2 }),
      sea: new MeshStandardMaterial({ color: "#2a8fa8", roughness: 0.2 }),
      acrylic: new MeshStandardMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.12,
        roughness: 0.02,
        depthWrite: false,
      }),
      label: new MeshStandardMaterial({
        map: makeSignTexture(["PLATO'S COVE", "MODEL · SCALE 1:50"], { w: 512, h: 160, size: 44 }),
        roughness: 0.6,
      }),
    }),
    [],
  );
  const neon = useMemo(() => new Color(3.2, 0.65, 1.9), []);
  // The island at 1:50: platform 1.12 × 1.0, the pool, the pedestal, and
  // nine columns where the island has them.
  const s = 1 / 50;
  const columns: [number, number][] = [
    [20, -19], [20, -10], [20, 0], [20, 8], [20, 17],
    [-20, -19], [-20, -10], [-20, 8], [-20, 17],
  ];
  return (
    <>
      <Room color="#d9a8c4" emissive="#2a1020" />
      <Glazing shared={shared} gaps={[[-1.2, 1.2]]} />
      <MallDoor
        x={0}
        z={0}
        normal={[0, 1]}
        night={false}
        transom="PLATO'S COVE HOLIDAYS"
        vinyl={PLATO_VINYL}
        card="BACK IN 5 MINUTES"
      />
      <pointLight position={[0, 3.2, -3.2]} color="#ffb0cf" intensity={10} distance={12} decay={2} />
      {/* Posters on the back wall. */}
      <mesh position={[-1.6, 2.0, -SHOP_DEPTH + 0.05]} material={m.poster}>
        <planeGeometry args={[1.3, 1.95]} />
      </mesh>
      <mesh position={[1.6, 2.0, -SHOP_DEPTH + 0.05]} material={m.poster2}>
        <planeGeometry args={[1.3, 1.95]} />
      </mesh>
      {/* The desk and its chair. */}
      <mesh position={[0, 0.45, -4.6]} material={m.desk} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.9, 0.8]} />
      </mesh>
      <primitive object={chair} position={[0.3, 0, -5.6]} rotation={[0, Math.PI + 0.3, 0]} />
      {/* The model, in the window to the left of the door. */}
      <group position={[-2.5, 0, -0.9]}>
        <mesh position={[0, 0.45, 0]} material={m.desk} castShadow>
          <boxGeometry args={[1.5, 0.9, 1.35]} />
        </mesh>
        <mesh position={[0, 0.905, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.sea}>
          <planeGeometry args={[1.4, 1.25]} />
        </mesh>
        <group position={[0, 0.96, 0]} scale={[s, s, s]}>
          <mesh material={m.tile}>
            <boxGeometry args={[56, 3, 50]} />
          </mesh>
          <mesh position={[0, 1.55, -2]} material={m.pool}>
            <boxGeometry args={[17, 0.2, 14]} />
          </mesh>
          <mesh position={[-20, 1.5 + 6.25, -2]} material={m.tile}>
            <boxGeometry args={[4.2, 12.5, 4.2]} />
          </mesh>
          {columns.map(([x, z]) => (
            <Fitted key={`${x},${z}`} model={column} position={[x, 1.5, z]} />
          ))}
        </group>
        <mesh position={[0, 1.18, 0]} material={m.acrylic}>
          <boxGeometry args={[1.3, 0.45, 1.15]} />
        </mesh>
        <mesh position={[0, 0.7, 0.68]} material={m.label}>
          <planeGeometry args={[0.6, 0.19]} />
        </mesh>
      </group>
      {/* The island's own neon, hung in the window to the right. */}
      <Text
        font="/fonts/Italianno-Regular.ttf"
        position={[2.45, 2.6, -0.35]}
        fontSize={0.62}
        lineHeight={0.8}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        outlineColor="#ff7cc8"
        outlineWidth={0}
        outlineBlur={0.2}
        outlineOpacity={0.9}>
        Plato's{"\n"}Cove
        <meshBasicMaterial color={neon} toneMapped={false} />
      </Text>
      <pointLight position={[2.45, 2.6, 0.6]} color="#ff5cb0" intensity={6} distance={9} decay={2} />
    </>
  );
}
const PLATO_VINYL = ["PLATO'S COVE", "HOLIDAYS", "ONE DESTINATION ONLY"];

// The hotel's entrance on the upper gallery: marble, a brass sign, two wall
// lights left on, and the hotel's door (the island's door model), through
// to the conference level.
function HotelEntrance() {
  const { scene } = useGLTF(MODEL.door);
  const door = useMemo(() => scene.clone(true), [scene]);
  const m = useMaterials(
    () => ({
      marble: new MeshStandardMaterial({ color: "#e6dfe2", roughness: 0.22 }),
      sign: new MeshStandardMaterial({
        map: makeSignTexture(["HOTEL & CONFERENCE SUITES"], {
          w: 1024,
          h: 128,
          size: 56,
          bg: "#1c1a22",
          fg: "#d9b46a",
        }),
        metalness: 0.5,
        roughness: 0.35,
      }),
      plaque: new MeshStandardMaterial({
        map: makeSignTexture(["CONFERENCE LEVEL", "All suites this way"], {
          w: 512,
          h: 192,
          size: 44,
          bg: "#d9b46a",
          fg: "#1c1a22",
        }),
        metalness: 0.6,
        roughness: 0.3,
      }),
      lamp: new MeshBasicMaterial({ color: new Color(2.4, 1.9, 1.3), toneMapped: false }),
    }),
    [],
  );
  const h = CEILING_Y - GALLERY_Y;
  return (
    <>
      <mesh position={[0, h / 2, -0.02]} material={m.marble} receiveShadow>
        <planeGeometry args={[BAY, h]} />
      </mesh>
      {/* The model's middle is 0.3 m in front of its wall. */}
      <primitive object={door} position={[0, 0, 0.3]} />
      <mesh position={[0, 4.55, 0.03]} material={m.sign}>
        <planeGeometry args={[4.8, 0.6]} />
      </mesh>
      <mesh position={[2.0, 1.6, 0.02]} material={m.plaque}>
        <planeGeometry args={[0.75, 0.28]} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 2.6, 0.1]} material={m.lamp}>
          <cylinderGeometry args={[0.09, 0.07, 0.3, 12]} />
        </mesh>
      ))}
      <pointLight position={[0, 3.4, 2.2]} color="#ffd29a" intensity={4} distance={9} decay={2} />
    </>
  );
}
