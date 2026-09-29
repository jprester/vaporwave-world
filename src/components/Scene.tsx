import { useEffect, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import { Fog, PerspectiveCamera } from "three";
import Effects from "./Effects";
import CaveWorld from "./cave/CaveWorld";
import IslandWorld from "./island/IslandWorld";
import { CAVE_LEVEL, ISLAND_LEVEL } from "./levels";
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

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const { world, phase, arrivedByDoor } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  const level = world === "island" ? ISLAND_LEVEL : CAVE_LEVEL;
  const spawn = arrivedByDoor ? level.arrival : level.spawn;
  const playerSnapshot = usePlayerController(level, spawn, phase === "out");

  useEffect(() => {
    scene.fog = FOG[world];
    const cam = camera as PerspectiveCamera;
    cam.near = CAMERA_NEAR[world];
    cam.updateProjectionMatrix();
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
      <group visible={world === "island"}>
        <IslandWorld active={world === "island" && phase !== "out"} />
      </group>
      <group visible={world === "cave"}>
        <CaveWorld active={world === "cave" && phase !== "out"} feed={null} />
      </group>
      <Effects />
    </>
  );
}
