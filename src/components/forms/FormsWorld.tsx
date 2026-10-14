import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import { N8AOPostPass } from "n8ao";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  BackSide,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Texture,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import DoorTrigger from "../DoorTrigger";
import {
  BOOMBOX_CENTER_X,
  BOOMBOX_CENTER_Z,
  DistanceVolume,
} from "../MusicPlayer";
import {
  COLUMN_POSITIONS,
  FLOOR_DEPTH,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  FRAME_THICKNESS,
  PEDESTAL_CENTER_X,
  PEDESTAL_CENTER_Z,
  PEDESTAL_DEPTH,
  PEDESTAL_HEIGHT,
  PEDESTAL_WIDTH,
  POOL_CENTER_X,
  POOL_CENTER_Z,
  POOL_DEPTH,
  POOL_RECESS,
  POOL_WIDTH,
  SUN_AZIMUTH,
  SUN_ELEVATION,
} from "../island/constants";
import { FORMS_DOORS } from "../levels";
import { markWorldReady } from "../worldStore";
import { clayClone, makeEdges, makeLabelTexture } from "./clay";
import { CAMERA_GIZMO_Z, REFERENCE_X, REFERENCE_Z } from "./constants";

// The forms: the island before anyone dressed it. Plato's prisoners, if they
// ever got out, were meant to find the Forms, the perfect originals that
// everything else is a copy of. Behind the grey doors there is the original
// of the island: its blockout. The same platform, pool, pedestal and columns,
// as untextured primitives in grey clay with their edges drawn in, floating
// over an endless white ground grid. Every prop is a clay proxy, everything
// is labelled the way a modelling viewport labels things, and it's lit by a
// plain overhead light at noon, because the golden hour is out on loan. The
// sun is there, low on the horizon where the island keeps it: a grey UV
// sphere, lit from above like everything else. Nobody deleted the default
// cube. On a plinth stands the reference, the only real thing here: a
// scanned marble bust, beside a chrome ball, a grey ball and a colour chart.
// The doors out lead everywhere else.

const HDRI_URL = "/textures/forms/cyclorama_hard_light_1k.hdr";
const BUST_URL = "/models/forms/marble_bust_01.glb";

const POOL_MIN_X = POOL_CENTER_X - POOL_WIDTH / 2;
const POOL_MAX_X = POOL_CENTER_X + POOL_WIDTH / 2;
const POOL_MIN_Z = POOL_CENTER_Z - POOL_DEPTH / 2;
const POOL_MAX_Z = POOL_CENTER_Z + POOL_DEPTH / 2;
const POOL_FLOOR_TOP = FLOOR_HEIGHT - POOL_RECESS;

const CLAY = "#d3d2ce";
const INK = "#232323";

interface Props {
  active: boolean;
}

export default function FormsWorld({ active }: Props) {
  const hdri = useLoader(HDRLoader, HDRI_URL);
  const kit = useKit(hdri);

  // Everything has loaded by the time this commits (Suspense), so the door
  // fade can end.
  useEffect(() => markWorldReady("forms"), []);

  return (
    <group name="forms-world">
      <Sky />
      <Ground />
      <hemisphereLight intensity={0.75} color="#ffffff" groundColor="#a9a8a2" />
      <directionalLight
        name="forms-key"
        intensity={1.7}
        color="#ffffff"
        position={[9, 60, 14]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={120}
        shadow-camera-left={-31}
        shadow-camera-right={31}
        shadow-camera-top={31}
        shadow-camera-bottom={-31}
        shadow-bias={-0.0008}
        shadow-normalBias={0.08}
      />
      <Platform kit={kit} />
      <DeckGrid />
      <Columns kit={kit} />
      <Pedestal kit={kit} />
      <Statues kit={kit} />
      <Sun kit={kit} />
      <Boombox kit={kit} active={active} />
      <Doors kit={kit} active={active} />
      <DefaultCube kit={kit} />
      <CameraGizmo kit={kit} />
      <KeyLightGizmo kit={kit} />
      <Dimensions kit={kit} />
      <Reference kit={kit} hdri={hdri} />
      <Labels />
    </group>
  );
}

// The forms' post-processing: none of the other worlds' grade (no bloom, no
// chromatic aberration, no grain, no vignette), only ambient occlusion, the
// soft contact shading of an untextured clay render.
//
// The pass comes straight from n8ao rather than through @react-three/
// postprocessing's <N8AO>: that wrapper lives in a module the main bundle
// shares, and using it would pull the whole library into the first load.
export function FormsEffects() {
  const { scene, camera } = useThree();
  const ao = useMemo(() => {
    const pass = new N8AOPostPass(scene, camera);
    Object.assign(pass.configuration, {
      aoRadius: 2.2,
      distanceFalloff: 1,
      intensity: 2.4,
      halfRes: true,
      color: new Color("#000000"),
    });
    pass.setQualityMode("Medium");
    return pass;
  }, [scene, camera]);
  useEffect(() => () => ao.dispose(), [ao]);
  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <primitive object={ao} />
    </EffectComposer>
  );
}

