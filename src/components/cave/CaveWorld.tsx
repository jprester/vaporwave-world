import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { FeedTextures } from "../IslandFeed";
import DoorTrigger from "../DoorTrigger";
import { setListenerPose, setTvSource } from "../musicStore";
import {
  CRT_FEED,
  CRT_NO_SIGNAL,
  CRT_STATIC,
  createCrtMaterial,
  createSharedCrtUniforms,
  type SharedCrtUniforms,
} from "./crtMaterial";
import {
  CARTS,
  CART_D,
  CART_H,
  CART_W,
  CAVE_DOOR_X,
  CAVE_DOOR_Z,
  CHAIR_ROWS_Z,
  CHAIR_SEATS_X,
  CRT_D,
  CRT_H,
  CRT_W,
  HALF_L,
  HALF_W,
  ROOM_HEIGHT,
  ROOM_LENGTH,
  ROOM_WIDTH,
  STAND_D,
  STAND_H,
  STAND_Z,
  WALL_COLS,
  WALL_ROWS,
} from "./constants";
import {
  makeCarpetTexture,
  makeCeilingTexture,
  makeWallTexture,
} from "./textures";

// The cave: a closed-down hotel conference room. Empty plastic chairs face a
// wall of mismatched CRTs, all tuned to a live picture of the island.

interface Props {
  active: boolean;
  // Live broadcast of the island (see IslandFeed). Null until it mounts.
  feed: FeedTextures | null;
}

export default function CaveWorld({ active, feed }: Props) {
  const shared = useMemo(() => createSharedCrtUniforms(), []);

  useEffect(() => {
    shared.uFeed.value = feed?.feed ?? null;
    shared.uOverlay.value = feed?.overlay ?? null;
    shared.uHasFeed.value = feed ? 1 : 0;
  }, [feed, shared]);

  useFrame((state) => {
    shared.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <group name="cave-world">
      <ambientLight intensity={0.25} color="#b9a6d6" />
      <hemisphereLight
        intensity={0.35}
        color="#d8d4ff"
        groundColor="#3a2240"
      />
      <Room />
      <CeilingLights />
      <VideoWall shared={shared} />
      {CARTS.map((cart, i) => (
        <AvCart key={i} {...cart} shared={shared} seed={20 + i} />
      ))}
      <Chairs />
      <CaveDoor />
      <ExitSign />
      <TvSpeaker active={active} />
      <DoorTrigger
        x={CAVE_DOOR_X}
        z={CAVE_DOOR_Z}
        normal={[0, -1]}
        active={active}
      />
    </group>
  );
}

// The music plays from the video wall: place the sound source there and keep
// the listener on the player's head while the cave is the current world.
function TvSpeaker({ active }: { active: boolean }) {
  const camera = useThree((s) => s.camera);
  const forward = useMemo(() => new Vector3(), []);

  useEffect(() => {
    setTvSource(0, STAND_H + (WALL_ROWS * CRT_H) / 2, STAND_Z);
  }, []);

  useFrame(() => {
    if (!active) return;
    camera.getWorldDirection(forward);
    const p = camera.position;
    setListenerPose(p.x, p.y, p.z, forward.x, forward.y, forward.z);
  });

  return null;
}

function Room() {
  const materials = useMemo(() => {
    const carpet = new MeshStandardMaterial({
      map: makeCarpetTexture(ROOM_WIDTH / 3, ROOM_LENGTH / 3),
      roughness: 0.95,
    });
    const ceiling = new MeshStandardMaterial({
      map: makeCeilingTexture(ROOM_WIDTH / 1.2, ROOM_LENGTH / 1.2),
      roughness: 0.9,
    });
    const longWall = new MeshStandardMaterial({
      map: makeWallTexture(ROOM_LENGTH / 2.4),
      roughness: 0.85,
    });
    const shortWall = new MeshStandardMaterial({
      map: makeWallTexture(ROOM_WIDTH / 2.4),
      roughness: 0.85,
    });
    return { carpet, ceiling, longWall, shortWall };
  }, []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [materials],
  );

  const midY = ROOM_HEIGHT / 2;
  return (
    <group name="cave-room">
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.carpet}
        receiveShadow>
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
    </group>
  );
}

// Recessed fluorescent troffers in two rows. One tube is dead and one
// flickers; a few point lights stand in for the panels' actual light.
const PANEL_ZS = [14, 8, 2, -4, -10, -15];
const PANEL_XS = [-4, 4];
const DEAD_PANEL = "4:-4";
const FLICKER_PANEL = "-4:8";
const CEILING_LIGHT_ZS = [12, 3, -6, -14];

