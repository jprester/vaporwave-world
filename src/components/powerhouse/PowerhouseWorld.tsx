import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  ShaderMaterial,
  SpotLight,
  type Material,
  type Texture,
} from "three";
import DoorTrigger from "../DoorTrigger";
import type { FeedTextures } from "../IslandFeed";
import { markWorldReady } from "../worldStore";
import { Crt } from "../cave/CaveWorld";
import { CRT_FEED, createSharedCrtUniforms } from "../cave/crtMaterial";
import { MODEL, useFittedModel } from "../stockroom/models";
import { FittedPrimitive, Tag, usePalletGeometry } from "../stockroom/Stock";
import { makeBackSoonTexture } from "../stockroom/textures";
import * as C from "./constants";
import {
  makeBlackoutWindowTexture,
  makeBrickTexture,
  makeChartTexture,
  makeClockTexture,
  makeDangerTexture,
  makeDaysBoardTexture,
  makeDeskTopTexture,
  makeDoorSignTexture,
  makeEnvelopeTexture,
  makeFirePlaqueTexture,
  makeFloorTexture,
  makeGaugeTexture,
  makeLogbookTexture,
  makeMeterTexture,
  makeMimicTexture,
  makeMoonTexture,
  makeNameplateTexture,
  makeSackTexture,
  makeStationBoardTexture,
  makeStencilTexture,
  makeSwitchgearTexture,
  makeTariffTexture,
  makeTileTexture,
  makeUpperWallTexture,
} from "./textures";

// QA hook: ?freeze=1 holds the fire, the meter discs and the lamps still, so
// the flicker-diff tool can isolate geometry.
const FREEZE = new URLSearchParams(window.location.search).has("freeze");

// The powerhouse: behind door #11, the generating station where the golden
// hour is made. A cold, high turbine hall, lit blue-white from the roof and
// orange from one round window at the far end: the fire, in a boiler, which
// throws the generators' shadows down the hall onto the wall by the door.
// Nobody is on shift. The log says it has been 18:47 for some time.

type Vec3 = [number, number, number];

interface Props {
  active: boolean;
  feed: FeedTextures | null;
}

export default function PowerhouseWorld({ active, feed }: Props) {
  const a = useAssets();
  useEffect(() => {
    markWorldReady("powerhouse");
  }, []);

  return (
    <group name="powerhouse-world">
      <ambientLight intensity={0.28} color="#9fb6c4" />
      <hemisphereLight intensity={0.4} color="#bcd6e6" groundColor="#1b2224" />
      <Shell a={a} />
      <RoofLights a={a} />
      <FloorMarkings a={a} />
      <Fire a={a} />
      <Fuel a={a} />
      <Generators a={a} />
      <Duct a={a} />
      <CraneAndMoon a={a} />
      <Gallery a={a} />
      <ControlDesk a={a} feed={feed} />
      <SouthWall a={a} />
      <DoorTrigger
        to="stockroom"
        x={C.DOOR_X}
        z={C.DOOR_Z}
        normal={[0, -1]}
        active={active}
      />
    </group>
  );
}

// ── Shared materials ──────────────────────────────────────────────────────

type Assets = ReturnType<typeof makeAssets>;

function std(params: ConstructorParameters<typeof MeshStandardMaterial>[0]) {
  return new MeshStandardMaterial(params);
}

