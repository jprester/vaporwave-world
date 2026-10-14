import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  BackSide,
  Color,
  DoubleSide,
  InstancedMesh,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  Shape,
  Vector3,
  type Texture,
} from "three";
import DoorTrigger from "../DoorTrigger";
import type { FeedTextures } from "../IslandFeed";
import { MODEL } from "../stockroom/models";
import { markWorldReady } from "../worldStore";
import {
  CEILING_Y,
  DOORS,
  ESCALATOR_OUTER,
  GALLERY_Y,
  HALF_L,
  HALF_W,
  RIDGE_Y,
  SLAB,
  SOFFIT_Y,
  STAFF_DOOR_X,
  VOID_HALF_L,
  VOID_HALF_W,
} from "./constants";
import {
  Benches,
  CeilingFittings,
  Directory,
  Escalators,
  Fountain,
  Palms,
  WetFloor,
} from "./Fixtures";
import Storefronts from "./Storefronts";
import {
  TERRAZZO_SIZE,
  makeClockTexture,
  makeShutterTexture,
  makeSignTexture,
  makeTerrazzoTexture,
  makeWetMap,
} from "./textures";
import { makeWetFloorMaterial, useFloorReflection } from "./wetFloor";

// The mall: "The Agora", after closing. Two storeys of shops round a long
// atrium under a pitched glass skylight, lit by the moon through the glass,
// a few neon signs still on and the odd night light. The concourse has just
// been mopped. The escalators are off. The fountain is dry. The music comes
// out of the ceiling speakers into all that glass and marble.
//
// It's the front of house: where the dream is sold. It joins everything: the
// travel agency's door opens onto the island, the hotel's (upstairs) onto its
// old conference room, and the service corridor onto the stockroom.

// Where the moon is: high in the north, so it's in view through the
// skylight when you look up from the concourse, and the skylight's shadow
// falls south across the floor.
const MOON_DIR = new Vector3(0.28, 0.82, -0.5).normalize();

export default function MallWorld({
  active,
  feed,
}: {
  active: boolean;
  feed: FeedTextures | null;
}) {
  // Mounting is the signal that the code and models have arrived: let the
  // door fade finish.
  useEffect(() => {
    markWorldReady("mall");
  }, []);

  return (
    <group name="mall-world">
      <ambientLight intensity={0.32} color="#36407a" />
      <hemisphereLight intensity={0.4} color="#5468b8" groundColor="#2a1a30" />
      <directionalLight
        name="moonlight"
        color="#a9bcff"
        intensity={1.5}
        position={MOON_DIR.clone().multiplyScalar(90).toArray()}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={20}
        shadow-camera-far={180}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <NightSky />
      <ConcourseFloor active={active} />
      <Galleries />
      <Balustrades />
      <Shell />
      <Skylight />
      <EndWalls />
      <Storefronts active={active} feed={feed} />
      <Escalators />
      <Fountain />
      <Palms />
      <Benches />
      <Directory />
      <WetFloor />
      <CeilingFittings />
      {DOORS.map((d) => (
        <DoorTrigger key={d.to} {...d} active={active} />
      ))}
    </group>
  );
}

function useMaterials<T extends Record<string, Material>>(make: () => T): T {
  const m = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () =>
      Object.values(m).forEach((mat) => {
        ((mat as MeshStandardMaterial).map as Texture | null)?.dispose();
        mat.dispose();
      }),
    [m],
  );
  return m;
}

// ── The night ──────────────────────────────────────────────────────────────

function NightSky() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: { uMoon: { value: MOON_DIR } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uMoon;
          varying vec3 vDir;
          float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(vec3(0.045, 0.055, 0.15), vec3(0.006, 0.008, 0.03), pow(h, 0.55));
            float s = hash(floor(d * 260.0));
            col += step(0.9975, s) * smoothstep(0.05, 0.3, h) * (0.4 + 0.8 * fract(s * 91.0)) * vec3(0.85, 0.9, 1.1);
            float md = dot(d, uMoon);
            col += smoothstep(0.99978, 0.99984, md) * vec3(2.6, 2.6, 2.4);
            col += pow(max(md, 0.0), 900.0) * vec3(0.35, 0.4, 0.6);
            col += pow(max(md, 0.0), 30.0) * vec3(0.03, 0.04, 0.08);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[400, 32, 24]} />
    </mesh>
  );
}