function CeilingLights() {
  const panelMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(2.2, 2.3, 2.1),
        toneMapped: false,
      }),
    [],
  );
  const deadMaterial = useMemo(
    () => new MeshBasicMaterial({ color: "#6d6a66" }),
    [],
  );
  const flickerMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(2.2, 2.3, 2.1),
        toneMapped: false,
      }),
    [],
  );
  const flickerLight = useRef<PointLight>(null);
  const flickerOn = useRef(1);

  useEffect(
    () => () => {
      panelMaterial.dispose();
      deadMaterial.dispose();
      flickerMaterial.dispose();
    },
    [panelMaterial, deadMaterial, flickerMaterial],
  );

  useFrame(() => {
    // Mostly on, with short irregular dropouts.
    if (Math.random() < (flickerOn.current ? 0.02 : 0.25)) {
      flickerOn.current = flickerOn.current ? 0 : 1;
    }
    const level = flickerOn.current ? 1 : 0.08;
    flickerMaterial.color.setRGB(2.2 * level, 2.3 * level, 2.1 * level);
    if (flickerLight.current) {
      flickerLight.current.intensity = 5 * level;
    }
  });

  return (
    <group name="cave-ceiling-lights">
      {PANEL_ZS.flatMap((z) =>
        PANEL_XS.map((x) => {
          const key = `${x}:${z}`;
          const material =
            key === DEAD_PANEL
              ? deadMaterial
              : key === FLICKER_PANEL
                ? flickerMaterial
                : panelMaterial;
          return (
            <mesh
              key={key}
              position={[x, ROOM_HEIGHT - 0.02, z]}
              rotation={[Math.PI / 2, 0, 0]}
              material={material}>
              <planeGeometry args={[1.2, 2.4]} />
            </mesh>
          );
        }),
      )}
      {CEILING_LIGHT_ZS.map((z) => (
        <pointLight
          key={z}
          position={[0, ROOM_HEIGHT - 1.1, z]}
          color="#e9f2e4"
          intensity={9}
          distance={18}
          decay={1.6}
        />
      ))}
      <pointLight
        ref={flickerLight}
        position={[-4, ROOM_HEIGHT - 0.4, 8]}
        color="#e9f2e4"
        intensity={5}
        distance={9}
        decay={1.6}
      />
    </group>
  );
}

const BEIGE = "#c4b9a4";
const CHARCOAL = "#2c2a31";
const SMOKE = "#6b6570";

// One CRT television. The screen faces +z in local space.
function Crt({
  shared,
  seed,
  mode,
  bodyColor,
}: {
  shared: SharedCrtUniforms;
  seed: number;
  mode: number;
  bodyColor: string;
}) {
  const screenMaterial = useMemo(
    () => createCrtMaterial(shared, seed, mode),
    [shared, seed, mode],
  );
  const bodyMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: bodyColor,
        roughness: 0.55,
        metalness: 0.05,
      }),
    [bodyColor],
  );
  useEffect(
    () => () => {
      screenMaterial.dispose();
      bodyMaterial.dispose();
    },
    [screenMaterial, bodyMaterial],
  );

  return (
    <group>
      <mesh position={[0, CRT_H / 2, 0]} material={bodyMaterial}>
        <boxGeometry args={[CRT_W, CRT_H, CRT_D * 0.55]} />
      </mesh>
      {/* Tapered tube housing at the back. */}
      <mesh
        position={[0, CRT_H * 0.46, -CRT_D * 0.4]}
        material={bodyMaterial}>
        <boxGeometry args={[CRT_W * 0.72, CRT_H * 0.78, CRT_D * 0.35]} />
      </mesh>
      <mesh
        position={[-CRT_W * 0.07, CRT_H * 0.53, CRT_D * 0.275 + 0.004]}
        material={screenMaterial}>
        <planeGeometry args={[CRT_W * 0.72, CRT_H * 0.74]} />
      </mesh>
      {/* Power LED. */}
      <mesh position={[CRT_W * 0.4, CRT_H * 0.14, CRT_D * 0.275 + 0.004]}>
        <circleGeometry args={[0.025, 10]} />
        <meshBasicMaterial color={[3, 0.3, 0.2]} toneMapped={false} />
      </mesh>
    </group>
  );
}

function wallScreenMode(i: number) {
  if (i === 3 || i === 11) return CRT_STATIC;
  if (i === 8) return CRT_NO_SIGNAL;
  return CRT_FEED;
}

