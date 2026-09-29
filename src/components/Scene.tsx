import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useThree } from "@react-three/fiber";
import {
  Fog,
  Group,
  PerspectiveCamera,
  Texture,
  WebGLRenderTarget,
} from "three";
import Effects from "./Effects";
import CaveWorld from "./cave/CaveWorld";
import IslandFeed from "./IslandFeed";
import IslandWorld from "./island/IslandWorld";
import { CAVE_LEVEL, ISLAND_LEVEL } from "./levels";
import { setAcoustics, setDistanceVolume } from "./musicStore";
import { usePlayerController } from "./player/usePlayerController";
import { getSnapshot, subscribe, travel, type WorldId } from "./worldStore";

// Both worlds stay mounted; only the current one is visible (and so drawn and
// lit). Fog and the camera's near plane are per world: the island needs a far
// horizon haze, the cave a close, dim one and a near plane that doesn't clip
// the chairs.

// Fog color chosen so that, once mixed in the Water/sky shaders' display
// space (the renderer passes the linear value), fully-fogged pixels render
// as the sky shader's horizon color (#EBADC2). This makes the distant
// ocean melt into the horizon instead of ending in a hard teal edge.
const FOG: Record<WorldId, Fog> = {
  island: new Fog(0xf6d7e2, 60, 700),
  cave: new Fog(0x160e1c, 9, 46),
};
const CAMERA_NEAR: Record<WorldId, number> = { island: 1, cave: 0.05 };
// In the cave the boombox is somewhere overhead: a steady, muffled level.
// (On the island, MusicPlayer sets the level from distance every frame.)
const CAVE_MUSIC_LEVEL = 0.8;

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const { world, destination, phase, arrivedByDoor } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  const level = world === "island" ? ISLAND_LEVEL : CAVE_LEVEL;
  const spawn = arrivedByDoor ? level.arrival : level.spawn;
  const playerSnapshot = usePlayerController(level, spawn, phase === "out");

  const islandGroup = useRef<Group>(null);
  const caveGroup = useRef<Group>(null);
  const [feed, setFeed] = useState<Texture | null>(null);
  const onFeedTarget = useCallback(
    (target: WebGLRenderTarget) => setFeed(target.texture),
    [],
  );

  useEffect(() => {
    scene.fog = FOG[world];
    const cam = camera as PerspectiveCamera;
    cam.near = CAMERA_NEAR[world];
    cam.updateProjectionMatrix();
    setAcoustics(world === "cave" ? "muffled" : "open");
    if (world === "cave") setDistanceVolume(CAVE_MUSIC_LEVEL);
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
      <IslandFeed
        enabled={world === "cave" || destination === "cave"}
        island={islandGroup}
        cave={caveGroup}
        islandFog={FOG.island}
        onTarget={onFeedTarget}
      />
      <Effects />
    </>
  );
}