// Shared materials: clay, edge ink and dashed ink.
interface Kit {
  clay: MeshStandardMaterial;
  ink: LineBasicMaterial;
  dashed: LineDashedMaterial;
}

function useKit(hdri: Texture): Kit {
  const kit = useMemo(() => {
    hdri.mapping = EquirectangularReflectionMapping;
    return {
      clay: new MeshStandardMaterial({
        color: CLAY,
        roughness: 0.92,
        metalness: 0,
        envMap: hdri,
        envMapIntensity: 0.35,
      }),
      ink: new LineBasicMaterial({ color: INK }),
      dashed: new LineDashedMaterial({
        color: INK,
        dashSize: 0.5,
        gapSize: 0.35,
      }),
    };
  }, [hdri]);
  useEffect(
    () => () => Object.values(kit).forEach((m: Material) => m.dispose()),
    [kit],
  );
  return kit;
}

// A clay primitive with its edges drawn.
const EDGE_LIFT = 0.012;
function Block({
  kit,
  geometry,
  position,
  rotation,
  threshold = 30,
  receiveShadow = true,
  material,
  name,
}: {
  kit: Kit;
  geometry: BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  threshold?: number;
  // Curved surfaces under a near-vertical light show shadow acne; they can
  // opt out of receiving.
  receiveShadow?: boolean;
  material?: Material;
  name?: string;
}) {
  const edges = useMemo(() => {
    const lines = makeEdges(geometry, kit.ink, threshold);
    // Lines that lie exactly on a face lose the depth test to it at grazing
    // angles; push them a few millimetres out so they always draw.
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new Vector3());
    lines.scale.set(
      (size.x + EDGE_LIFT) / size.x,
      (size.y + EDGE_LIFT) / size.y,
      (size.z + EDGE_LIFT) / size.z,
    );
    return lines;
  }, [geometry, kit, threshold]);
  useEffect(
    () => () => {
      edges.geometry.dispose();
    },
    [edges],
  );
  return (
    <group name={name} position={position} rotation={rotation}>
      <mesh
        geometry={geometry}
        material={material ?? kit.clay}
        castShadow
        receiveShadow={receiveShadow}
      />
      <primitive object={edges} />
    </group>
  );
}

