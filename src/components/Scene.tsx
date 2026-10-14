import {
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
import { CAVE_LEVEL, ISLAND_LEVEL, STOCKROOM_LEVEL, type Level } from "./levels";
import { setAcoustics, setDistanceVolume, type Acoustics } from "./musicStore";
import StockroomWorld from "./stockroom/StockroomWorld";
import { usePlayerController } from "./player/usePlayerController";
import { getSnapshot, subscribe, travel, type WorldId } from "./worldStore";

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
};
const CAMERA_NEAR: Record<WorldId, number> = {
  island: 1,
  cave: 0.05,
  stockroom: 0.05,
};
const LEVELS: Record<WorldId, Level> = {
  island: ISLAND_LEVEL,
  cave: CAVE_LEVEL,
  stockroom: STOCKROOM_LEVEL,
};
// Island: straight from the boombox. Cave: out of the TVs. Stockroom: over
// the warehouse PA, into a big reverberant hall.
const ACOUSTICS: Record<WorldId, Acoustics> = {
  island: "open",
  cave: "tv",
  stockroom: "hall",
};
// Indoors the music's placement and falloff are handled by the Web Audio
// graph (see musicStore), so the base level is simply full. (On the island,
// MusicPlayer sets the level from distance every frame.)
const INDOOR_MUSIC_LEVEL = 1;
// Worlds that show Plato TV somewhere, so the island feed must be rendering.
const WATCHES_TV = new Set<WorldId>(["cave", "stockroom"]);

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const { world, destination, phase, cameFrom } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  const level = LEVELS[world];
  const spawn = (cameFrom && level.arrivals[cameFrom]) || level.spawn;
  const playerSnapshot = usePlayerController(level, spawn, phase === "out");

  const islandGroup = useRef<Group>(null);
  const caveGroup = useRef<Group>(null);
  const stockroomGroup = useRef<Group>(null);
  const [feed, setFeed] = useState<FeedTextures | null>(null);
  const onFeedTextures = useCallback((t: FeedTextures) => setFeed(t), []);

  useEffect(() => {
    scene.fog = FOG[world];
    const cam = camera as PerspectiveCamera;
    cam.near = CAMERA_NEAR[world];
    cam.updateProjectionMatrix();
    setAcoustics(ACOUSTICS[world]);
    if (world !== "island") setDistanceVolume(INDOOR_MUSIC_LEVEL);
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
      <IslandFeed
        enabled={WATCHES_TV.has(world) || WATCHES_TV.has(destination)}
        island={islandGroup}
        others={[caveGroup, stockroomGroup]}
        islandFog={FOG.island}
        onTextures={onFeedTextures}
      />
      <Effects />
    </>
  );
}