function makeAssets() {
  const L = C.HALF_L * 2;
  const W = C.HALF_W * 2;
  const H = C.ROOM_HEIGHT;
  const mats = {
    floor: std({
      map: makeFloorTexture([W / 4, L / 4]),
      roughness: 0.62,
      metalness: 0.05,
    }),
    tileLong: std({ map: makeTileTexture(L / 1.2), roughness: 0.25 }),
    tileShort: std({ map: makeTileTexture(W / 1.2), roughness: 0.25 }),
    wallLong: std({ map: makeUpperWallTexture([L / 4, H / 4]), roughness: 0.9 }),
    wallShort: std({ map: makeUpperWallTexture([W / 4, H / 4]), roughness: 0.9 }),
    ceiling: std({ color: "#161c1e", roughness: 1 }),
    steel: std({ color: "#3d4a4a", roughness: 0.6, metalness: 0.5 }),
    darkSteel: std({ color: "#232a2b", roughness: 0.55, metalness: 0.6 }),
    craneYellow: std({ color: "#c9a63a", roughness: 0.55, metalness: 0.3 }),
    boiler: std({ color: "#33403f", roughness: 0.5, metalness: 0.55 }),
    brick: std({ map: makeBrickTexture([18 / 2, 1.2 / 0.5]), roughness: 0.95 }),
    brass: std({ color: "#b48d4a", roughness: 0.35, metalness: 0.85 }),
    concrete: std({ color: "#7c8682", roughness: 0.85 }),
    genPaint: std({ color: "#4f8f87", roughness: 0.38, metalness: 0.35 }),
    genPink: std({ color: "#d77a9c", roughness: 0.4, metalness: 0.2 }),
    duct: std({ color: "#aeb6b8", roughness: 0.35, metalness: 0.75 }),
    switchgear: std({ color: "#5d6e69", roughness: 0.55, metalness: 0.3 }),
    switchFront: std({ map: makeSwitchgearTexture([(C.HALF_L - C.GALLERY_Z0) / 1.5, 1]), roughness: 0.5, metalness: 0.2 }),
    switchEnd: std({ map: makeSwitchgearTexture([(C.STAIR_X0 - C.GALLERY_X0) / 1.5, 1]), roughness: 0.5, metalness: 0.2 }),
    grating: std({ color: "#545e5e", roughness: 0.6, metalness: 0.6 }),
    rail: std({ color: "#d0b046", roughness: 0.45, metalness: 0.4 }),
    wood: std({ color: "#9c7a4f", roughness: 0.9 }),
    sack: std({ map: makeSackTexture(), roughness: 0.95 }),
    sackPlain: std({ color: "#c2b38a", roughness: 0.95 }),
    meterBody: std({ color: "#2f3a38", roughness: 0.5, metalness: 0.3 }),
    meterDisc: std({ color: "#c9cdd0", roughness: 0.25, metalness: 0.9 }),
    board: std({ color: "#4c5a56", roughness: 0.8 }),
    paper: std({ color: "#efe9da", roughness: 0.85 }),
    plate: std({ color: "#d9d4c2", roughness: 0.6, side: DoubleSide }),
    envelope: std({ map: makeEnvelopeTexture(), roughness: 0.85 }),
    wireTray: std({ color: "#8d9496", roughness: 0.4, metalness: 0.8 }),
    tariff: std({ map: makeTariffTexture(), roughness: 0.8 }),
    days: std({ map: makeDaysBoardTexture(), roughness: 0.55 }),
    doorSign: std({ map: makeDoorSignTexture(), roughness: 0.6 }),
    station: std({ map: makeStationBoardTexture(), roughness: 0.6 }),
    plaque: std({ map: makeFirePlaqueTexture(), roughness: 0.4, metalness: 0.4 }),
    gauge: std({ map: makeGaugeTexture(), roughness: 0.35 }),
    danger: std({ map: makeDangerTexture(), roughness: 0.5 }),
    mimic: std({ map: makeMimicTexture(), roughness: 0.55 }),
    logbook: std({ map: makeLogbookTexture(), roughness: 0.85 }),
    clock: std({ map: makeClockTexture(), roughness: 0.4 }),
    deskTop: std({ map: makeDeskTopTexture(), roughness: 0.5 }),
    chart: std({ map: makeChartTexture(), roughness: 0.8 }),
    backSoon: std({ map: makeBackSoonTexture(), roughness: 0.8 }),
    mug: std({ color: "#e86aa8", roughness: 0.35 }),
    window: std({ map: makeBlackoutWindowTexture(), roughness: 0.3, metalness: 0.2 }),
    moon: new MeshBasicMaterial({
      map: makeMoonTexture(),
      color: new Color(1.15, 1.2, 1.35),
      toneMapped: false,
    }),
    chainRed: std({ color: "#b8283a", roughness: 0.5 }),
    chainWhite: std({ color: "#e8e4dc", roughness: 0.5 }),
    tube: new MeshBasicMaterial({ color: new Color(2.4, 2.8, 3.0), toneMapped: false }),
    highBay: new MeshBasicMaterial({ color: new Color(2.2, 2.6, 3.1), toneMapped: false }),
    lampGreen: new MeshBasicMaterial({ color: new Color(0.6, 2.6, 1.0), toneMapped: false }),
    lampRed: new MeshBasicMaterial({ color: new Color(2.8, 0.4, 0.5), toneMapped: false }),
    needle: std({ color: "#1c1c1c", roughness: 0.5 }),
  };
  const stencil = (text: string, color: string, opts?: Parameters<typeof makeStencilTexture>[2]) =>
    std({
      map: makeStencilTexture(text, color, opts),
      transparent: true,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  const stencils = {
    fireIn: stencil("KEEP THE FIRE IN", "#d9d6c6"),
    walkway: stencil("WALKWAY", "#d98aa6", { w: 512, h: 128, size: 90 }),
    ductArrow: stencil("GOLDEN HOUR  ▶▶▶  OUT", "#2a3436"),
    island: stencil("ISLAND", "#2a3436", { w: 512, h: 160, size: 110 }),
    motel: stencil("MOTEL", "#2a3436", { w: 512, h: 160, size: 110 }),
    agora: stencil("AGORA", "#2a3436", { w: 512, h: 160, size: 110 }),
    tv: stencil("PLATO TV", "#2a3436", { w: 512, h: 160, size: 110 }),
    control: stencil("CONTROL ROOM", "#e9e4d2", { w: 1024, h: 160, size: 120 }),
    noNight: stencil("NIGHT NOT SUPPLIED", "#e9e4d2", { w: 1024, h: 160, size: 120 }),
  };
  const meters = [
    makeMeterTexture("ISLAND", "1278419", "SUN · SEA · SIGN"),
    makeMeterTexture("SUNSET MOTEL", "0418820", "POOL · SIGN · ROOM 9"),
    makeMeterTexture("THE AGORA", "0003310", "SUNSET OUTLET ONLY"),
    makeMeterTexture("PLATO TV", "0912744", "24 HOURS"),
  ].map((map) => std({ map, roughness: 0.4 }));
  const nameplates = [1, 2, 3].map((n) =>
    std({ map: makeNameplateTexture(n), roughness: 0.35, metalness: 0.6 }),
  );
  const fire = makeFireMaterial();
  return { mats, stencils, meters, nameplates, fire };
}

function useAssets() {
  const assets = useMemo(makeAssets, []);
  useEffect(
    () => () => {
      const all: Material[] = [
        ...Object.values(assets.mats),
        ...Object.values(assets.stencils),
        ...assets.meters,
        ...assets.nameplates,
        assets.fire,
      ];
      for (const m of all) {
        const map = (m as MeshStandardMaterial).map as Texture | null | undefined;
        map?.dispose();
        m.dispose();
      }
    },
    [assets],
  );
  return assets;
}

// The fire behind the glass: rising, folding flame in gold and orange, hot
// enough to bloom. A small shader, no textures.
function makeFireMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }
      void main() {
        vec2 p = vUv;
        float t = uTime;
        vec2 q = vec2(p.x * 3.0, p.y * 2.2 - t * 1.4);
        float n = fbm(q + fbm(q * 1.7 + vec2(0.0, -t * 0.6)));
        // Flames rise from a bed of embers at the bottom.
        float shape = n * 1.35 - p.y * 0.95 + 0.25;
        float flame = smoothstep(0.05, 0.75, shape);
        vec3 ember = vec3(0.45, 0.06, 0.02);
        vec3 orange = vec3(2.6, 0.75, 0.12);
        vec3 gold = vec3(3.6, 2.1, 0.6);
        vec3 col = mix(ember, orange, flame);
        col = mix(col, gold, smoothstep(0.55, 1.0, shape));
        // Soot on the glass toward the rim.
        float r = length(p - 0.5) * 2.0;
        col *= 1.0 - smoothstep(0.75, 1.0, r) * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
    fog: false,
  });
}

// ── The building ──────────────────────────────────────────────────────────

const WALL_T = 0.3;
const DADO_PROUD = 0.04;
// The inside face of each wall's dado: where the room really ends.
const IN_X = C.HALF_W - DADO_PROUD;
const IN_Z = C.HALF_L - DADO_PROUD;
// Steel stanchions along the long walls, holding the crane rails.
const STANCHION_ZS = [-28, -20, -12, -4, 14, 22, 30];
const WEST_EXTRA_STANCHIONS = [5];
// The mimic board hangs on the east wall where a stanchion would be.
const EAST_SKIP_STANCHIONS = [22];
const WINDOW_ZS_WEST = [-24, -16, -8, 0.5, 9.5, 18];
const WINDOW_ZS_EAST = [-24, -16, -8];
const WINDOW_W = 3;
const WINDOW_Y0 = 5.6;
const WINDOW_Y1 = 13.6;