function useDisposable<T extends { dispose(): void }>(
  make: () => T,
  deps: unknown[],
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(make, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

// ---------------------------------------------------------------------------
// Sky and ground

// An even white dome, a touch brighter overhead, the same colour as the fog
// at the horizon so the ground grid melts into it.
function Sky() {
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: new Color("#e9e9e6") },
          uZenith: { value: new Color("#f6f6f4") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          varying vec3 vDir;
          void main() {
            float t = smoothstep(0.0, 0.6, vDir.y);
            gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  const geometry = useDisposable(() => new SphereGeometry(5000, 32, 16), []);
  return (
    <mesh
      name="forms-sky"
      geometry={geometry}
      material={material}
      renderOrder={-1}
    />
  );
}

// A viewport grid, drawn over a surface as a transparent overlay: minor and
// major lines that fade with distance, optionally the world's x axis in red
// and z axis in green, and optionally a rectangular hole (the pool).
interface GridOptions {
  minor: number;
  major: number;
  minorAlpha: number;
  majorAlpha: number;
  axes: boolean;
  // x0, x1, z0, z1 of a hole; empty if x0 > x1.
  hole?: [number, number, number, number];
}

function makeGridMaterial(o: GridOptions) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
    uniforms: {
      uMinorColor: { value: new Color("#9a9a96") },
      uMajorColor: { value: new Color("#6e6e6a") },
      uAxisX: { value: new Color("#d2574f") },
      uAxisZ: { value: new Color("#71a447") },
      uSpacing: { value: [o.minor, o.major] },
      uAlpha: { value: [o.minorAlpha, o.majorAlpha] },
      uAxes: { value: o.axes ? 1 : 0 },
      uHole: { value: o.hole ?? [1, -1, 1, -1] },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uMinorColor;
      uniform vec3 uMajorColor;
      uniform vec3 uAxisX;
      uniform vec3 uAxisZ;
      uniform vec2 uSpacing;
      uniform vec2 uAlpha;
      uniform float uAxes;
      uniform vec4 uHole;
      varying vec3 vWorld;
      float lineAt(vec2 p, float spacing, float width) {
        vec2 g = p / spacing;
        vec2 d = fwidth(g);
        vec2 l = abs(fract(g - 0.5) - 0.5) / d;
        return 1.0 - min(min(l.x, l.y) / width, 1.0);
      }
      float axis(float c, float width) {
        float d = fwidth(c);
        return 1.0 - min(abs(c) / (d * width), 1.0);
      }
      void main() {
        vec2 p = vWorld.xz;
        if (p.x > uHole.x && p.x < uHole.y && p.y > uHole.z && p.y < uHole.w) discard;
        float dist = distance(cameraPosition.xz, p);
        float minor = lineAt(p, uSpacing.x, 1.0) * (1.0 - smoothstep(18.0, 60.0, dist));
        float major = lineAt(p, uSpacing.y, 1.2) * (1.0 - smoothstep(80.0, 380.0, dist));
        vec3 col = uMinorColor;
        float a = minor * uAlpha.x;
        if (major * uAlpha.y > a) { col = uMajorColor; a = major * uAlpha.y; }
        if (uAxes > 0.5) {
          float fade = 1.0 - smoothstep(150.0, 900.0, dist);
          float ax = axis(p.y, 1.6) * fade;
          float az = axis(p.x, 1.6) * fade;
          if (ax > 0.01) { col = mix(col, uAxisX, ax); a = max(a, ax * 0.9); }
          if (az > 0.01) { col = mix(col, uAxisZ, az); a = max(a, az * 0.9); }
        }
        if (a < 0.003) discard;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

// The endless ground: a matte white plane that takes the platform's shadow,
// with a viewport grid drawn over it (1 m and 10 m lines, the x axis in red
// and the z axis in green), fading out into the haze.
function Ground() {
  const ground = useDisposable(
    () => new MeshStandardMaterial({ color: "#c4c4c0", roughness: 1 }),
    [],
  );
  const grid = useDisposable(
    () =>
      makeGridMaterial({
        minor: 1,
        major: 10,
        minorAlpha: 0.35,
        majorAlpha: 0.55,
        axes: true,
      }),
    [],
  );
  const plane = useDisposable(() => new PlaneGeometry(4000, 4000), []);
  return (
    <group name="forms-ground" rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={plane} material={ground} receiveShadow />
      <mesh geometry={plane} material={grid} renderOrder={1} />
    </group>
  );
}

// Where the island lays its tiles, the deck has only a faint layout grid.
function DeckGrid() {
  const grid = useDisposable(
    () =>
      makeGridMaterial({
        minor: 1,
        major: 4,
        minorAlpha: 0.12,
        majorAlpha: 0.26,
        axes: false,
        hole: [POOL_MIN_X, POOL_MAX_X, POOL_MIN_Z, POOL_MAX_Z],
      }),
    [],
  );
  const plane = useDisposable(
    () => new PlaneGeometry(FLOOR_WIDTH, FLOOR_DEPTH),
    [],
  );
  return (
    <mesh
      name="forms-deck-grid"
      geometry={plane}
      material={grid}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_HEIGHT, 0]}
      renderOrder={1}
    />
  );
}

// ---------------------------------------------------------------------------
// The island's blockout

// The platform as five slabs around an empty pool, the way the island builds
// it, with nothing on them.
function Platform({ kit }: { kit: Kit }) {
  const slabs = useMemo(() => {
    const halfW = FLOOR_WIDTH / 2;
    const halfD = FLOOR_DEPTH / 2;
    const y = FLOOR_HEIGHT - FRAME_THICKNESS / 2;
    const t = FRAME_THICKNESS;
    const list: {
      size: [number, number, number];
      at: [number, number, number];
    }[] = [
      {
        size: [FLOOR_WIDTH, t, POOL_MIN_Z + halfD],
        at: [0, y, (-halfD + POOL_MIN_Z) / 2],
      },
      {
        size: [FLOOR_WIDTH, t, halfD - POOL_MAX_Z],
        at: [0, y, (POOL_MAX_Z + halfD) / 2],
      },
      {
        size: [POOL_MIN_X + halfW, t, POOL_DEPTH],
        at: [(-halfW + POOL_MIN_X) / 2, y, POOL_CENTER_Z],
      },
      {
        size: [halfW - POOL_MAX_X, t, POOL_DEPTH],
        at: [(POOL_MAX_X + halfW) / 2, y, POOL_CENTER_Z],
      },
      {
        size: [POOL_WIDTH, t, POOL_DEPTH],
        at: [POOL_CENTER_X, POOL_FLOOR_TOP - t / 2, POOL_CENTER_Z],
      },
    ];
    return list.map((s) => ({
      geometry: new BoxGeometry(...s.size),
      at: s.at,
    }));
  }, []);
  useEffect(() => () => slabs.forEach((s) => s.geometry.dispose()), [slabs]);
  // The basin (the last slab) is a shade darker, so the empty pool reads as a
  // drop from the deck.
  const basin = useDisposable(() => {
    const m = kit.clay.clone();
    m.color.set("#b2b1ac");
    return m;
  }, [kit]);
  return (
    <group name="forms-platform">
      {slabs.map((s, i) => (
        <Block
          key={i}
          kit={kit}
          geometry={s.geometry}
          position={s.at}
          material={i === slabs.length - 1 ? basin : undefined}
        />
      ))}
    </group>
  );
}

// A doric column, reduced to its idea: a square plinth, a plain shaft and a
// square abacus, 7.18 m tall like the island's.
function Columns({ kit }: { kit: Kit }) {
  const parts = useMemo(
    () => ({
      plinth: new BoxGeometry(1.48, 0.32, 1.48),
      shaft: new CylinderGeometry(0.5, 0.56, 6.48, 24, 1),
      abacus: new BoxGeometry(1.4, 0.38, 1.4),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(parts).forEach((g) => g.dispose()),
    [parts],
  );
  return (
    <group name="forms-columns">
      {COLUMN_POSITIONS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <Block kit={kit} geometry={parts.plinth} position={[0, 0.16, 0]} />
          <Block
            kit={kit}
            geometry={parts.shaft}
            position={[0, 0.32 + 3.24, 0]}
            receiveShadow={false}
          />
          <Block
            kit={kit}
            geometry={parts.abacus}
            position={[0, 7.18 - 0.19, 0]}
          />
        </group>
      ))}
    </group>
  );
}

// The pedestal, and on it where the neon sign goes, a default text object
// that says "Text".
function Pedestal({ kit }: { kit: Kit }) {
  const box = useDisposable(
    () => new BoxGeometry(PEDESTAL_WIDTH, PEDESTAL_HEIGHT, PEDESTAL_DEPTH),
    [],
  );
  const text = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3a3a38";
    ctx.font = "400 150px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Text", 256, 136);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return new MeshStandardMaterial({ map, transparent: true, roughness: 0.9 });
  }, []);
  useEffect(
    () => () => {
      text.map?.dispose();
      text.dispose();
    },
    [text],
  );
  const plane = useDisposable(() => new PlaneGeometry(3.2, 1.6), []);
  return (
    <group
      name="forms-pedestal"
      position={[PEDESTAL_CENTER_X, 0, PEDESTAL_CENTER_Z]}>
      <Block
        kit={kit}
        geometry={box}
        position={[0, FLOOR_HEIGHT + PEDESTAL_HEIGHT / 2, 0]}
      />
      <mesh
        geometry={plane}
        material={text}
        position={[0, FLOOR_HEIGHT + 7.6, PEDESTAL_DEPTH / 2 + 0.02]}
      />
    </group>
  );
}

