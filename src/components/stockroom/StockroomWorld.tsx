import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import DoorTrigger from "../DoorTrigger";
import MallDoor from "../mall/MallDoor";
import type { FeedTextures } from "../IslandFeed";
import { Crt } from "../cave/CaveWorld";
import {
  CRT_FEED,
  createSharedCrtUniforms,
} from "../cave/crtMaterial";
import {
  DESK_X,
  DESK_Z,
  DOOR_X,
  DOOR_Z,
  MALL_DOOR_X,
  MALL_DOOR_Z,
  HALF_L,
  HALF_W,
  LOTS,
  ROOM_HEIGHT,
  ROOM_LENGTH,
  ROOM_WIDTH,
  SHUTTER_H,
  SHUTTER_W,
  SHUTTER_Z,
  SUN_Z,
} from "./constants";
import {
  ColumnsLot,
  DoorsLot,
  HeliosLot,
  Racks,
  SeaLot,
  Suns,
  VenusLot,
  usePalletGeometry,
  useStockMaterials,
} from "./Stock";
import {
  makeCardboardTexture,
  makeBackSoonTexture,
  makeBlockWallTexture,
  makeConcreteTexture,
  makeInventoryTexture,
  makeLotSignTexture,
  makeShutterTexture,
  makeSloganTexture,
} from "./textures";

// The stockroom: backstage of the dream. Behind the cave's staff door is the
// prop store the island is dressed from: a dim, high warehouse of pallet
// racks and numbered floor lots holding the spares of everything out there,
// down to the sun, one of which stands at the end of the aisle, plugged in,
// setting forever against the back wall. Nobody is here; the clerk is back in
// five minutes.

interface Props {
  active: boolean;
  feed: FeedTextures | null;
}

export default function StockroomWorld({ active, feed }: Props) {
  return (
    <group name="stockroom-world">
      <ambientLight intensity={0.22} color="#a9a6cf" />
      <hemisphereLight intensity={0.3} color="#cfd6ff" groundColor="#3a3040" />
      <Shell />
      <HighBays />
      <FloorMarkings />
      <LotSigns />
      <Racks />
      <VenusLot />
      <SeaLot />
      <HeliosLot />
      <DoorsLot />
      <ColumnsLot />
      <Suns />
      <StockroomDoor />
      <Desk feed={feed} />
      <InventoryBoard />
      <LoadingShutter />
      <Receiving />
      <PaHorns />
      <MallDoor x={MALL_DOOR_X} z={MALL_DOOR_Z} normal={[0, 1]} />
      <DoorTrigger
        to="mall"
        x={MALL_DOOR_X}
        z={MALL_DOOR_Z}
        normal={[0, 1]}
        active={active}
      />
      <DoorTrigger
        to="cave"
        x={DOOR_X}
        z={DOOR_Z}
        normal={[0, -1]}
        active={active}
      />
    </group>
  );
}