function Shell({ a }: { a: Assets }) {
  const { mats } = a;
  const L = C.HALF_L * 2;
  const W = C.HALF_W * 2;
  const H = C.ROOM_HEIGHT;
  return (
    <group name="shell">
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.floor} receiveShadow>
        <planeGeometry args={[W, L]} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}>
        <planeGeometry args={[W, L]} />
      </mesh>
      {/* Walls: blockwork the full height, a glazed tile dado in front. */}
      {[-1, 1].map((s) => (
        <group key={`x${s}`}>
          <mesh
            position={[s * (C.HALF_W + WALL_T / 2), H / 2, 0]}
            material={mats.wallLong}
            receiveShadow>
            <boxGeometry args={[WALL_T, H, L + 2 * WALL_T]} />
          </mesh>
          <mesh
            position={[s * (C.HALF_W - DADO_PROUD / 2), C.DADO_H / 2, 0]}
            rotation={[0, s > 0 ? Math.PI : 0, 0]}
            material={mats.tileLong}
            receiveShadow>
            <boxGeometry args={[DADO_PROUD + 0.01, C.DADO_H, L]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={`z${s}`}>
          <mesh
            position={[0, H / 2, s * (C.HALF_L + WALL_T / 2)]}
            material={mats.wallShort}
            receiveShadow>
            <boxGeometry args={[W, H, WALL_T]} />
          </mesh>
          <mesh
            position={[0, C.DADO_H / 2, s * (C.HALF_L - DADO_PROUD / 2)]}
            material={mats.tileShort}
            receiveShadow>
            <boxGeometry args={[W - 2 * DADO_PROUD - 0.002, C.DADO_H, DADO_PROUD + 0.01]} />
          </mesh>
        </group>
      ))}
      {/* Painted-out windows high in the long walls. Whatever's outside, it
          isn't let in. */}
      {WINDOW_ZS_WEST.map((z) => (
        <Window key={`w${z}`} a={a} x={-IN_X} z={z} side={1} />
      ))}
      {WINDOW_ZS_EAST.map((z) => (
        <Window key={`e${z}`} a={a} x={IN_X} z={z} side={-1} />
      ))}
      {/* Stanchions, crane rails, roof trusses. */}
      {[-1, 1].map((s) =>
        [...STANCHION_ZS, ...(s < 0 ? WEST_EXTRA_STANCHIONS : [])]
          .filter((z) => s < 0 || !EAST_SKIP_STANCHIONS.includes(z))
          .map((z) => (
          <mesh
            key={`st${s}${z}`}
            position={[s * (IN_X - 0.25), C.CRANE_RAIL_Y / 2, z]}
            material={mats.steel}
            castShadow
            receiveShadow>
            <boxGeometry args={[0.5, C.CRANE_RAIL_Y, 0.5]} />
          </mesh>
        )),
      )}
      {[-1, 1].map((s) => (
        <group key={`rail${s}`}>
          <mesh position={[s * (IN_X - 0.4), C.CRANE_RAIL_Y + 0.2, 0]} material={mats.steel}>
            <boxGeometry args={[0.8, 0.4, L - 0.1]} />
          </mesh>
          <mesh position={[s * (IN_X - 0.4), C.CRANE_RAIL_Y + 0.45, 0]} material={mats.darkSteel}>
            <boxGeometry args={[0.12, 0.1, L - 0.1]} />
          </mesh>
        </group>
      ))}
      {STANCHION_ZS.map((z) => (
        <group key={`truss${z}`} position={[0, 0, z]}>
          <mesh position={[0, 15.4, 0]} material={mats.darkSteel}>
            <boxGeometry args={[W - 0.1, 0.35, 0.3]} />
          </mesh>
          <mesh position={[0, 16.75, 0]} material={mats.darkSteel}>
            <boxGeometry args={[W - 0.1, 0.3, 0.3]} />
          </mesh>
          {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
            <mesh key={x} position={[x, 16.08, 0]} material={mats.darkSteel}>
              <boxGeometry args={[0.18, 1.05, 0.18]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Window({ a, x, z, side }: { a: Assets; x: number; z: number; side: 1 | -1 }) {
  const h = WINDOW_Y1 - WINDOW_Y0;
  return (
    <group position={[x + side * 0.03, (WINDOW_Y0 + WINDOW_Y1) / 2, z]} rotation={[0, (side * Math.PI) / 2, 0]}>
      <mesh material={a.mats.window}>
        <planeGeometry args={[WINDOW_W, h]} />
      </mesh>
      {/* Steel surround. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (WINDOW_W / 2 + 0.08), 0, 0.04]} material={a.mats.darkSteel}>
          <boxGeometry args={[0.16, h + 0.32, 0.1]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * (h / 2 + 0.08), 0.04]} material={a.mats.darkSteel}>
          <boxGeometry args={[WINDOW_W, 0.16, 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

// High-bay lamps under the trusses: cold mercury light, blue-white.
const HIGH_BAY_ZS = [30, 22, 14, -4, -12, -28];
function RoofLights({ a }: { a: Assets }) {
  return (
    <group name="roof-lights">
      {HIGH_BAY_ZS.flatMap((z) =>
        [-9, 3].map((x) => (
          <group key={`${x}${z}`} position={[x, 14.4, z]}>
            <mesh position={[0, 0.5, 0]} material={a.mats.darkSteel}>
              <cylinderGeometry args={[0.02, 0.02, 1.0, 4]} />
            </mesh>
            <mesh material={a.mats.steel}>
              <cylinderGeometry args={[0.18, 0.62, 0.55, 16, 1, true]} />
            </mesh>
            <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.highBay}>
              <circleGeometry args={[0.58, 20]} />
            </mesh>
          </group>
        )),
      )}
      {[22, 4, -14].map((z) => (
        <pointLight
          key={z}
          position={[-3, 12.5, z]}
          color="#cfe6ff"
          intensity={30}
          distance={34}
          decay={1.3}
        />
      ))}
    </group>
  );
}

// Walkway lines painted down both sides of the generators, worn pink.
function FloorMarkings({ a }: { a: Assets }) {
  const lineMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#c97d97",
        roughness: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  useEffect(() => () => lineMat.dispose(), [lineMat]);
  const z0 = -16.5;
  const z1 = 30;
  const len = z1 - z0;
  return (
    <group name="floor-markings">
      {[C.GEN_X - 3.6, C.GEN_X + 3.6].map((x) => (
        <mesh
          key={x}
          position={[x, 0.004, (z0 + z1) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={lineMat}
          receiveShadow>
          <planeGeometry args={[0.14, len]} />
        </mesh>
      ))}
      {[24, -2].map((z) => (
        <mesh
          key={z}
          position={[C.GEN_X - 7.4, 0.005, z]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          material={a.stencils.walkway}>
          <planeGeometry args={[2.4, 0.6]} />
        </mesh>
      ))}
    </group>
  );
}

// ── The fire ──────────────────────────────────────────────────────────────

function Fire({ a }: { a: Assets }) {
  const { mats } = a;
  const spot = useRef<SpotLight>(null);
  const glow = useRef<PointLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useEffect(() => {
    target.position.set(C.FIRE_X + 3, 4.5, C.HALF_L);
    target.updateMatrixWorld();
    if (spot.current) spot.current.target = target;
  }, [target]);
  useFrame((state) => {
    const t = FREEZE ? 0 : state.clock.getElapsedTime();
    a.fire.uniforms.uTime.value = t;
    const flick =
      0.88 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1 + 1.3) * 0.04 + Math.sin(t * 3.1) * 0.03;
    if (spot.current) spot.current.intensity = 230 * flick;
    if (glow.current) glow.current.intensity = 14 * flick;
  });
  const front = C.BOILER_FRONT_Z;
  const depth = C.HALF_L + front; // 5.5
  const cz = front - depth / 2;
  const w = C.BOILER_X1 - C.BOILER_X0;
  return (
    <group name="fire">
      {/* The boiler: a riveted steel casing on a firebrick setting. */}
      <mesh position={[0, C.BOILER_H / 2, cz]} material={mats.boiler} receiveShadow>
        <boxGeometry args={[w, C.BOILER_H, depth]} />
      </mesh>
      <mesh position={[0, 0.6, front + 0.06]} material={mats.brick}>
        <boxGeometry args={[w + 0.2, 1.2, 0.12]} />
      </mesh>
      {[3.4, 5.6, 7.8].map((y) => (
        <mesh key={y} position={[0, y, front + 0.025]} material={mats.darkSteel}>
          <boxGeometry args={[w + 0.04, 0.12, 0.05]} />
        </mesh>
      ))}
      {[-6.5, 6.5].map((x) => (
        <mesh key={x} position={[x, C.BOILER_H / 2 + 0.6, front + 0.025]} material={mats.darkSteel}>
          <boxGeometry args={[0.12, C.BOILER_H - 1.2, 0.05]} />
        </mesh>
      ))}
      {/* The flue, up into the roof. */}
      <mesh position={[7.4, (C.BOILER_H + C.ROOM_HEIGHT) / 2, cz]} material={mats.darkSteel}>
        <cylinderGeometry args={[1.0, 1.0, C.ROOM_HEIGHT - C.BOILER_H + 0.1, 24]} />
      </mesh>
      {/* The fire door: a round window on the fire, in a brass ring. */}
      <group position={[C.FIRE_X, C.FIRE_Y, front]}>
        <mesh position={[0, 0, 0.02]} material={a.fire}>
          <circleGeometry args={[C.FIRE_R, 40]} />
        </mesh>
        <mesh position={[0, 0, 0.08]} material={mats.brass}>
          <torusGeometry args={[C.FIRE_R + 0.06, 0.12, 12, 48]} />
        </mesh>
        <mesh position={[0, 0, 0.04]} material={mats.darkSteel}>
          <ringGeometry args={[C.FIRE_R + 0.15, C.FIRE_R + 0.55, 48]} />
        </mesh>
        {/* Hinge and latch. */}
        <mesh position={[-C.FIRE_R - 0.35, 0, 0.12]} material={mats.darkSteel}>
          <boxGeometry args={[0.3, 0.9, 0.14]} />
        </mesh>
        <mesh position={[C.FIRE_R + 0.4, 0, 0.2]} rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 10]} />
        </mesh>
      </group>
      {/* The plaque above, and the temperature gauge. */}
      <mesh position={[C.FIRE_X, 4.55, front + 0.02]} material={mats.plaque}>
        <planeGeometry args={[3.2, 1.2]} />
      </mesh>
      <group position={[C.FIRE_X + 4.4, 4.55, front + 0.02]}>
        <mesh material={mats.gauge}>
          <circleGeometry args={[0.6, 40]} />
        </mesh>
        <Needle a={a} r={0.6} t={0.79} />
      </group>
      {/* The stencil over it all. */}
      <mesh position={[0, 14.6, -IN_Z + 0.02]} material={a.stencils.fireIn}>
        <planeGeometry args={[12, 2.2]} />
      </mesh>
      {/* The light of the fire, thrown down the hall. */}
      <spotLight
        ref={spot}
        position={[C.FIRE_X, C.FIRE_Y, front + 0.4]}
        color="#ff9a4a"
        intensity={230}
        distance={90}
        decay={1.35}
        angle={0.62}
        penumbra={0.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      <pointLight
        ref={glow}
        position={[C.FIRE_X, C.FIRE_Y, front + 1.6]}
        color="#ff8a3a"
        intensity={14}
        distance={14}
        decay={1.6}
      />
    </group>
  );
}

// A gauge needle on a dial of radius r, pointing at fraction t of the scale
// (the scale runs clockwise from lower left to lower right, as drawn).
function Needle({ a, r, t }: { a: Assets; r: number; t: number }) {
  // Canvas angles are clockwise from +x with y down; in the mesh, y is up.
  const canvasAngle = Math.PI * 0.8 + Math.PI * 1.4 * t;
  const angle = -canvasAngle;
  const len = r * 0.78;
  return (
    <group position={[0, 0, 0.012]}>
      <mesh
        position={[Math.cos(angle) * len * 0.5, Math.sin(angle) * len * 0.5, 0]}
        rotation={[0, 0, angle]}
        material={a.mats.needle}>
        <planeGeometry args={[len, r * 0.045]} />
      </mesh>
      <mesh position={[0, 0, 0.002]} material={a.mats.needle}>
        <circleGeometry args={[r * 0.07, 16]} />
      </mesh>
    </group>
  );
}

// Fuel: sacks of nostalgia on two pallets west of the boiler, one opened by
// the fire door with the shovel still in it.
function Fuel({ a }: { a: Assets }) {
  const pallet = usePalletGeometry();
  const { mats } = a;
  const sacks = useMemo(() => {
    const out: { p: Vec3; r: number }[] = [];
    for (const [px, layers] of [
      [-0.8, 4],
      [0.8, 3],
    ] as const) {
      for (let l = 0; l < layers; l++) {
        for (let k = 0; k < 2; k++) {
          const turn = l % 2 ? Math.PI / 2 : 0;
          const off = l % 2 ? [(k - 0.5) * 0.52, 0] : [0, (k - 0.5) * 0.48];
          out.push({
            p: [px + off[0], 0.13 + 0.13 + l * 0.24, off[1]],
            r: turn + Math.sin(px * 3 + l * 5 + k) * 0.06,
          });
        }
      }
    }
    return out;
  }, []);
  return (
    <group name="fuel">
      <group position={[C.FUEL_X, 0, C.FUEL_Z]}>
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} geometry={pallet} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.wood} castShadow />
        ))}
        {sacks.map(({ p, r }, i) => (
          <mesh key={i} position={p} rotation={[0, r, 0]} material={[mats.sackPlain, mats.sackPlain, mats.sack, mats.sackPlain, mats.sackPlain, mats.sackPlain]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.24, 0.92]} />
          </mesh>
        ))}
        <Tag
          lines={["NOSTALGIA, GRADE B", "QTY 40   25 KG", "GRADE A: NONE LEFT"]}
          position={[-0.8, 0.74, 0.715]}
          size={0.5}
        />
      </group>
      {/* The open sack and the shovel, by the fire door. */}
      <group position={[C.FIRE_X + 2.6, 0, C.BOILER_FRONT_Z + 1.5]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.28, 0]} rotation={[0, 0, 0]} material={[mats.sackPlain, mats.sackPlain, mats.sack, mats.sackPlain, mats.sack, mats.sackPlain]} castShadow>
          <boxGeometry args={[0.55, 0.56, 0.4]} />
        </mesh>
        <group position={[0.05, 0.5, 0]} rotation={[0, 0, -0.42]}>
          <mesh position={[0, 0.6, 0]} material={mats.wood}>
            <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
          </mesh>
          <mesh position={[0, -0.05, 0]} material={mats.darkSteel}>
            <boxGeometry args={[0.26, 0.32, 0.03]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ── The generators ────────────────────────────────────────────────────────

function Generators({ a }: { a: Assets }) {
  return (
    <group name="generators">
      {C.GEN_ZS.map((z, i) => (
        <Generator key={z} a={a} z={z} index={i} />
      ))}
    </group>
  );
}

function Generator({ a, z, index }: { a: Assets; z: number; index: number }) {
  const { mats } = a;
  const down = index === C.GEN_OUT_OF_SERVICE;
  const R = C.CASING_R;
  const half = C.CASING_L / 2;
  return (
    <group position={[C.GEN_X, 0, z]}>
      <mesh position={[0, C.PLINTH_H / 2, 0]} material={mats.concrete} castShadow receiveShadow>
        <boxGeometry args={[C.PLINTH_W, C.PLINTH_H, C.PLINTH_L]} />
      </mesh>
      {/* Feet. */}
      {[-half + 1.2, half - 1.2].map((dz) => (
        <mesh key={dz} position={[0, C.PLINTH_H + 0.4, dz]} material={mats.darkSteel} castShadow>
          <boxGeometry args={[R * 1.6, 0.8, 0.5]} />
        </mesh>
      ))}
      {/* The casing, axis along z. */}
      <group position={[0, C.CASING_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={mats.genPaint} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, C.CASING_L, 40]} />
        </mesh>
        {[-half + 0.5, half - 0.5].map((dy) => (
          <mesh key={dy} position={[0, dy, 0]} material={mats.genPink}>
            <cylinderGeometry args={[R + 0.03, R + 0.03, 0.18, 40]} />
          </mesh>
        ))}
        {/* The exciter at the north end, and the shaft coupling at the south. */}
        <mesh position={[0, -half - 0.6, 0]} material={mats.genPaint} castShadow>
          <cylinderGeometry args={[R * 0.6, R * 0.6, 1.2, 32]} />
        </mesh>
        <mesh position={[0, half + 0.25, 0]} material={mats.darkSteel}>
          <cylinderGeometry args={[0.32, 0.32, 0.5, 16]} />
        </mesh>
      </group>
      {/* Nameplate on the south end, and the status lamp above it. */}
      <mesh position={[0, C.CASING_Y + 0.8, half + 0.012]} material={a.nameplates[index]}>
        <planeGeometry args={[1.5, 0.75]} />
      </mesh>
      <mesh position={[0, C.CASING_Y + 1.45, half + 0.05]} material={down ? mats.lampRed : mats.lampGreen}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
      {down && <Barrier a={a} />}
    </group>
  );
}

// Posts and red-and-white chain round the generator that's down.
function Barrier({ a }: { a: Assets }) {
  const hx = C.BARRIER_HALF_X;
  const hz = C.BARRIER_HALF_Z;
  const corners: [number, number][] = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ];
  const links = useMemo(() => {
    const out: { p: Vec3; r: number; red: boolean }[] = [];
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corners[i];
      const [x1, z1] = corners[(i + 1) % 4];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.round(len / 0.5);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        // The chain sags between posts.
        const sag = Math.sin(Math.PI * t) * 0.18;
        out.push({
          p: [x0 + (x1 - x0) * t, 0.92 - sag, z0 + (z1 - z0) * t],
          r: Math.atan2(-(z1 - z0), x1 - x0),
          red: k % 2 === 0,
        });
      }
    }
    return out;
    // corners are derived from constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group name="barrier">
      {corners.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} material={a.mats.chainRed} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 1.0, 10]} />
          </mesh>
          <mesh position={[0, 0.03, 0]} material={a.mats.darkSteel}>
            <cylinderGeometry args={[0.2, 0.22, 0.06, 16]} />
          </mesh>
        </group>
      ))}
      {links.map(({ p, r, red }, i) => (
        <mesh key={i} position={p} rotation={[0, r, 0]} material={red ? a.mats.chainRed : a.mats.chainWhite}>
          <boxGeometry args={[0.48, 0.04, 0.04]} />
        </mesh>
      ))}
      <Tag lines={["GEN No. 2", "OUT OF SERVICE", "SINCE 18:47"]} position={[0, 0.62, hz + 0.03]} size={0.5} />
    </group>
  );
}

