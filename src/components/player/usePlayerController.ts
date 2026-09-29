import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, MathUtils, Vector3 } from "three";
import type { Footprint, Level, SpawnPoint } from "../levels";

// First-person kinematic walker: pointer-lock mouse look, WASD / arrows,
// Space to jump. The level supplies floor height, walkable bounds and
// colliders. Changing the level or spawn point teleports the player there.

const LOOK_SENSITIVITY = 0.002;
const PLAYER_EYE_HEIGHT = 1.7;
export const PLAYER_RADIUS = 1.2;
const WALK_SPEED = 5;
const GROUND_ACCELERATION = 38;
const AIR_ACCELERATION = 10;
const GRAVITY = 34;
const JUMP_SPEED = 10.5;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

export interface PlayerSnapshot {
  x: number;
  y: number;
  z: number;
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  yaw: number;
  pitch: number;
  grounded: boolean;
  jumpCount: number;
  lastJumpPeakY: number;
}

export function usePlayerController(
  level: Level,
  spawn: SpawnPoint = level.spawn,
  frozen = false,
) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(spawn.yaw);
  const pitch = useRef(0);
  const isGrounded = useRef(true);
  const jumpWasDown = useRef(false);
  const jumpCount = useRef(0);
  const lastJumpPeakY = useRef(level.floorY + PLAYER_EYE_HEIGHT);
  const velocity = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const movement = useMemo(() => new Vector3(), []);
  const targetVelocity = useMemo(() => new Vector3(), []);
  const euler = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const snapshot = useRef<PlayerSnapshot>({
    x: spawn.x,
    y: level.floorY + PLAYER_EYE_HEIGHT,
    z: spawn.z,
    velocity: { x: 0, y: 0, z: 0 },
    yaw: spawn.yaw,
    pitch: 0,
    grounded: true,
    jumpCount: 0,
    lastJumpPeakY: level.floorY + PLAYER_EYE_HEIGHT,
  });

  // Spawn (and respawn whenever the level or spawn point changes).
  useEffect(() => {
    camera.position.set(spawn.x, level.floorY + PLAYER_EYE_HEIGHT, spawn.z);
    camera.rotation.order = "YXZ";
    yaw.current = spawn.yaw;
    pitch.current = 0;
    velocity.set(0, 0, 0);
    isGrounded.current = true;
    lastJumpPeakY.current = camera.position.y;
    camera.rotation.set(0, spawn.yaw, 0);
    camera.updateProjectionMatrix();
  }, [camera, level, spawn, velocity]);

  useEffect(() => {
    // Debug hook for screenshot tooling (scripts/shot.mjs): aim the camera
    // without pointer lock. The useFrame loop applies yaw/pitch every frame.
    window.setCameraOrientation = (y: number, p: number) => {
      yaw.current = y;
      pitch.current = MathUtils.clamp(p, -PITCH_LIMIT, PITCH_LIMIT);
    };
    // Debug hook: stand at a point in the current level.
    window.setPlayerPosition = (x: number, z: number) => {
      camera.position.x = x;
      camera.position.z = z;
      velocity.set(0, 0, 0);
    };
    return () => {
      delete window.setCameraOrientation;
      delete window.setPlayerPosition;
    };
  }, [camera, velocity]);

  useEffect(() => {
    const canvas = gl.domElement;

    const requestLock = () => {
      const lockRequest = canvas.requestPointerLock?.();
      if (lockRequest instanceof Promise) {
        lockRequest.catch(() => undefined);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;

      yaw.current -= event.movementX * LOOK_SENSITIVITY;
      pitch.current -= event.movementY * LOOK_SENSITIVITY;
      pitch.current = MathUtils.clamp(pitch.current, -PITCH_LIMIT, PITCH_LIMIT);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      addKey(keys.current, event);
      if (isMovementEvent(event)) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      removeKey(keys.current, event);
      if (isMovementEvent(event)) {
        event.preventDefault();
      }
    };

    // Losing focus (alt-tab) never delivers keyup; drop held keys so the
    // player doesn't keep walking.
    const handleBlur = () => keys.current.clear();

    canvas.addEventListener("click", requestLock);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      canvas.removeEventListener("click", requestLock);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [gl]);

  useFrame((_, delta) => {
    euler.set(pitch.current, yaw.current, 0);
    camera.quaternion.setFromEuler(euler);

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.set(0, 0, 0);

    const canMove = !frozenRef.current;
    if (canMove && hasAnyKey(keys.current, ["KeyW", "ArrowUp"])) {
      movement.add(forward);
    }
    if (canMove && hasAnyKey(keys.current, ["KeyS", "ArrowDown"])) {
      movement.sub(forward);
    }
    if (canMove && hasAnyKey(keys.current, ["KeyA", "ArrowLeft"])) {
      movement.sub(right);
    }
    if (canMove && hasAnyKey(keys.current, ["KeyD", "ArrowRight"])) {
      movement.add(right);
    }

    const jumpIsDown = hasAnyKey(keys.current, ["Space", " ", "Spacebar"]);
    if (canMove && jumpIsDown && !jumpWasDown.current && isGrounded.current) {
      velocity.y = JUMP_SPEED;
      isGrounded.current = false;
      jumpCount.current += 1;
      lastJumpPeakY.current = camera.position.y;
    }
    jumpWasDown.current = jumpIsDown;

    if (movement.lengthSq() > 0) {
      movement.normalize();
    }

    targetVelocity.copy(movement).multiplyScalar(WALK_SPEED);

    const acceleration = isGrounded.current
      ? GROUND_ACCELERATION
      : AIR_ACCELERATION;
    const blend = Math.min(1, acceleration * delta);
    velocity.x += (targetVelocity.x - velocity.x) * blend;
    velocity.z += (targetVelocity.z - velocity.z) * blend;
    velocity.y -= GRAVITY * delta;

    camera.position.addScaledVector(velocity, delta);
    lastJumpPeakY.current = Math.max(lastJumpPeakY.current, camera.position.y);

    const floorEyeY = level.floorY + PLAYER_EYE_HEIGHT;
    if (camera.position.y <= floorEyeY) {
      camera.position.y = floorEyeY;
      velocity.y = 0;
      isGrounded.current = true;
    } else {
      isGrounded.current = false;
    }

    const { bounds } = level;
    camera.position.x = MathUtils.clamp(
      camera.position.x,
      bounds.minX + PLAYER_RADIUS,
      bounds.maxX - PLAYER_RADIUS,
    );
    camera.position.z = MathUtils.clamp(
      camera.position.z,
      bounds.minZ + PLAYER_RADIUS,
      bounds.maxZ - PLAYER_RADIUS,
    );

    for (const box of level.colliders) {
      pushOutOfFootprint(camera, velocity, box);
    }

    snapshot.current = {
      x: Number(camera.position.x.toFixed(3)),
      y: Number(camera.position.y.toFixed(3)),
      z: Number(camera.position.z.toFixed(3)),
      velocity: {
        x: Number(velocity.x.toFixed(3)),
        y: Number(velocity.y.toFixed(3)),
        z: Number(velocity.z.toFixed(3)),
      },
      yaw: Number(yaw.current.toFixed(3)),
      pitch: Number(pitch.current.toFixed(3)),
      grounded: isGrounded.current,
      jumpCount: jumpCount.current,
      lastJumpPeakY: Number(lastJumpPeakY.current.toFixed(3)),
    };
  });

  return snapshot;
}

function pushOutOfFootprint(
  camera: { position: Vector3 },
  velocity: Vector3,
  { cx, cz, w, d }: Footprint,
) {
  const halfX = w / 2 + PLAYER_RADIUS;
  const halfZ = d / 2 + PLAYER_RADIUS;
  const dx = camera.position.x - cx;
  const dz = camera.position.z - cz;
  if (Math.abs(dx) >= halfX || Math.abs(dz) >= halfZ) return;
  const penX = halfX - Math.abs(dx);
  const penZ = halfZ - Math.abs(dz);
  if (penX < penZ) {
    camera.position.x = cx + (dx >= 0 ? halfX : -halfX);
    velocity.x = 0;
  } else {
    camera.position.z = cz + (dz >= 0 ? halfZ : -halfZ);
    velocity.z = 0;
  }
}

function hasAnyKey(keys: Set<string>, codes: string[]) {
  return codes.some((code) => keys.has(code));
}

function addKey(keys: Set<string>, event: KeyboardEvent) {
  keys.add(event.code);
  keys.add(event.key);
}

function removeKey(keys: Set<string>, event: KeyboardEvent) {
  keys.delete(event.code);
  keys.delete(event.key);
}

const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  " ",
  "Spacebar",
]);

function isMovementEvent(event: KeyboardEvent) {
  return MOVEMENT_KEYS.has(event.code) || MOVEMENT_KEYS.has(event.key);
}