// ── Floors ─────────────────────────────────────────────────────────────────

function ConcourseFloor({ active }: { active: boolean }) {
  const floor = useRef<Mesh>(null);
  const reflection = useFloorReflection(floor, 0, active);
  const material = useMemo(
    () =>
      makeWetFloorMaterial(
        makeTerrazzoTexture([(HALF_W * 2) / TERRAZZO_SIZE, (HALF_L * 2) / TERRAZZO_SIZE]),
        makeWetMap(),
        reflection,
      ),
    [reflection],
  );
  useEffect(
    () => () => {
      material.map?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
    },
    [material],
  );
  return (
    <mesh
      ref={floor}
      name="concourse-floor"
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
      receiveShadow>
      <planeGeometry args={[HALF_W * 2, HALF_L * 2]} />
    </mesh>
  );
}

// The upper floor: a slab round the atrium, polished terrazzo on top, a
// white soffit underneath, and its edge.
const GALLERY_SLABS: [number, number, number, number][] = [
  // x0, x1, z0, z1
  [-HALF_W, -VOID_HALF_W, -HALF_L, HALF_L],
  [VOID_HALF_W, HALF_W, -HALF_L, HALF_L],
  [-VOID_HALF_W, VOID_HALF_W, -HALF_L, -VOID_HALF_L],
  [-VOID_HALF_W, VOID_HALF_W, VOID_HALF_L, HALF_L],
];

function Galleries() {
  const m = useMaterials(() => ({
    slab: new MeshStandardMaterial({ color: "#e9e4e0", roughness: 0.6 }),
    top: new MeshStandardMaterial({
      map: makeTerrazzoTexture([1, 1]),
      roughness: 0.22,
      metalness: 0.05,
    }),
  }));
  return (
    <group name="galleries">
      {GALLERY_SLABS.map(([x0, x1, z0, z1]) => {
        const w = x1 - x0;
        const d = z1 - z0;
        return (
          <group key={`${x0},${z0}`} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}>
            <mesh position={[0, SOFFIT_Y + SLAB / 2, 0]} material={m.slab} castShadow receiveShadow>
              <boxGeometry args={[w, SLAB, d]} />
            </mesh>
            <GalleryTop w={w} d={d} material={m.top} />
          </group>
        );
      })}
    </group>
  );
}