function Shell() {
  const materials = useMemo(() => {
    const floor = new MeshStandardMaterial({
      map: makeConcreteTexture(ROOM_WIDTH / 6, ROOM_LENGTH / 6),
      roughness: 0.55,
      metalness: 0.05,
    });
    const longWall = new MeshStandardMaterial({
      map: makeBlockWallTexture(ROOM_LENGTH / 2.2),
      roughness: 0.9,
    });
    const shortWall = new MeshStandardMaterial({
      map: makeBlockWallTexture(ROOM_WIDTH / 2.2),
      roughness: 0.9,
    });
    const ceiling = new MeshStandardMaterial({ color: "#1b1922", roughness: 1 });
    const steel = new MeshStandardMaterial({
      color: "#3a3844",
      roughness: 0.6,
      metalness: 0.5,
    });
    return { floor, longWall, shortWall, ceiling, steel };
  }, []);
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );

  const midY = ROOM_HEIGHT / 2;
  const trussZs = [];
  for (let z = HALF_L - 4; z > -HALF_L; z -= 6) trussZs.push(z);
  return (
    <group name="stockroom-shell">
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.floor}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_LENGTH]} />
      </mesh>
      <mesh
        position={[0, ROOM_HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.ceiling}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_LENGTH]} />
      </mesh>
      <mesh
        position={[-HALF_W, midY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.longWall}>
        <planeGeometry args={[ROOM_LENGTH, ROOM_HEIGHT]} />
      </mesh>
      <mesh
        position={[HALF_W, midY, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        material={materials.longWall}>
        <planeGeometry args={[ROOM_LENGTH, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[0, midY, -HALF_L]} material={materials.shortWall}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
      </mesh>
      <mesh
        position={[0, midY, HALF_L]}
        rotation={[0, Math.PI, 0]}
        material={materials.shortWall}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
      </mesh>
      {/* Roof trusses. */}
      {trussZs.map((z) => (
        <mesh
          key={z}
          position={[0, ROOM_HEIGHT - 0.45, z]}
          material={materials.steel}>
          <boxGeometry args={[ROOM_WIDTH, 0.5, 0.22]} />
        </mesh>
      ))}
    </group>
  );
}

// High-bay lamps on drop rods. Only the ones over the central aisle carry a
// real light; the rest are glowing dishes. One over the Venus lot is dead.
const AISLE_LAMP_ZS = [17, 7, -3, -13];
const SIDE_LAMPS: [number, number][] = [
  [-7.5, 5],
  [7.5, 5],
  [-7.5, -11],
  [7.5, -11],
];
const DEAD_LAMP = "-7.5:5";
const LAMP_Y = ROOM_HEIGHT - 1.6;

function HighBays() {
  const materials = useMemo(
    () => ({
      shade: new MeshStandardMaterial({
        color: "#5c6470",
        roughness: 0.4,
        metalness: 0.7,
        side: DoubleSide,
      }),
      glow: new MeshBasicMaterial({
        color: new Color(2.6, 2.7, 2.5),
        toneMapped: false,
      }),
      dead: new MeshBasicMaterial({ color: "#4b4a50" }),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );

  const lamps: { key: string; x: number; z: number; lit: boolean }[] = [
    ...AISLE_LAMP_ZS.map((z) => ({ key: `0:${z}`, x: 0, z, lit: true })),
    ...SIDE_LAMPS.map(([x, z]) => ({
      key: `${x}:${z}`,
      x,
      z,
      lit: `${x}:${z}` !== DEAD_LAMP,
    })),
  ];
  return (
    <group name="high-bays">
      {lamps.map(({ key, x, z, lit }) => (
        <group key={key} position={[x, LAMP_Y, z]}>
          <mesh position={[0, 0.8, 0]} material={materials.shade}>
            <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
          </mesh>
          <mesh material={materials.shade}>
            <cylinderGeometry args={[0.18, 0.6, 0.55, 20, 1, true]} />
          </mesh>
          <mesh
            position={[0, -0.2, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={lit ? materials.glow : materials.dead}>
            <circleGeometry args={[0.5, 20]} />
          </mesh>
        </group>
      ))}
      {AISLE_LAMP_ZS.map((z) => (
        <pointLight
          key={z}
          position={[0, LAMP_Y - 0.6, z]}
          color="#dfe6ff"
          intensity={14}
          distance={22}
          decay={1.5}
        />
      ))}
    </group>
  );
}

// Yellow painted borders around each floor lot, and a walkway line down to
// the suns.
function FloorMarkings() {
  const material = useMemo(
    () => new MeshStandardMaterial({ color: "#c9a52c", roughness: 0.7 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const W = 0.1;
  const strips: { x: number; z: number; w: number; d: number }[] = [];
  for (const l of LOTS) {
    const cx = (l.x0 + l.x1) / 2;
    const cz = (l.z0 + l.z1) / 2;
    const w = Math.abs(l.x1 - l.x0) + 0.3;
    const d = Math.abs(l.z1 - l.z0) + 0.3;
    strips.push(
      { x: cx, z: cz - d / 2, w, d: W },
      { x: cx, z: cz + d / 2, w, d: W },
      { x: cx - w / 2, z: cz, w: W, d },
      { x: cx + w / 2, z: cz, w: W, d },
    );
  }
  // The keep-clear box in front of the suns.
  strips.push(
    { x: 0, z: SUN_Z + 2.6, w: 16.2, d: W },
    { x: -8.05, z: SUN_Z + 1.3, w: W, d: 2.6 },
    { x: 8.05, z: SUN_Z + 1.3, w: W, d: 2.6 },
  );
  return (
    <group name="floor-markings">
      {strips.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, 0.006, s.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={material}>
          <planeGeometry args={[s.w, s.d]} />
        </mesh>
      ))}
    </group>
  );
}

// Lot signs hang over the front (south) edge of each lot, readable as you
// walk up the aisle from the door; the suns get one too.
const SIGN_W = 3.6;
const SIGN_H = 0.9;
const SIGN_Y = 6.2;

function LotSigns() {
  const signs = useMemo(() => {
    const all = [
      ...LOTS.map((l) => ({
        key: l.id,
        number: l.number,
        label: l.label,
        x: (l.x0 + l.x1) / 2,
        z: l.z0 + 0.2,
      })),
    ];
    return all.map((s) => ({
      ...s,
      material: new MeshStandardMaterial({
        map: makeLotSignTexture(s.number, s.label),
        roughness: 0.7,
      }),
    }));
  }, []);
  const rod = useMemo(
    () => new MeshStandardMaterial({ color: "#2a2930", metalness: 0.6 }),
    [],
  );
  useEffect(
    () => () => {
      signs.forEach((s) => {
        s.material.map?.dispose();
        s.material.dispose();
      });
      rod.dispose();
    },
    [signs, rod],
  );
  const rodLength = ROOM_HEIGHT - 0.45 - SIGN_Y - SIGN_H / 2;
  return (
    <group name="lot-signs">
      {signs.map((s) => (
        <group key={s.key} position={[s.x, SIGN_Y, s.z]}>
          <mesh material={s.material}>
            <planeGeometry args={[SIGN_W, SIGN_H]} />
          </mesh>
          {/* Same face on the back, for walking back to the door. */}
          <mesh rotation={[0, Math.PI, 0]} material={s.material}>
            <planeGeometry args={[SIGN_W, SIGN_H]} />
          </mesh>
          {[-1.4, 1.4].map((x) => (
            <mesh
              key={x}
              position={[x, SIGN_H / 2 + rodLength / 2, 0]}
              material={rod}>
              <cylinderGeometry args={[0.015, 0.015, rodLength, 4]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// The way back: the other side of the cave's staff door, with a sign.
function StockroomDoor() {
  const { scene } = useGLTF("/models/door/door.glb");
  const door = useMemo(() => scene.clone(true), [scene]);
  const sign = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1d3b33";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#e8e4d8";
    ctx.font = "bold 52px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FRONT OF HOUSE", 256, 52);
    ctx.font = "bold 24px Arial, Helvetica, sans-serif";
    ctx.fillText("SMILE BEFORE ENTERING", 256, 100);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return new MeshStandardMaterial({ map, roughness: 0.6 });
  }, []);
  useEffect(
    () => () => {
      sign.map?.dispose();
      sign.dispose();
    },
    [sign],
  );
  return (
    <group>
      <primitive
        name="stockroom-door"
        object={door}
        position={[DOOR_X, 0, DOOR_Z]}
        rotation={[0, Math.PI, 0]}
      />
      <mesh
        position={[DOOR_X, 4.6, HALF_L - 0.03]}
        rotation={[0, Math.PI, 0]}
        material={sign}>
        <planeGeometry args={[2.2, 0.55]} />
      </mesh>
    </group>
  );
}

// The clerk's desk: a folding table with a CRT turned to the empty chair,
// still showing the island, and a tent card for whoever comes in.
function Desk({ feed }: { feed: FeedTextures | null }) {
  const { scene: tableScene } = useGLTF("/models/desk/plastic-table.glb");
  const { scene: chairScene } = useGLTF("/models/chair/platic-chair.glb");
  const table = useMemo(() => tableScene.clone(true), [tableScene]);
  const chair = useMemo(() => chairScene.clone(true), [chairScene]);
  const shared = useMemo(() => createSharedCrtUniforms(), []);
  const materials = useMemo(
    () => ({
      card: new MeshStandardMaterial({
        map: makeBackSoonTexture(),
        roughness: 0.8,
      }),
      mug: new MeshStandardMaterial({ color: "#e86aa8", roughness: 0.35 }),
      lampShade: new MeshStandardMaterial({
        color: "#2e5a4a",
        roughness: 0.4,
        metalness: 0.4,
        side: DoubleSide,
      }),
      bulb: new MeshBasicMaterial({
        color: new Color(3, 2.5, 1.7),
        toneMapped: false,
      }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );
  useEffect(() => {
    shared.uFeed.value = feed?.feed ?? null;
    shared.uOverlay.value = feed?.overlay ?? null;
    shared.uHasFeed.value = feed ? 1 : 0;
  }, [feed, shared]);
  useFrame((state) => {
    shared.uTime.value = state.clock.getElapsedTime();
  });

  const top = 0.91;
  return (
    <group name="desk" position={[DESK_X, 0, DESK_Z]}>
      <primitive object={table} />
      {/* The empty chair, pushed back, facing the door. */}
      <primitive object={chair} position={[0.2, 0, -1.05]} rotation={[0, 0.2, 0]} />
      {/* Monitor at the front edge, screen turned to the chair. */}
      <group position={[-0.25, top, 0.05]} rotation={[0, Math.PI - 0.2, 0]} scale={0.3}>
        <Crt shared={shared} seed={7.7} mode={CRT_FEED} bodyColor="#c4b9a4" />
      </group>
      {/* Tent card facing the door. */}
      <group position={[0.55, top, 0.4]} rotation={[0, -0.1, 0]}>
        <mesh position={[0, 0.1, 0.04]} rotation={[-0.35, 0, 0]} material={materials.card}>
          <planeGeometry args={[0.42, 0.21]} />
        </mesh>
      </group>
      <mesh position={[0.75, top + 0.06, -0.25]} material={materials.mug}>
        <cylinderGeometry args={[0.05, 0.045, 0.12, 14]} />
      </mesh>
      {/* Desk lamp, still on. */}
      <group position={[-0.85, top, -0.25]}>
        <mesh position={[0, 0.22, 0]} material={materials.lampShade}>
          <cylinderGeometry args={[0.012, 0.012, 0.44, 6]} />
        </mesh>
        <mesh position={[0, 0.46, 0.06]} rotation={[0.6, 0, 0]} material={materials.lampShade}>
          <cylinderGeometry args={[0.05, 0.13, 0.16, 14, 1, true]} />
        </mesh>
        <mesh position={[0, 0.43, 0.1]} material={materials.bulb}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
        <pointLight
          position={[0, 0.3, 0.25]}
          color="#ffcf94"
          intensity={1.1}
          distance={5}
          decay={1.6}
        />
      </group>
    </group>
  );
}

// The inventory, on a whiteboard on the east wall by the desk.
function InventoryBoard() {
  const materials = useMemo(
    () => ({
      face: new MeshStandardMaterial({
        map: makeInventoryTexture(),
        roughness: 0.35,
      }),
      frame: new MeshStandardMaterial({
        color: "#b9bcc2",
        roughness: 0.4,
        metalness: 0.6,
      }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );
  const W = 3.4;
  const H = W * (832 / 1536);
  return (
    <group
      name="inventory-board"
      position={[HALF_W - 0.05, 2.15, DESK_Z]}
      rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.02]} material={materials.frame}>
        <boxGeometry args={[W + 0.1, H + 0.1, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.002]} material={materials.face}>
        <planeGeometry args={[W, H]} />
      </mesh>
    </group>
  );
}

// A roll-up shutter on the west wall that doesn't open. Under it, a thin
// line of warm, ordinary daylight: not pink, not golden hour. Something is
// outside.
function LoadingShutter() {
  const materials = useMemo(() => {
    const shutter = new MeshStandardMaterial({
      map: makeShutterTexture(),
      roughness: 0.55,
      metalness: 0.4,
    });
    const post = new MeshStandardMaterial({ color: "#d3aa22", roughness: 0.6 });
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.3)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const daylight = new MeshBasicMaterial({
      map: new CanvasTexture(canvas),
      color: new Color(2.2, 2.0, 1.6),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const gap = new MeshBasicMaterial({
      color: new Color(3.2, 2.9, 2.3),
      toneMapped: false,
    });
    return { shutter, post, daylight, gap };
  }, []);
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );
  const x = -HALF_W + 0.06;
  return (
    <group name="loading-shutter">
      <mesh
        position={[x, SHUTTER_H / 2 + 0.03, SHUTTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.shutter}>
        <planeGeometry args={[SHUTTER_W, SHUTTER_H]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[x + 0.08, SHUTTER_H / 2, SHUTTER_Z + s * (SHUTTER_W / 2 + 0.12)]}
          material={materials.post}>
          <boxGeometry args={[0.2, SHUTTER_H + 0.2, 0.24]} />
        </mesh>
      ))}
      {/* The bright gap under the shutter's bottom rail. */}
      <mesh
        position={[x + 0.005, 0.015, SHUTTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.gap}>
        <planeGeometry args={[SHUTTER_W - 0.1, 0.03]} />
      </mesh>
      <mesh
        position={[x + 0.6, 0.005, SHUTTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.daylight}>
        <planeGeometry args={[1.2, SHUTTER_W - 0.2]} />
      </mesh>
      <pointLight
        position={[x + 0.4, 0.15, SHUTTER_Z]}
        color="#fff1d6"
        intensity={2.5}
        distance={4}
        decay={2}
      />
    </group>
  );
}

// The front of the warehouse: the slogan over the door, a stack of empty
// pallets and a few returns nobody has put away.
function Receiving() {
  const pallet = usePalletGeometry();
  const { wood } = useStockMaterials();
  const materials = useMemo(
    () => ({
      slogan: new MeshBasicMaterial({
        map: makeSloganTexture("EVERY DAY IS THE SAME BEAUTIFUL DAY"),
        color: new Color(0.55, 0.53, 0.6),
        transparent: true,
        depthWrite: false,
      }),
      box: new MeshStandardMaterial({ map: makeCardboardTexture(), roughness: 0.9 }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );
  const returns: [number, number, number, number, number, number, number][] = [
    // x, z, w, h, d, yaw, y
    [-7.4, 21.6, 0.9, 0.7, 0.8, 0.2, 0],
    [-6.5, 21.9, 0.6, 0.5, 0.6, -0.3, 0],
    [-7.2, 21.7, 0.6, 0.45, 0.55, 0.5, 0.7],
    [-9.6, 21.2, 1.1, 0.9, 0.9, 0.05, 0],
  ];
  return (
    <group name="receiving">
      <mesh
        position={[0, 6.4, HALF_L - 0.02]}
        rotation={[0, Math.PI, 0]}
        material={materials.slogan}>
        <planeGeometry args={[17, 1.33]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          geometry={pallet}
          material={wood}
          position={[-4.6 + Math.sin(i * 2.1) * 0.05, i * 0.135, 22.2]}
          rotation={[0, Math.sin(i * 5.3) * 0.05, 0]}
        />
      ))}
      {returns.map(([x, z, w, h, d, yaw, y], i) => (
        <mesh
          key={i}
          position={[x, y + h / 2, z]}
          rotation={[0, yaw, 0]}
          material={materials.box}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
    </group>
  );
}

// The music plays over these: two horn speakers high on the racks' ends.
function PaHorns() {
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#d9d6cc",
        roughness: 0.5,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="pa-horns">
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * (HALF_W - 1.6), ROOM_HEIGHT - 2.2, 11.4]}
          rotation={[0.25, s * -0.5, 0]}>
          {/* Bell facing +z (down the room, toward the door). */}
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, 0.2]}
            material={material}>
            <cylinderGeometry args={[0.32, 0.08, 0.5, 16, 1, true]} />
          </mesh>
          <mesh position={[0, 0, -0.12]} material={material}>
            <boxGeometry args={[0.18, 0.18, 0.2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/models/statue/helios_vaporwave_bust.glb");
useGLTF.preload("/models/statue/woman1_aiSkin1_0.001.glb");
useGLTF.preload("/models/misc/doric_pillar.glb");
