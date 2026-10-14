import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { LineBasicMaterial, LineSegments, MeshMatcapMaterial } from "three";
import { clayClone, makeClayMatcap } from "./clay";

// The grey door: the same door model as every other door, but never dressed.
// Flat clay with its edges drawn in, lit by nothing in the room around it.
// One stands in each world and leads to the forms, where nothing is dressed.

interface Props {
  x: number;
  y?: number;
  z: number;
  // Unit vector out of the door's front face, on the XZ plane.
  normal: [number, number];
}

export default function GreyDoor({ x, y = 0, z, normal }: Props) {
  const { scene } = useGLTF("/models/door/door.glb");
  const { door, dispose } = useMemo(() => {
    const matcap = makeClayMatcap();
    const clay = new MeshMatcapMaterial({ matcap, color: "#e6e6e3" });
    // Only the main edges: from across the island the bevels' lines would
    // run together into a dark smudge.
    const edges = new LineBasicMaterial({ color: "#2e2e2e" });
    const door = clayClone(scene, clay, edges, 60);
    door.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
    return {
      door,
      dispose: () => {
        matcap.dispose();
        clay.dispose();
        edges.dispose();
        door.traverse((o) => {
          if (o instanceof LineSegments) o.geometry.dispose();
        });
      },
    };
  }, [scene]);
  useEffect(() => dispose, [dispose]);

  const [nx, nz] = normal;
  return (
    <primitive
      name="grey-door"
      object={door}
      position={[x, y, z]}
      rotation={[0, Math.atan2(nx, nz), 0]}
    />
  );
}

useGLTF.preload("/models/door/door.glb");
