import { useGLTF } from "@react-three/drei";
import {
  COLUMN_POSITIONS,
  DOOR_X,
  DOOR_Z,
  FLOOR_HEIGHT,
  PEDESTAL_CENTER_X,
  PEDESTAL_CENTER_Z,
  PEDESTAL_HEIGHT,
} from "./constants";

export function DoricColumns() {
  const { scene } = useGLTF("/models/misc/doric_pillar.glb");
  return (
    <group name="doric-columns">
      {COLUMN_POSITIONS.map((pos, i) => (
        <primitive
          key={i}
          name={`doric-column-${i}`}
          object={scene.clone(true)}
          position={pos}
        />
      ))}
    </group>
  );
}

export function VaporwaveBust() {
  const { scene } = useGLTF("/models/statue/helios_vaporwave_bust.glb");
  return (
    <primitive
      name="vaporwave-bust"
      object={scene}
      position={[60, 0, -182]}
      scale={[2, 2, 2]}
    />
  );
}

export function WomanStatue() {
  const { scene } = useGLTF("/models/statue/woman1_aiSkin1_0.001.glb");
  return (
    <primitive
      name="woman-statue"
      object={scene}
      position={[
        PEDESTAL_CENTER_X,
        FLOOR_HEIGHT + PEDESTAL_HEIGHT,
        PEDESTAL_CENTER_Z,
      ]}
      rotation={[0, 2 * Math.PI, 0]}
      scale={[3, 3, 3]}
    />
  );
}

export function FloorDoor() {
  const { scene } = useGLTF("/models/door/door.glb");
  return (
    <primitive
      name="floor-door"
      object={scene}
      position={[DOOR_X, FLOOR_HEIGHT, DOOR_Z]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}
