import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  Box3,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
  type Material,
} from "three";
import DoorTrigger from "../DoorTrigger";
import { markWorldReady } from "../worldStore";
import { MODEL, useFittedModel, type FittedModel } from "../stockroom/models";
import {
  makeBarkTexture,
  makeClockTexture,
  makeFrondTexture,
  makeNeonTexture,
} from "../mall/textures";
import * as C from "./constants";

// QA hook: ?freeze=1 holds water, palms, the floating ring and the neon
// flicker still, so the flicker-diff tool can isolate geometry.
const FREEZE = new URLSearchParams(window.location.search).has("freeze");
import {
  makeCurtainTexture,
  makeDeckTexture,
  makeDisturbTexture,
  makeGateBoardTexture,
  makeGoldenHourPlaque,
  makeMotelBoardTexture,
  makeNumberTexture,
  makeOfficeSignTexture,
  makePoolRulesTexture,
  makePoolTileTexture,
  makeSmallSignTexture,
  makeStuccoTexture,
  makeUmbrellaTexture,
  makeVendingTexture,
} from "./textures";

// The Sunset Motel: a courtyard motel at permanent golden hour. The door in
// the cave's east wall comes out through the gate; the sun is going down in
// the west and has been for some time.

const SUN_DIR = new Vector3(-0.78, 0.075, 0.62).normalize();

interface Props {
  active: boolean;
}

export default function MotelWorld({ active }: Props) {
  const a = useAssets();
  useEffect(() => {
    markWorldReady("motel");
  }, []);

  return (
    <group name="motel-world">
      <ambientLight intensity={0.5} color="#ffc9d6" />
      <hemisphereLight intensity={0.75} color="#ff9ec4" groundColor="#462a50" />
      <directionalLight
        color="#ff9a62"
        intensity={3.1}
        position={[SUN_DIR.x * 90, SUN_DIR.y * 90, SUN_DIR.z * 90]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={180}
        shadow-bias={-0.0006}
        shadow-normalBias={0.08}
      />
      <Sky />
      <Mountains />
      <OutsideGround />
      <Courtyard a={a} />
      <Building a={a} />
      <Balcony a={a} />
      <Stair a={a} />
      <Pool a={a} />
      <NeonSign a={a} />
      <Gate a={a} />
      <Palms a={a} />
      <Loungers a={a} />
      <PoolsideTable a={a} />
      <Fittings a={a} />
      <Venus />
      <DoorTrigger
        to="cave"
        x={C.MOTEL_DOOR_X}
        z={C.MOTEL_DOOR_Z}
        normal={[-1, 0]}
        active={active}
      />
    </group>
  );
}

// ── Shared materials and textures ──────────────────────────────────────────

function useAssets() {
  const assets = useMemo(() => {
    const deck = makeDeckTexture([1, 1]);
    deck.wrapS = deck.wrapT = RepeatWrapping;
    const stucco = makeStuccoTexture([5, 2.5]);
    const poolTile = makePoolTileTexture([8, 4]);
    const curtainWarm = makeCurtainTexture("warm");
    const curtainTv = makeCurtainTexture("tv");
    const curtainDark = makeCurtainTexture("dark");
    const numbers = Array.from({ length: 11 }, (_, i) => makeNumberTexture(i + 1));
    const board = makeMotelBoardTexture();
    const gateBoard = makeGateBoardTexture();
    const neon = makeNeonTexture("VACANCY", "#ff356e", {
      w: 1024,
      h: 256,
      size: 170,
      spacing: 0.14,
    });
    const vending = makeVendingTexture();
    const umbrella = makeUmbrellaTexture();
    const poolRules = makePoolRulesTexture();
    const golden = makeGoldenHourPlaque();
    const officeSign = makeOfficeSignTexture();
    const disturb = makeDisturbTexture();
    const ice = makeSmallSignTexture("ICE", "24 HOURS");
    const phone = makeSmallSignTexture("PHONE", "DIAL 0 FOR OFFICE");
    const clock = makeClockTexture();
    const frond = makeFrondTexture();
    const bark = makeBarkTexture();

    const glass = new MeshStandardMaterial({
      color: "#a9f0e4",
      roughness: 0.3,
      metalness: 0,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const mats = {
      deck: new MeshStandardMaterial({ map: deck, roughness: 0.94 }),
      stucco: new MeshStandardMaterial({ map: stucco, roughness: 0.9 }),
      stuccoFlat: new MeshStandardMaterial({ color: "#dfa6ab", roughness: 0.9 }),
      stuccoDark: new MeshStandardMaterial({ color: "#c07f8d", roughness: 0.9 }),
      cream: new MeshStandardMaterial({ color: "#f2ddc6", roughness: 0.75 }),
      teal: new MeshStandardMaterial({ color: "#1f7f7d", roughness: 0.5 }),
      doorTeal: new MeshStandardMaterial({ color: "#1b6d70", roughness: 0.55 }),
      chrome: new MeshStandardMaterial({ color: "#d3e3e5", metalness: 0.5, roughness: 0.42 }),
      white: new MeshStandardMaterial({ color: "#efe6dc", roughness: 0.65 }),
      dark: new MeshStandardMaterial({ color: "#241a2b", roughness: 0.8 }),
      frame: new MeshStandardMaterial({ color: "#3a2433", roughness: 0.65 }),
      poolTile: new MeshStandardMaterial({ map: poolTile, roughness: 0.42 }),
      glass,
      curtainWarm: new MeshBasicMaterial({
        map: curtainWarm,
        toneMapped: false,
        color: new Color(1.45, 1.35, 1.25),
      }),
      curtainTv: new MeshBasicMaterial({
        map: curtainTv,
        toneMapped: false,
        color: new Color(0.9, 1.2, 1.5),
      }),
      curtainDark: new MeshBasicMaterial({ map: curtainDark, color: "#5c5470" }),
      numbers: numbers.map(
        (map) =>
          new MeshStandardMaterial({ map, roughness: 0.45, metalness: 0.45 }),
      ),
      board: new MeshStandardMaterial({
        map: board,
        roughness: 0.55,
        emissive: "#ff9a72",
        emissiveMap: board,
        emissiveIntensity: 0.5,
      }),
      gateBoard: new MeshStandardMaterial({
        map: gateBoard,
        roughness: 0.6,
        emissive: "#ffb082",
        emissiveMap: gateBoard,
        emissiveIntensity: 0.35,
      }),
      neon: new MeshBasicMaterial({
        map: neon,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        color: new Color(2.2, 2.2, 2.2),
      }),
      neonFlat: new MeshBasicMaterial({ color: new Color(2.2, 0.42, 1.15), toneMapped: false }),
      vending: new MeshStandardMaterial({
        map: vending,
        roughness: 0.35,
        emissive: "#a8eaff",
        emissiveMap: vending,
        emissiveIntensity: 0.55,
      }),
      umbrella: new MeshStandardMaterial({
        map: umbrella,
        roughness: 0.7,
        side: DoubleSide,
      }),
      poolRules: new MeshStandardMaterial({ map: poolRules, roughness: 0.7 }),
      golden: new MeshStandardMaterial({ map: golden, roughness: 0.35, metalness: 0.4 }),
      officeSign: new MeshStandardMaterial({ map: officeSign, roughness: 0.7 }),
      disturb: new MeshStandardMaterial({ map: disturb, roughness: 0.8, side: DoubleSide }),
      ice: new MeshStandardMaterial({
        map: ice,
        roughness: 0.5,
        emissive: "#ffffff",
        emissiveMap: ice,
        emissiveIntensity: 0.3,
      }),
      phone: new MeshStandardMaterial({ map: phone, roughness: 0.5 }),
      clock: new MeshStandardMaterial({ map: clock, roughness: 0.5 }),
      frond: new MeshStandardMaterial({
        map: frond,
        alphaTest: 0.5,
        side: DoubleSide,
        roughness: 0.4,
        color: "#cfe0b8",
      }),
      bark: new MeshStandardMaterial({ map: bark, roughness: 0.75 }),
      towelPink: new MeshStandardMaterial({ color: "#e8909f", roughness: 0.95 }),
      towelCream: new MeshStandardMaterial({ color: "#f0dfc8", roughness: 0.95 }),
      sand: new MeshStandardMaterial({ color: "#c8a882", roughness: 1 }),
      drinkGlass: new MeshStandardMaterial({
        color: "#cdeee6",
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        metalness: 0.1,
      }),
      bulb: new MeshBasicMaterial({ color: new Color(2.4, 1.6, 0.8), toneMapped: false }),
      porch: new MeshBasicMaterial({ color: new Color(1.1, 0.55, 0.24), toneMapped: false }),
    };

    const all: { dispose: () => void }[] = [
      deck, stucco, poolTile, curtainWarm, curtainTv, curtainDark,
      ...numbers, board, gateBoard, neon, vending, umbrella, poolRules,
      golden, officeSign, disturb, ice, phone, clock, frond, bark,
      ...Object.values(mats).flatMap((m) => (Array.isArray(m) ? m : [m])),
    ];
    return { mats, all };
  }, []);

  useEffect(
    () => () => {
      for (const item of assets.all) item.dispose();
    },
    [assets],
  );

  return assets;
}

type Assets = ReturnType<typeof useAssets>;

// ── Sky, horizon and the world outside the walls ────────────────────────────

function Sky() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uSun: { value: SUN_DIR.clone() } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(vec3(1.20, 0.50, 0.28), vec3(0.86, 0.24, 0.40), smoothstep(0.0, 0.10, h));
            col = mix(col, vec3(0.44, 0.12, 0.34), smoothstep(0.08, 0.28, h));
            col = mix(col, vec3(0.10, 0.045, 0.19), smoothstep(0.24, 0.75, h));
            // A few soft horizontal cloud bands near the horizon.
            float band = sin(d.y * 95.0 + d.x * 4.0) * sin(d.y * 31.0 - d.z * 3.0);
            col += vec3(0.35, 0.10, 0.08) * smoothstep(0.55, 0.95, band) * smoothstep(0.35, 0.03, h);
            // The sun, half-set and slow.
            float sd = max(dot(d, uSun), 0.0);
            col += vec3(2.6, 1.45, 0.62) * pow(sd, 420.0);
            col += vec3(0.55, 0.18, 0.10) * pow(sd, 12.0);
            // Stars, only well above the afterglow.
            float star = step(0.9975, fract(sin(dot(floor(d * 480.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453));
            col += vec3(0.55, 0.45, 0.6) * star * smoothstep(0.35, 0.7, h);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} scale={[300, 300, 300]} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 32]} />
    </mesh>
  );
}

function Mountains() {
  const geos = useMemo(() => {
    const ridge = (radius: number, base: number, seed: number, high: number) => {
      const N = 160;
      const positions: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * Math.PI * 2;
        const r = radius + Math.sin(ang * 5 + seed) * 7;
        const h =
          2 +
          high *
            (0.35 +
              0.3 * Math.sin(ang * 3.1 + seed) +
              0.2 * Math.sin(ang * 7.7 + seed * 2) +
              0.15 * Math.sin(ang * 17.3 + seed * 3));
        positions.push(Math.cos(ang) * r, base, Math.sin(ang) * r);
        positions.push(Math.cos(ang) * r, base + Math.max(1.5, h), Math.sin(ang) * r);
      }
      for (let i = 0; i < N; i++) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(positions, 3));
      g.setIndex(indices);
      return g;
    };
    return [
      { geo: ridge(210, -4, 1.7, 40), color: "#73395a" },
      { geo: ridge(150, -2, 4.2, 24), color: "#3c1d3f" },
    ];
  }, []);
  useEffect(() => () => geos.forEach((g) => g.geo.dispose()), [geos]);

  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g.geo} renderOrder={-5}>
          <meshBasicMaterial color={g.color} side={DoubleSide} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