// A gallery's floor, its terrazzo repeated to its own size.
function GalleryTop({ w, d, material }: { w: number; d: number; material: MeshStandardMaterial }) {
  const mat = useMemo(() => {
    const map = material.map!.clone();
    map.repeat.set(w / TERRAZZO_SIZE, d / TERRAZZO_SIZE);
    map.needsUpdate = true;
    const c = material.clone();
    c.map = map;
    return c;
  }, [material, w, d]);
  useEffect(
    () => () => {
      mat.map?.dispose();
      mat.dispose();
    },
    [mat],
  );
  return (
    <mesh position={[0, GALLERY_Y + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

// Glass balustrade round the atrium, with a steel handrail and posts; open
// where the escalators land.
const RAIL_H = 1.1;
const BALUSTRADE_RUNS: [number, number, number, number][] = [
  // x0, z0, x1, z1 along the void's edge
  [-VOID_HALF_W, -VOID_HALF_L, -VOID_HALF_W, VOID_HALF_L],
  [VOID_HALF_W, -VOID_HALF_L, VOID_HALF_W, VOID_HALF_L],
  [-VOID_HALF_W, VOID_HALF_L, VOID_HALF_W, VOID_HALF_L],
  [-VOID_HALF_W, -VOID_HALF_L, -ESCALATOR_OUTER, -VOID_HALF_L],
  [ESCALATOR_OUTER, -VOID_HALF_L, VOID_HALF_W, -VOID_HALF_L],
];

function Balustrades() {
  const m = useMaterials(() => ({
    glass: new MeshStandardMaterial({
      color: "#a8c2d2",
      metalness: 0.3,
      roughness: 0.05,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: DoubleSide,
    }),
    steel: new MeshStandardMaterial({ color: "#c9c8cc", metalness: 0.95, roughness: 0.22 }),
  }));
  const posts = useRef<InstancedMesh>(null);
  const postSpots = useMemo(() => {
    const out: [number, number][] = [];
    for (const [x0, z0, x1, z1] of BALUSTRADE_RUNS) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.round(len / 2.5);
      for (let k = 0; k <= n; k++) {
        out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
      }
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const mesh = posts.current!;
    const o = new Object3D();
    postSpots.forEach(([x, z], i) => {
      o.position.set(x, GALLERY_Y + RAIL_H / 2, z);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [postSpots]);
  return (
    <group name="balustrades">
      {BALUSTRADE_RUNS.map(([x0, z0, x1, z1]) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const yaw = Math.atan2(x1 - x0, z1 - z0);
        return (
          <group key={`${x0},${z0},${x1}`} position={[(x0 + x1) / 2, GALLERY_Y, (z0 + z1) / 2]} rotation={[0, yaw, 0]}>
            <mesh position={[0, RAIL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glass}>
              <planeGeometry args={[len, RAIL_H - 0.1]} />
            </mesh>
            <mesh position={[0, RAIL_H, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel} castShadow>
              <cylinderGeometry args={[0.03, 0.03, len, 10]} />
            </mesh>
          </group>
        );
      })}
      <instancedMesh ref={posts} args={[undefined, m.steel, postSpots.length]} castShadow>
        <boxGeometry args={[0.05, RAIL_H, 0.05]} />
      </instancedMesh>
    </group>
  );
}

// ── The building ───────────────────────────────────────────────────────────

// The roof over the galleries, the deep beam round the skylight, and the
// plain walls at the ends of the shopfront runs.
function Shell() {
  const m = useMaterials(() => ({
    ceiling: new MeshStandardMaterial({ color: "#d9d4d0", roughness: 0.85 }),
    beam: new MeshStandardMaterial({ color: "#e6e1dd", roughness: 0.55 }),
    wall: new MeshStandardMaterial({ color: "#bdb3b1", roughness: 0.9 }),
  }));
  const corners: [number, number][] = [];
  for (const side of [-1, 1]) for (const end of [-1, 1]) corners.push([side, end]);
  return (
    <group name="shell">
      {GALLERY_SLABS.map(([x0, x1, z0, z1]) => (
        <mesh
          key={`${x0},${z0}`}
          position={[(x0 + x1) / 2, CEILING_Y + 0.2, (z0 + z1) / 2]}
          material={m.ceiling}
          castShadow
          receiveShadow>
          <boxGeometry args={[x1 - x0, 0.4, z1 - z0]} />
        </mesh>
      ))}
      {/* The beam round the skylight opening. */}
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} position={[s * VOID_HALF_W, CEILING_Y, 0]} material={m.beam} castShadow receiveShadow>
          <boxGeometry args={[0.5, 1.4, VOID_HALF_L * 2 + 0.5]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} position={[0, CEILING_Y, s * VOID_HALF_L]} material={m.beam} castShadow receiveShadow>
          <boxGeometry args={[VOID_HALF_W * 2 + 0.5, 1.4, 0.5]} />
        </mesh>
      ))}
      {/* Walls past the end bays, both storeys. */}
      {corners.map(([side, end]) => (
        <mesh
          key={`${side},${end}`}
          position={[side * HALF_W, CEILING_Y / 2, end * (HALF_L - 4)]}
          rotation={[0, (-side * Math.PI) / 2, 0]}
          material={m.wall}
          receiveShadow>
          <planeGeometry args={[8, CEILING_Y]} />
        </mesh>
      ))}
    </group>
  );
}

// A pitched glass roof over the atrium: rafters every 2.5 m, purlins along
// it, a ridge, glass gable ends. The glass casts no shadow; the steel does,
// so the moonlight falls on the floor in a grid.
const RAFTER_STEP = 2.5;

function Skylight() {
  const m = useMaterials(() => ({
    glass: new MeshStandardMaterial({
      color: "#7f97c0",
      metalness: 0.2,
      roughness: 0.05,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: DoubleSide,
    }),
    steel: new MeshStandardMaterial({ color: "#d4d2d8", metalness: 0.6, roughness: 0.4 }),
  }));
  const eave = CEILING_Y + 0.7;
  const rise = RIDGE_Y - eave;
  const pitch = Math.atan2(rise, VOID_HALF_W);
  const slope = Math.hypot(rise, VOID_HALF_W);
  const rafters = useRef<InstancedMesh>(null);
  const purlins = useRef<InstancedMesh>(null);
  const count = Math.round((VOID_HALF_L * 2) / RAFTER_STEP) + 1;
  useLayoutEffect(() => {
    const o = new Object3D();
    let i = 0;
    for (const s of [-1, 1]) {
      for (let k = 0; k < count; k++) {
        o.position.set((s * VOID_HALF_W) / 2, eave + rise / 2, -VOID_HALF_L + k * RAFTER_STEP);
        o.rotation.set(0, 0, s * pitch);
        o.updateMatrix();
        rafters.current!.setMatrixAt(i++, o.matrix);
      }
    }
    rafters.current!.instanceMatrix.needsUpdate = true;
    rafters.current!.computeBoundingSphere();
    i = 0;
    for (const s of [-1, 1]) {
      for (const t of [0.2, 0.45, 0.7]) {
        o.position.set(s * VOID_HALF_W * (1 - t), eave + rise * t, 0);
        o.rotation.set(0, 0, s * pitch);
        o.updateMatrix();
        purlins.current!.setMatrixAt(i++, o.matrix);
      }
    }
    purlins.current!.instanceMatrix.needsUpdate = true;
    purlins.current!.computeBoundingSphere();
  }, [count, eave, rise, pitch]);
  return (
    <group name="skylight">
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(s * VOID_HALF_W) / 2, eave + rise / 2, 0]}
          rotation={[0, 0, s * pitch]}>
          <boxGeometry args={[slope, 0.02, VOID_HALF_L * 2]} />
          <primitive object={m.glass} attach="material" />
        </mesh>
      ))}
      <instancedMesh ref={rafters} args={[undefined, m.steel, count * 2]} castShadow>
        <boxGeometry args={[slope, 0.24, 0.14]} />
      </instancedMesh>
      <instancedMesh ref={purlins} args={[undefined, m.steel, 6]} castShadow>
        <boxGeometry args={[0.1, 0.16, VOID_HALF_L * 2]} />
      </instancedMesh>
      <mesh position={[0, RIDGE_Y, 0]} material={m.steel} castShadow>
        <boxGeometry args={[0.3, 0.3, VOID_HALF_L * 2]} />
      </mesh>
      {/* Low wall the roof sits on, and the glass gables. */}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[s * VOID_HALF_W, CEILING_Y + 0.7 / 2 + 0.35, 0]} material={m.steel} castShadow>
          <boxGeometry args={[0.3, 0.7, VOID_HALF_L * 2]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`g${s}`} position={[0, eave, s * VOID_HALF_L]} material={m.glass}>
          <shapeGeometry args={[gable(VOID_HALF_W, rise)]} />
        </mesh>
      ))}
    </group>
  );
}

