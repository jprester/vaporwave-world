import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Fog,
  Group,
  HalfFloatType,
  PerspectiveCamera,
  WebGLRenderTarget,
} from "three";

// Live picture of the island for the cave's CRTs. While the cave is (about to
// be) on screen, a fixed camera on the empty island renders into a small
// half-float target at ~15 fps; every screen samples that one texture. The
// low resolution and frame rate are part of the look, and keep the island's
// cost down while it isn't the world being walked.

const FEED_WIDTH = 320;
const FEED_HEIGHT = 240;
const FEED_INTERVAL = 1 / 15;

// Where the camera stands: the island's opening view, toward the sun.
const FEED_POSITION: [number, number, number] = [0, 6.6, 16];
const FEED_PAN = 0.12; // radians of slow side-to-side drift
const FEED_PITCH = 0.07;

interface Props {
  enabled: boolean;
  island: RefObject<Group | null>;
  cave: RefObject<Group | null>;
  islandFog: Fog;
  onTarget: (target: WebGLRenderTarget) => void;
}

export default function IslandFeed({
  enabled,
  island,
  cave,
  islandFog,
  onTarget,
}: Props) {
  const { gl, scene } = useThree();
  const since = useRef(Infinity);

  const target = useMemo(
    () =>
      new WebGLRenderTarget(FEED_WIDTH, FEED_HEIGHT, {
        type: HalfFloatType,
        depthBuffer: true,
      }),
    [],
  );
  const camera = useMemo(() => {
    const cam = new PerspectiveCamera(52, FEED_WIDTH / FEED_HEIGHT, 1, 20000);
    cam.position.set(...FEED_POSITION);
    cam.rotation.order = "YXZ";
    return cam;
  }, []);

  useEffect(() => {
    onTarget(target);
    return () => target.dispose();
  }, [onTarget, target]);

  // Default priority (0) runs before the EffectComposer's frame (priority 1),
  // so the feed is ready before the cave is drawn.
  useFrame((state, delta) => {
    if (!enabled || !island.current || !cave.current) return;
    since.current += delta;
    if (since.current < FEED_INTERVAL) return;
    since.current = 0;

    const t = state.clock.getElapsedTime();
    camera.rotation.set(FEED_PITCH, Math.sin(t * 0.06) * FEED_PAN, 0);

    const islandVisible = island.current.visible;
    const caveVisible = cave.current.visible;
    const fog = scene.fog;
    island.current.visible = true;
    cave.current.visible = false;
    scene.fog = islandFog;

    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(previous);

    island.current.visible = islandVisible;
    cave.current.visible = caveVisible;
    scene.fog = fog;
  });

  return null;
}