function OutsideGround() {
  // Four pieces round the courtyard, not one plane under it: the pool is a
  // hole in the deck, and a lid under it would hide the water.
  const material = useMemo(
    () => new MeshStandardMaterial({ color: "#35202c", roughness: 1 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const FAR = 350;
  return (
    <group name="outside-ground">
      <mesh position={[0, -0.08, -(C.HALF_L + FAR / 2)]} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow>
        <planeGeometry args={[FAR * 2, FAR]} />
      </mesh>
      <mesh position={[0, -0.08, C.HALF_L + FAR / 2]} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow>
        <planeGeometry args={[FAR * 2, FAR]} />
      </mesh>
      <mesh position={[-(C.HALF_W + FAR / 2), -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow>
        <planeGeometry args={[FAR, C.HALF_L * 2]} />
      </mesh>
      <mesh position={[C.HALF_W + FAR / 2, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow>
        <planeGeometry args={[FAR, C.HALF_L * 2]} />
      </mesh>
    </group>
  );
}

// ── The courtyard floor and its walls ──────────────────────────────────────

// The deck's UVs are scaled by world size so one texture tile is always 4 m.
function deckGeometry(w: number, d: number) {
  const g = new PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) * w) / 4, (uv.getY(i) * d) / 4);
  }
  g.rotateX(-Math.PI / 2);
  return g;
}

function DeckPlane({ w, d, x, z, material }: {
  w: number;
  d: number;
  x: number;
  z: number;
  material: Material;
}) {
  const geo = useMemo(() => deckGeometry(w, d), [w, d]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={[x, 0, z]} material={material} receiveShadow />;
}

function Courtyard({ a }: { a: Assets }) {
  const poolWest = C.POOL_X - C.POOL_W / 2;
  const poolEast = C.POOL_X + C.POOL_W / 2;
  const poolSouth = C.POOL_Z + C.POOL_D / 2;
  const poolNorth = C.POOL_Z - C.POOL_D / 2;

  return (
    <group name="courtyard">
      {/* Deck in four pieces around the pool. */}
      <DeckPlane
        w={C.HALF_W * 2}
        d={C.HALF_L - poolSouth}
        x={0}
        z={(poolSouth + C.HALF_L) / 2}
        material={a.mats.deck}
      />
      <DeckPlane
        w={C.HALF_W * 2}
        d={poolNorth + C.HALF_L}
        x={0}
        z={(poolNorth - C.HALF_L) / 2}
        material={a.mats.deck}
      />
      <DeckPlane
        w={poolWest + C.HALF_W}
        d={C.POOL_D}
        x={(poolWest - C.HALF_W) / 2}
        z={C.POOL_Z}
        material={a.mats.deck}
      />
      <DeckPlane
        w={C.HALF_W - poolEast}
        d={C.POOL_D}
        x={(poolEast + C.HALF_W) / 2}
        z={C.POOL_Z}
        material={a.mats.deck}
      />
      <Fence a={a} />

      {/* The pool's edge: a low coping all round. */}
      {[
        { w: C.POOL_W + 0.7, d: 0.35, x: C.POOL_X, z: poolNorth - 0.18 },
        { w: C.POOL_W + 0.7, d: 0.35, x: C.POOL_X, z: poolSouth + 0.18 },
        { w: 0.35, d: C.POOL_D + 0.7, x: poolWest - 0.18, z: C.POOL_Z },
        { w: 0.35, d: C.POOL_D + 0.7, x: poolEast + 0.18, z: C.POOL_Z },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, 0.06, b.z]} material={a.mats.cream} receiveShadow>
          <boxGeometry args={[b.w, 0.12, b.d]} />
        </mesh>
      ))}
    </group>
  );
}

function Fence({ a }: { a: Assets }) {
  const H = 1.15;
  return (
    <group name="fence">
      {/* West and south, low enough to see the sunset over. */}
      <mesh position={[-C.HALF_W + 0.15, H / 2, 0]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[0.3, H, C.HALF_L * 2]} />
      </mesh>
      <mesh position={[0, H / 2, C.HALF_L - 0.15]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[C.HALF_W * 2, H, 0.3]} />
      </mesh>
      <mesh position={[-C.HALF_W + 0.15, H + 0.03, 0]} material={a.mats.cream}>
        <boxGeometry args={[0.38, 0.07, C.HALF_L * 2]} />
      </mesh>
      <mesh position={[0, H + 0.03, C.HALF_L - 0.15]} material={a.mats.cream}>
        <boxGeometry args={[C.HALF_W * 2, 0.07, 0.38]} />
      </mesh>
      {/* A line of painted tile along the fence, catching the light. */}
      <mesh position={[-C.HALF_W + 0.31, 0.62, 0]} material={a.mats.teal}>
        <boxGeometry args={[0.02, 0.12, C.HALF_L * 2]} />
      </mesh>
      <mesh position={[0, 0.62, C.HALF_L - 0.31]} material={a.mats.teal}>
        <boxGeometry args={[C.HALF_W * 2, 0.12, 0.02]} />
      </mesh>
    </group>
  );
}

// ── The motel building, rooms and office ────────────────────────────────────

function Building({ a }: { a: Assets }) {
  const wallZ = C.MOTEL_FRONT_Z - 0.1;
  return (
    <group name="motel-building">
      {/* Ground floor wall, east of the office. */}
      <mesh position={[4, 1.75, wallZ]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[36, 3.5, 0.2]} />
      </mesh>
      {/* Office bay: a sill, a header and three piers around glass. */}
      <mesh position={[-21.5, 1.75, wallZ]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[1, 3.5, 0.2]} />
      </mesh>
      <mesh position={[-18.2, 0.45, wallZ]} material={a.mats.stuccoFlat}>
        <boxGeometry args={[4.6, 0.9, 0.2]} />
      </mesh>
      <mesh position={[-17.5, 3.1, wallZ]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[7, 0.8, 0.2]} />
      </mesh>
      {[
        { x: -20.75, w: 0.5 },
        { x: -15.65, w: 0.5 },
        { x: -14.2, w: 0.4 },
      ].map((p, i) => (
        <mesh key={i} position={[p.x, 1.8, wallZ]} material={a.mats.stuccoFlat} castShadow>
          <boxGeometry args={[p.w, 1.8, 0.2]} />
        </mesh>
      ))}

      {/* A shallow pilaster covers the joint where the office bay meets the
          room wall; without it, a 4 cm gap between the two boxes lets the lit
          office interior show through as a bright vertical sliver. */}
      <mesh position={[-14.02, 1.75, C.MOTEL_FRONT_Z + 0.02]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[0.16, 3.5, 0.06]} />
      </mesh>

      {/* A downpipe at the office corner hides the joint between the bay
          and the room wall, and gives the long facade a vertical break. */}
      <group position={[-14.02, 0, C.MOTEL_FRONT_Z + 0.1]}>
        <mesh position={[0, 3.55, 0]} material={a.mats.teal}>
          <cylinderGeometry args={[0.07, 0.07, 7.0, 10]} />
        </mesh>
        {[1.0, 3.0, 5.0, 6.8].map((y) => (
          <mesh key={y} position={[0, y, -0.01]} material={a.mats.teal}>
            <boxGeometry args={[0.18, 0.04, 0.1]} />
          </mesh>
        ))}
      </group>

      {/* Upper storey and the band between the floors. */}
      <mesh position={[0, 5.25, wallZ]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[C.HALF_W * 2, 3.5, 0.2]} />
      </mesh>
      <mesh position={[0, 3.41, wallZ - 0.02]} material={a.mats.teal}>
        <boxGeometry args={[C.HALF_W * 2, 0.16, 0.26]} />
      </mesh>

      {/* Parapet, roof and side walls. */}
      <mesh position={[0, 7.45, wallZ]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[C.HALF_W * 2, 0.9, 0.32]} />
      </mesh>
      <mesh position={[0, 7.94, wallZ]} material={a.mats.cream}>
        <boxGeometry args={[C.HALF_W * 2 + 0.2, 0.08, 0.42]} />
      </mesh>
      <mesh position={[0, 7.05, -17]} material={a.mats.dark}>
        <boxGeometry args={[C.HALF_W * 2, 0.2, 6]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (C.HALF_W - 0.15), 3.95, -17]}
          material={a.mats.stuccoDark}
          castShadow
          receiveShadow>
          <boxGeometry args={[0.3, 7.9, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 3.95, -19.9]} material={a.mats.stuccoDark} receiveShadow>
        <boxGeometry args={[C.HALF_W * 2, 7.9, 0.2]} />
      </mesh>

      {/* A painted "MOTEL" band on the upper facade. */}
      <mesh position={[6.2, 5.55, C.MOTEL_FRONT_Z + 0.005]} material={a.mats.cream}>
        <planeGeometry args={[4.6, 0.28]} />
      </mesh>

      {/* Ground rooms 1–5. */}
      {C.GROUND_ROOM_NUMBERS.map((n, i) => (
        <RoomFront
          key={n}
          bayX={C.BAY_XS[i + 1]}
          y={0}
          number={n}
          lit={n === C.LIT_ROOM ? "warm" : "dark"}
          a={a}
          ac={n === 1 || n === 4}
        />
      ))}
      {/* Upper rooms 6–11. */}
      {C.UPPER_ROOM_NUMBERS.map((n, i) => (
        <RoomFront
          key={n}
          bayX={C.BAY_XS[i]}
          y={C.STOREY_Y}
          number={n}
          lit={n === C.TV_ROOM ? "tv" : "dark"}
          a={a}
          disturb={n === 8}
          ac={n === 6 || n === 10}
        />
      ))}

      <Office a={a} />
    </group>
  );
}

