import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useThree } from "@react-three/fiber";
import { Fog, Group, PerspectiveCamera } from "three";
import Effects from "./Effects";
import CaveWorld from "./cave/CaveWorld";
import IslandFeed, { type FeedTextures } from "./IslandFeed";
import IslandWorld from "./island/IslandWorld";
import {
  CAVE_LEVEL,
  ISLAND_LEVEL,
  MALL_LEVEL,
  STOCKROOM_LEVEL,
  type Level,
} from "./levels";
import {
  setAcoustics,
  setDistanceVolume,
  setNearBoombox,
  type Acoustics,
} from "./musicStore";
import StockroomWorld from "./stockroom/StockroomWorld";
import { usePlayerController } from "./player/usePlayerController";
import {
  getSnapshot,
  isWorldReady,
  subscribe,
  travel,
  type WorldId,
} from "./worldStore";

// The mall loads lazily, the first time a door to it is in reach (see
// mallWanted below).
const MallWorld = lazy(() => import("./mall/MallWorld"));

// All worlds stay mounted; only the current one is visible (and so drawn and
// lit). Fog, the camera's near plane and the acoustics are per world: the
// island needs a far horizon haze, the indoor worlds a close, dim one and a
// near plane that doesn't clip the furniture.

// Fog color chosen so that, once mixed in the Water/sky shaders' display
// space (the renderer passes the linear value), fully-fogged pixels render
// as the sky shader's pink horizon band. This makes the distant
// ocean melt into the horizon instead of ending in a hard teal edge.
const FOG: Record<WorldId, Fog> = {
  island: new Fog(0xefb9d4, 80, 900),
  cave: new Fog(0x160e1c, 9, 46),
  stockroom: new Fog(0x0d0c14, 18, 66),
  // Night air, blue-black, deepening down the length of the atrium.
  mall: new Fog(0x0a0c1a, 28, 120),
};
const CAMERA_NEAR: Record<WorldId, number> = {
  island: 1,
  cave: 0.05,
  stockroom: 0.05,
  mall: 0.05,
};
const LEVELS: Record<WorldId, Level> = {
  island: ISLAND_LEVEL,
  cave: CAVE_LEVEL,
  stockroom: STOCKROOM_LEVEL,
  mall: MALL_LEVEL,
};
// Island: straight from the boombox. Cave: out of the TVs. Stockroom: over
// the warehouse PA, into a big reverberant hall. Mall: muzak from the
// ceiling speakers, into a bigger, brighter one.
const ACOUSTICS: Record<WorldId, Acoustics> = {
  island: "open",
  cave: "tv",
  stockroom: "hall",
  mall: "mall",
};
// Indoors the music's placement and falloff are handled by the Web Audio
// graph (see musicStore), so the base level is simply full. (On the island,
// MusicPlayer sets the level from distance every frame.)
const INDOOR_MUSIC_LEVEL = 1;
// Worlds that show Plato TV somewhere, so the island feed must be rendering.
const WATCHES_TV = new Set<WorldId>(["cave", "stockroom", "mall"]);

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const { world, destination, phase, cameFrom, nearDoor } =
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const level = LEVELS[world];
  const spawn = (cameFrom && level.arrivals[cameFrom]) || level.spawn;
  const playerSnapshot = usePlayerController(level, spawn, phase === "out");

  const islandGroup = useRef<Group>(null);
  const caveGroup = useRef<Group>(null);
  const stockroomGroup = useRef<Group>(null);
  const mallGroup = useRef<Group>(null);
  // Mount the mall once it's wanted: the player is at a door to it, on the
  // way there, or started there. It stays mounted after that.
  const [mallWanted, setMallWanted] = useState(false);
  const wantMall =
    world === "mall" || destination === "mall" || nearDoor === "mall";
  if (wantMall && !mallWanted) setMallWanted(true);
  const [feed, setFeed] = useState<FeedTextures | null>(null);
  const onFeedTextures = useCallback((t: FeedTextures) => setFeed(t), []);

  useEffect(() => {
    scene.fog = FOG[world];
    const cam = camera as PerspectiveCamera;
    cam.near = CAMERA_NEAR[world];
    cam.updateProjectionMatrix();
    setAcoustics(ACOUSTICS[world]);
    setNearBoombox(false);
    // The island sets the level from the boombox distance.
    if (world !== "island") {
      setDistanceVolume(INDOOR_MUSIC_LEVEL);
    }
    return () => {
      scene.fog = null;
    };
  }, [camera, scene, world]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem:
          "x right, y up, z forward/back in Three.js world units",
        world: getSnapshot().world,
        // False until a lazily loaded world has mounted.
        ready: isWorldReady(getSnapshot().world),
        transition: getSnapshot().phase,
        nearDoor: getSnapshot().nearDoor,
        player: playerSnapshot.current,
        controls: "grounded-walk",
        pointerLocked: document.pointerLockElement === gl.domElement,
      });

    window.advanceTime = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

    window.travel = travel;
    window.qa_doors = () => JSON.stringify(LEVELS[getSnapshot().world].doors);
    // Draw calls and triangles over one whole frame (every composer pass),
    // plus the GPU memory counts.
    window.qa_renderInfo = async () => {
      const frame = () =>
        new Promise<void>((r) => window.requestAnimationFrame(() => r()));
      await frame();
      gl.info.autoReset = false;
      gl.info.reset();
      await frame();
      const info = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        lines: gl.info.render.lines,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
      };
      gl.info.autoReset = true;
      return JSON.stringify(info);
    };
  }, [gl, playerSnapshot]);

  return (
    <>
      <group ref={islandGroup} visible={world === "island"}>
        <IslandWorld active={world === "island" && phase !== "out"} />
      </group>
      <group ref={caveGroup} visible={world === "cave"}>
        <CaveWorld active={world === "cave" && phase !== "out"} feed={feed} />
      </group>
      <group ref={stockroomGroup} visible={world === "stockroom"}>
        <StockroomWorld
          active={world === "stockroom" && phase !== "out"}
          feed={feed}
        />
      </group>
      <group ref={mallGroup} visible={world === "mall"}>
        {mallWanted && (
          <Suspense fallback={null}>
            <MallWorld active={world === "mall" && phase !== "out"} feed={feed} />
          </Suspense>
        )}
      </group>
      <IslandFeed
        enabled={WATCHES_TV.has(world) || WATCHES_TV.has(destination)}
        island={islandGroup}
        others={[caveGroup, stockroomGroup, mallGroup]}
        islandFog={FOG.island}
        onTextures={onFeedTextures}
      />
      <Effects world={world} />
    </>
  );
}