// The two statues as clay proxies: Venus on the pedestal, Helios in the sea,
// sunk to the same depth in the ground grid.
function Statues({ kit }: { kit: Kit }) {
  const venus = useGLTF("/models/statue/woman1_aiSkin1_0.001.glb").scene;
  const helios = useGLTF("/models/statue/helios_vaporwave_bust.glb").scene;
  const clones = useMemo(
    () => ({
      venus: clayClone(venus, kit.clay),
      helios: clayClone(helios, kit.clay),
    }),
    [venus, helios, kit],
  );
  return (
    <group name="forms-statues">
      <primitive
        object={clones.venus}
        position={[
          PEDESTAL_CENTER_X,
          FLOOR_HEIGHT + PEDESTAL_HEIGHT,
          PEDESTAL_CENTER_Z,
        ]}
        scale={3}
      />
      <primitive object={clones.helios} position={[60, 0, -182]} scale={2} />
    </group>
  );
}

// The sun where the island keeps it, low in the south: a UV sphere, its
// segments drawn, lit from above by the noon light like everything else.
const SUN_DISTANCE = 700;
const SUN_RADIUS = 88;
export const SUN_POSITION = (() => {
  const phi = ((90 - SUN_ELEVATION) * Math.PI) / 180;
  const theta = (SUN_AZIMUTH * Math.PI) / 180;
  return new Vector3().setFromSphericalCoords(SUN_DISTANCE, phi, theta);
})();

function Sun({ kit }: { kit: Kit }) {
  const { geometry, material, lines, lineMaterial } = useMemo(() => {
    const geometry = new SphereGeometry(SUN_RADIUS, 24, 16);
    const material = kit.clay.clone();
    material.fog = false;
    const lineMaterial = new LineBasicMaterial({
      color: "#555552",
      fog: false,
    });
    const lines = makeEdges(geometry, lineMaterial, 4);
    return { geometry, material, lines, lineMaterial };
  }, [kit]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      lines.geometry.dispose();
      lineMaterial.dispose();
    },
    [geometry, material, lines, lineMaterial],
  );
  return (
    <group name="forms-sun" position={SUN_POSITION.toArray()}>
      <mesh geometry={geometry} material={material} />
      <primitive object={lines} />
    </group>
  );
}

