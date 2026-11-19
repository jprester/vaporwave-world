import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  TubeGeometry,
  Vector3,
  type Material,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import DoorTrigger from "../DoorTrigger";
import { markWorldReady } from "../worldStore";
import { TILE_TEXTURE_PATHS } from "../materials";
import { MODEL, useFittedModel } from "../stockroom/models";
import { FittedPrimitive, Tag } from "../stockroom/Stock";
import { makeBackSoonTexture } from "../stockroom/textures";
import { makeBarkTexture, makeFrondTexture } from "../mall/textures";
import { makeCopingMarkTexture } from "../motel/textures";
import * as C from "./constants";
import {
  LOCKER_COLS,
  LOCKER_ROWS,
  OPEN_LOCKER,
  makeFootprintsTexture,
  makeHalfSunTexture,
  makeLidoNeonTexture,
  makeLockerTexture,
  makeMosaicTexture,
  makePaceClockTexture,
  makePlaqueTexture,
  makePriceBoardTexture,
  makeRulesTexture,
  makeShadowTexture,
  makeSkyTexture,
  makeStripeTexture,
} from "./textures";

// QA hook: ?freeze=1 holds the water, the floats and the drip still, so the
// flicker-diff tool can isolate geometry.
const FREEZE = new URLSearchParams(window.location.search).has("freeze");

// The Lido: the poolrooms behind the motel's pool plant. Plato's prisoner,
// once out of the cave, can't look at things yet, only at their
// reflections in water. Here the reflections are made: white tile and
// pastel bands, a ceiling that is a sky, and at the end of a long pool, a
// sun that is only half there. The water supplies the other half.

type Vec3 = [number, number, number];

interface Props {
  active: boolean;
}

export default function LidoWorld({ active }: Props) {
  const a = useAssets();
  useEffect(() => {
    markWorldReady("lido");
  }, []);

  return (
    <group name="lido-world">
      <ambientLight intensity={0.2} color="#fff1f8" />
      <hemisphereLight intensity={0.62} color="#fff2fa" groundColor="#bfeae6" />
      <directionalLight position={[3, 12, 6]} intensity={0.5} color="#fff0f4" />
      <Shell a={a} />
      <Sky a={a} />
      <Pool a={a} />
      <HalfSun a={a} />
      <Floats a={a} />
      <Entrance a={a} />
      <HallFittings a={a} />
      <EastWing a={a} />
      <WestWing a={a} />
      <Terrace a={a} />
      <Slide a={a} />
      <Palms a={a} />
      <LidoDoor />
      <DoorTrigger
        to="motel"
        x={C.DOOR_X}
        z={C.DOOR_Z}
        normal={[0, -1]}
        active={active}
      />
    </group>
  );
}

// ── Tiles ─────────────────────────────────────────────────────────────────
//
// Every tiled surface uses the island's own tile set, with UVs taken from
// world position, so the grout runs on unbroken from one piece to the next
// and round every corner. Pieces are merged per tint.

const TINTS = {
  white: "#f7f5fa",
  floor: "#eef6f6",
  pink: "#ffb3d1",
  lilac: "#cbb8ff",
  aqua: "#8fe6df",
  pool: "#63d3d8",
  wade: "#c9f1ed",
  ceiling: "#f6f4fa",
} as const;
type Tint = keyof typeof TINTS;

// Planar UVs from world position along the face's dominant axis, in tiles.
function worldUV(g: BufferGeometry) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ax >= ay && ax >= az) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else if (ay >= az) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u / C.TILE;
    uv[i * 2 + 1] = v / C.TILE;
  }
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  return g;
}

class TileBuilder {
  parts = new Map<Tint, BufferGeometry[]>();

  add(tint: Tint, g: BufferGeometry) {
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    flat.clearGroups();
    for (const name of Object.keys(flat.attributes)) {
      if (name !== "position" && name !== "normal") flat.deleteAttribute(name);
    }
    worldUV(flat);
    const list = this.parts.get(tint) ?? [];
    list.push(flat);
    this.parts.set(tint, list);
  }

  box(tint: Tint, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    const g = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(tint, g);
  }

  build() {
    const out: [Tint, BufferGeometry][] = [];
    for (const [tint, list] of this.parts) {
      out.push([tint, mergeGeometries(list)!]);
      for (const g of list) g.dispose();
    }
    return out;
  }
}

interface Arch {
  c: number; // centre along the wall
  half: number;
  apex: number; // height of the crown above the wall's base floor (y = 0)
}

// A wall with round-headed arches cut up from its foot, and optional holes,
// extruded WALL_T thick about its centre line. Along z, the wall stands at
// x = `at`; along x, at z = `at`. Coordinates are world coordinates.
function archWall(
  along: "x" | "z",
  at: number,
  from: number,
  to: number,
  y0: number,
  y1: number,
  arches: Arch[],
  holes: [number, number][][] = [],
) {
  // Shape space: u along the wall, v = y. Along z the shape's u is -z, so
  // the extrusion keeps its winding (see the matrix below).
  const toU = (w: number) => (along === "z" ? -w : w);
  const [u0, u1] = [toU(from), toU(to)].sort((p, q) => p - q);
  const sorted = [...arches].sort((p, q) => toU(p.c) - toU(q.c));
  const shape = new Shape();
  shape.moveTo(u0, y0);
  for (const { c, half, apex } of sorted) {
    const uc = toU(c);
    const spring = apex - half;
    shape.lineTo(uc - half, y0);
    shape.lineTo(uc - half, spring);
    shape.absarc(uc, spring, half, Math.PI, 0, true);
    shape.lineTo(uc + half, y0);
  }
  shape.lineTo(u1, y0);
  shape.lineTo(u1, y1);
  shape.lineTo(u0, y1);
  shape.closePath();
  for (const hole of holes) {
    const p = new Path();
    hole.forEach(([w, y], i) => (i ? p.lineTo(toU(w), y) : p.moveTo(toU(w), y)));
    p.closePath();
    shape.holes.push(p);
  }
  const g = new ExtrudeGeometry(shape, {
    depth: C.WALL_T,
    bevelEnabled: false,
    curveSegments: 20,
  });
  const m = new Matrix4();
  if (along === "z") {
    // shape (u, v, w) → world (w + at - T/2, v, -u)
    m.set(0, 0, 1, at - C.WALL_T / 2, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  } else {
    m.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, at - C.WALL_T / 2, 0, 0, 0, 1);
  }
  g.applyMatrix4(m);
  g.computeVertexNormals();
  return g;
}

// Spans [a, b] minus the cuts.
function spans(a: number, b: number, cuts: [number, number][]) {
  const out: [number, number][] = [];
  let from = a;
  for (const [c0, c1] of [...cuts].sort((p, q) => p[0] - q[0])) {
    if (c0 > from) out.push([from, Math.min(c0, b)]);
    from = Math.max(from, c1);
  }
  if (b > from) out.push([from, b]);
  return out;
}

const PROUD = 0.015;
const archCuts = (cs: number[]) =>
  cs.map((c) => [c - C.ARCH_HALF, c + C.ARCH_HALF] as [number, number]);

// ── Shared materials ──────────────────────────────────────────────────────

function std(params: ConstructorParameters<typeof MeshStandardMaterial>[0]) {
  return new MeshStandardMaterial(params);
}

function basic(map: Texture | null, color: Color | string, extra: Partial<MeshBasicMaterial> = {}) {
  const m = new MeshBasicMaterial({ map, color, toneMapped: false });
  Object.assign(m, extra);
  return m;
}

// A horizontal band of a texture: v from `from`, `size` high (v = 0 is the
// bottom of the picture).
function crop(t: Texture, from: number, size: number) {
  t.repeat.set(1, size);
  t.offset.set(0, from);
  return t;
}

