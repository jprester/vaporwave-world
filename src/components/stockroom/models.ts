import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Object3D, Vector3 } from "three";

// The stockroom reuses the island's own models: spares of the very props out
// there. These helpers clone a GLB with its root transform reset (the island
// moves and scales the shared originals) and report how to scale and offset
// it so it stands on y = 0, centred, at a given height.

export interface FittedModel {
  scale: number;
  // Offset (already scaled) that puts the model's base centre at the origin.
  offset: [number, number, number];
  // Unscaled size.
  size: Vector3;
  clone: () => Object3D;
}

function cleanClone(scene: Group) {
  const c = scene.clone(true);
  c.position.set(0, 0, 0);
  c.rotation.set(0, 0, 0);
  c.scale.set(1, 1, 1);
  c.updateMatrixWorld(true);
  return c;
}

export function useFittedModel(url: string, height: number): FittedModel {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const probe = cleanClone(scene);
    const box = new Box3().setFromObject(probe);
    const size = box.getSize(new Vector3());
    const s = height / size.y;
    return {
      scale: s,
      offset: [
        (-(box.min.x + box.max.x) / 2) * s,
        -box.min.y * s,
        (-(box.min.z + box.max.z) / 2) * s,
      ],
      size,
      clone: () => cleanClone(scene),
    };
  }, [scene, height]);
}

export const MODEL = {
  venus: "/models/statue/woman1_aiSkin1_0.001.glb",
  helios: "/models/statue/helios_vaporwave_bust.glb",
  column: "/models/misc/doric_pillar.glb",
  door: "/models/door/door.glb",
};