// The boombox, its table and chair as clay proxies where the island has them.
// The music plays from here, mono and dry.
function Boombox({ kit, active }: { kit: Kit; active: boolean }) {
  const table = useGLTF("/models/desk/plastic-table.glb").scene;
  const boombox = useGLTF("/models/misc/retro-boombox.002.glb").scene;
  const chair = useGLTF("/models/chair/platic-chair.glb").scene;
  const set = useMemo(() => {
    const t = clayClone(table, kit.clay);
    const top = new Box3().setFromObject(t).max.y;
    return {
      table: t,
      top,
      boombox: clayClone(boombox, kit.clay),
      chair: clayClone(chair, kit.clay),
    };
  }, [table, boombox, chair, kit]);
  return (
    <group name="forms-boombox">
      <primitive
        object={set.table}
        position={[BOOMBOX_CENTER_X, FLOOR_HEIGHT, BOOMBOX_CENTER_Z]}
      />
      <primitive
        object={set.boombox}
        position={[BOOMBOX_CENTER_X, FLOOR_HEIGHT + set.top, BOOMBOX_CENTER_Z]}
        rotation={[0, Math.PI, 0]}
      />
      <primitive
        object={set.chair}
        position={[
          BOOMBOX_CENTER_X - 2.4,
          FLOOR_HEIGHT,
          BOOMBOX_CENTER_Z + 1.6,
        ]}
        rotation={[0, Math.PI / 5, 0]}
      />
      <DistanceVolume active={active} />
    </group>
  );
}

// The doors out: clay doors with their edges drawn, one to each world.
function Doors({ kit, active }: { kit: Kit; active: boolean }) {
  const { scene } = useGLTF("/models/door/door.glb");
  const doors = useMemo(
    () =>
      FORMS_DOORS.map((d) => ({
        ...d,
        object: clayClone(scene, kit.clay, kit.ink),
      })),
    [scene, kit],
  );
  useEffect(
    () => () =>
      doors.forEach((d) =>
        d.object.traverse((o) => {
          if (o instanceof LineSegments) o.geometry.dispose();
        }),
      ),
    [doors],
  );
  return (
    <group name="forms-doors">
      {doors.map((d) => (
        <group key={d.to}>
          <primitive
            object={d.object}
            position={[d.x, FLOOR_HEIGHT, d.z]}
            rotation={[0, Math.atan2(d.normal[0], d.normal[1]), 0]}
          />
          <DoorTrigger
            to={d.to}
            x={d.x}
            z={d.z}
            normal={d.normal}
            active={active}
          />
        </group>
      ))}
    </group>
  );
}

// Nobody deleted it. 2 m, at the bottom of the empty pool.
function DefaultCube({ kit }: { kit: Kit }) {
  const box = useDisposable(() => new BoxGeometry(2, 2, 2), []);
  return (
    <Block
      name="forms-cube"
      kit={kit}
      geometry={box}
      position={[POOL_CENTER_X + 2.2, POOL_FLOOR_TOP + 1, POOL_CENTER_Z - 1.4]}
    />
  );
}

function linesGeometry(points: number[]) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  return g;
}

// The camera for the island's opening shot, where the island first puts the
// player: a frustum gizmo at eye height, looking at the sun.
function CameraGizmo({ kit }: { kit: Kit }) {
  const geometry = useDisposable(() => {
    const d = 1.5;
    const w = 0.8;
    const h = 0.45;
    const corners = [
      [-w, -h, -d],
      [w, -h, -d],
      [w, h, -d],
      [-w, h, -d],
    ];
    const p: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      p.push(0, 0, 0, ...a, ...a, ...b);
    }
    // The "up" triangle over the frame.
    p.push(-w * 0.6, h + 0.08, -d, w * 0.6, h + 0.08, -d);
    p.push(w * 0.6, h + 0.08, -d, 0, h + 0.5, -d);
    p.push(0, h + 0.5, -d, -w * 0.6, h + 0.08, -d);
    return linesGeometry(p);
  }, []);
  return (
    <lineSegments
      name="forms-camera"
      geometry={geometry}
      material={kit.ink}
      position={[0, FLOOR_HEIGHT + 1.7, CAMERA_GIZMO_Z]}
    />
  );
}