function RoomFront({
  bayX,
  y,
  number,
  lit,
  a,
  disturb = false,
  ac = false,
}: {
  bayX: number;
  y: number;
  number: number;
  lit: "warm" | "tv" | "dark";
  a: Assets;
  disturb?: boolean;
  ac?: boolean;
}) {
  const z = C.MOTEL_FRONT_Z + 0.03;
  const winX = bayX + C.WINDOW_DX;
  const doorX = bayX + C.DOOR_DX;
  const curtain =
    lit === "warm" ? a.mats.curtainWarm : lit === "dark" ? a.mats.curtainDark : a.mats.curtainTv;

  return (
    <group>
      <group position={[winX, y + C.WINDOW_SILL + C.WINDOW_H / 2, z]}>
        <mesh position={[0, 0, 0]} material={curtain}>
          <planeGeometry args={[C.WINDOW_W - 0.06, C.WINDOW_H - 0.06]} />
        </mesh>
        <mesh position={[0, 0, 0.014]} material={a.mats.glass}>
          <planeGeometry args={[C.WINDOW_W, C.WINDOW_H]} />
        </mesh>
        {/* Frame. */}
        <mesh position={[0, C.WINDOW_H / 2 + 0.04, 0.03]} material={a.mats.frame}>
          <boxGeometry args={[C.WINDOW_W + 0.14, 0.08, 0.05]} />
        </mesh>
        <mesh position={[0, -C.WINDOW_H / 2 - 0.04, 0.03]} material={a.mats.frame}>
          <boxGeometry args={[C.WINDOW_W + 0.14, 0.08, 0.05]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[(s * (C.WINDOW_W + 0.04)) / 2, 0, 0.03]}
            material={a.mats.frame}>
            <boxGeometry args={[0.08, C.WINDOW_H + 0.16, 0.05]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.032]} material={a.mats.frame}>
          <boxGeometry args={[0.035, C.WINDOW_H, 0.04]} />
        </mesh>
      </group>

      <group position={[doorX, y, z]}>
        {/* Door leaf, frame, number and knob. */}
        <mesh position={[0, C.DOOR_H / 2, 0.0]} material={a.mats.doorTeal}>
          <boxGeometry args={[C.DOOR_W, C.DOOR_H, 0.07]} />
        </mesh>
        <mesh position={[0, C.DOOR_H / 2, 0.04]} material={a.mats.dark}>
          <boxGeometry args={[C.DOOR_W - 0.2, 0.5, 0.02]} />
        </mesh>
        <mesh position={[-C.DOOR_W / 2 - 0.045, C.DOOR_H / 2, 0.015]} material={a.mats.frame}>
          <boxGeometry args={[0.09, C.DOOR_H + 0.14, 0.07]} />
        </mesh>
        <mesh position={[C.DOOR_W / 2 + 0.045, C.DOOR_H / 2, 0.015]} material={a.mats.frame}>
          <boxGeometry args={[0.09, C.DOOR_H + 0.14, 0.07]} />
        </mesh>
        <mesh position={[0, C.DOOR_H + 0.07, 0.015]} material={a.mats.frame}>
          <boxGeometry args={[C.DOOR_W + 0.2, 0.1, 0.07]} />
        </mesh>
        <mesh position={[0, C.NUMBER_Y, 0.06]} material={a.mats.numbers[number - 1]}>
          <planeGeometry args={[0.28, 0.28]} />
        </mesh>
        <mesh position={[C.DOOR_W / 2 - 0.17, 1.02, 0.075]} material={a.mats.chrome}>
          <sphereGeometry args={[0.045, 10, 8]} />
        </mesh>
        {disturb && (
          <mesh
            position={[C.DOOR_W / 2 - 0.17, 0.9, 0.1]}
            material={a.mats.disturb}>
            <planeGeometry args={[0.24, 0.12]} />
          </mesh>
        )}
        {/* A step worn pale at the threshold. */}
        <mesh position={[0, 0.03, 0.16]} material={a.mats.cream} receiveShadow>
          <boxGeometry args={[C.DOOR_W + 0.2, 0.06, 0.32]} />
        </mesh>
      </group>

      {/* A tired air conditioner under some windows. */}
      {ac && (
        <group position={[winX, y + C.WINDOW_SILL - 0.26, z + 0.19]}>
          <mesh material={a.mats.cream} castShadow>
            <boxGeometry args={[0.92, 0.42, 0.36]} />
          </mesh>
          <mesh position={[0, 0, 0.19]} material={a.mats.dark}>
            <planeGeometry args={[0.8, 0.3]} />
          </mesh>
          <mesh position={[0, -0.24, 0]} material={a.mats.frame}>
            <boxGeometry args={[0.98, 0.04, 0.4]} />
          </mesh>
        </group>
      )}

      {/* Porch light beside every door: the only thing on. */}
      <group position={[doorX - C.DOOR_W / 2 - 0.3, y + 2.32, z + 0.09]}>
        <mesh position={[0, 0.11, 0]} material={a.mats.frame}>
          <boxGeometry args={[0.1, 0.22, 0.1]} />
        </mesh>
        <mesh position={[0, 0.04, 0.06]} material={a.mats.dark}>
          <boxGeometry args={[0.18, 0.07, 0.24]} />
        </mesh>
        <mesh position={[0, -0.03, 0.12]} material={a.mats.porch}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
      </group>
    </group>
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

function Office({ a }: { a: Assets }) {
  const helios = useFittedModel(MODEL.helios, 0.8);
  return (
    <group name="office">
      {/* The glass front, its piers and the sign. */}
      <mesh position={[C.OFFICE_WINDOW_X, 1.8, C.MOTEL_FRONT_Z + 0.03]} material={a.mats.glass}>
        <planeGeometry args={[C.OFFICE_WINDOW_W, 1.8]} />
      </mesh>
      <mesh position={[C.OFFICE_DOOR_X, 1.1, C.MOTEL_FRONT_Z + 0.03]} material={a.mats.glass}>
        <planeGeometry args={[1, 2.2]} />
      </mesh>
      <mesh position={[C.OFFICE_DOOR_X - 0.53, 1.1, C.MOTEL_FRONT_Z + 0.045]} material={a.mats.frame}>
        <boxGeometry args={[0.08, 2.3, 0.06]} />
      </mesh>
      <mesh position={[C.OFFICE_DOOR_X + 0.53, 1.1, C.MOTEL_FRONT_Z + 0.045]} material={a.mats.frame}>
        <boxGeometry args={[0.08, 2.3, 0.06]} />
      </mesh>
      <mesh position={[C.OFFICE_DOOR_X, 2.24, C.MOTEL_FRONT_Z + 0.045]} material={a.mats.frame}>
        <boxGeometry args={[1.14, 0.08, 0.06]} />
      </mesh>
      <mesh position={[C.OFFICE_DOOR_X, 2.46, C.MOTEL_FRONT_Z - 0.05]} material={a.mats.stuccoFlat}>
        <boxGeometry args={[1.02, 0.48, 0.12]} />
      </mesh>
      <mesh position={[C.OFFICE_DOOR_X, 1.02, C.MOTEL_FRONT_Z + 0.06]} material={a.mats.chrome}>
        <sphereGeometry args={[0.04, 10, 8]} />
      </mesh>
      <mesh position={[C.OFFICE_WINDOW_X + 1.5, 1.05, C.MOTEL_FRONT_Z + 0.02]} material={a.mats.frame}>
        <boxGeometry args={[0.07, 2.1, 0.06]} />
      </mesh>
      <mesh position={[C.OFFICE_WINDOW_X, 1.8, C.MOTEL_FRONT_Z + 0.03]} material={a.mats.frame}>
        <boxGeometry args={[0.04, 1.8, 0.04]} />
      </mesh>
      <mesh position={[-16.9, 2.88, C.MOTEL_FRONT_Z + 0.04]} material={a.mats.officeSign}>
        <planeGeometry args={[1.7, 0.44]} />
      </mesh>
      <mesh position={[-13.8, 1.55, C.MOTEL_FRONT_Z + 0.035]} material={a.mats.golden}>
        <planeGeometry args={[0.62, 0.31]} />
      </mesh>

      {/* The room behind the glass. */}
      <mesh position={[-17.5, 0.01, -15.45]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.deck}>
        <planeGeometry args={[7, 2.9]} />
      </mesh>
      <mesh position={[-17.5, 2.9, -15.45]} rotation={[Math.PI / 2, 0, 0]} material={a.mats.cream}>
        <planeGeometry args={[7, 2.9]} />
      </mesh>
      <mesh position={[-17.5, 1.45, C.OFFICE_BACK_Z]} material={a.mats.stuccoDark}>
        <boxGeometry args={[7.2, 2.9, 0.12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s === -1 ? -20.9 : -14.1, 1.45, -15.45]} material={a.mats.stuccoDark}>
          <boxGeometry args={[0.12, 2.9, 2.9]} />
        </mesh>
      ))}

      {/* Counter, key rack, clock, guest book, bell, phone, lamp. */}
      <mesh position={[-17.4, 0.52, -15.5]} material={a.mats.teal}>
        <boxGeometry args={[3.7, 1.04, 0.24]} />
      </mesh>
      <mesh position={[-17.4, 1.08, -15.55]} material={a.mats.cream}>
        <boxGeometry args={[4, 0.08, 0.8]} />
      </mesh>
      <mesh position={[-17.9, 2.05, -16.78]} material={a.mats.frame}>
        <boxGeometry args={[2.4, 1.2, 0.06]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[-18.75 + (i % 6) * 0.34, 1.75 - Math.floor(i / 6) * 0.42, -16.71]}>
          <mesh material={a.mats.chrome}>
            <boxGeometry args={[0.05, 0.16, 0.02]} />
          </mesh>
          <mesh position={[0, -0.11, 0]} material={a.mats.golden}>
            <boxGeometry args={[0.075, 0.09, 0.012]} />
          </mesh>
        </group>
      ))}
      <mesh position={[-17.0, 2.35, -16.7]} material={a.mats.clock}>
        <circleGeometry args={[0.32, 32]} />
      </mesh>
      <mesh position={[-16.6, 1.14, -15.5]} rotation={[0, 0.2, 0]} material={a.mats.cream}>
        <boxGeometry args={[0.38, 0.035, 0.3]} />
      </mesh>
      <mesh position={[-15.9, 1.16, -15.55]} material={a.mats.chrome}>
        <sphereGeometry args={[0.055, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[-19.2, 1.12, -15.6]} material={a.mats.dark}>
        <cylinderGeometry args={[0.06, 0.08, 0.08, 12]} />
      </mesh>
      <mesh position={[-19.2, 1.34, -15.6]} material={a.mats.chrome}>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
      </mesh>
      <mesh position={[-19.2, 1.62, -15.6]} material={a.mats.cream}>
        <coneGeometry args={[0.2, 0.22, 16, 1, true]} />
      </mesh>
      <mesh position={[-19.2, 1.6, -15.6]} material={a.mats.bulb}>
        <sphereGeometry args={[0.045, 10, 8]} />
      </mesh>
      <pointLight
        position={[-19.2, 1.58, -15.45]}
        color="#ffc07a"
        intensity={4.2}
        distance={7}
        decay={1.8}
      />
      <mesh position={[-16.3, 1.14, -15.5]} material={a.mats.dark}>
        <boxGeometry args={[0.26, 0.08, 0.2]} />
      </mesh>
      <mesh position={[-16.3, 1.19, -15.5]} rotation={[0, 0, Math.PI / 2]} material={a.mats.dark}>
        <cylinderGeometry args={[0.035, 0.035, 0.26, 10]} />
      </mesh>
      <Fitted model={helios} position={[-15.1, 1.12, -15.65]} rotation={[0, 0.35, 0]} />
    </group>
  );
}

