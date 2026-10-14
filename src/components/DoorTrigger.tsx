import { useId, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { setNearDoor, type WorldId } from "./worldStore";

// Marks the player as "at the door" when they stand in front of it and look
// at it. UI.tsx shows the prompt and handles the click / Enter that travels.

const REACH = 4.2; // how far in front of the door the prompt appears
const HALF_WIDTH = 1.8;
const FOCUS_DOT = 0.6;

interface Props {
  // The world this door leads to.
  to: WorldId;
  x: number;
  z: number;
  // Unit vector pointing out of the door's front face, on the XZ plane.
  normal: [number, number];
  active: boolean;
}

export default function DoorTrigger({ to, x, z, normal, active }: Props) {
  const camera = useThree((s) => s.camera);
  const owner = useId();
  const dir = useRef(new Vector3());
  const [nx, nz] = normal;

  useFrame(() => {
    if (!active) {
      setNearDoor(owner, to, false);
      return;
    }
    const dx = camera.position.x - x;
    const dz = camera.position.z - z;
    // Distance out from the door face, and sideways along it.
    const out = dx * nx + dz * nz;
    const side = Math.abs(dx * -nz + dz * nx);
    if (out <= 0 || out > REACH || side > HALF_WIDTH) {
      setNearDoor(owner, to, false);
      return;
    }
    camera.getWorldDirection(dir.current);
    const len = Math.hypot(dir.current.x, dir.current.z) || 1;
    // Looking back into the door means looking against its normal.
    const dot = -(dir.current.x * nx + dir.current.z * nz) / len;
    setNearDoor(owner, to, dot >= FOCUS_DOT);
  });

  return null;
}