function VideoWall({ shared }: { shared: SharedCrtUniforms }) {
  const glow = useRef<PointLight>(null);
  const standMaterial = useMemo(
    () => new MeshStandardMaterial({ color: "#3b2c33", roughness: 0.7 }),
    [],
  );
  useEffect(() => () => standMaterial.dispose(), [standMaterial]);

  useFrame((state) => {
    // The screens' spill on the carpet and chairs, breathing slightly.
    if (glow.current) {
      const t = state.clock.getElapsedTime();
      glow.current.intensity = 14 + Math.sin(t * 1.7) * 1.5 + Math.sin(t * 7.3) * 0.6;
    }
  });

  const width = WALL_COLS * CRT_W;
  const screens = [];
  for (let row = 0; row < WALL_ROWS; row++) {
    for (let col = 0; col < WALL_COLS; col++) {
      const i = row * WALL_COLS + col;
      const x = -width / 2 + CRT_W / 2 + col * CRT_W;
      const y = STAND_H + row * CRT_H;
      const bodyColor = (i * 7 + row) % 3 === 0 ? CHARCOAL : (i % 4 === 1 ? SMOKE : BEIGE);
      screens.push(
        <group key={i} position={[x, y, STAND_Z + 0.05]}>
          <Crt
            shared={shared}
            seed={i * 1.37}
            mode={wallScreenMode(i)}
            bodyColor={bodyColor}
          />
        </group>,
      );
    }
  }

  return (
    <group name="video-wall">
      <mesh
        position={[0, STAND_H / 2, STAND_Z]}
        material={standMaterial}>
        <boxGeometry args={[width + 0.4, STAND_H, STAND_D]} />
      </mesh>
      {screens}
      <pointLight
        ref={glow}
        position={[0, 2.2, STAND_Z + 3]}
        color="#f39ad0"
        intensity={14}
        distance={20}
        decay={1.5}
      />
    </group>
  );
}

// Rolling AV cart: two shelves on four legs, one CRT on top.
function AvCart({
  x,
  z,
  yaw,
  shared,
  seed,
}: {
  x: number;
  z: number;
  yaw: number;
  shared: SharedCrtUniforms;
  seed: number;
}) {
  const metal = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#1d1c22",
        roughness: 0.45,
        metalness: 0.6,
      }),
    [],
  );
  useEffect(() => () => metal.dispose(), [metal]);

  const legs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      {legs.map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[(sx * CART_W) / 2.2, CART_H / 2, (sz * CART_D) / 2.2]}
          material={metal}>
          <boxGeometry args={[0.05, CART_H, 0.05]} />
        </mesh>
      ))}
      {[0.18, CART_H].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={metal}>
          <boxGeometry args={[CART_W, 0.04, CART_D]} />
        </mesh>
      ))}
      <group position={[0, CART_H + 0.02, 0.05]} scale={0.8}>
        <Crt
          shared={shared}
          seed={seed}
          mode={CRT_FEED}
          bodyColor={seed % 2 ? BEIGE : CHARCOAL}
        />
      </group>
    </group>
  );
}

// Rows of plastic chairs facing the screens. One chair in the back row has
// been turned around to face the door.
function Chairs() {
  const { scene } = useGLTF("/models/chair/platic-chair.glb");
  const chairs = useMemo(() => {
    const out: { key: string; x: number; z: number; yaw: number; object: Group }[] = [];
    let n = 0;
    CHAIR_ROWS_Z.forEach((z, row) => {
      for (const side of [-1, 1]) {
        CHAIR_SEATS_X.forEach((sx, seat) => {
          n += 1;
          const turned = row === 0 && side === 1 && seat === 1;
          // The model's seat faces +z; turn it to face the screens (-z).
          const jitter = Math.sin(n * 12.9898) * 0.07;
          out.push({
            key: `${row}-${side}-${seat}`,
            x: side * sx,
            z,
            yaw: turned ? 0.25 : Math.PI + jitter,
            object: scene.clone(true),
          });
        });
      }
    });
    return out;
  }, [scene]);

  return (
    <group name="cave-chairs">
      {chairs.map((c) => (
        <primitive
          key={c.key}
          object={c.object}
          position={[c.x, 0, c.z]}
          rotation={[0, c.yaw, 0]}
        />
      ))}
    </group>
  );
}

function CaveDoor() {
  const { scene } = useGLTF("/models/door/door.glb");
  const door = useMemo(() => scene.clone(true), [scene]);
  return (
    <primitive
      name="cave-door"
      object={door}
      position={[CAVE_DOOR_X, 0, CAVE_DOOR_Z]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

// Backlit red EXIT sign on the wall beside the door.
function ExitSign() {
  const faceMaterial = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a0606";
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = "#ff3a2a";
    ctx.font = "bold 64px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("EXIT", 128, 52);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return new MeshBasicMaterial({
      map,
      color: new Color(2.4, 2.4, 2.4),
      toneMapped: false,
    });
  }, []);
  const housing = useRef<Mesh>(null);
  useEffect(
    () => () => {
      faceMaterial.map?.dispose();
      faceMaterial.dispose();
    },
    [faceMaterial],
  );

  return (
    <group position={[CAVE_DOOR_X + 2.3, 3.3, HALF_L - 0.06]} rotation={[0, Math.PI, 0]}>
      <mesh ref={housing} position={[0, 0, -0.03]}>
        <boxGeometry args={[0.95, 0.38, 0.06]} />
        <meshStandardMaterial color="#d8d2cc" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.001]} material={faceMaterial}>
        <planeGeometry args={[0.85, 0.3]} />
      </mesh>
      <pointLight
        position={[0, 0, 0.4]}
        color="#ff3a2a"
        intensity={1.5}
        distance={4}
        decay={2}
      />
    </group>
  );
}

useGLTF.preload("/models/chair/platic-chair.glb");
useGLTF.preload("/models/door/door.glb");
