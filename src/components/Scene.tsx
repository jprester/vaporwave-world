import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import Effects from "./Effects";
import IslandWorld from "./island/IslandWorld";
import { ISLAND_LEVEL } from "./levels";
import { usePlayerController } from "./player/usePlayerController";

export default function Scene() {
  const { gl } = useThree();
  const playerSnapshot = usePlayerController(ISLAND_LEVEL);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem:
          "x right, y up, z forward/back in Three.js world units",
        world: "island",
        player: playerSnapshot.current,
        controls: "grounded-walk",
        pointerLocked: document.pointerLockElement === gl.domElement,
      });

    window.advanceTime = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
  }, [gl, playerSnapshot]);

  return (
    <>
      <IslandWorld />
      <Effects />
    </>
  );
}