// ── The balcony and the outside stair ──────────────────────────────────────

function Balcony({ a }: { a: Assets }) {
  const railEnd = C.STAIR_X0;
  const railSpan = railEnd + C.HALF_W;
  const railCenter = (-C.HALF_W + railEnd) / 2;
  const postCount = 14;
  return (
    <group name="balcony">
      <mesh position={[0, C.STOREY_Y - 0.15, -12.8]} material={a.mats.cream} castShadow receiveShadow>
        <boxGeometry args={[C.HALF_W * 2, 0.3, C.BALCONY_DEPTH]} />
      </mesh>
      <mesh position={[0, C.STOREY_Y - 0.16, C.BALCONY_Z + 0.04]} material={a.mats.teal}>
        <boxGeometry args={[C.HALF_W * 2, 0.34, 0.14]} />
      </mesh>
      {/* The underside, lit by a strip of warm lamps. */}
      {[-16, -8, 0, 8, 16].map((x) => (
        <mesh key={x} position={[x, C.STOREY_Y - 0.31, C.BALCONY_Z + 0.7]} material={a.mats.bulb}>
          <boxGeometry args={[1.3, 0.04, 0.08]} />
        </mesh>
      ))}
      <pointLight
        position={[0, C.STOREY_Y - 0.45, C.BALCONY_Z + 0.6]}
        color="#ffb27a"
        intensity={5}
        distance={13}
        decay={1.7}
      />
      {/* Railing: two rails and posts, with a gap at the stair. */}
      {[0.55, 0.95].map((h) => (
        <mesh key={h} position={[railCenter, C.STOREY_Y + h, C.BALCONY_Z + 0.01]} material={a.mats.teal}>
          <boxGeometry args={[railSpan, 0.06, 0.06]} />
        </mesh>
      ))}
      {Array.from({ length: postCount }, (_, i) => {
        const x = -C.HALF_W + 1.2 + (i / (postCount - 1)) * (railSpan - 2.4);
        return (
          <mesh key={i} position={[x, C.STOREY_Y + 0.55, C.BALCONY_Z + 0.01]} material={a.mats.teal}>
            <boxGeometry args={[0.06, 1.1, 0.06]} />
          </mesh>
        );
      })}
      {/* Towels left over the rail. */}
      {[
        { x: -9.4, color: a.mats.towelPink },
        { x: -2.2, color: a.mats.towelCream },
        { x: 7.6, color: a.mats.teal },
        { x: 12.4, color: a.mats.towelPink },
      ].map((towel) => (
        <group key={towel.x} position={[towel.x, C.STOREY_Y + 0.66, C.BALCONY_Z + 0.02]}>
          <mesh material={towel.color} castShadow>
            <boxGeometry args={[0.58, 0.52, 0.035]} />
          </mesh>
          <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]} material={towel.color}>
            <cylinderGeometry args={[0.035, 0.035, 0.58, 8]} />
          </mesh>
        </group>
      ))}

      {/* Posts that carry the balcony. */}
      {C.BALCONY_POSTS.map((x) => (
        <mesh key={x} position={[x, C.STOREY_Y / 2, C.BALCONY_Z + 0.35]} material={a.mats.cream} castShadow>
          <boxGeometry args={[0.2, C.STOREY_Y, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}

function Stair({ a }: { a: Assets }) {
  const tread = (C.STAIR_Z1 - C.STAIR_Z0) / C.STAIR_STEPS;
  const width = C.STAIR_X1 - C.STAIR_X0;
  const cx = (C.STAIR_X0 + C.STAIR_X1) / 2;
  const angle = Math.atan2(C.STOREY_Y, C.STAIR_Z1 - C.STAIR_Z0);
  const length = Math.hypot(C.STOREY_Y, C.STAIR_Z1 - C.STAIR_Z0);

  return (
    <group name="stair">
      {Array.from({ length: C.STAIR_STEPS }, (_, i) => {
        const top = C.STOREY_Y * (1 - i / C.STAIR_STEPS);
        const z = C.STAIR_Z0 + (i + 0.5) * tread;
        return (
          <mesh key={i} position={[cx, top / 2, z]} material={a.mats.cream} castShadow>
            <boxGeometry args={[width, top, tread + 0.02]} />
          </mesh>
        );
      })}
      {/* The step boxes share one closed side, so no separate stringer is
          needed; a second sloped panel here only z-fought the tread faces. */}
      <mesh
        position={[C.STAIR_X0 - 0.06, C.STOREY_Y / 2 + 0.9, (C.STAIR_Z0 + C.STAIR_Z1) / 2]}
        rotation={[angle, 0, 0]}
        material={a.mats.teal}>
        <boxGeometry args={[0.07, 0.07, length]} />
      </mesh>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const z = C.STAIR_Z0 + t * (C.STAIR_Z1 - C.STAIR_Z0);
        const y = C.STOREY_Y * (1 - t);
        return (
          <mesh key={t} position={[C.STAIR_X0 - 0.06, y + 0.45, z]} material={a.mats.teal}>
            <boxGeometry args={[0.05, 0.9, 0.05]} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── The pool ───────────────────────────────────────────────────────────────

function Water() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uSun: { value: SUN_DIR.clone() } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSun;
          varying vec3 vWorld;

          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }

          vec3 skyColor(vec3 d) {
            float h = clamp(d.y, 0.0, 1.0);
            vec3 c = mix(vec3(1.18, 0.48, 0.28), vec3(0.80, 0.21, 0.40), smoothstep(0.0, 0.12, h));
            c = mix(c, vec3(0.34, 0.09, 0.30), smoothstep(0.10, 0.36, h));
            c = mix(c, vec3(0.07, 0.03, 0.14), smoothstep(0.34, 0.82, h));
            float sd = max(dot(d, uSun), 0.0);
            c += vec3(2.7, 1.5, 0.65) * pow(sd, 360.0);
            c += vec3(0.45, 0.13, 0.08) * pow(sd, 11.0);
            return c;
          }

          void main() {
            vec3 view = normalize(cameraPosition - vWorld);
            vec2 p = vWorld.xz;
            float t = uTime;
            float nx = sin(p.x * 1.9 + t * 1.05) * 0.5 + sin(p.y * 3.1 - t * 0.72) * 0.32;
            float nz = cos(p.y * 2.2 + t * 0.88) * 0.5 + cos(p.x * 2.7 - t * 1.24) * 0.32;
            vec3 n = normalize(vec3(nx * 0.09, 1.0, nz * 0.09));
            vec3 r = reflect(-view, n);
            r.y = abs(r.y);
            // The sky, compressed to the two bands the water actually sees.
            vec3 refl = mix(vec3(0.62, 0.2, 0.16), vec3(0.2, 0.06, 0.18),
                            smoothstep(0.0, 0.3, r.y));
            refl = mix(refl, vec3(0.06, 0.025, 0.1),
                       smoothstep(0.28, 0.8, r.y));
            float fres = pow(1.0 - max(dot(n, view), 0.0), 2.2);
            vec3 deep = vec3(0.008, 0.085, 0.1);
            vec3 col = mix(deep, refl, 0.18 + 0.36 * fres);
            col += vec3(0.02, 0.075, 0.07) * (0.55 + 0.45 * n.x);
            // The sun's path on the water.
            float glint = pow(max(dot(r, uSun), 0.0), 300.0);
            col += vec3(2.2, 1.3, 0.75) * glint * 1.2;
            // Small, sparse highlights, not a tiled floor.
            float sparkle = pow(hash21(floor(p * 35.0) + floor(t * 1.5)), 32.0);
            col += vec3(0.5, 0.62, 0.55) * sparkle * 0.08;
            // The sun painted on the bottom, seen through the water.
            vec2 q = vWorld.xz - vec2(${C.POOL_X.toFixed(1)}, ${C.POOL_Z.toFixed(1)});
            q += vec2(n.x, n.z) * 0.5;
            float disc = 1.0 - smoothstep(2.7, 3.05, length(q));
            float sunT = clamp((3.0 - q.y) / 6.0, 0.0, 1.0);
            vec3 sun = mix(vec3(0.85, 0.05, 0.3), vec3(1.0, 0.5, 0.16), sunT);
            float f = fract(q.y * 3.4 + 0.15);
            float slots = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.6, 0.7, f));
            col = mix(col, sun, disc * slots * 0.82);
            gl_FragColor = vec4(col, 0.84);
          }
        `,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    if (FREEZE) return;
    material.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      position={[C.POOL_X, C.WATER_Y, C.POOL_Z]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}>
      <planeGeometry args={[C.POOL_W - 0.16, C.POOL_D - 0.16]} />
    </mesh>
  );
}

function Pool({ a }: { a: Assets }) {
  const pos = C.POOL_Z;
  const halfW = C.POOL_W / 2;
  const halfD = C.POOL_D / 2;
  return (
    <group name="pool">
      {/* Tiled basin: a floor and four inner walls, so the water is visible. */}
      <mesh
        position={[C.POOL_X, -C.POOL_DEPTH, C.POOL_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={a.mats.poolTile}>
        <planeGeometry args={[C.POOL_W, C.POOL_D]} />
      </mesh>
      {[
        { x: C.POOL_X, z: C.POOL_Z - halfD + 0.01, yaw: 0, w: C.POOL_W },
        { x: C.POOL_X, z: C.POOL_Z + halfD - 0.01, yaw: Math.PI, w: C.POOL_W },
        { x: C.POOL_X - halfW + 0.01, z: C.POOL_Z, yaw: Math.PI / 2, w: C.POOL_D },
        { x: C.POOL_X + halfW - 0.01, z: C.POOL_Z, yaw: -Math.PI / 2, w: C.POOL_D },
      ].map((wall, i) => (
        <mesh
          key={i}
          position={[wall.x, -C.POOL_DEPTH / 2, wall.z]}
          rotation={[0, wall.yaw, 0]}
          material={a.mats.poolTile}>
          <planeGeometry args={[wall.w, C.POOL_DEPTH]} />
        </mesh>
      ))}
      {/* A pale band at the waterline. */}
      {[
        { x: C.POOL_X, z: C.POOL_Z - halfD + 0.01, w: C.POOL_W, d: 0.04 },
        { x: C.POOL_X, z: C.POOL_Z + halfD - 0.01, w: C.POOL_W, d: 0.04 },
        { x: C.POOL_X - halfW + 0.01, z: C.POOL_Z, w: 0.04, d: C.POOL_D },
        { x: C.POOL_X + halfW - 0.01, z: C.POOL_Z, w: 0.04, d: C.POOL_D },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, C.WATER_Y + 0.04, b.z]} material={a.mats.cream}>
          <boxGeometry args={[b.w, 0.1, b.d]} />
        </mesh>
      ))}
      <Water />
      {/* The diving board, still promising a depth the pool does not have. */}
      <group name="diving-board" position={[C.POOL_X, 0, C.POOL_Z - halfD - 0.6]}>
        <mesh position={[0, 0.2, 0]} material={a.mats.cream} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.4, 1.15]} />
        </mesh>
        <mesh position={[0, 0.44, 0]} material={a.mats.teal}>
          <boxGeometry args={[1.04, 0.08, 1.19]} />
        </mesh>
        <mesh position={[0, 0.62, 0.9]} rotation={[0.03, 0, 0]} material={a.mats.cream} castShadow>
          <boxGeometry args={[0.6, 0.08, 2.6]} />
        </mesh>
        <mesh position={[0, 0.64, 2.16]} material={a.mats.teal}>
          <boxGeometry args={[0.62, 0.1, 0.12]} />
        </mesh>
        <mesh position={[0, 0.68, -0.1]} rotation={[0, 0, Math.PI / 2]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.03, 0.03, 0.62, 8]} />
        </mesh>
      </group>

      {/* A chrome ladder at the east end. */}
      {[-0.28, 0.28].map((dz) => (
        <mesh key={dz} position={[C.POOL_X + halfW - 0.25, 0.28, C.POOL_Z + dz]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.035, 0.035, 1.4, 10]} />
        </mesh>
      ))}
      {[0.12, 0.5, 0.88].map((y) => (
        <mesh key={y} position={[C.POOL_X + halfW - 0.25, y, C.POOL_Z]} rotation={[Math.PI / 2, 0, 0]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
        </mesh>
      ))}
      {/* A ring left floating. */}
      <FloatingRing />
      {/* Depth marks, painted on the coping. */}
      {[
        { x: C.POOL_X - halfW + 1.2, z: pos + halfD + 0.02 },
        { x: C.POOL_X + halfW - 1.2, z: pos + halfD + 0.02 },
      ].map((p, i) => (
        <mesh key={i} position={[p.x, 0.13, p.z]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.teal}>
          <planeGeometry args={[0.5, 0.22]} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingRing() {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (FREEZE) return;
    const t = state.clock.getElapsedTime();
    if (!ref.current) return;
    ref.current.position.y = C.WATER_Y + 0.06 + Math.sin(t * 0.8) * 0.025;
    ref.current.rotation.y = t * 0.08;
    ref.current.rotation.z = Math.sin(t * 0.55) * 0.04;
  });
  return (
    <group ref={ref} position={[C.POOL_X + 2.8, C.WATER_Y + 0.06, C.POOL_Z + 1.4]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.52, 0.16, 12, 28]} />
        <meshStandardMaterial color="#ff7d9a" roughness={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.05, 8, 20]} />
        <meshStandardMaterial color="#ffe2c4" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── The sign, the gate and the courtyard fittings ──────────────────────────

function NeonSign({ a }: { a: Assets }) {
  const neonRef = useRef<MeshBasicMaterial | null>(null);
  const light = useRef<PointLight | null>(null);
  useFrame((state) => {
    if (FREEZE) return;
    const t = state.clock.getElapsedTime();
    // A tired tube: mostly steady, with an occasional stutter.
    const stutter = Math.sin(t * 27.3) > 0.995 ? 0.55 : 1;
    const flicker = (0.96 + 0.04 * Math.sin(t * 2.3)) * stutter;
    if (neonRef.current) neonRef.current.color.setScalar(1.9 * flicker);
    if (light.current) light.current.intensity = 9 * flicker;
  });

  return (
    <group name="neon-sign" position={[C.SIGN_X, 0, C.SIGN_Z]}>
      <mesh position={[0, C.SIGN_POLE_H / 2, -0.4]} material={a.mats.chrome} castShadow>
        <cylinderGeometry args={[0.12, 0.17, C.SIGN_POLE_H, 10]} />
      </mesh>
      <mesh position={[0, 2.2, -0.4]} material={a.mats.dark}>
        <boxGeometry args={[0.5, 0.35, 0.35]} />
      </mesh>
      {/* The board, facing the courtyard (and a dark back). */}
      <mesh position={[0, 8.0, 0.06]} material={a.mats.board} castShadow>
        <planeGeometry args={[6.4, 3.2]} />
      </mesh>
      <mesh position={[0, 8.0, -0.06]} material={a.mats.dark}>
        <boxGeometry args={[6.6, 3.35, 0.12]} />
      </mesh>
      {/* Neon border, because a sign this size deserves one. */}
      {[
        [0, 9.66, 6.4, 0.06],
        [0, 6.34, 6.4, 0.06],
        [-3.17, 8.0, 0.06, 3.38],
        [3.17, 8.0, 0.06, 3.38],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.1]} material={a.mats.neonFlat}>
          <boxGeometry args={[w, h, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 5.86, 0.09]} material={a.mats.neon} ref={(m) => { neonRef.current = m ? (m.material as MeshBasicMaterial) : null; }}>
        <planeGeometry args={[4.2, 1.0]} />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 7.2, 1.2]}
        color="#ff3d7f"
        intensity={9}
        distance={24}
        decay={1.8}
      />
      {/* A light from the board itself, so the pole reads at night. */}
      <pointLight position={[0, 8.2, 1.4]} color="#ffb07a" intensity={3.5} distance={13} decay={2} />
    </group>
  );
}

function Gate({ a }: { a: Assets }) {
  const { scene } = useGLTF(MODEL.door);
  const door = useMemo(() => scene.clone(true), [scene]);
  const { spill, gap } = useMemo(() => {
    const g = document.createElement("canvas");
    g.width = 128;
    g.height = 64;
    const ctx = g.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 64);
    ctx.globalCompositeOperation = "destination-in";
    const side = ctx.createLinearGradient(0, 0, 128, 0);
    side.addColorStop(0, "rgba(0,0,0,0)");
    side.addColorStop(0.22, "rgba(0,0,0,1)");
    side.addColorStop(0.78, "rgba(0,0,0,1)");
    side.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 128, 64);
    const map = new CanvasTexture(g);
    map.colorSpace = SRGBColorSpace;
    return {
      spill: new MeshBasicMaterial({
        map,
        color: new Color(1.5, 1.05, 0.8),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
      gap: new MeshBasicMaterial({ color: new Color(2.2, 1.55, 1.05), toneMapped: false }),
    };
  }, []);
  useEffect(
    () => () => {
      spill.map?.dispose();
      spill.dispose();
      gap.dispose();
    },
    [spill, gap],
  );

  const wallX = C.HALF_W - 0.15;
  const northLen = C.GATE_PYLON_Z[0] - 0.3 - -C.HALF_L;
  const southLen = C.HALF_L - (C.GATE_PYLON_Z[1] + 0.3);

  return (
    <group name="gate">
      {/* The east wall, low, with the gate opening between the pylons. */}
      <mesh position={[wallX, 0.575, -C.HALF_L + northLen / 2]} material={a.mats.stucco} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.15, northLen]} />
      </mesh>
      <mesh position={[wallX, 0.575, C.HALF_L - southLen / 2]} material={a.mats.stucco} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.15, southLen]} />
      </mesh>
      {[
        { z: -C.HALF_L + northLen / 2, d: northLen },
        { z: C.HALF_L - southLen / 2, d: southLen },
      ].map((s, i) => (
        <mesh key={i} position={[wallX, 1.18, s.z]} material={a.mats.cream}>
          <boxGeometry args={[0.4, 0.07, s.d]} />
        </mesh>
      ))}
      {/* Pylons and header. */}
      {C.GATE_PYLON_Z.map((z) => (
        <group key={z} position={[wallX, 0, z]}>
          <mesh position={[0, C.GATE_HEIGHT / 2, 0]} material={a.mats.stuccoFlat} castShadow receiveShadow>
            <boxGeometry args={[0.7, C.GATE_HEIGHT, 0.6]} />
          </mesh>
          <mesh position={[0, C.GATE_HEIGHT + 0.04, 0]} material={a.mats.cream}>
            <boxGeometry args={[0.86, 0.1, 0.76]} />
          </mesh>
        </group>
      ))}
      <mesh position={[wallX, 4.6, C.MOTEL_DOOR_Z]} material={a.mats.stuccoFlat} castShadow>
        <boxGeometry args={[0.7, 1.5, C.GATE_PYLON_Z[1] - C.GATE_PYLON_Z[0] + 0.6]} />
      </mesh>
      <mesh position={[wallX, 5.42, C.MOTEL_DOOR_Z]} material={a.mats.cream}>
        <boxGeometry args={[0.9, 0.1, 3.8]} />
      </mesh>
      <mesh position={[wallX - 0.36, 4.9, C.MOTEL_DOOR_Z]} rotation={[0, -Math.PI / 2, 0]} material={a.mats.gateBoard}>
        <planeGeometry args={[2.9, 0.72]} />
      </mesh>
      <mesh position={[wallX + 0.36, 4.9, C.MOTEL_DOOR_Z]} rotation={[0, Math.PI / 2, 0]} material={a.mats.gateBoard}>
        <planeGeometry args={[2.9, 0.72]} />
      </mesh>

      {/* Jambs and transom close the opening around the 1.9 m door. */}
      {[C.MOTEL_DOOR_Z - 1.05, C.MOTEL_DOOR_Z + 1.05].map((z) => (
        <mesh key={z} position={[wallX, 2.2, z]} material={a.mats.stuccoFlat} castShadow>
          <boxGeometry args={[0.7, 4.4, 0.3]} />
        </mesh>
      ))}

      {/* The door itself, warm light under it. */}
      <group position={[C.MOTEL_DOOR_X, 0, C.MOTEL_DOOR_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <primitive object={door} />
        <mesh position={[0, 0.012, 0.32]} material={gap}>
          <planeGeometry args={[1.7, 0.03]} />
        </mesh>
        <mesh position={[0, 0.006, 0.95]} rotation={[-Math.PI / 2, 0, 0]} material={spill}>
          <planeGeometry args={[2.3, 1.4]} />
        </mesh>
        <pointLight position={[0, 0.18, 0.8]} color="#ffb27a" intensity={2.6} distance={4.5} decay={2} />
      </group>
      {/* The plaque, on the wall just inside the gate. */}
      <mesh position={[C.HALF_W - 0.34, 1.55, 8.6]} rotation={[0, -Math.PI / 2, 0]} material={a.mats.golden}>
        <planeGeometry args={[1.1, 0.55]} />
      </mesh>
    </group>
  );
}

// ── Palm trees, loungers and the poolside table ─────────────────────────────

function frondGeometry() {
  const g = new PlaneGeometry(1.15, 3.6, 4, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const w = pos.getX(i);
    const l = pos.getY(i) + 1.8;
    const y = 0.78 * l - 0.22 * l * l + 0.24 * (w / 0.58) ** 2 * (l / 3.6);
    pos.setXYZ(i, l, y, w);
  }
  g.computeVertexNormals();
  return g;
}

function Palm({ x, z, height, seed, a, frond }: {
  x: number;
  z: number;
  height: number;
  seed: number;
  a: Assets;
  frond: BufferGeometry;
}) {
  const crown = useRef<Group>(null);
  const { trunk, top } = useMemo(() => {
    const lean = new Vector3(Math.sin(seed) * 0.55, 0, Math.cos(seed * 1.3) * 0.55);
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0.1, 0),
      new Vector3(lean.x * 0.2, height * 0.45, lean.z * 0.2),
      new Vector3(lean.x * 0.6, height * 0.8, lean.z * 0.6),
      new Vector3(lean.x, height, lean.z),
    ]);
    return { trunk: new TubeGeometry(curve, 14, 0.17, 8, false), top: curve.getPoint(1) };
  }, [height, seed]);
  useEffect(() => () => trunk.dispose(), [trunk]);
  useFrame((state) => {
    if (FREEZE || !crown.current) return;
    const t = state.clock.getElapsedTime();
    crown.current.rotation.z = Math.sin(t * 0.7 + seed) * 0.012;
    crown.current.rotation.x = Math.cos(t * 0.55 + seed) * 0.01;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.04, 0]} material={a.mats.dark} receiveShadow>
        <cylinderGeometry args={[0.52, 0.58, 0.1, 14]} />
      </mesh>
      <mesh position={[0, 0.09, 0]} material={a.mats.sand} receiveShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.06, 14]} />
      </mesh>
      <mesh geometry={trunk} material={a.mats.bark} castShadow />
      <group ref={crown} position={top}>
        {Array.from({ length: 9 }, (_, k) => (
          <mesh
            key={k}
            geometry={frond}
            material={a.mats.frond ?? a.mats.teal}
            rotation={[
              Math.sin(k * 2.7) * 0.2,
              seed + (k / 9) * Math.PI * 2,
              Math.sin(k * 1.7) * 0.24 - 0.04,
            ]}
            castShadow
          />
        ))}
      </group>
      <mesh position={[top.x, top.y, top.z]} material={a.mats.dark}>
        <sphereGeometry args={[0.2, 10, 8]} />
      </mesh>
    </group>
  );
}

function Palms({ a }: { a: Assets }) {
  const frond = useMemo(() => frondGeometry(), []);
  useEffect(() => () => frond.dispose(), [frond]);
  return (
    <group name="palms">
      {C.PALMS.map(([x, z, height], i) => (
        <Palm key={i} x={x} z={z} height={height} seed={i * 1.7 + 0.4} a={a} frond={frond} />
      ))}
      <pointLight position={[14, 1.2, 13]} color="#ffb27a" intensity={2} distance={7} decay={2} />
    </group>
  );
}

function Loungers({ a }: { a: Assets }) {
  return (
    <group name="loungers">
      {C.LOUNGERS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, 0.02 * (i - 1.5), 0]}>
          {/* Frame and legs. */}
          {[-0.29, 0.29].map((dx) => (
            <mesh key={dx} position={[dx, 0.34, 0]} material={a.mats.chrome} castShadow>
              <boxGeometry args={[0.05, 0.05, 1.75]} />
            </mesh>
          ))}
          {[-0.7, 0.7].map((dz) =>
            [-0.29, 0.29].map((dx) => (
              <mesh key={`${dz}${dx}`} position={[dx, 0.17, dz]} material={a.mats.chrome}>
                <boxGeometry args={[0.05, 0.34, 0.05]} />
              </mesh>
            )),
          )}
          {/* Seat and tilted back. */}
          <mesh position={[0, 0.37, 0.05]} material={a.mats.towelPink} castShadow>
            <boxGeometry args={[0.68, 0.07, 1.35]} />
          </mesh>
          <mesh position={[0, 0.6, 0.86]} rotation={[-0.62, 0, 0]} material={a.mats.towelCream} castShadow>
            <boxGeometry args={[0.68, 0.06, 0.7]} />
          </mesh>
          {i === 1 && (
            <>
              <mesh position={[0, 0.44, 0.25]} rotation={[-0.04, 0.18, 0]} material={a.mats.cream}>
                <boxGeometry args={[0.36, 0.06, 0.8]} />
              </mesh>
              <mesh position={[0.05, 0.49, 0.42]} material={a.mats.towelPink}>
                <boxGeometry args={[0.3, 0.08, 0.28]} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {/* Two parasols, furled a little. */}
      {C.UMBRELLAS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.35, 0]} material={a.mats.chrome}>
            <cylinderGeometry args={[0.035, 0.04, 2.7, 8]} />
          </mesh>
          <mesh position={[0, 2.65, 0]} material={a.mats.umbrella} castShadow>
            <coneGeometry args={[1.85, 0.5, 12, 1, true]} />
          </mesh>
          <mesh position={[0, 2.93, 0]} material={a.mats.chrome}>
            <sphereGeometry args={[0.05, 8, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PoolsideTable({ a }: { a: Assets }) {
  const { scene: tableScene } = useGLTF("/models/desk/plastic-table.glb");
  const { scene: chairScene } = useGLTF("/models/chair/platic-chair.glb");
  const clean = (source: typeof tableScene) => {
    const clone = source.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    return clone;
  };
  const table = useMemo(() => clean(tableScene), [tableScene]);
  const chairA = useMemo(() => clean(chairScene), [chairScene]);
  const chairB = useMemo(() => clean(chairScene), [chairScene]);
  const { scene: boomboxScene } = useGLTF("/models/misc/retro-boombox.002.glb");
  const boombox = useMemo(() => clean(boomboxScene), [boomboxScene]);
  const tableRef = useRef<Group>(null);
  const [top, setTop] = useState(0.75);

  useEffect(() => {
    if (!tableRef.current) return;
    const box = new Box3().setFromObject(tableRef.current);
    if (!box.isEmpty()) setTop(box.max.y);
  }, []);

  return (
    <group position={[C.TABLE[0], 0, C.TABLE[1]]} rotation={[0, 0.35, 0]}>
      <primitive ref={tableRef} object={table} />
      <primitive object={boombox} position={[0.3, top, -0.1]} rotation={[0, 0.7, 0]} />
      <primitive object={chairA} position={[-2.1, 0, 1.25]} rotation={[0, 0.7, 0]} />
      <primitive object={chairB} position={[2.1, 0, 1.1]} rotation={[0, -0.6, 0]} />
      {/* Two glasses, left from the afternoon. */}
      {[
        { p: [-0.55, 0.2] as const, h: 0.14 },
        { p: [0.62, 0.42] as const, h: 0.16 },
      ].map((g, i) => (
        <mesh key={i} position={[g.p[0], top + g.h / 2, g.p[1]]} material={a.mats.drinkGlass}>
          <cylinderGeometry args={[0.045, 0.038, g.h, 10, 1, true]} />
        </mesh>
      ))}
      {/* An ashtray with one cigarette in it. */}
      <mesh position={[0.05, top + 0.02, 0.66]} material={a.mats.cream}>
        <cylinderGeometry args={[0.1, 0.085, 0.035, 14]} />
      </mesh>
      <mesh position={[0.05, top + 0.045, 0.66]} rotation={[0, 0.6, Math.PI / 2]} material={a.mats.white}>
        <cylinderGeometry args={[0.012, 0.012, 0.13, 6]} />
      </mesh>
    </group>
  );
}

// ── Vending, ice, phone, cart, signs, ashtray ───────────────────────────────

function Fittings({ a }: { a: Assets }) {
  return (
    <group name="fittings">
      {/* Vending machine, facing into the courtyard. */}
      <group position={[C.VENDING[0], 0, C.VENDING[1]]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.95, 0]} material={a.mats.dark} castShadow>
          <boxGeometry args={[1.5, 1.9, 0.8]} />
        </mesh>
        <mesh position={[0, 0.95, 0.405]} material={a.mats.vending}>
          <planeGeometry args={[1.42, 1.82]} />
        </mesh>
        <mesh position={[0, 2.0, 0.1]} material={a.mats.teal}>
          <boxGeometry args={[1.55, 0.16, 0.9]} />
        </mesh>
        <pointLight position={[0, 1.1, 0.9]} color="#7fe8ff" intensity={2.4} distance={5} decay={2} />
      </group>

      {/* Ice machine. */}
      <group position={[C.ICE[0], 0, C.ICE[1]]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.95, 0]} material={a.mats.white} castShadow>
          <boxGeometry args={[1.15, 1.9, 0.9]} />
        </mesh>
        <mesh position={[0, 2.0, 0]} material={a.mats.teal}>
          <boxGeometry args={[1.2, 0.14, 0.95]} />
        </mesh>
        <mesh position={[0, 0.95, 0.456]} material={a.mats.ice}>
          <planeGeometry args={[0.78, 0.39]} />
        </mesh>
        {[0.52, 1.24].map((y) => (
          <mesh key={y} position={[0, y, 0.46]} material={a.mats.chrome}>
            <boxGeometry args={[0.86, 0.03, 0.02]} />
          </mesh>
        ))}
        <mesh position={[0, 0.32, 0.46]} material={a.mats.dark}>
          <boxGeometry args={[0.7, 0.28, 0.04]} />
        </mesh>
      </group>

      {/* Payphone, on the east wall. */}
      <group position={[C.PAYPHONE[0], 1.35, C.PAYPHONE[1]]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={a.mats.dark} castShadow>
          <boxGeometry args={[0.42, 0.62, 0.22]} />
        </mesh>
        <mesh position={[-0.12, -0.02, 0.14]} rotation={[0.1, 0, 0]} material={a.mats.dark}>
          <boxGeometry args={[0.11, 0.36, 0.08]} />
        </mesh>
        <mesh position={[0.12, 0.02, 0.13]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.035, 0.035, 0.3, 8]} />
        </mesh>
        <mesh position={[0, 0.5, 0.02]} material={a.mats.phone}>
          <planeGeometry args={[0.34, 0.17]} />
        </mesh>
        {/* The cord, going nowhere. */}
        <mesh position={[0, -0.4, 0.16]} rotation={[0, 0, 0.2]} material={a.mats.frame}>
          <torusGeometry args={[0.16, 0.012, 6, 18, Math.PI]} />
        </mesh>
      </group>

      {/* The maid's cart, parked under the balcony and forgotten. */}
      <group position={[C.MAID_CART[0], 0, C.MAID_CART[1]]} rotation={[0, 0.2, 0]}>
        <mesh position={[0, 0.82, 0]} material={a.mats.dark} castShadow>
          <boxGeometry args={[1.15, 0.08, 0.7]} />
        </mesh>
        <mesh position={[0, 0.4, 0]} material={a.mats.chrome}>
          <boxGeometry args={[1.05, 0.04, 0.62]} />
        </mesh>
        {[-0.48, 0.48].map((dx) =>
          [-0.28, 0.28].map((dz) => (
            <mesh key={`${dx}${dz}`} position={[dx, 0.4, dz]} material={a.mats.chrome}>
              <boxGeometry args={[0.04, 0.8, 0.04]} />
            </mesh>
          )),
        )}
        {[-0.3, 0.05, 0.4].map((dz, i) => (
          <mesh key={dz} position={[0, 0.53, dz]} rotation={[0, 0, Math.PI / 2]} material={i % 2 ? a.mats.towelCream : a.mats.towelPink}>
            <cylinderGeometry args={[0.11, 0.11, 0.8, 12]} />
          </mesh>
        ))}
        {[-0.35, 0.2].map((dx) => (
          <mesh key={dx} position={[dx, 0.92, 0.18]} material={a.mats.teal}>
            <boxGeometry args={[0.16, 0.24, 0.16]} />
          </mesh>
        ))}
      </group>

      {/* Pool rules on a post. */}
      <group position={[C.POOL_SIGN[0], 0, C.POOL_SIGN[1]]}>
        <mesh position={[0, 0.72, -0.09]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.035, 0.035, 1.44, 8]} />
        </mesh>
        <mesh position={[0, 1.32, 0.03]} material={a.mats.poolRules} castShadow>
          <planeGeometry args={[0.86, 0.64]} />
        </mesh>
        <mesh position={[0, 1.32, 0.0]} material={a.mats.dark}>
          <boxGeometry args={[0.94, 0.72, 0.03]} />
        </mesh>
      </group>

      {/* An ashtray on a stand, still holding the afternoon. */}
      <group position={[C.ASHTRAY[0], 0, C.ASHTRAY[1]]}>
        <mesh position={[0, 0.34, 0]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.04, 0.06, 0.68, 8]} />
        </mesh>
        <mesh position={[0, 0.7, 0]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.3, 0.26, 0.12, 14]} />
        </mesh>
        <mesh position={[0, 0.755, 0]} material={a.mats.sand}>
          <cylinderGeometry args={[0.27, 0.27, 0.02, 14]} />
        </mesh>
        {[0, 1.9, 3.6].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.13, 0.775, Math.sin(ang) * 0.13]}
            rotation={[0, ang, Math.PI / 2]}
            material={a.mats.cream}>
            <cylinderGeometry args={[0.014, 0.014, 0.14, 6]} />
          </mesh>
        ))}
      </group>

      {/* "ICE" light spilling from the machine. Kept dim so the white
          cabinet does not blow out into a vertical band. */}
      <pointLight position={[C.ICE[0] - 1.25, 1.15, C.ICE[1]]} color="#bff4ff" intensity={0.55} distance={3} decay={2} />
    </group>
  );
}

function Venus() {
  const venus = useFittedModel(MODEL.venus, 2.05);
  return (
    <group position={[C.VENUS[0], 0, C.VENUS[1]]}>
      <mesh position={[0, C.VENUS_PLINTH_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.35, C.VENUS_PLINTH_H, 1.35]} />
        <meshStandardMaterial color="#d8c3b8" roughness={0.8} />
      </mesh>
      <Fitted model={venus} position={[0, C.VENUS_PLINTH_H, 0]} rotation={[0, 0.9, 0]} />
    </group>
  );
}

// ── Preloads ───────────────────────────────────────────────────────────────

useGLTF.preload(MODEL.door);
useGLTF.preload(MODEL.helios);
useGLTF.preload(MODEL.venus);
useGLTF.preload("/models/desk/plastic-table.glb");
useGLTF.preload("/models/chair/platic-chair.glb");
useGLTF.preload("/models/misc/retro-boombox.002.glb");