// The key light, high over the platform: a sun-lamp gizmo with a dashed line
// down along its direction.
const KEY_GIZMO: [number, number, number] = [9 * 0.42, 26, 14 * 0.42];
function KeyLightGizmo({ kit }: { kit: Kit }) {
  const { ring, ray } = useMemo(() => {
    const p: number[] = [];
    const r = 0.7;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      p.push(
        Math.cos(a0) * r,
        0,
        Math.sin(a0) * r,
        Math.cos(a1) * r,
        0,
        Math.sin(a1) * r,
      );
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.push(
        Math.cos(a) * 1.0,
        0,
        Math.sin(a) * 1.0,
        Math.cos(a) * 1.5,
        0,
        Math.sin(a) * 1.5,
      );
    }
    const ring = linesGeometry(p);
    // Toward the origin, the light's target, as far as the platform top.
    const dir = new Vector3(...KEY_GIZMO).negate().normalize();
    const len = (KEY_GIZMO[1] - FLOOR_HEIGHT) / -dir.y;
    const ray = new LineSegments(
      linesGeometry([0, 0, 0, dir.x * len, dir.y * len, dir.z * len]),
      kit.dashed,
    );
    ray.computeLineDistances();
    return { ring, ray };
  }, [kit]);
  useEffect(
    () => () => {
      ring.dispose();
      ray.geometry.dispose();
    },
    [ring, ray],
  );
  return (
    <group name="forms-key-gizmo" position={KEY_GIZMO}>
      <lineSegments geometry={ring} material={kit.ink} />
      <primitive object={ray} />
    </group>
  );
}

// Dimension lines along the platform's south and east edges and up its
// south-east corner.
function Dimensions({ kit }: { kit: Kit }) {
  const geometry = useDisposable(() => {
    const halfW = FLOOR_WIDTH / 2;
    const halfD = FLOOR_DEPTH / 2;
    const y = FLOOR_HEIGHT + 0.02;
    const off = 2;
    const tick = 0.35;
    const p: number[] = [];
    // South: 56 m.
    p.push(-halfW, y, halfD, -halfW, y, halfD + off + tick);
    p.push(halfW, y, halfD, halfW, y, halfD + off + tick);
    p.push(-halfW, y, halfD + off, halfW, y, halfD + off);
    p.push(
      -halfW - tick,
      y,
      halfD + off + tick,
      -halfW + tick,
      y,
      halfD + off - tick,
    );
    p.push(
      halfW - tick,
      y,
      halfD + off + tick,
      halfW + tick,
      y,
      halfD + off - tick,
    );
    // East: 50 m.
    p.push(halfW, y, -halfD, halfW + off + tick, y, -halfD);
    p.push(halfW + off, y, -halfD, halfW + off, y, halfD);
    p.push(
      halfW + off - tick,
      y,
      -halfD - tick,
      halfW + off + tick,
      y,
      -halfD + tick,
    );
    p.push(
      halfW + off - tick,
      y,
      halfD - tick,
      halfW + off + tick,
      y,
      halfD + tick,
    );
    // Height: 5.2 m, from the ground to the deck at the south-east corner.
    const cx = halfW + off;
    const cz = halfD + off;
    p.push(cx, 0, cz, cx, FLOOR_HEIGHT, cz);
    p.push(halfW, FLOOR_HEIGHT, halfD, cx + tick, FLOOR_HEIGHT, cz + tick);
    p.push(cx - tick, 0, cz - tick, cx + tick, 0, cz + tick);
    return linesGeometry(p);
  }, []);
  return (
    <lineSegments
      name="forms-dimensions"
      geometry={geometry}
      material={kit.ink}
    />
  );
}

// The reference: the only real thing here. A scanned marble bust on a clay
// plinth, a chrome ball and a grey ball on a stand, and a colour chart.
const CHART = [
  ["#735244", "#c29682", "#627a9d", "#576c43", "#8580b1", "#67bdaa"],
  ["#d67e2c", "#505ba6", "#c15a63", "#5e3c6c", "#9dbc40", "#e0a32e"],
  ["#383d96", "#469449", "#af363c", "#e7c71f", "#bb5695", "#0885a1"],
  ["#f3f3f2", "#c8c8c8", "#a0a0a0", "#7a7a79", "#555555", "#343434"],
];