function useAssets() {
  const [colorMap, normalMap, roughMap] = useLoader(TextureLoader, TILE_TEXTURE_PATHS);
  const gl = useThree((s) => s.gl);
  const assets = useMemo(() => {
    // The island's tile maps are cached and shared; take clones (they share
    // the images) and set them up for world-space UVs.
    const prep = (t: Texture, srgb: boolean) => {
      const c = t.clone();
      c.wrapS = c.wrapT = RepeatWrapping;
      c.repeat.set(1, 1);
      c.anisotropy = 8;
      if (srgb) c.colorSpace = SRGBColorSpace;
      c.needsUpdate = true;
      return c;
    };
    const tileMaps = {
      map: prep(colorMap, true),
      normalMap: prep(normalMap, false),
      roughnessMap: prep(roughMap, false),
    };
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();

    const tile = Object.fromEntries(
      (Object.keys(TINTS) as Tint[]).map((k) => [
        k,
        new MeshPhysicalMaterial({
          ...tileMaps,
          color: TINTS[k],
          roughness: 1,
          clearcoat: k === "floor" || k === "wade" ? 0.35 : 0.7,
          // Ceilings face away from every light; let them glow a little, as
          // if the whole room were lit from the water.
          emissive: k === "ceiling" ? "#6a6474" : "#000000",
          clearcoatRoughness: 0.32,
          envMap: env,
          envMapIntensity: 0.24,
        }),
      ]),
    ) as Record<Tint, MeshPhysicalMaterial>;

    const textures = {
      sun: makeHalfSunTexture(),
      mosaic: makeMosaicTexture(),
      sky: makeSkyTexture(),
      rules: makeRulesTexture(),
      price: makePriceBoardTexture(),
      shadowTop: crop(makeShadowTexture(), 0.45, 0.55),
      shadowLegs: crop(makeShadowTexture(), 0, 0.42),
      lockers: makeLockerTexture(),
      pace: makePaceClockTexture(),
      footprints: makeFootprintsTexture(),
      ring: makeStripeTexture(["#ff5c9a", "#ffffff", "#ff5c9a", "#ffffff", "#ff5c9a", "#ffffff", "#ff5c9a", "#ffffff"], true),
      ball: makeStripeTexture(["#ff6fae", "#ffffff", "#5fd6d0", "#ffffff", "#c6a6ff", "#ffffff"], true),
      neon: makeLidoNeonTexture(),
      back: makeBackSoonTexture(),
      frond: makeFrondTexture(),
      bark: makeBarkTexture(),
      depthShallow: makeCopingMarkTexture("0.3 M"),
      depthDeep: makeCopingMarkTexture("DEEPER IN REFLECTION"),
      sunPlaque: makePlaqueTexture(
        ["SUN, SETTING (SPARE)", "HALVED, FOR REFLECTION USE", "THE OTHER HALF IS SUPPLIED BY THE WATER", "ON LOAN FROM STOCK · DO NOT STARE"],
        { w: 640, h: 300, bg: "#2a2232", fg: "#ffe6a8", accent: "#ff7cb4", size: 40 },
      ),
      mirrorPlaque: makePlaqueTexture(["PLEASE CHECK YOUR", "REFLECTION BEFORE LEAVING"], { size: 40 }),
      depthSign: makePlaqueTexture(["DEPTH 0.2 M", "WADING ONLY"], { size: 52, accent: "#ff7cb4" }),
      footbath: makePlaqueTexture(["THE POOL", "PLEASE USE THE FOOTBATH"], { w: 1024, h: 256, size: 70, accent: "#ff7cb4" }),
      doorSign: makePlaqueTexture(["TO THE MOTEL", "VIA THE POOL PLANT · STAFF"], { size: 46 }),
      slide: makePlaqueTexture(["SLIDE CLOSED", "NO LIFEGUARD ON DUTY"], { bg: "#ff5c8e", fg: "#ffffff", accent: "#ffffff", size: 50 }),
      terrace: makePlaqueTexture(["SUN TERRACE", "THE SUN IS IN THE POOL · SEE WINDOW"], { w: 768, h: 256, size: 64, accent: "#ff7cb4" }),
      filter: makePlaqueTexture(["FILTER ROOM", "REFLECTIONS · AUTHORISED STAFF ONLY"], { w: 640, h: 256, size: 54 }),
      plunge: makePlaqueTexture(["PLUNGE POOL", "COLD · REFLECTIONS NOT GUARANTEED"], { w: 640, h: 256, size: 54 }),
    };

    const mats = {
      ...tile,
      chrome: std({ color: "#e4ecf0", metalness: 0.85, roughness: 0.18, envMap: env, envMapIntensity: 1 }),
      plastic: std({ color: "#fbf8f6", roughness: 0.4, envMap: env, envMapIntensity: 0.3 }),
      pinkPlastic: std({ color: "#ff8fbd", roughness: 0.35, envMap: env, envMapIntensity: 0.3 }),
      aquaPlastic: std({ color: "#5fd6d0", roughness: 0.35, envMap: env, envMapIntensity: 0.3 }),
      lilacPlastic: std({ color: "#c6a6ff", roughness: 0.35, envMap: env, envMapIntensity: 0.3 }),
      dark: std({ color: "#2a2232", roughness: 0.8 }),
      grate: std({ color: "#9aa6ac", metalness: 0.6, roughness: 0.4 }),
      towel: std({ color: "#ff9cc4", roughness: 0.95 }),
      towelWhite: std({ color: "#f6f2ee", roughness: 0.95 }),
      glass: std({
        color: "#d8fbff",
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        envMap: env,
        envMapIntensity: 1,
      }),
      slideTube: new MeshPhysicalMaterial({
        color: "#ff6fae",
        roughness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        transmission: 0,
        transparent: true,
        opacity: 0.86,
        side: DoubleSide,
        envMap: env,
        envMapIntensity: 0.7,
      }),
      sun: basic(textures.sun, new Color(2.0, 1.9, 1.9), {
        alphaTest: 0.5,
        fog: false,
        side: DoubleSide,
      } as Partial<MeshBasicMaterial>),
      sunBack: std({ color: "#5b4a5a", roughness: 0.7, metalness: 0.3 }),
      mosaic: std({
        map: textures.mosaic,
        roughness: 0.35,
        emissive: "#ffffff",
        emissiveMap: textures.mosaic,
        emissiveIntensity: 0.38,
        envMap: env,
        envMapIntensity: 0.25,
      }),
      sky: basic(textures.sky, new Color(1.12, 1.12, 1.12), { fog: false } as Partial<MeshBasicMaterial>),
      neon: basic(textures.neon, new Color(2.4, 2.4, 2.4), {
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: false,
      } as Partial<MeshBasicMaterial>),
      panel: basic(null, new Color(1.5, 1.5, 1.55)),
      rules: std({ map: textures.rules, roughness: 0.4 }),
      price: std({
        map: textures.price,
        roughness: 0.6,
        emissive: "#ffffff",
        emissiveMap: textures.price,
        emissiveIntensity: 0.25,
      }),
      shadowTop: std({ map: textures.shadowTop, alphaTest: 0.5, roughness: 1, side: DoubleSide }),
      shadowLegs: std({ map: textures.shadowLegs, alphaTest: 0.5, roughness: 1, side: DoubleSide }),
      lockers: std({ map: textures.lockers, roughness: 0.45, envMap: env, envMapIntensity: 0.3 }),
      lockerSide: std({ color: "#e9e4ea", roughness: 0.5 }),
      pace: std({ map: textures.pace, roughness: 0.4 }),
      footprints: std({
        map: textures.footprints,
        transparent: true,
        depthWrite: false,
        roughness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      ring: std({ map: textures.ring, roughness: 0.3 }),
      ball: std({ map: textures.ball, roughness: 0.3 }),
      back: std({ map: textures.back, roughness: 0.8, side: DoubleSide }),
      frond: std({ map: textures.frond, alphaTest: 0.5, side: DoubleSide, roughness: 0.38, color: "#d6ecc0" }),
      bark: std({ map: textures.bark, roughness: 0.75 }),
      depthShallow: std({
        map: textures.depthShallow,
        alphaTest: 0.35,
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      depthDeep: std({
        map: textures.depthDeep,
        alphaTest: 0.35,
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      sunPlaque: std({ map: textures.sunPlaque, roughness: 0.4, metalness: 0.2 }),
      mirrorPlaque: std({ map: textures.mirrorPlaque, roughness: 0.4 }),
      depthSign: std({ map: textures.depthSign, roughness: 0.4 }),
      footbath: std({ map: textures.footbath, roughness: 0.4 }),
      doorSign: std({ map: textures.doorSign, roughness: 0.4 }),
      slide: std({ map: textures.slide, roughness: 0.5, side: DoubleSide }),
      terrace: std({ map: textures.terrace, roughness: 0.4 }),
      filter: std({ map: textures.filter, roughness: 0.4 }),
      plunge: std({ map: textures.plunge, roughness: 0.4 }),
      kioskLight: basic(null, new Color(1.9, 1.6, 1.3)),
      dimMirror: std({ color: "#b9cdd2", metalness: 0.9, roughness: 0.22, envMap: env, envMapIntensity: 1 }),
    };

    const wade = makeWaterMaterial({ color: [0.55, 0.92, 0.9], alpha: 0.32 });
    const caustics = makeCausticsMaterial();

    const all: { dispose: () => void }[] = [
      ...Object.values(tileMaps),
      env,
      ...Object.values(textures),
      ...Object.values(mats),
      wade,
      caustics,
    ];
    return { mats, wade, caustics, all };
  }, [colorMap, normalMap, roughMap, gl]);

  useEffect(
    () => () => {
      for (const item of assets.all) item.dispose();
    },
    [assets],
  );

  useFrame((_, delta) => {
    if (FREEZE) return;
    assets.wade.uniforms.uTime.value += delta;
    assets.caustics.uniforms.uTime.value += delta;
  });

  return assets;
}

type Assets = ReturnType<typeof useAssets>;

// ── Water and caustics ───────────────────────────────────────────────────

// The usual tiling caustic: a few iterations of warped sines, sharpened.
const CAUSTIC_GLSL = /* glsl */ `
  float caustic(vec2 uv, float time) {
    vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 4; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return clamp(pow(abs(c), 8.0), 0.0, 1.0);
  }
`;

const WORLD_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// Shallow water: see-through, aqua, caustics dancing on the tiles under it,
// and a pink sky in it at a glancing angle.
function makeWaterMaterial({ color, alpha }: { color: Vec3; alpha: number }) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(...color) },
      uAlpha: { value: alpha },
    },
    vertexShader: WORLD_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uAlpha;
      varying vec3 vWorld;
      ${CAUSTIC_GLSL}
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
        float c = caustic(vWorld.xz / 3.2, uTime * 0.55);
        vec3 col = uColor + vec3(0.75, 1.0, 1.0) * c * 0.65;
        vec3 sky = vec3(1.25, 0.92, 1.12);
        col = mix(col, sky, fres * 0.75);
        float a = mix(uAlpha + c * 0.25, 0.88, fres);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

// Light through moving water, added onto the pool's floor.
function makeCausticsMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: WORLD_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      ${CAUSTIC_GLSL}
      void main() {
        float c = caustic(vWorld.xz / 2.8, uTime * 0.5);
        gl_FragColor = vec4(vec3(0.75, 1.0, 1.0) * c * 0.8, 1.0);
      }
    `,
  });
}

// ── The shell: floors, walls, ceilings, bands ─────────────────────────────

function useShellGeometry() {
  const parts = useMemo(() => {
    const b = new TileBuilder();
    const Y0 = -0.35; // under every floor slab and wall foot
    const H = C.HALL_X;

    // Dry floors: a slab under every flat patch at y = 0. The east walkway
    // stops a centimetre short of the wall's outer face, so its edge (the
    // step down into the wing, inside the arches) never shares the wall's
    // plane.
    for (const p of C.FLOORS) {
      if (p.y2 !== undefined || p.y !== 0) continue;
      const x1 = p.x1 === C.HALL_OUT ? p.x1 - 0.01 : p.x1;
      b.box("floor", p.x0, x1, Y0, 0, p.z0, p.z1);
    }
    // The flooded floors: the east wing and the footbath.
    b.box("wade", C.HALL_OUT - 0.02, C.HALF_W, Y0 - 0.06, C.WADE_Y, C.NORTH_Z, C.HALL_S);
    b.box("wade", -C.FOOTBATH_X, C.FOOTBATH_X, Y0 - 0.06, C.WADE_Y, C.FOOTBATH_Z0, C.FOOTBATH_Z1);

    // The hall's side walls, with their arches (and on the west, the
    // terrace window with a notch where the slide goes through).
    const eastArches = C.EAST_ARCHES.map((c) => ({ c, half: C.ARCH_HALF, apex: C.ARCH_H }));
    const westArches = C.WEST_ARCHES.map((c) => ({ c, half: C.ARCH_HALF, apex: C.ARCH_H }));
    const winBottom = C.TERRACE_Y + C.PARAPET_H;
    const window: [number, number][] = [
      [C.WINDOW_Z0, winBottom],
      [C.SLIDE_Z - 0.75, winBottom],
      [C.SLIDE_Z - 0.75, C.TERRACE_Y + 0.02],
      [C.SLIDE_Z + 0.75, C.TERRACE_Y + 0.02],
      [C.SLIDE_Z + 0.75, winBottom],
      [C.WINDOW_Z1, winBottom],
      [C.WINDOW_Z1, C.WINDOW_TOP],
      [C.WINDOW_Z0, C.WINDOW_TOP],
    ];
    b.add("white", archWall("z", H, C.NORTH_Z - 0.2, C.HALL_S + 0.2, Y0, C.HALL_H, eastArches));
    b.add("white", archWall("z", -H, C.NORTH_Z - 0.2, C.HALL_S + 0.2, Y0, C.HALL_H, westArches, [window]));
    // The arch wall between the entrance and the hall: one wide round arch.
    b.add(
      "white",
      archWall("x", C.HALL_S, -C.HALL_IN - 0.05, C.HALL_IN + 0.05, Y0, C.HALL_H, [
        { c: 0, half: C.ENTRY_ARCH_HALF, apex: C.ENTRY_ARCH_H },
      ]),
    );
    // Entrance: side walls and the south wall with the door.
    for (const s of [-1, 1]) {
      b.box("white", s > 0 ? C.HALL_IN : -C.HALL_OUT, s > 0 ? C.HALL_OUT : -C.HALL_IN, Y0, C.ENTRANCE_H, C.HALL_S, C.SOUTH_Z + 0.2);
    }
    b.box("white", -C.HALL_OUT, C.HALL_OUT, Y0, C.ENTRANCE_H, C.SOUTH_Z, C.SOUTH_Z + C.WALL_T);
    // North wall, all the way across, down to the pool's floor.
    b.box("white", -C.HALF_W - C.WALL_T, C.HALF_W + C.WALL_T, C.POOL_BOTTOM - 0.1, C.HALL_H, C.NORTH_Z - C.WALL_T, C.NORTH_Z);
    // The wings' outer walls and their south ends.
    b.box("white", C.HALF_W, C.HALF_W + C.WALL_T, Y0, C.WING_H, C.NORTH_Z - 0.2, C.HALL_S + 0.2);
    b.box("white", -C.HALF_W - C.WALL_T, -C.HALF_W, Y0, C.WEST_H, C.NORTH_Z - 0.2, C.HALL_S + 0.2);
    b.box("white", C.HALL_X, C.HALF_W + 0.2, Y0, C.WING_H, C.HALL_S - C.WALL_T / 2, C.HALL_S + C.WALL_T / 2);
    b.box("white", -C.HALF_W - 0.2, -C.HALL_X, Y0, C.WEST_H, C.HALL_S - C.WALL_T / 2, C.HALL_S + C.WALL_T / 2);

    // Ceilings. The hall's has the sky let into it: a ring round the
    // lightbox, and the lightbox's sides.
    b.box("ceiling", -C.HALL_OUT, C.HALL_OUT, C.ENTRANCE_H, C.ENTRANCE_H + 0.2, C.HALL_S, C.SOUTH_Z + 0.2);
    const top = C.HALL_H;
    b.box("ceiling", -C.HALL_IN, C.HALL_IN, top, top + 0.2, C.NORTH_Z, C.SKY_Z0);
    b.box("ceiling", -C.HALL_IN, C.HALL_IN, top, top + 0.2, C.SKY_Z1, C.HALL_S);
    for (const s of [-1, 1]) {
      const [x0, x1] = s > 0 ? [C.SKY_X, C.HALL_IN] : [-C.HALL_IN, -C.SKY_X];
      b.box("ceiling", x0, x1, top, top + 0.2, C.SKY_Z0, C.SKY_Z1);
      const [w0, w1] = s > 0 ? [C.SKY_X, C.SKY_X + 0.1] : [-C.SKY_X - 0.1, -C.SKY_X];
      b.box("white", w0, w1, top, top + C.SKY_RECESS + 0.05, C.SKY_Z0 - 0.1, C.SKY_Z1 + 0.1);
    }
    b.box("white", -C.SKY_X, C.SKY_X, top, top + C.SKY_RECESS + 0.05, C.SKY_Z0 - 0.1, C.SKY_Z0);
    b.box("white", -C.SKY_X, C.SKY_X, top, top + C.SKY_RECESS + 0.05, C.SKY_Z1, C.SKY_Z1 + 0.1);
    b.box("ceiling", C.HALL_OUT - 0.05, C.HALF_W, C.WING_H, C.WING_H + 0.2, C.NORTH_Z, C.HALL_S);
    b.box("ceiling", -C.HALF_W, -C.HALL_OUT + 0.05, C.WEST_H, C.WEST_H + 0.2, C.NORTH_Z, C.HALL_S);

    // The terrace: solid, tiled like the floors, and the stair up to it.
    b.box("floor", -C.HALF_W, -C.HALL_OUT, Y0, C.TERRACE_Y, C.NORTH_Z, C.TERRACE_Z1);
    const run = (C.STAIR_Z1 - C.STAIR_Z0) / C.STAIR_STEPS;
    const rise = C.TERRACE_Y / C.STAIR_STEPS;
    for (let k = 1; k <= C.STAIR_STEPS; k++) {
      // Each tread straddles the ramp the player walks on.
      const zFront = Math.min(C.STAIR_Z1, C.STAIR_Z1 - (k - 0.5) * run);
      const zBack = Math.max(C.STAIR_Z0, C.STAIR_Z1 - (k + 0.5) * run);
      b.box("floor", C.STAIR_X0, C.STAIR_X1, Y0, k * rise, zBack, zFront);
    }

    // The pool: floor and walls in pool tile, the walls stopping just under
    // the coping so their tops never meet the deck's.
    b.box("pool", -C.POOL_X, C.POOL_X, C.POOL_BOTTOM - 0.1, C.POOL_BOTTOM, C.POOL_Z0, C.POOL_Z1);
    for (const s of [-1, 1]) {
      const [x0, x1] = s > 0 ? [C.POOL_X - 0.05, C.POOL_X + 0.3] : [-C.POOL_X - 0.3, -C.POOL_X + 0.05];
      b.box("pool", x0, x1, C.POOL_BOTTOM - 0.05, -0.005, C.POOL_Z0, C.POOL_Z1);
    }
    b.box("pool", -C.POOL_X, C.POOL_X, C.POOL_BOTTOM - 0.05, -0.005, C.POOL_Z1 - 0.05, C.POOL_Z1 + 0.3);
    // The coping, pink, a little proud of the deck.
    const cw = C.COPING_W;
    b.box("pink", C.POOL_X - 0.15, C.POOL_X + cw - 0.15, 0, 0.05, C.POOL_Z0, C.POOL_Z1 + cw - 0.15);
    b.box("pink", -C.POOL_X - cw + 0.15, -C.POOL_X + 0.15, 0, 0.05, C.POOL_Z0, C.POOL_Z1 + cw - 0.15);
    b.box("pink", -C.POOL_X + 0.15, C.POOL_X - 0.15, 0, 0.05, C.POOL_Z1 - 0.15, C.POOL_Z1 + cw - 0.15);
    // The footbath's lip.
    b.box("aqua", -C.FOOTBATH_X - 0.2, C.FOOTBATH_X + 0.2, 0, 0.03, C.FOOTBATH_Z0 - 0.2, C.FOOTBATH_Z0);

    // Bands of coloured tile, 1.5 cm proud, broken by every opening.
    const bandZ = (x: number, dir: 1 | -1, z0: number, z1: number, y0: number, y1: number, tint: Tint, cuts: [number, number][] = []) => {
      for (const [a0, a1] of spans(z0, z1, cuts)) {
        const [x0, x1] = dir > 0 ? [x, x + PROUD] : [x - PROUD, x];
        b.box(tint, x0, x1, y0, y1, a0, a1);
      }
    };
    const bandX = (z: number, dir: 1 | -1, x0: number, x1: number, y0: number, y1: number, tint: Tint, cuts: [number, number][] = []) => {
      for (const [a0, a1] of spans(x0, x1, cuts)) {
        const [z0, z1] = dir > 0 ? [z, z + PROUD] : [z - PROUD, z];
        b.box(tint, a0, a1, y0, y1, z0, z1);
      }
    };
    const eastCuts = archCuts(C.EAST_ARCHES);
    const westCuts = archCuts(C.WEST_ARCHES);
    // In the hall: a pink dado line, an aqua skirting, a lilac band high up.
    for (const [x, dir, cuts] of [
      [C.HALL_IN, -1, eastCuts],
      [-C.HALL_IN, 1, westCuts],
    ] as const) {
      bandZ(x, dir, C.NORTH_Z, C.HALL_S - 0.2, 0, 0.3, "aqua", cuts);
      bandZ(x, dir, C.NORTH_Z, C.HALL_S - 0.2, 1.2, 1.5, "pink", cuts);
      bandZ(x, dir, C.NORTH_Z, C.HALL_S - 0.2, 7.9, 8.3, "lilac");
    }
    bandX(C.HALL_S - C.WALL_T / 2, -1, -C.HALL_IN, C.HALL_IN, 1.2, 1.5, "pink", [[-C.ENTRY_ARCH_HALF - 0.3, C.ENTRY_ARCH_HALF + 0.3]]);
    bandX(C.HALL_S - C.WALL_T / 2, -1, -C.HALL_IN, C.HALL_IN, 7.9, 8.3, "lilac");
    bandX(C.HALL_S - C.WALL_T / 2, -1, -C.HALL_IN, C.HALL_IN, 0, 0.3, "aqua", [[-C.FOOTBATH_X - 0.2, C.FOOTBATH_X + 0.2]]);
    // In the entrance.
    for (const [x, dir] of [
      [C.HALL_IN, -1],
      [-C.HALL_IN, 1],
    ] as const) {
      bandZ(x, dir, C.HALL_S + C.WALL_T / 2, C.SOUTH_Z, 1.2, 1.5, "pink");
      bandZ(x, dir, C.HALL_S + C.WALL_T / 2, C.SOUTH_Z, 0, 0.3, "aqua");
    }
    bandX(C.SOUTH_Z, -1, -C.HALL_IN, C.HALL_IN, 1.2, 1.5, "pink", [[-1.4, 1.4]]);
    bandX(C.HALL_S + C.WALL_T / 2, 1, -C.HALL_IN, C.HALL_IN, 1.2, 1.5, "pink", [[-C.ENTRY_ARCH_HALF - 0.3, C.ENTRY_ARCH_HALF + 0.3]]);
    // In the east wing, on every wall, just above the water.
    bandZ(C.HALL_OUT, 1, C.NORTH_Z, C.HALL_S - 0.2, 0.9, 1.2, "pink", eastCuts);
    bandZ(C.HALL_OUT, 1, C.NORTH_Z, C.HALL_S - 0.2, 3.3, 3.6, "lilac", eastCuts);
    bandZ(C.HALF_W, -1, C.NORTH_Z, C.HALL_S - 0.2, 0.9, 1.2, "pink");
    bandZ(C.HALF_W, -1, C.NORTH_Z, C.HALL_S - 0.2, 3.3, 3.6, "lilac");
    bandX(C.HALL_S - C.WALL_T / 2, -1, C.HALL_OUT, C.HALF_W, 0.9, 1.2, "pink");
    bandX(C.HALL_S - C.WALL_T / 2, -1, C.HALL_OUT, C.HALF_W, 3.3, 3.6, "lilac");
    // In the west wing, and along the terrace's face.
    bandZ(-C.HALF_W, 1, C.TERRACE_Z1, C.HALL_S - 0.2, 1.2, 1.5, "pink");
    bandZ(-C.HALL_OUT, -1, C.STAIR_Z1, C.HALL_S - 0.2, 1.2, 1.5, "pink", westCuts);
    bandZ(-C.HALF_W, 1, C.NORTH_Z, C.HALL_S - 0.2, 7.3, 7.7, "lilac");
    bandZ(-C.HALF_W, 1, C.NORTH_Z, C.TERRACE_Z1, C.TERRACE_Y + 1.2, C.TERRACE_Y + 1.5, "pink");
    bandX(C.HALL_S - C.WALL_T / 2, -1, -C.HALF_W, -C.HALL_OUT, 1.2, 1.5, "pink");
    bandX(C.TERRACE_Z1, 1, -C.HALF_W, C.STAIR_X0, 2.9, 3.2, "aqua");
    bandX(C.TERRACE_Z1, 1, -C.HALF_W, C.STAIR_X0, 1.2, 1.5, "pink", [[-18.6, -16.4]]);
    bandX(C.NORTH_Z, 1, -C.HALF_W, -C.HALL_OUT, C.TERRACE_Y + 1.2, C.TERRACE_Y + 1.5, "pink");

    // The east wing's piers, each with two bands round it.
    for (const px of C.PIER_XS) {
      for (const pz of C.PIER_ZS) {
        const h = C.PIER / 2;
        b.box("white", px - h, px + h, C.WADE_Y - 0.05, C.WING_H, pz - h, pz + h);
        const r = h + PROUD;
        b.box("pink", px - r, px + r, 0.9, 1.2, pz - r, pz + r);
        b.box("lilac", px - r, px + r, 3.3, 3.6, pz - r, pz + r);
      }
    }
    return b.build();
  }, []);
  useEffect(() => () => parts.forEach(([, g]) => g.dispose()), [parts]);
  return parts;
}

function Shell({ a }: { a: Assets }) {
  const parts = useShellGeometry();
  return (
    <group name="shell">
      {parts.map(([tint, g]) => (
        <mesh key={tint} geometry={g} material={a.mats[tint]} />
      ))}
      {/* The wade water over the east wing and in the footbath. */}
      <mesh
        position={[(C.HALL_OUT + C.HALF_W) / 2, C.WADE_WATER_Y, (C.NORTH_Z + C.HALL_S) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={a.wade}
      >
        <planeGeometry args={[C.HALF_W - C.HALL_OUT + 0.02, C.HALL_S - C.NORTH_Z]} />
      </mesh>
      <mesh
        position={[0, C.WADE_WATER_Y, (C.FOOTBATH_Z0 + C.FOOTBATH_Z1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={a.wade}
      >
        <planeGeometry args={[C.FOOTBATH_X * 2, C.FOOTBATH_Z1 - C.FOOTBATH_Z0]} />
      </mesh>
    </group>
  );
}

// ── The sky, the sun, the mural ──────────────────────────────────────────

function Sky({ a }: { a: Assets }) {
  const w = C.SKY_X * 2;
  const l = C.SKY_Z1 - C.SKY_Z0;
  return (
    <group name="sky">
      {/* Facing down; turned so the warm end of the picture is north. */}
      <mesh
        position={[0, C.HALL_H + C.SKY_RECESS, (C.SKY_Z0 + C.SKY_Z1) / 2]}
        rotation={[Math.PI / 2, 0, Math.PI]}
        material={a.mats.sky}
      >
        <planeGeometry args={[w, l]} />
      </mesh>
      {/* The hall's light comes from the sky, cool at the door, warm at the
          sun: soft, from high in the lightbox. */}
      <pointLight position={[0, 9.6, 10]} color="#dcd8ff" intensity={16} distance={30} decay={1.2} />
      <pointLight position={[0, 9.6, -10]} color="#ffd8ea" intensity={16} distance={30} decay={1.2} />
    </group>
  );
}

function HalfSun({ a }: { a: Assets }) {
  const R = C.SUN_R;
  return (
    <group name="half-sun">
      <mesh position={[0, C.WATER_Y + R / 2, C.SUN_Z]} material={a.mats.sun}>
        <planeGeometry args={[R * 2, R]} />
      </mesh>
      {/* Its stand: two legs down into the pool behind it, and a bar. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * R * 0.55, (C.POOL_BOTTOM + C.WATER_Y + R * 0.6) / 2, C.SUN_Z - 0.3]} material={a.mats.sunBack}>
          <boxGeometry args={[0.12, R * 0.6 - C.POOL_BOTTOM + C.WATER_Y, 0.12]} />
        </mesh>
      ))}
      <mesh position={[0, C.WATER_Y + R * 0.6, C.SUN_Z - 0.3]} material={a.mats.sunBack}>
        <boxGeometry args={[R * 1.2, 0.1, 0.1]} />
      </mesh>
      {/* The mural, set into the north wall behind it. */}
      <mesh
        position={[0, (C.POOL_BOTTOM + C.HALL_H) / 2, C.NORTH_Z + PROUD]}
        material={a.mats.mosaic}
      >
        <planeGeometry args={[C.HALL_IN * 2, C.HALL_H - C.POOL_BOTTOM]} />
      </mesh>
      <mesh position={[0, 7.25, C.NORTH_Z + 0.06]} material={a.mats.neon}>
        <planeGeometry args={[10, 2.5]} />
      </mesh>
      <pointLight position={[0, 2.6, C.SUN_Z + 3]} color="#ff8f8a" intensity={45} distance={40} decay={1.25} />
      <pointLight position={[0, 6.8, C.NORTH_Z + 1.5]} color="#ff6fbf" intensity={14} distance={14} decay={1.6} />
      {/* The plaque, on a stand at the end of the east walkway. */}
      <group position={[C.SUN_PLAQUE[0], 0, C.SUN_PLAQUE[1]]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 0.5, 0]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.03, 0.03, 1, 10]} />
        </mesh>
        <mesh position={[0, 1.08, 0]} rotation={[-0.5, 0, 0]} material={a.mats.sunPlaque}>
          <boxGeometry args={[0.64, 0.3, 0.02]} />
        </mesh>
      </group>
    </group>
  );
}

// ── The pool ─────────────────────────────────────────────────────────────

function Pool({ a }: { a: Assets }) {
  const normals = useLoader(TextureLoader, "/textures/waternormals.jpg");
  const water = useMemo(() => {
    const n = normals.clone();
    n.wrapS = n.wrapT = RepeatWrapping;
    n.needsUpdate = true;
    const w = new Water(
      new PlaneGeometry(C.POOL_X * 2, C.POOL_Z1 - C.POOL_Z0),
      {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: n,
        sunDirection: new Vector3(0, 0.25, -1).normalize(),
        sunColor: 0xffc49a,
        waterColor: 0x3fb4bc,
        distortionScale: 0.35,
        fog: true,
      },
    );
    w.rotation.x = -Math.PI / 2;
    w.position.set(0, C.WATER_Y, (C.POOL_Z0 + C.POOL_Z1) / 2);
    w.material.uniforms.size.value = 3.5;
    w.material.transparent = true;
    w.material.depthWrite = false;
    // Clear looking down, a mirror at a glance (as on the island).
    w.material.fragmentShader = w.material.fragmentShader.replace(
      "gl_FragColor = vec4( outgoingLight, alpha );",
      "gl_FragColor = vec4( outgoingLight, mix( 0.22, 0.96, smoothstep( 0.25, 0.95, reflectance ) ) );",
    );
    return { w, n };
  }, [normals]);
  useEffect(
    () => () => {
      water.w.geometry.dispose();
      water.w.material.dispose();
      water.n.dispose();
    },
    [water],
  );
  useFrame((_, delta) => {
    if (FREEZE) return;
    water.w.material.uniforms.time.value += delta * 0.25;
  });

  return (
    <group name="pool">
      <primitive object={water.w} />
      <mesh
        position={[0, C.POOL_BOTTOM + 0.012, (C.POOL_Z0 + C.POOL_Z1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={a.caustics}
      >
        <planeGeometry args={[C.POOL_X * 2, C.POOL_Z1 - C.POOL_Z0]} />
      </mesh>
      {/* Depth marks on the coping: the same at both ends, and one more. */}
      {(
        [
          [1, 8, a.mats.depthShallow, 0.7, 0.35],
          [-1, 8, a.mats.depthShallow, 0.7, 0.35],
          [1, -20, a.mats.depthDeep, 1.6, 0.4],
          [-1, -20, a.mats.depthDeep, 1.6, 0.4],
        ] as [number, number, Material, number, number][]
      ).map(([s, z, m, w, h], i) => (
        // Lying on the coping, reading from the walkway beside it.
        <mesh
          key={i}
          position={[s * (C.POOL_X + 0.08), 0.052, z]}
          rotation={[-Math.PI / 2, 0, (s * Math.PI) / 2]}
          material={m}
        >
          <planeGeometry args={[w, h]} />
        </mesh>
      ))}
      {/* Chrome steps down into the shallow end, both sides. */}
      {[-1, 1].map((s) => (
        <PoolLadder key={s} a={a} x={s * (C.POOL_X - 0.05)} z={8.5} facing={-s as 1 | -1} />
      ))}
    </group>
  );
}

// A pool ladder hooked over the edge at x, its rails curving out over the
// coping and down into the water on the -facing side.
function PoolLadder({ a, x, z, facing, floorY = 0, depth = 1.0 }: {
  a: Assets;
  x: number;
  z: number;
  facing: 1 | -1;
  floorY?: number;
  depth?: number;
}) {
  const rail = useMemo(() => {
    const pts = [
      new Vector3(-facing * 0.35, floorY, 0),
      new Vector3(-facing * 0.32, floorY + 0.75, 0),
      new Vector3(-facing * 0.05, floorY + 0.95, 0),
      new Vector3(facing * 0.18, floorY + 0.6, 0),
      new Vector3(facing * 0.2, floorY - depth, 0),
    ];
    return new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.025, 8, false);
  }, [facing, floorY, depth]);
  useEffect(() => () => rail.dispose(), [rail]);
  const steps = Math.max(1, Math.round(depth / 0.3));
  return (
    <group position={[x, 0, z]}>
      {[-0.25, 0.25].map((dz) => (
        <mesh key={dz} geometry={rail} position={[0, 0, dz]} material={a.mats.chrome} />
      ))}
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[facing * 0.2, floorY - 0.18 - i * 0.3, 0]} material={a.mats.chrome}>
          <boxGeometry args={[0.08, 0.025, 0.5]} />
        </mesh>
      ))}
    </group>
  );
}

// A flamingo and a rubber ring, adrift on the long pool, and a beach ball in
// the flooded wing.
function Floats({ a }: { a: Assets }) {
  const flamingo = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const ball = useRef<Mesh>(null);
  const neck = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(0.45, 0.15, 0),
          new Vector3(0.62, 0.6, 0),
          new Vector3(0.48, 1.05, 0),
          new Vector3(0.6, 1.28, 0),
        ]),
        20,
        0.085,
        10,
        false,
      ),
    [],
  );
  useEffect(() => () => neck.dispose(), [neck]);
  useFrame((state) => {
    const t = FREEZE ? 0 : state.clock.getElapsedTime();
    if (flamingo.current) {
      flamingo.current.position.set(
        2.3 + Math.sin(t * 0.05) * 0.8,
        C.WATER_Y + 0.05 + Math.sin(t * 0.9) * 0.015,
        -4 + Math.sin(t * 0.031) * 9,
      );
      flamingo.current.rotation.y = 0.8 + t * 0.02;
    }
    if (ring.current) {
      ring.current.position.set(-2.4 + Math.sin(t * 0.04 + 2) * 0.6, C.WATER_Y + 0.03 + Math.sin(t * 1.1) * 0.012, 3 + Math.sin(t * 0.027 + 1) * 4);
      ring.current.rotation.set(Math.sin(t * 0.7) * 0.03, t * 0.03, 0);
    }
    if (ball.current) {
      ball.current.position.set(15.8, C.WADE_WATER_Y + 0.22 + Math.sin(t * 1.3) * 0.01, -5.8);
      ball.current.rotation.set(0.4, t * 0.05, 0.2);
    }
  });
  return (
    <group name="floats">
      <group ref={flamingo}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={a.mats.pinkPlastic}>
          <torusGeometry args={[0.55, 0.24, 16, 40]} />
        </mesh>
        <mesh geometry={neck} material={a.mats.pinkPlastic} />
        <mesh position={[0.63, 1.3, 0]} material={a.mats.pinkPlastic}>
          <sphereGeometry args={[0.15, 18, 14]} />
        </mesh>
        <mesh position={[0.83, 1.25, 0]} rotation={[0, 0, -Math.PI / 2 - 0.4]} material={a.mats.plastic}>
          <coneGeometry args={[0.06, 0.22, 12]} />
        </mesh>
        <mesh position={[0.92, 1.21, 0]} rotation={[0, 0, -Math.PI / 2 - 0.4]} material={a.mats.dark}>
          <coneGeometry args={[0.035, 0.07, 10]} />
        </mesh>
        <mesh position={[-0.62, 0.32, 0]} rotation={[0, 0, 0.7]} material={a.mats.pinkPlastic}>
          <coneGeometry args={[0.16, 0.42, 12]} />
        </mesh>
      </group>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={a.mats.ring}>
          <torusGeometry args={[0.45, 0.16, 14, 36]} />
        </mesh>
      </group>
      <mesh ref={ball} material={a.mats.ball}>
        <sphereGeometry args={[0.3, 24, 16]} />
      </mesh>
    </group>
  );
}

// ── The entrance: the door, the kiosk, the lockers ───────────────────────

function LidoDoor() {
  const model = useFittedModel(MODEL.door, 4);
  // The motel's sunset, coming under the door.
  const { gap, spill } = useMemo(() => {
    const g = document.createElement("canvas");
    g.width = 128;
    g.height = 64;
    const ctx = g.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.3)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 64);
    ctx.globalCompositeOperation = "destination-in";
    const side = ctx.createLinearGradient(0, 0, 128, 0);
    side.addColorStop(0, "rgba(0,0,0,0)");
    side.addColorStop(0.2, "rgba(0,0,0,1)");
    side.addColorStop(0.8, "rgba(0,0,0,1)");
    side.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 128, 64);
    const map = new CanvasTexture(g);
    return {
      gap: basic(null, new Color(2.6, 1.4, 0.7)),
      spill: basic(map, new Color(1.8, 1.0, 0.55), { transparent: true, depthWrite: false } as Partial<MeshBasicMaterial>),
    };
  }, []);
  useEffect(
    () => () => {
      gap.dispose();
      spill.map?.dispose();
      spill.dispose();
    },
    [gap, spill],
  );
  return (
    <group name="lido-door" position={[C.DOOR_X, 0, C.DOOR_Z]} rotation={[0, Math.PI, 0]}>
      <FittedPrimitive model={model} position={[0, 0, 0]} />
      <mesh position={[0, 0.012, 0.29]} material={gap}>
        <planeGeometry args={[1.6, 0.024]} />
      </mesh>
      <mesh position={[0, 0.004, 0.95]} rotation={[-Math.PI / 2, 0, 0]} material={spill}>
        <planeGeometry args={[2.2, 1.3]} />
      </mesh>
    </group>
  );
}

function Entrance({ a }: { a: Assets }) {
  const chair = useFittedModel("/models/chair/platic-chair.glb", 0.85);
  const { KIOSK_X0: x0, KIOSK_X1: x1, KIOSK_Z0: z0, KIOSK_Z1: z1 } = C;
  const kh = 2.7; // kiosk height
  const winZ0 = z0 + 0.4;
  const winZ1 = z0 + 2.4;
  const lockerW = (C.LOCKER_Z1 - C.LOCKER_Z0) / LOCKER_COLS;
  const lockerH = C.LOCKER_H / LOCKER_ROWS;
  const openCol = Math.floor((OPEN_LOCKER - 1) / LOCKER_ROWS);
  const openRow = (OPEN_LOCKER - 1) % LOCKER_ROWS;
  const openZ0 = C.LOCKER_Z0 + openCol * lockerW;
  const openY1 = C.LOCKER_H - openRow * lockerH;
  const lx = C.LOCKER_X - C.LOCKER_D;
  return (
    <group name="entrance">
      <pointLight position={[0, 3.9, 27]} color="#fff0f6" intensity={7} distance={14} decay={1.4} />
      {/* The sign over the arch, and by the door. */}
      <mesh position={[0, 4.2, C.HALL_S + C.WALL_T / 2 + PROUD]} material={a.mats.footbath}>
        <planeGeometry args={[2.6, 0.65]} />
      </mesh>
      <mesh position={[2.1, 1.75, C.SOUTH_Z - PROUD]} rotation={[0, Math.PI, 0]} material={a.mats.doorSign}>
        <planeGeometry args={[0.8, 0.4]} />
      </mesh>

      {/* The kiosk: a pink-tiled box with a window onto the way in. */}
      <group name="kiosk">
        <mesh position={[(x0 + x1) / 2, kh / 2, z0 + 0.06]} material={a.mats.pink}>
          <boxGeometry args={[x1 - x0, kh, 0.12]} />
        </mesh>
        <mesh position={[(x0 + x1) / 2, kh / 2, z1 - 0.06]} material={a.mats.pink}>
          <boxGeometry args={[x1 - x0, kh, 0.12]} />
        </mesh>
        <mesh position={[(x0 + x1) / 2, kh + 0.06, (z0 + z1) / 2]} material={a.mats.white}>
          <boxGeometry args={[x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1]} />
        </mesh>
        {/* Front wall, round the window. */}
        <mesh position={[x1 - 0.06, 0.5, (z0 + z1) / 2]} material={a.mats.pink}>
          <boxGeometry args={[0.12, 1, z1 - z0 - 0.02]} />
        </mesh>
        <mesh position={[x1 - 0.06, (2.2 + kh) / 2, (z0 + z1) / 2]} material={a.mats.pink}>
          <boxGeometry args={[0.12, kh - 2.2, z1 - z0 - 0.02]} />
        </mesh>
        <mesh position={[x1 - 0.06, 1.6, (winZ1 + z1) / 2]} material={a.mats.pink}>
          <boxGeometry args={[0.12, 1.2, z1 - winZ1]} />
        </mesh>
        <mesh position={[x1 - 0.06, 1.6, (z0 + winZ0) / 2]} material={a.mats.pink}>
          <boxGeometry args={[0.12, 1.2, winZ0 - z0]} />
        </mesh>
        <mesh position={[x1 - 0.05, 1.6, (winZ0 + winZ1) / 2]} material={a.mats.glass}>
          <boxGeometry args={[0.02, 1.2, winZ1 - winZ0]} />
        </mesh>
        {/* The counter outside the window. */}
        <mesh position={[x1 + 0.18, 1.0, (winZ0 + winZ1) / 2]} material={a.mats.white}>
          <boxGeometry args={[0.36, 0.05, winZ1 - winZ0 + 0.3]} />
        </mesh>
        {/* Inside: the dark, a chair, a lamp left on, the card. */}
        <mesh position={[(x0 + x1) / 2, 0.01, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.dark}>
          <planeGeometry args={[x1 - x0 - 0.1, z1 - z0 - 0.3]} />
        </mesh>
        <FittedPrimitive model={chair} position={[x1 - 1.1, 0.01, (winZ0 + winZ1) / 2]} rotation={[0, -Math.PI / 2, 0]} />
        <mesh position={[x1 - 0.35, 0.92, (winZ0 + winZ1) / 2]} material={a.mats.white}>
          <boxGeometry args={[0.5, 0.05, winZ1 - winZ0]} />
        </mesh>
        <mesh position={[x1 - 0.28, 1.12, winZ0 + 0.45]} rotation={[0, Math.PI / 2, 0]} material={a.mats.back}>
          <planeGeometry args={[0.32, 0.16]} />
        </mesh>
        <mesh position={[x1 - 0.4, 2.45, (z0 + z1) / 2]} material={a.mats.kioskLight}>
          <boxGeometry args={[0.3, 0.04, 1.2]} />
        </mesh>
        <pointLight position={[x1 - 0.8, 2.2, (winZ0 + winZ1) / 2]} color="#ffd6b0" intensity={2.5} distance={4} decay={2} />
        {/* The price board beside the window. */}
        <mesh position={[x1 + PROUD, 1.45, (winZ1 + z1) / 2 + 0.05]} rotation={[0, Math.PI / 2, 0]} material={a.mats.price}>
          <planeGeometry args={[1.5, 0.75]} />
        </mesh>
        {/* Lost property, on the counter: a wire basket and, folded into
            it, a shadow. */}
        <group position={[x1 + 0.2, 1.025, winZ1 - 0.35]}>
          {/* The basket: a wire rim and a floor, open sides. */}
          <mesh position={[0, 0.005, 0]} material={a.mats.grate}>
            <boxGeometry args={[0.3, 0.01, 0.42]} />
          </mesh>
          {[
            [0, 0.2, [0.3, 0.012, 0.012]],
            [0, -0.2, [0.3, 0.012, 0.012]],
          ].map(([dx, dz, size], i) => (
            <mesh key={i} position={[dx as number, 0.18, dz as number]} material={a.mats.chrome}>
              <boxGeometry args={size as Vec3} />
            </mesh>
          ))}
          {[-0.14, 0.14].map((dx) => (
            <mesh key={dx} position={[dx, 0.18, 0]} material={a.mats.chrome}>
              <boxGeometry args={[0.012, 0.012, 0.42]} />
            </mesh>
          ))}
          {[
            [-0.14, -0.2],
            [0.14, -0.2],
            [-0.14, 0.2],
            [0.14, 0.2],
          ].map(([dx, dz], i) => (
            <mesh key={i} position={[dx, 0.09, dz]} material={a.mats.chrome}>
              <boxGeometry args={[0.012, 0.18, 0.012]} />
            </mesh>
          ))}
          {/* The shadow: folded in, head and shoulders on top, its legs
              hanging out over the front of the basket. */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={a.mats.shadowTop}>
            <planeGeometry args={[0.38, 0.26]} />
          </mesh>
          <mesh position={[0.165, 0.11, 0.03]} rotation={[0, Math.PI / 2, 0]} material={a.mats.shadowLegs}>
            <planeGeometry args={[0.2, 0.15]} />
          </mesh>
          <Tag
            lines={["LOST PROPERTY", "1 SHADOW (ADULT)", "FOUND BY THE POOL", "UNCLAIMED"]}
            position={[0.16, 0.06, -0.12]}
            rotation={[0, Math.PI / 2, 0.08]}
            size={0.2}
          />
        </group>
      </group>

      {/* The lockers along the east wall. */}
      <group name="lockers">
        <mesh
          position={[C.LOCKER_X - C.LOCKER_D / 2, C.LOCKER_H / 2, (C.LOCKER_Z0 + C.LOCKER_Z1) / 2]}
          material={[
            a.mats.lockerSide,
            a.mats.lockers,
            a.mats.lockerSide,
            a.mats.lockerSide,
            a.mats.lockerSide,
            a.mats.lockerSide,
          ]}
        >
          <boxGeometry args={[C.LOCKER_D, C.LOCKER_H, C.LOCKER_Z1 - C.LOCKER_Z0]} />
        </mesh>
        {/* Locker 7, open, its door swung back, a towel inside. */}
        <group position={[lx - 0.005, openY1 - lockerH / 2, openZ0 + 0.01]} rotation={[0, -1.9, 0]}>
          <mesh position={[0, 0, (lockerW - 0.02) / 2]} material={a.mats.lilacPlastic}>
            <boxGeometry args={[0.02, lockerH - 0.03, lockerW - 0.02]} />
          </mesh>
        </group>
        <mesh position={[lx + 0.03, openY1 - lockerH + 0.12, openZ0 + lockerW / 2]} material={a.mats.towel}>
          <boxGeometry args={[0.1, 0.14, lockerW - 0.16]} />
        </mesh>
        {/* A bench in front of them. */}
        <mesh position={[lx - 0.9, 0.42, (C.LOCKER_Z0 + C.LOCKER_Z1) / 2]} material={a.mats.white}>
          <boxGeometry args={[0.4, 0.06, 4]} />
        </mesh>
        {[-1.7, 1.7].map((dz) => (
          <mesh key={dz} position={[lx - 0.9, 0.2, (C.LOCKER_Z0 + C.LOCKER_Z1) / 2 + dz]} material={a.mats.chrome}>
            <boxGeometry args={[0.32, 0.4, 0.05]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── The hall's fittings ──────────────────────────────────────────────────

function HallFittings({ a }: { a: Assets }) {
  const [lgx, lgz] = C.LIFEGUARD;
  // Wet footprints from the footbath to the lifeguard's ladder.
  const from = new Vector3(0.9, 0, C.FOOTBATH_Z0 - 0.3);
  const to = new Vector3(lgx + 0.2, 0, lgz + 0.9);
  const len = from.distanceTo(to);
  const angle = Math.atan2(to.x - from.x, to.z - from.z);
  return (
    <group name="hall-fittings">
      <mesh
        position={[(from.x + to.x) / 2, 0.004, (from.z + to.z) / 2]}
        rotation={[-Math.PI / 2, 0, angle]}
        material={a.mats.footprints}
      >
        <planeGeometry args={[0.6, len]} />
      </mesh>

      {/* The lifeguard's chair, empty, facing the water. */}
      <group name="lifeguard" position={[lgx, 0, lgz]}>
        {[
          [-0.42, -0.42],
          [0.42, -0.42],
          [-0.42, 0.42],
          [0.42, 0.42],
        ].map(([dx, dz], i) => (
          <mesh key={i} position={[dx * 0.85, 1.05, dz * 0.85]} rotation={[dz * 0.12, 0, -dx * 0.12]} material={a.mats.plastic}>
            <cylinderGeometry args={[0.045, 0.05, 2.12, 10]} />
          </mesh>
        ))}
        {[0.5, 1.0, 1.5].map((y) => (
          <mesh key={y} position={[0, y, 0.36 + (2.1 - y) * 0.03]} material={a.mats.plastic}>
            <boxGeometry args={[0.72, 0.05, 0.1]} />
          </mesh>
        ))}
        <mesh position={[0, 2.12, 0]} material={a.mats.pinkPlastic}>
          <boxGeometry args={[0.8, 0.08, 0.7]} />
        </mesh>
        <mesh position={[0, 2.5, 0.33]} rotation={[0.12, 0, 0]} material={a.mats.pinkPlastic}>
          <boxGeometry args={[0.8, 0.7, 0.06]} />
        </mesh>
        <mesh position={[0, 1.35, -0.45]} material={a.mats.plastic}>
          <boxGeometry args={[0.75, 0.05, 0.25]} />
        </mesh>
        {/* The card, hung on the seat's front edge. */}
        <mesh position={[0, 1.96, -0.36]} rotation={[0.08, Math.PI, 0]} material={a.mats.back}>
          <planeGeometry args={[0.36, 0.18]} />
        </mesh>
        {/* A whistle on its cord, over the backrest. */}
        <mesh position={[0.22, 2.68, 0.37]} rotation={[0, 0, Math.PI / 2]} material={a.mats.aquaPlastic}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 10]} />
        </mesh>
        {/* A parasol. */}
        <mesh position={[0.36, 3.0, 0.33]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 8]} />
        </mesh>
        <mesh position={[0.36, 3.9, 0.33]} material={a.mats.ring}>
          <coneGeometry args={[0.95, 0.4, 16, 1, true]} />
        </mesh>
      </group>

      {/* The rules, on a post at the start of the east walkway. */}
      <group position={[C.RULES[0], 0, C.RULES[1]]}>
        <mesh position={[0, 0.9, -0.03]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 10]} />
        </mesh>
        <mesh position={[0, 1.55, 0.02]} material={a.mats.rules}>
          <boxGeometry args={[0.8, 1.2, 0.03]} />
        </mesh>
      </group>

      {/* The pace clock, high on the east wall, stopped at 47. */}
      <mesh position={[C.HALL_IN - PROUD, 5.6, 9]} rotation={[0, -Math.PI / 2, 0]} material={a.mats.pace}>
        <circleGeometry args={[0.85, 48]} />
      </mesh>
      <mesh position={[C.HALL_IN - 0.005, 5.6, 9]} rotation={[0, 0, Math.PI / 2]} material={a.mats.aquaPlastic}>
        <cylinderGeometry args={[0.92, 0.92, 0.01, 48]} />
      </mesh>
    </group>
  );
}

// ── The east wing: flooded, piers, a mirror at the end ────────────────────

function EastWing({ a }: { a: Assets }) {
  const camera = useThree((s) => s.camera);
  const mirrorW = C.HALF_W - C.HALL_OUT;
  const mirrorH = C.WING_H - C.WADE_Y;
  const mirror = useMemo(() => {
    const r = new Reflector(new PlaneGeometry(mirrorW, mirrorH), {
      textureWidth: 1024,
      textureHeight: 512,
      color: 0xc9d7da,
      clipBias: 0.003,
    });
    r.position.set((C.HALL_OUT + C.HALF_W) / 2, (C.WADE_Y + C.WING_H) / 2, C.NORTH_Z + 0.02);
    return r;
  }, [mirrorW, mirrorH]);
  const dim = useRef<Mesh>(null);
  useEffect(
    () => () => {
      mirror.geometry.dispose();
      (mirror.material as Material).dispose();
      mirror.getRenderTarget().dispose();
    },
    [mirror],
  );
  // The mirror only renders its reflection when you could be looking into
  // it from the wing; from the hall a plain silvered panel stands in.
  useFrame(() => {
    const near = camera.position.x > C.HALL_IN - 1.5;
    mirror.visible = near;
    if (dim.current) dim.current.visible = !near;
  });

  // Ceiling panels, glowing, one in each bay between the piers.
  const panels = useRef<InstancedMesh>(null);
  const bays = useMemo(() => {
    const xs = [(C.HALL_OUT + C.PIER_XS[0]) / 2, (C.PIER_XS[0] + C.PIER_XS[1]) / 2, (C.PIER_XS[1] + C.HALF_W) / 2];
    const zs = [C.NORTH_Z + 2, ...C.PIER_ZS.map((z) => z + 2.25)];
    return xs.flatMap((x) => zs.map((z) => [x, z] as [number, number]));
  }, []);
  useEffect(() => {
    const m = panels.current;
    if (!m) return;
    const o = new Object3D();
    bays.forEach(([x, z], i) => {
      o.position.set(x, C.WING_H - 0.01, z);
      o.rotation.set(Math.PI / 2, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [bays]);

  return (
    <group name="east-wing">
      <primitive object={mirror} />
      <mesh ref={dim} position={[mirror.position.x, mirror.position.y, C.NORTH_Z + 0.02]} material={a.mats.dimMirror}>
        <planeGeometry args={[mirrorW, mirrorH]} />
      </mesh>
      {/* The mirror's chrome frame. */}
      <mesh position={[mirror.position.x, C.WING_H - 0.06, C.NORTH_Z + 0.05]} material={a.mats.chrome}>
        <boxGeometry args={[mirrorW, 0.1, 0.06]} />
      </mesh>
      <mesh position={[C.HALF_W - 0.01, 1.6, C.NORTH_Z + 2.2]} rotation={[0, -Math.PI / 2, 0]} material={a.mats.mirrorPlaque}>
        <planeGeometry args={[0.8, 0.4]} />
      </mesh>
      <instancedMesh ref={panels} args={[undefined, undefined, bays.length]} material={a.mats.panel}>
        <planeGeometry args={[1.8, 1.8]} />
      </instancedMesh>
      {[-18, -4, 10].map((z) => (
        <pointLight key={z} position={[15.8, 3.1, z]} color="#e8fffd" intensity={8} distance={15} decay={1.4} />
      ))}
      {/* Depth signs on a few piers, facing the way you come in. */}
      {[
        [C.PIER_XS[0], C.PIER_ZS[1]],
        [C.PIER_XS[0], C.PIER_ZS[6]],
        [C.PIER_XS[1], C.PIER_ZS[4]],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x - C.PIER / 2 - PROUD - 0.002, 1.75, z]} rotation={[0, -Math.PI / 2, 0]} material={a.mats.depthSign}>
          <planeGeometry args={[0.6, 0.3]} />
        </mesh>
      ))}
      {/* A pool ladder, at the step down from the hall: all three rungs of
          it, into twenty centimetres of water. */}
      <group position={[0, 0, 0]}>
        <PoolLadder a={a} x={C.HALL_OUT + 0.1} z={C.EAST_ARCHES[2] + C.ARCH_HALF - 0.45} facing={1} depth={0.3} />
      </group>
    </group>
  );
}

// ── The west wing: changing rooms, showers, the stair ─────────────────────

function WestWing({ a }: { a: Assets }) {
  const drip = useRef<Mesh>(null);
  const curtains = [a.mats.pinkPlastic, a.mats.aquaPlastic, a.mats.lilacPlastic];
  useFrame((state) => {
    if (!drip.current) return;
    const t = FREEZE ? 0.3 : (state.clock.getElapsedTime() % 2.6) / 0.62;
    // Hangs, falls, gone; again.
    const fall = Math.max(0, t - 0.5);
    drip.current.position.y = 2.18 - fall * fall * 2.1;
    drip.current.visible = drip.current.position.y > 0.02;
  });
  const run = C.STAIR_Z1 - C.STAIR_Z0;
  const slope = Math.atan2(C.TERRACE_Y, run);
  const railLen = Math.hypot(C.TERRACE_Y, run);
  return (
    <group name="west-wing">
      <pointLight position={[-15.6, 5.2, 12]} color="#fff0f8" intensity={6} distance={20} decay={1.4} />
      {/* Changing cubicles along the west wall. */}
      {Array.from({ length: C.CUBICLE_COUNT + 1 }, (_, i) => (
        <mesh
          key={i}
          position={[-C.HALF_W + C.CUBICLE_D / 2, 1.2, C.CUBICLE_Z0 + i * C.CUBICLE_W]}
          material={a.mats.white}
        >
          <boxGeometry args={[C.CUBICLE_D, 2.1, 0.05]} />
        </mesh>
      ))}
      <mesh
        position={[-C.HALF_W + C.CUBICLE_D / 2, 2.27, C.CUBICLE_Z0 + (C.CUBICLE_W * C.CUBICLE_COUNT) / 2]}
        material={a.mats.white}
      >
        <boxGeometry args={[C.CUBICLE_D, 0.04, C.CUBICLE_W * C.CUBICLE_COUNT + 0.05]} />
      </mesh>
      {Array.from({ length: C.CUBICLE_COUNT }, (_, i) => {
        const z = C.CUBICLE_Z0 + i * C.CUBICLE_W;
        const open = 0.35 + ((i * 37) % 5) * 0.09;
        return (
          <group key={i}>
            <mesh position={[-C.HALF_W + C.CUBICLE_D, 1.2, z + C.CUBICLE_W * (1 - open / 2) - 0.03]} material={curtains[i % 3]}>
              <boxGeometry args={[0.03, 1.9, C.CUBICLE_W * open - 0.06]} />
            </mesh>
            <mesh position={[-C.HALF_W + C.CUBICLE_D + 0.02, 2.2, z + C.CUBICLE_W / 2]} material={a.mats.chrome}>
              <boxGeometry args={[0.02, 0.02, C.CUBICLE_W - 0.1]} />
            </mesh>
            <mesh position={[-C.HALF_W + 0.3, 0.45, z + C.CUBICLE_W / 2]} material={a.mats.white}>
              <boxGeometry args={[0.5, 0.05, C.CUBICLE_W - 0.2]} />
            </mesh>
          </group>
        );
      })}
      {/* A slatted bench down the middle. */}
      <group position={[C.BENCH[0], 0, C.BENCH[1]]}>
        {[-0.18, 0, 0.18].map((dx) => (
          <mesh key={dx} position={[dx, 0.45, 0]} material={a.mats.plastic}>
            <boxGeometry args={[0.13, 0.04, C.BENCH_L]} />
          </mesh>
        ))}
        {[-C.BENCH_L / 2 + 0.4, 0, C.BENCH_L / 2 - 0.4].map((dz) => (
          <mesh key={dz} position={[0, 0.22, dz]} material={a.mats.chrome}>
            <boxGeometry args={[0.46, 0.44, 0.05]} />
          </mesh>
        ))}
        <mesh position={[0.05, 0.5, 1.2]} material={a.mats.towelWhite}>
          <boxGeometry args={[0.4, 0.06, 0.6]} />
        </mesh>
      </group>
      {/* Showers on the south wall; the middle one drips. */}
      {C.SHOWER_XS.map((x, i) => (
        <group key={x} position={[x, 0, C.HALL_S - C.WALL_T / 2]}>
          <mesh position={[0, 1.6, -0.05]} material={a.mats.chrome}>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 10]} />
          </mesh>
          <mesh position={[0, 2.38, -0.18]} rotation={[Math.PI / 2, 0, 0]} material={a.mats.chrome}>
            <cylinderGeometry args={[0.025, 0.025, 0.28, 10]} />
          </mesh>
          <mesh position={[0, 2.3, -0.34]} rotation={[0.5, 0, 0]} material={a.mats.chrome}>
            <cylinderGeometry args={[0.11, 0.06, 0.08, 18]} />
          </mesh>
          <mesh position={[0, 1.15, -0.03]} rotation={[Math.PI / 2, 0, 0]} material={a.mats.chrome}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
          </mesh>
          <mesh position={[0, 0.006, -0.6]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.grate}>
            <circleGeometry args={[0.12, 20]} />
          </mesh>
          {i === 1 && (
            <mesh ref={drip} position={[0, 2.2, -0.38]} material={a.mats.glass}>
              <sphereGeometry args={[0.022, 10, 8]} />
            </mesh>
          )}
        </group>
      ))}
      {/* The stair's balustrade: chrome posts and a rail, following the
          slope, on its open side. */}
      <mesh
        position={[C.STAIR_X0 + 0.05, C.TERRACE_Y / 2 + C.RAIL_H, (C.STAIR_Z0 + C.STAIR_Z1) / 2]}
        rotation={[slope, 0, 0]}
        material={a.mats.chrome}
      >
        <boxGeometry args={[0.06, 0.06, railLen]} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const z = C.STAIR_Z1 - 0.3 - (i * (run - 0.6)) / 6;
        const y = (C.TERRACE_Y * (C.STAIR_Z1 - z)) / run;
        return (
          <mesh key={i} position={[C.STAIR_X0 + 0.05, y + C.RAIL_H / 2, z]} material={a.mats.chrome}>
            <cylinderGeometry args={[0.025, 0.025, C.RAIL_H, 8]} />
          </mesh>
        );
      })}
      {/* The filter room's door in the terrace's face. */}
      <mesh position={[-17.5, 1.3, C.TERRACE_Z1 + PROUD]} material={a.mats.lilacPlastic}>
        <planeGeometry args={[1.1, 2.4]} />
      </mesh>
      <mesh position={[-17.5, 2.82, C.TERRACE_Z1 + PROUD]} material={a.mats.filter}>
        <planeGeometry args={[1.2, 0.48]} />
      </mesh>
      <mesh position={[-17.1, 1.2, C.TERRACE_Z1 + 0.04]} material={a.mats.chrome}>
        <boxGeometry args={[0.04, 0.2, 0.05]} />
      </mesh>
    </group>
  );
}

// ── The sun terrace ──────────────────────────────────────────────────────

function Terrace({ a }: { a: Assets }) {
  const Y = C.TERRACE_Y;
  const railX0 = -C.HALF_W;
  const railX1 = C.STAIR_X0 - 0.1;
  const posts = Math.round((railX1 - railX0) / 1.2);
  return (
    <group name="terrace">
      {/* The railing along its edge. */}
      {[Y + C.RAIL_H, Y + 0.55].map((y) => (
        <mesh key={y} position={[(railX0 + railX1) / 2, y, C.TERRACE_Z1 - 0.05]} material={a.mats.chrome}>
          <boxGeometry args={[railX1 - railX0, 0.05, 0.05]} />
        </mesh>
      ))}
      {Array.from({ length: posts + 1 }, (_, i) => (
        <mesh key={i} position={[railX0 + 0.05 + (i * (railX1 - railX0 - 0.1)) / posts, Y + C.RAIL_H / 2, C.TERRACE_Z1 - 0.05]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.025, 0.025, C.RAIL_H, 8]} />
        </mesh>
      ))}
      {/* The rail along the window's parapet, either side of the slide. */}
      {[
        [C.WINDOW_Z0, C.SLIDE_Z - 0.75],
        [C.SLIDE_Z + 0.75, C.WINDOW_Z1],
      ].map(([z0, z1]) => (
        <mesh key={z0} position={[-C.HALL_OUT - 0.08, Y + C.PARAPET_H + 0.12, (z0 + z1) / 2]} material={a.mats.chrome}>
          <boxGeometry args={[0.05, 0.05, z1 - z0]} />
        </mesh>
      ))}
      <mesh position={[-C.HALF_W + PROUD, Y + 2.3, -20]} rotation={[0, Math.PI / 2, 0]} material={a.mats.terrace}>
        <planeGeometry args={[2.4, 0.8]} />
      </mesh>
      {/* The plunge pool. */}
      <group position={[C.PLUNGE[0], Y, C.PLUNGE[1]]}>
        <mesh position={[0, 0.25, 0]} material={a.mats.aqua}>
          <cylinderGeometry args={[C.PLUNGE_R + 0.15, C.PLUNGE_R + 0.15, 0.5, 48, 1, true]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} material={a.mats.pool}>
          <cylinderGeometry args={[C.PLUNGE_R - 0.02, C.PLUNGE_R - 0.02, 0.5, 48, 1, true]} />
        </mesh>
        <mesh position={[0, 0.505, 0]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.white}>
          <ringGeometry args={[C.PLUNGE_R - 0.03, C.PLUNGE_R + 0.16, 48]} />
        </mesh>
        <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]} material={a.wade}>
          <circleGeometry args={[C.PLUNGE_R - 0.02, 48]} />
        </mesh>
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.pool}>
          <circleGeometry args={[C.PLUNGE_R - 0.02, 48]} />
        </mesh>
        <mesh position={[C.PLUNGE_R + 0.17, 0.75, 0]} rotation={[0, Math.PI / 2, 0]} material={a.mats.plunge}>
          <planeGeometry args={[0.8, 0.32]} />
        </mesh>
        <mesh position={[C.PLUNGE_R + 0.17, 0.4, 0]} material={a.mats.chrome}>
          <boxGeometry args={[0.04, 0.8, 0.04]} />
        </mesh>
      </group>
      {/* Two loungers, facing the window and the reflection beyond it. */}
      {C.LOUNGERS.map(([x, z], i) => (
        <group key={i} position={[x, Y, z]}>
          <mesh position={[0.15, 0.36, 0]} material={a.mats.plastic}>
            <boxGeometry args={[1.35, 0.06, 0.72]} />
          </mesh>
          <mesh position={[-0.75, 0.62, 0]} rotation={[0, 0, -0.75]} material={a.mats.plastic}>
            <boxGeometry args={[0.75, 0.06, 0.72]} />
          </mesh>
          {[
            [0.7, 0.3],
            [0.7, -0.3],
            [-0.5, 0.3],
            [-0.5, -0.3],
          ].map(([dx, dz], k) => (
            <mesh key={k} position={[dx, 0.17, dz]} material={a.mats.plastic}>
              <boxGeometry args={[0.06, 0.34, 0.06]} />
            </mesh>
          ))}
          {i === 0 && (
            <mesh position={[0.2, 0.4, 0]} material={a.mats.towel}>
              <boxGeometry args={[1.0, 0.03, 0.6]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ── The slide ────────────────────────────────────────────────────────────

// It clears the parapet notch at the wall and the walkway's heads below.
const SLIDE_POINTS: Vec3[] = [
  [C.SLIDE_START_X, C.TERRACE_Y + 0.6, C.SLIDE_Z],
  [-10.2, C.TERRACE_Y + 0.57, C.SLIDE_Z],
  [-9.0, C.TERRACE_Y + 0.52, C.SLIDE_Z],
  [-7.4, 3.75, C.SLIDE_Z + 0.15],
  [-5.6, 3.2, C.SLIDE_Z + 0.55],
  [-4.4, 2.62, C.SLIDE_Z + 1.0],
  [-3.4, 1.55, C.SLIDE_Z + 1.5],
  [-2.6, 0.45, C.SLIDE_Z + 1.9],
  [-2.0, -0.35, C.SLIDE_Z + 2.2],
];

function Slide({ a }: { a: Assets }) {
  const tube = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(SLIDE_POINTS.map((p) => new Vector3(...p))),
        90,
        C.SLIDE_R,
        20,
        false,
      ),
    [],
  );
  useEffect(() => () => tube.dispose(), [tube]);
  const [px, pz] = C.SLIDE_POST;
  const postTop = 3.6;
  return (
    <group name="slide">
      <mesh geometry={tube} material={a.mats.slideTube} />
      {/* Its post, by the wall, and a strap round the tube. */}
      <mesh position={[px, postTop / 2, pz]} material={a.mats.chrome}>
        <cylinderGeometry args={[0.1, 0.12, postTop, 12]} />
      </mesh>
      {/* The top: grab bars, and the chain across with its sign. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[C.SLIDE_START_X - 0.3, C.TERRACE_Y + 0.6, C.SLIDE_Z + s * 0.6]} material={a.mats.chrome}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        </mesh>
      ))}
      <mesh position={[C.SLIDE_START_X - 0.3, C.TERRACE_Y + 1.0, C.SLIDE_Z]} rotation={[Math.PI / 2, 0, 0]} material={a.mats.chrome}>
        <cylinderGeometry args={[0.012, 0.012, 1.2, 6]} />
      </mesh>
      <mesh position={[C.SLIDE_START_X - 0.32, C.TERRACE_Y + 0.82, C.SLIDE_Z]} rotation={[0, -Math.PI / 2, 0]} material={a.mats.slide}>
        <planeGeometry args={[0.6, 0.3]} />
      </mesh>
    </group>
  );
}

// ── Palms, in pink-tiled planters ────────────────────────────────────────

const FRONDS = 10;

function frondGeometry() {
  const g = new PlaneGeometry(1.1, 3.3, 4, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const w = pos.getX(i);
    const l = pos.getY(i) + 1.65;
    const y = 0.72 * l - 0.23 * l * l + 0.22 * (w / 0.55) ** 2 * (l / 3.3);
    pos.setXYZ(i, l, y, w);
  }
  g.computeVertexNormals();
  return g;
}

function Palms({ a }: { a: Assets }) {
  const parts = useMemo(() => {
    const frond = frondGeometry();
    const trunks = C.PALMS.map(([, , h], i) => {
      const lean = new Vector3(Math.sin(i * 2.3) * 0.6, 0, Math.cos(i * 1.9) * 0.6);
      const curve = new CatmullRomCurve3([
        new Vector3(0, 0.6, 0),
        new Vector3(lean.x * 0.2, h * 0.45, lean.z * 0.2),
        new Vector3(lean.x * 0.6, h * 0.8, lean.z * 0.6),
        new Vector3(lean.x, h, lean.z),
      ]);
      return { trunk: new TubeGeometry(curve, 14, 0.17, 9, false), top: curve.getPoint(1) };
    });
    return { frond, trunks };
  }, []);
  useEffect(
    () => () => {
      parts.frond.dispose();
      parts.trunks.forEach((t) => t.trunk.dispose());
    },
    [parts],
  );
  return (
    <group name="palms">
      {C.PALMS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.3, 0]} material={a.mats.pink}>
            <boxGeometry args={[C.PLANTER, 0.6, C.PLANTER]} />
          </mesh>
          <mesh position={[0, 0.601, 0]} rotation={[-Math.PI / 2, 0, 0]} material={a.mats.dark}>
            <planeGeometry args={[C.PLANTER - 0.14, C.PLANTER - 0.14]} />
          </mesh>
          <mesh geometry={parts.trunks[i].trunk} material={a.mats.bark} />
          <group position={parts.trunks[i].top}>
            {Array.from({ length: FRONDS }, (_, k) => (
              <mesh
                key={k}
                geometry={parts.frond}
                material={a.mats.frond}
                rotation={[Math.sin(k * 3.3) * 0.18, i * 0.9 + (k / FRONDS) * Math.PI * 2, Math.sin(k * 1.9) * 0.2 - 0.05]}
              />
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