// A triangle in the XY plane, base on y = 0.
function gable(halfW: number, rise: number) {
  const shape = new Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(halfW, 0);
  shape.lineTo(0, rise);
  return shape;
}

// ── The ends of the mall ───────────────────────────────────────────────────

// South: the main entrance, shuttered (there's no other entrance), the
// centre's name and a clock stopped at closing time. North: the service
// corridor door (the stockroom), the toilets sign, and the upper mall.
function EndWalls() {
  const { scene } = useGLTF(MODEL.door);
  const door = useMemo(() => scene.clone(true), [scene]);
  const m = useMaterials(() => {
    const shutter = makeShutterTexture();
    shutter.repeat.set(5, 3.8);
    return {
      wall: new MeshStandardMaterial({ color: "#c6bdba", roughness: 0.9 }),
      shutter: new MeshStandardMaterial({ map: shutter, metalness: 0.55, roughness: 0.45 }),
      frame: new MeshStandardMaterial({ color: "#2a2730", metalness: 0.7, roughness: 0.4 }),
      entrance: new MeshStandardMaterial({
        map: makeSignTexture(["MAIN ENTRANCE"], { w: 1024, h: 128, size: 64, bg: "#1c1a22", fg: "#e7e2dc" }),
        roughness: 0.45,
        metalness: 0.3,
      }),
      notice: new MeshStandardMaterial({
        map: makeSignTexture(["THIS ENTRANCE IS CLOSED", "Please use another entrance", "Thank you for shopping at The Agora"], {
          w: 768,
          h: 384,
          size: 46,
        }),
        roughness: 0.7,
      }),
      name: new MeshBasicMaterial({
        map: makeSignTexture(["THE AGORA"], { w: 1024, h: 160, size: 110, bg: "#c6bdba", fg: "#f4efe9" }),
        color: new Color(0.55, 0.55, 0.6),
      }),
      clock: new MeshStandardMaterial({ map: makeClockTexture(), roughness: 0.4 }),
      staff: new MeshStandardMaterial({
        map: makeSignTexture(["STAFF ONLY", "SERVICE CORRIDOR · DELIVERIES"], {
          w: 512,
          h: 192,
          size: 52,
          bg: "#2a2a30",
          fg: "#e9e4da",
        }),
        roughness: 0.4,
      }),
      exit: new MeshBasicMaterial({
        map: makeSignTexture(["EXIT"], { w: 256, h: 96, size: 64, bg: "#0f5a2e", fg: "#d8ffe6" }),
        color: new Color(2.2, 2.2, 2.2),
        toneMapped: false,
      }),
      toilets: new MeshStandardMaterial({
        map: makeSignTexture(["CUSTOMER TOILETS", "Closed for cleaning"], {
          w: 512,
          h: 192,
          size: 46,
          bg: "#2c3a6a",
          fg: "#f2efe8",
        }),
        roughness: 0.5,
      }),
      upper: new MeshStandardMaterial({
        map: makeSignTexture(["UPPER MALL", "Hotel · Television City · Arcadia"], {
          w: 768,
          h: 192,
          size: 54,
          bg: "#2c3a6a",
          fg: "#f2efe8",
        }),
        roughness: 0.5,
      }),
    };
  });
  return (
    <group name="end-walls">
      {/* South. */}
      <group position={[0, 0, HALF_L]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, CEILING_Y / 2, 0]} material={m.wall} receiveShadow>
          <planeGeometry args={[HALF_W * 2, CEILING_Y]} />
        </mesh>
        <mesh position={[0, 1.9, 0.02]} material={m.shutter}>
          <planeGeometry args={[10, 3.8]} />
        </mesh>
        <mesh position={[0, 3.9, 0.12]} material={m.frame}>
          <boxGeometry args={[10.2, 0.3, 0.24]} />
        </mesh>
        <mesh position={[0, 4.5, 0.03]} material={m.entrance}>
          <planeGeometry args={[4.4, 0.55]} />
        </mesh>
        <mesh position={[0, 1.6, 0.04]} material={m.notice}>
          <planeGeometry args={[1.2, 0.6]} />
        </mesh>
        <mesh position={[0, GALLERY_Y + 2.0, 0.03]} material={m.name}>
          <planeGeometry args={[9, 1.4]} />
        </mesh>
        <mesh position={[0, GALLERY_Y + 4.0, 0.06]} material={m.clock}>
          <circleGeometry args={[1.0, 48]} />
        </mesh>
      </group>
      {/* North. */}
      <group position={[0, 0, -HALF_L]}>
        <mesh position={[0, CEILING_Y / 2, 0]} material={m.wall} receiveShadow>
          <planeGeometry args={[HALF_W * 2, CEILING_Y]} />
        </mesh>
        <primitive object={door} position={[STAFF_DOOR_X, 0, 0.3]} />
        <mesh position={[STAFF_DOOR_X + 2.3, 1.8, 0.03]} material={m.staff}>
          <planeGeometry args={[1.5, 0.56]} />
        </mesh>
        <mesh position={[STAFF_DOOR_X, 4.35, 0.05]} material={m.exit}>
          <planeGeometry args={[0.7, 0.26]} />
        </mesh>
        <mesh position={[-9, 2.6, 0.03]} material={m.toilets}>
          <planeGeometry args={[1.6, 0.6]} />
        </mesh>
        <mesh position={[0, GALLERY_Y + 2.6, 0.03]} material={m.upper}>
          <planeGeometry args={[3.2, 0.8]} />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL.door);