// ── The duct ──────────────────────────────────────────────────────────────

const MANIFOLD_Z0 = C.HALF_L - 1.6;
// Relative to the duct.
const BRANCH_XS = [-2.25, -0.75, 0.75, 2.25];

function Duct({ a }: { a: Assets }) {
  const { mats } = a;
  const riseZ = -30;
  const runZ0 = riseZ;
  const runZ1 = MANIFOLD_Z0;
  const runLen = runZ1 - runZ0;
  const casingTop = C.CASING_Y + C.CASING_R;
  const labels = [a.stencils.island, a.stencils.motel, a.stencils.agora, a.stencils.tv];
  return (
    <group name="duct" position={[C.DUCT_X, 0, 0]}>
      {/* Up out of the boiler... */}
      <mesh position={[0, (C.BOILER_H + C.DUCT_Y) / 2, riseZ]} material={mats.duct} castShadow>
        <cylinderGeometry args={[C.DUCT_R, C.DUCT_R, C.DUCT_Y - C.BOILER_H, 28]} />
      </mesh>
      <mesh position={[0, C.DUCT_Y, riseZ]} material={mats.duct}>
        <sphereGeometry args={[C.DUCT_R, 28, 16]} />
      </mesh>
      {/* ...along the roof... */}
      <mesh position={[0, C.DUCT_Y, (runZ0 + runZ1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={mats.duct} castShadow>
        <cylinderGeometry args={[C.DUCT_R, C.DUCT_R, runLen, 28]} />
      </mesh>
      {Array.from({ length: Math.floor(runLen / 4) }, (_, i) => (
        <mesh key={i} position={[0, C.DUCT_Y, runZ0 + 2 + i * 4]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel}>
          <cylinderGeometry args={[C.DUCT_R + 0.04, C.DUCT_R + 0.04, 0.14, 28]} />
        </mesh>
      ))}
      {/* Hangers. */}
      {[-22, -6, 10, 26].map((z) => (
        <mesh key={z} position={[0, (C.DUCT_Y + 15.4) / 2, z]} material={mats.darkSteel}>
          <boxGeometry args={[0.06, 15.4 - C.DUCT_Y, 0.06]} />
        </mesh>
      ))}
      {/* Stencilled along both sides. */}
      {[-1, 1].map((s) =>
        [-18, 8].map((z) => (
          <mesh
            key={`${s}${z}`}
            position={[s * (C.DUCT_R + 0.002), C.DUCT_Y, z]}
            rotation={[0, (s * Math.PI) / 2, 0]}
            material={a.stencils.ductArrow}>
            <planeGeometry args={[6, 1.1]} />
          </mesh>
        )),
      )}
      {/* A drop into each generator. */}
      {C.GEN_ZS.map((z) => (
        <group key={z}>
          <mesh position={[0, (C.DUCT_Y + casingTop) / 2, z]} material={mats.duct} castShadow>
            <cylinderGeometry args={[0.32, 0.32, C.DUCT_Y - casingTop + 0.1, 18]} />
          </mesh>
          <mesh position={[0, casingTop + 0.12, z]} material={mats.darkSteel}>
            <cylinderGeometry args={[0.5, 0.5, 0.24, 18]} />
          </mesh>
        </group>
      ))}
      {/* ...and out through the south wall, into four. */}
      <mesh position={[0, C.DUCT_Y, (MANIFOLD_Z0 + IN_Z) / 2]} material={mats.duct}>
        <boxGeometry args={[6, 1.7, IN_Z - MANIFOLD_Z0 + 0.06]} />
      </mesh>
      {BRANCH_XS.map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (13.05 + C.ROOM_HEIGHT) / 2, IN_Z - 0.6]} material={mats.duct}>
            <cylinderGeometry args={[0.28, 0.28, C.ROOM_HEIGHT - 13.05 + 0.1, 16]} />
          </mesh>
          {/* A plate on each branch, where it leaves the manifold. */}
          <mesh position={[0, 14.3, IN_Z - 0.6 - 0.3]} rotation={[0, Math.PI, 0]} material={a.mats.plate}>
            <planeGeometry args={[1.2, 0.42]} />
          </mesh>
          <mesh position={[0, 14.3, IN_Z - 0.6 - 0.31]} rotation={[0, Math.PI, 0]} material={labels[i]}>
            <planeGeometry args={[1.1, 0.34]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── The crane and the moon ────────────────────────────────────────────────

function CraneAndMoon({ a }: { a: Assets }) {
  const { mats } = a;
  const moon = useRef<Mesh>(null);
  useFrame((state) => {
    if (!moon.current || FREEZE) return;
    // It turns, very slowly, on the hook.
    moon.current.rotation.y = state.clock.getElapsedTime() * 0.03;
  });
  const span = C.HALF_W * 2 - 0.8;
  const top = C.MOON_Y + C.MOON_R;
  return (
    <group name="crane-and-moon">
      {/* The bridge, on its end trucks, and the trolley on top. */}
      <group position={[0, C.CRANE_Y, C.MOON_Z]}>
        {[-0.55, 0.55].map((dz) => (
          <mesh key={dz} position={[0, 0, dz]} material={mats.craneYellow} castShadow>
            <boxGeometry args={[span, 0.8, 0.35]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (span / 2 - 0.5), -0.35, 0]} material={mats.craneYellow}>
            <boxGeometry args={[1.0, 0.5, 2.6]} />
          </mesh>
        ))}
        <mesh position={[C.MOON_X, 0.65, 0]} material={mats.darkSteel}>
          <boxGeometry args={[1.6, 0.5, 1.7]} />
        </mesh>
      </group>
      {/* Cable, hook block, and the moon on its lifting eye. */}
      <mesh position={[C.MOON_X, (C.CRANE_Y + top + 1.0) / 2, C.MOON_Z]} material={mats.darkSteel}>
        <cylinderGeometry args={[0.03, 0.03, C.CRANE_Y - top - 1.0, 6]} />
      </mesh>
      <mesh position={[C.MOON_X, top + 0.85, C.MOON_Z]} material={mats.craneYellow}>
        <boxGeometry args={[0.4, 0.5, 0.25]} />
      </mesh>
      <mesh position={[C.MOON_X, top + 0.38, C.MOON_Z]} rotation={[0, 0, 0]} material={mats.darkSteel}>
        <torusGeometry args={[0.16, 0.045, 8, 18, Math.PI * 1.5]} />
      </mesh>
      <mesh position={[C.MOON_X, top + 0.12, C.MOON_Z]} rotation={[0, Math.PI / 2, 0]} material={mats.steel}>
        <torusGeometry args={[0.14, 0.04, 8, 18]} />
      </mesh>
      <mesh ref={moon} position={[C.MOON_X, C.MOON_Y, C.MOON_Z]} material={mats.moon} castShadow>
        <sphereGeometry args={[C.MOON_R, 48, 32]} />
      </mesh>
      <pointLight position={[C.MOON_X, C.MOON_Y - 0.5, C.MOON_Z + 3]} color="#b9c9ff" intensity={6} distance={14} decay={1.4} />
      {/* The cradle it was lifted out of. */}
      <group position={[C.MOON_X, 0, C.MOON_Z]}>
        <mesh position={[0, 0.2, 0]} material={mats.wood} castShadow receiveShadow>
          <boxGeometry args={[C.CRADLE_W, 0.4, C.CRADLE_W]} />
        </mesh>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`${sx}${sz}`}
              position={[sx * (C.CRADLE_W / 2 - 0.2), 0.4 + (C.CRADLE_H - 0.4) / 2 + 0.1, sz * (C.CRADLE_W / 2 - 0.2)]}
              material={mats.wood}
              castShadow>
              <boxGeometry args={[0.4, C.CRADLE_H - 0.4 + 0.2, 0.4]} />
            </mesh>
          )),
        )}
        <Tag
          lines={["MOON (SPARE)", "PHASES: FULL ONLY", "-> AGORA, ON CALL"]}
          position={[0, 0.22, C.CRADLE_W / 2 + 0.012]}
          size={0.5}
        />
      </group>
    </group>
  );
}