function Reference({ kit, hdri }: { kit: Kit; hdri: Texture }) {
  const { scene } = useGLTF(BUST_URL);
  const bust = useMemo(() => {
    const b = scene.clone(true);
    b.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as MeshStandardMaterial;
        mat.envMap = hdri;
        mat.envMapIntensity = 0.9;
      }
    });
    return b;
  }, [scene, hdri]);

  const parts = useMemo(() => {
    const chrome = new MeshStandardMaterial({
      color: "#ffffff",
      metalness: 1,
      roughness: 0.02,
      envMap: hdri,
      envMapIntensity: 1,
    });
    const grey = new MeshStandardMaterial({
      color: "#7f7f7f",
      roughness: 0.85,
      envMap: hdri,
      envMapIntensity: 0.6,
    });
    const black = new MeshStandardMaterial({
      color: "#1d1d1d",
      roughness: 0.6,
    });
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, 384, 256);
    CHART.forEach((row, r) =>
      row.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(10 + i * 62, 10 + r * 60, 54, 54);
      }),
    );
    const chartMap = new CanvasTexture(canvas);
    chartMap.colorSpace = SRGBColorSpace;
    const chart = new MeshBasicMaterial({ map: chartMap, side: DoubleSide });
    return {
      chrome,
      grey,
      black,
      chart,
      ball: new SphereGeometry(0.16, 48, 32),
      pole: new CylinderGeometry(0.018, 0.018, 1.45, 8),
      bar: new BoxGeometry(0.62, 0.03, 0.03),
      base: new CylinderGeometry(0.22, 0.24, 0.04, 16),
      board: new PlaneGeometry(0.9, 0.6),
      plinth: new BoxGeometry(0.75, 1.1, 0.75),
      easel: new BoxGeometry(0.04, 1.3, 0.04),
    };
  }, [hdri]);
  useEffect(
    () => () => {
      parts.chart.map?.dispose();
      Object.values(parts).forEach((p) => p.dispose());
    },
    [parts],
  );

  return (
    <group
      name="forms-reference"
      position={[REFERENCE_X, FLOOR_HEIGHT, REFERENCE_Z]}>
      {/* The bust on its plinth, turned to face the pool. */}
      <Block kit={kit} geometry={parts.plinth} position={[0, 0.55, 0]} />
      <primitive
        object={bust}
        position={[0, 1.1, 0]}
        rotation={[0, -0.5, 0]}
        scale={1.5}
      />
      {/* Chrome and grey balls on a T-stand. */}
      <group position={[1.35, 0, 0.25]} rotation={[0, -0.35, 0]}>
        <mesh
          geometry={parts.base}
          material={parts.black}
          position={[0, 0.02, 0]}
        />
        <mesh
          geometry={parts.pole}
          material={parts.black}
          position={[0, 0.745, 0]}
          castShadow
        />
        <mesh
          geometry={parts.bar}
          material={parts.black}
          position={[0, 1.46, 0]}
        />
        <mesh
          geometry={parts.ball}
          material={parts.chrome}
          position={[-0.29, 1.62, 0]}
          castShadow
        />
        <mesh
          geometry={parts.ball}
          material={parts.grey}
          position={[0.29, 1.62, 0]}
          castShadow
        />
      </group>
      {/* The colour chart on a little easel. */}
      <group position={[-1.3, 0, 0.3]} rotation={[0, 0.45, 0]}>
        <mesh
          geometry={parts.easel}
          material={parts.black}
          position={[0, 0.65, -0.12]}
          rotation={[-0.12, 0, 0]}
        />
        <mesh
          geometry={parts.board}
          material={parts.chart}
          position={[0, 1.05, 0]}
          rotation={[-0.12, 0, 0]}
          castShadow
        />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Labels

// Object names, as a modelling viewport shows them: small, constant-size text
// at the end of a short leader line, drawn over everything. Each fades in
// only within its own distance, so they turn up as you walk up to things.
interface LabelSpec {
  text: string;
  at: [number, number, number];
  // Leader line length, straight up from the anchor.
  lift?: number;
  // Fully visible within near, gone beyond far.
  near?: number;
  far?: number;
}

const LABELS: LabelSpec[] = (() => {
  const y = FLOOR_HEIGHT;
  const list: LabelSpec[] = [
    {
      text: "sun",
      at: SUN_POSITION.toArray() as [number, number, number],
      lift: 110,
      near: 2000,
      far: 3000,
    },
    { text: "helios", at: [60, 30, -182], lift: 18, near: 260, far: 400 },
    { text: "sea", at: [-36, 0, 6], lift: 2.5, near: 40, far: 60 },
    {
      text: "venus",
      at: [PEDESTAL_CENTER_X, y + PEDESTAL_HEIGHT + 5.5, PEDESTAL_CENTER_Z],
      lift: 2,
      near: 45,
      far: 60,
    },
    {
      text: "pedestal",
      at: [
        PEDESTAL_CENTER_X + PEDESTAL_WIDTH / 2,
        y + 3,
        PEDESTAL_CENTER_Z + PEDESTAL_DEPTH / 2,
      ],
      lift: 1,
      near: 14,
      far: 20,
    },
    {
      text: "pool (empty)",
      at: [POOL_MIN_X + 2, y, POOL_MAX_Z],
      lift: 1.2,
      near: 16,
      far: 24,
    },
    {
      text: "Cube",
      at: [POOL_CENTER_X + 2.2, POOL_FLOOR_TOP + 2, POOL_CENTER_Z - 1.4],
      lift: 1.5,
      near: 22,
      far: 32,
    },
    {
      text: "camera",
      at: [0, y + 1.7, CAMERA_GIZMO_Z],
      lift: 0.9,
      near: 14,
      far: 20,
    },
    {
      text: "key light (noon, 6500 K)",
      at: KEY_GIZMO,
      lift: 1.5,
      near: 40,
      far: 55,
    },
    {
      text: "boombox",
      at: [BOOMBOX_CENTER_X, y + 1.6, BOOMBOX_CENTER_Z],
      lift: 1,
      near: 14,
      far: 20,
    },
    {
      text: "reference (real)",
      at: [REFERENCE_X, y + 1.75, REFERENCE_Z],
      lift: 0.7,
      near: 10,
      far: 15,
    },
    {
      text: "chrome ball",
      at: [REFERENCE_X + 1.1, y + 1.8, REFERENCE_Z + 0.35],
      lift: 0.5,
      near: 7,
      far: 10,
    },
    {
      text: "grey ball",
      at: [REFERENCE_X + 1.6, y + 1.8, REFERENCE_Z + 0.05],
      lift: 0.28,
      near: 7,
      far: 10,
    },
    {
      text: "colour chart",
      at: [REFERENCE_X - 1.3, y + 1.4, REFERENCE_Z + 0.3],
      lift: 0.5,
      near: 7,
      far: 10,
    },
    {
      text: "56.000 m",
      at: [0, y, FLOOR_DEPTH / 2 + 2],
      lift: 0.4,
      near: 18,
      far: 26,
    },
    {
      text: "50.000 m",
      at: [FLOOR_WIDTH / 2 + 2, y, 0],
      lift: 0.4,
      near: 18,
      far: 26,
    },
    {
      text: "5.200 m",
      at: [FLOOR_WIDTH / 2 + 2, y / 2, FLOOR_DEPTH / 2 + 2],
      lift: 0.2,
      near: 18,
      far: 26,
    },
  ];
  COLUMN_POSITIONS.forEach(([x, , z], i) =>
    list.push({
      text: `column.${String(i).padStart(3, "0")}`,
      at: [x, y + 7.2, z],
      lift: 0.8,
      near: 12,
      far: 18,
    }),
  );
  for (const d of FORMS_DOORS) {
    list.push({
      text: `door → ${d.to}`,
      at: [d.x, y + 4.1, d.z],
      lift: 0.6,
      near: 22,
      far: 30,
    });
  }
  return list;
})();

// Labels are constant-size on screen: this is their height as a fraction of
// the view at distance 1 (see SpriteMaterial.sizeAttenuation).
const LABEL_HEIGHT = 0.032;

function Labels() {
  const camera = useThree((s) => s.camera);
  const items = useMemo(
    () =>
      LABELS.map((spec) => {
        const { texture, aspect } = makeLabelTexture(spec.text);
        const spriteMat = new SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: false,
          fog: false,
        });
        const sprite = new Sprite(spriteMat);
        sprite.center.set(0, 0);
        sprite.scale.set(LABEL_HEIGHT * aspect, LABEL_HEIGHT, 1);
        sprite.renderOrder = 20;
        const lift = spec.lift ?? 1;
        const [x, y, z] = spec.at;
        sprite.position.set(x, y + lift, z);
        const lineMat = new LineBasicMaterial({
          color: INK,
          transparent: true,
          fog: false,
        });
        const line = new LineSegments(
          linesGeometry([x, y, z, x, y + lift, z]),
          lineMat,
        );
        const group = new Group();
        group.add(sprite, line);
        return { spec, group, spriteMat, lineMat, line, texture };
      }),
    [],
  );
  useEffect(
    () => () =>
      items.forEach((i) => {
        i.texture.dispose();
        i.spriteMat.dispose();
        i.lineMat.dispose();
        i.line.geometry.dispose();
      }),
    [items],
  );
  const anchor = useRef(new Vector3());
  useFrame(() => {
    for (const item of items) {
      const { near = 20, far = 30, at } = item.spec;
      const d = anchor.current.set(...at).distanceTo(camera.position);
      const o = d <= near ? 1 : d >= far ? 0 : 1 - (d - near) / (far - near);
      item.group.visible = o > 0;
      item.spriteMat.opacity = o;
      item.lineMat.opacity = o * 0.8;
    }
  });
  return (
    <group name="forms-labels">
      {items.map((i, k) => (
        <primitive key={k} object={i.group} />
      ))}
    </group>
  );
}

useGLTF.preload(BUST_URL);