// ── The control gallery ───────────────────────────────────────────────────

const POST_STEP = 2.1;

function Gallery({ a }: { a: Assets }) {
  const { mats } = a;
  const x0 = C.GALLERY_X0;
  // The deck and canopy run into the walls; the switchgear stops at the dado.
  const x1 = C.HALF_W + 0.02;
  const z1 = C.HALF_L + 0.02;
  const z0 = C.GALLERY_Z0;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const deckY = C.GALLERY_Y;
  const railY = deckY + C.RAIL_H;
  const frontPosts = Math.round(d / POST_STEP);
  const stairLen = C.STAIR_Z1 - C.STAIR_Z0;
  const rise = C.GALLERY_Y;
  const pitch = Math.atan2(rise, stairLen);
  const stairHyp = Math.hypot(rise, stairLen);
  const stepD = stairLen / C.STAIR_STEPS;
  const stairW = x1 - C.STAIR_X0;
  return (
    <group name="gallery">
      {/* The switchgear under it, and its front. */}
      <mesh
        position={[(x0 + IN_X - 0.04) / 2 + 0.02, (deckY - C.GALLERY_SLAB) / 2 - 0.01, (z0 + IN_Z - 0.06) / 2 + 0.01]}
        material={mats.switchgear}>
        <boxGeometry args={[IN_X - 0.04 - x0 - 0.04, deckY - C.GALLERY_SLAB - 0.02, IN_Z - 0.06 - z0 - 0.02]} />
      </mesh>
      <mesh
        position={[x0 - 0.01, (deckY - C.GALLERY_SLAB) / 2, (z0 + IN_Z) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        material={mats.switchFront}>
        <planeGeometry args={[IN_Z - z0 - 0.1, deckY - C.GALLERY_SLAB - 0.04]} />
      </mesh>
      {/* The north end of the switchgear, beside the stair. */}
      <mesh position={[(x0 + C.STAIR_X0) / 2, (deckY - C.GALLERY_SLAB) / 2, z0 - 0.01]} rotation={[0, Math.PI, 0]} material={mats.switchEnd}>
        <planeGeometry args={[C.STAIR_X0 - x0 - 0.1, deckY - C.GALLERY_SLAB - 0.04]} />
      </mesh>
      {/* The big output gauge and the danger board, facing the hall. */}
      <group position={[x0 - 0.03, 2.25, 16.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel}>
          <cylinderGeometry args={[1.0, 1.0, 0.04, 40]} />
        </mesh>
        <mesh material={mats.gauge} position={[0, 0, 0.022]}>
          <circleGeometry args={[0.92, 48]} />
        </mesh>
        <group position={[0, 0, 0.022]}>
          <Needle a={a} r={0.92} t={0.79} />
        </group>
      </group>
      <mesh position={[x0 - 0.03, 2.3, 27.5]} rotation={[0, -Math.PI / 2, 0]} material={mats.danger}>
        <planeGeometry args={[3.2, 1.2]} />
      </mesh>
      {/* Deck slab. */}
      <mesh position={[cx, deckY - C.GALLERY_SLAB / 2, cz]} material={mats.grating} castShadow receiveShadow>
        <boxGeometry args={[w, C.GALLERY_SLAB, d]} />
      </mesh>
      {/* Front railing, and the short run across the north end. */}
      {Array.from({ length: frontPosts + 1 }, (_, i) => (
        <mesh key={i} position={[x0 + 0.05, deckY + C.RAIL_H / 2, z0 + 0.05 + (i * (d - 0.1)) / frontPosts]} material={mats.rail} castShadow>
          <boxGeometry args={[0.07, C.RAIL_H, 0.07]} />
        </mesh>
      ))}
      {[railY, deckY + 0.55].map((y) => (
        <mesh key={y} position={[x0 + 0.05, y, cz]} material={mats.rail}>
          <boxGeometry args={[0.07, 0.06, d - 0.02]} />
        </mesh>
      ))}
      {[railY, deckY + 0.55].map((y) => (
        <mesh key={`n${y}`} position={[(x0 + C.STAIR_X0) / 2, y, z0 + 0.05]} material={mats.rail}>
          <boxGeometry args={[C.STAIR_X0 - x0, 0.06, 0.07]} />
        </mesh>
      ))}
      {[x0 + 2, C.STAIR_X0 - 0.05].map((x) => (
        <mesh key={x} position={[x, deckY + C.RAIL_H / 2, z0 + 0.05]} material={mats.rail}>
          <boxGeometry args={[0.07, C.RAIL_H, 0.07]} />
        </mesh>
      ))}
      {/* The stair: treads between a stringer on the open side and the wall. */}
      {Array.from({ length: C.STAIR_STEPS }, (_, i) => {
        const zc = C.STAIR_Z0 + (i + 0.5) * stepD;
        const y = ((i + 1) / C.STAIR_STEPS) * rise;
        return (
          <mesh key={i} position={[(C.STAIR_X0 + x1) / 2, y - 0.04, zc]} material={mats.grating} castShadow receiveShadow>
            <boxGeometry args={[stairW - 0.02, 0.08, stepD + 0.04]} />
          </mesh>
        );
      })}
      <mesh
        position={[C.STAIR_X0 + 0.08, rise / 2 - 0.1, (C.STAIR_Z0 + C.STAIR_Z1) / 2]}
        rotation={[-pitch, 0, 0]}
        material={mats.darkSteel}
        castShadow>
        <boxGeometry args={[0.12, 0.3, stairHyp]} />
      </mesh>
      <mesh
        position={[x1 - 0.08, rise / 2 - 0.1, (C.STAIR_Z0 + C.STAIR_Z1) / 2]}
        rotation={[-pitch, 0, 0]}
        material={mats.darkSteel}>
        <boxGeometry args={[0.1, 0.3, stairHyp]} />
      </mesh>
      {/* Its handrail on the open side, and posts. */}
      <mesh
        position={[C.STAIR_X0 + 0.05, rise / 2 + C.RAIL_H, (C.STAIR_Z0 + C.STAIR_Z1) / 2]}
        rotation={[-pitch, 0, 0]}
        material={mats.rail}>
        <boxGeometry args={[0.07, 0.06, stairHyp]} />
      </mesh>
      {[0.5, 3.5, 6.5, 9.5].map((dz) => {
        const y = (dz / stairLen) * rise;
        return (
          <mesh key={dz} position={[C.STAIR_X0 + 0.05, y + C.RAIL_H / 2, C.STAIR_Z0 + dz]} material={mats.rail}>
            <boxGeometry args={[0.07, C.RAIL_H, 0.07]} />
          </mesh>
        );
      })}
      {/* The canopy over the gallery, its fascia, and the tubes under it. */}
      <mesh position={[cx, C.CANOPY_Y + 0.15, cz]} material={mats.steel}>
        <boxGeometry args={[w, 0.3, d]} />
      </mesh>
      {/* Its bottom sits a little below the canopy's, not in the same plane. */}
      <mesh position={[x0 + 0.1, C.CANOPY_Y + 0.675, cz]} material={mats.board}>
        <boxGeometry args={[0.2, 1.45, d]} />
      </mesh>
      <mesh position={[x0 - 0.005, C.CANOPY_Y + 0.7, 16.5]} rotation={[0, -Math.PI / 2, 0]} material={a.stencils.control}>
        <planeGeometry args={[6, 0.94]} />
      </mesh>
      <mesh position={[x0 - 0.005, C.CANOPY_Y + 0.7, 28.8]} rotation={[0, -Math.PI / 2, 0]} material={a.stencils.noNight}>
        <planeGeometry args={[6, 0.94]} />
      </mesh>
      <group position={[x0 - 0.02, C.CANOPY_Y + 0.7, 22.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel}>
          <cylinderGeometry args={[0.66, 0.66, 0.06, 32]} />
        </mesh>
        <mesh material={mats.clock} position={[0, 0, 0.012]}>
          <circleGeometry args={[0.6, 40]} />
        </mesh>
      </group>
      {[x0 + 0.5, x1 - 0.25].map((x) => (
        <mesh key={x} position={[x, (deckY + C.CANOPY_Y) / 2, z0 + 0.3]} material={mats.steel}>
          <boxGeometry args={[0.14, C.CANOPY_Y - deckY, 0.14]} />
        </mesh>
      ))}
      {[9.2, 12.6].map((x) =>
        [16, 22.5, 29].map((z) => (
          <mesh key={`${x}${z}`} position={[x, C.CANOPY_Y - 0.06, z]} material={mats.tube}>
            <boxGeometry args={[0.12, 0.08, 4.2]} />
          </mesh>
        )),
      )}
      <pointLight position={[11, C.CANOPY_Y - 0.8, 22]} color="#e2fff0" intensity={9} distance={14} decay={1.4} />
      {/* The mimic board on the wall behind the desk. */}
      <mesh position={[x1 - 0.06, 6.4, (C.MIMIC_Z0 + C.MIMIC_Z1) / 2]} material={mats.darkSteel}>
        <boxGeometry args={[0.1, 3.2, C.MIMIC_Z1 - C.MIMIC_Z0 + 0.2]} />
      </mesh>
      <mesh position={[x1 - 0.13, 6.4, (C.MIMIC_Z0 + C.MIMIC_Z1) / 2]} rotation={[0, -Math.PI / 2, 0]} material={mats.mimic}>
        <planeGeometry args={[C.MIMIC_Z1 - C.MIMIC_Z0, (C.MIMIC_Z1 - C.MIMIC_Z0) / 5]} />
      </mesh>
    </group>
  );
}

// The desk: switches facing the operator, a monitor showing Plato TV turned
// to the empty chair, the log open at today (which is every day), a chart
// recorder drawing a flat line, a mug, and the card.
function ControlDesk({ a, feed }: { a: Assets; feed: FeedTextures | null }) {
  const { mats } = a;
  const { scene: chairScene } = useGLTF("/models/chair/platic-chair.glb");
  const chair = useMemo(() => {
    const c = chairScene.clone(true);
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    c.scale.set(1, 1, 1);
    return c;
  }, [chairScene]);
  const shared = useMemo(() => createSharedCrtUniforms(), []);
  useEffect(() => {
    shared.uFeed.value = feed?.feed ?? null;
    shared.uOverlay.value = feed?.overlay ?? null;
    shared.uHasFeed.value = feed ? 1 : 0;
  }, [feed, shared]);
  useFrame((state) => {
    shared.uTime.value = FREEZE ? 0 : state.clock.getElapsedTime();
  });
  const x0 = C.CONSOLE_X0;
  const x1 = C.CONSOLE_X1;
  const z0 = C.CONSOLE_Z0;
  const z1 = C.CONSOLE_Z1;
  const deck = C.GALLERY_Y;
  const top = deck + 0.8;
  const len = z1 - z0;
  return (
    <group name="control-desk">
      <mesh position={[(x0 + x1) / 2, deck + 0.4, (z0 + z1) / 2]} material={mats.switchgear} castShadow>
        <boxGeometry args={[x1 - x0, 0.8, len]} />
      </mesh>
      {/* The raised switch panel along the hall side, sloped to the chair. */}
      <group position={[x0 + 0.2, top + 0.28, (z0 + z1) / 2]} rotation={[0, 0, 0.35]}>
        <mesh material={mats.switchgear}>
          <boxGeometry args={[0.2, 0.62, len]} />
        </mesh>
        <mesh position={[0.101, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.deskTop}>
          <planeGeometry args={[len - 0.1, 0.56]} />
        </mesh>
      </group>
      {/* Monitor, turned to the chair. */}
      <group position={[x0 + 0.62, top, 19.6]} rotation={[0, Math.PI / 2 + 0.25, 0]} scale={0.3}>
        <Crt shared={shared} seed={11.3} mode={CRT_FEED} bodyColor="#c4b9a4" />
      </group>
      {/* The log, open. */}
      <mesh position={[x0 + 0.7, top + 0.012, 22.2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={mats.logbook}>
        <planeGeometry args={[0.64, 0.4]} />
      </mesh>
      <mesh position={[x0 + 0.7, top + 0.004, 22.2]} material={mats.board}>
        <boxGeometry args={[0.42, 0.008, 0.66]} />
      </mesh>
      {/* The chart recorder, with its paper. */}
      <group position={[x0 + 0.6, top, 24.6]}>
        <mesh position={[0, 0.17, 0]} material={mats.meterBody}>
          <boxGeometry args={[0.5, 0.34, 0.42]} />
        </mesh>
        <mesh position={[0.251, 0.19, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.chart}>
          <planeGeometry args={[0.3, 0.24]} />
        </mesh>
      </group>
      <mesh position={[x0 + 0.75, top + 0.06, 20.9]} material={mats.mug}>
        <cylinderGeometry args={[0.05, 0.045, 0.12, 14]} />
      </mesh>
      <group position={[x0 + 0.78, top, 23.3]} rotation={[0, Math.PI / 2 + 0.1, 0]}>
        <mesh position={[0, 0.1, 0.04]} rotation={[-0.35, 0, 0]} material={mats.backSoon}>
          <planeGeometry args={[0.42, 0.21]} />
        </mesh>
      </group>
      {/* The chair, pushed back, facing the hall. */}
      <primitive
        object={chair}
        position={[C.CHAIR[0], deck, C.CHAIR[1]]}
        rotation={[0, -Math.PI / 2 + 0.25, 0]}
      />
    </group>
  );
}

// ── The south wall: the door, the meters, the boards ──────────────────────

function SouthWall({ a }: { a: Assets }) {
  const { mats } = a;
  const door = useFittedModel(MODEL.door, 4);
  const discs = useRef<Group>(null);
  const speeds = [1.6, 0.9, 0.12, 1.3];
  useFrame((_, dt) => {
    if (!discs.current || FREEZE) return;
    discs.current.children.forEach((c, i) => {
      c.rotation.y += dt * speeds[i];
    });
  });
  const wallZ = IN_Z;
  const meterY = 2.35;
  return (
    <group name="south-wall">
      <FittedPrimitive model={door} position={[C.DOOR_X, 0, C.DOOR_Z]} rotation={[0, Math.PI, 0]} />
      <mesh position={[C.DOOR_X, 4.6, wallZ - 0.02]} rotation={[0, Math.PI, 0]} material={mats.doorSign}>
        <planeGeometry args={[2.2, 0.69]} />
      </mesh>
      {/* The station's name, high up. */}
      <mesh position={[-0.5, 9.8, wallZ - 0.02]} rotation={[0, Math.PI, 0]} material={mats.station}>
        <planeGeometry args={[14, 2.19]} />
      </mesh>
      {/* The meter board: one meter per account, discs turning. */}
      <mesh position={[0, 2.2, wallZ - 0.03]} material={mats.board}>
        <boxGeometry args={[11.2, 2.7, 0.06]} />
      </mesh>
      {C.METER_XS.map((x, i) => (
        <group key={x} position={[x, meterY, wallZ - 0.06]}>
          <mesh position={[0, 0, -0.13]} material={mats.meterBody}>
            <boxGeometry args={[1.0, 1.25, 0.26]} />
          </mesh>
          <mesh position={[0, 0, -0.262]} rotation={[0, Math.PI, 0]} material={a.meters[i]}>
            <planeGeometry args={[0.9, 1.125]} />
          </mesh>
        </group>
      ))}
      <group ref={discs}>
        {C.METER_XS.map((x) => (
          <group key={x} position={[x, meterY + 0.1, wallZ - 0.06 - 0.2]}>
            <mesh material={mats.meterDisc}>
              <cylinderGeometry args={[0.26, 0.26, 0.012, 32]} />
            </mesh>
            <mesh position={[0.24, 0.008, 0]} material={mats.needle}>
              <boxGeometry args={[0.04, 0.006, 0.03]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* The shelf under the meters, and the post nobody opens. */}
      <mesh position={[0, C.METER_SHELF_Y, wallZ - 0.06 - 0.22]} material={mats.darkSteel}>
        <boxGeometry args={[11, 0.04, 0.44]} />
      </mesh>
      {[-5, 0, 5].map((x) => (
        <mesh key={x} position={[x, C.METER_SHELF_Y - 0.17, wallZ - 0.06 - 0.12]} material={mats.darkSteel}>
          <boxGeometry args={[0.04, 0.3, 0.22]} />
        </mesh>
      ))}
      <Post a={a} x={-2.6} />
      <Post a={a} x={2.9} count={4} />
      {/* The tariff, by the meters. */}
      <mesh position={[-7.3, 1.95, wallZ - 0.02]} rotation={[0, Math.PI, 0]} material={mats.tariff}>
        <planeGeometry args={[0.76, 1.07]} />
      </mesh>
      {/* The safety board, on the west wall by the door. */}
      <group position={[-IN_X, 2.7, 26.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.03]} material={mats.darkSteel}>
          <boxGeometry args={[2.1, 1.6, 0.06]} />
        </mesh>
        <mesh position={[0, 0, 0.062]} material={mats.days}>
          <planeGeometry args={[2.0, 1.5]} />
        </mesh>
      </group>
    </group>
  );
}

// A wire tray of unopened mail on the meter shelf, every one a final notice
// to the occupier.
function Post({ a, x, count = 7 }: { a: Assets; x: number; count?: number }) {
  const y = C.METER_SHELF_Y + 0.02;
  const z = IN_Z - 0.06 - 0.22;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.005, 0]} material={a.mats.wireTray}>
        <boxGeometry args={[0.42, 0.01, 0.3]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.205, 0.04, 0]} material={a.mats.wireTray}>
          <boxGeometry args={[0.01, 0.07, 0.3]} />
        </mesh>
      ))}
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 2.1) * 0.015, 0.014 + i * 0.008, Math.cos(i * 1.7) * 0.01]}
          rotation={[0, Math.sin(i * 3.7) * 0.12 + Math.PI, 0]}
          material={i === count - 1 ? [a.mats.paper, a.mats.paper, a.mats.envelope, a.mats.paper, a.mats.paper, a.mats.paper] : a.mats.paper}>
          <boxGeometry args={[0.36, 0.006, 0.18]} />
        </mesh>
      ))}
    </group>
  );
}
