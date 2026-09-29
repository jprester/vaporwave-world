import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Fog,
  Group,
  HalfFloatType,
  PerspectiveCamera,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderTarget,
} from "three";

// "Plato TV": the island as a live broadcast on the cave's CRTs. While the
// cave is (about to be) on screen, a camera on the empty island cuts between
// a handful of slow shots and renders into a small half-float target at
// ~15 fps; a canvas overlay adds the channel logo, a LIVE bug, a lower-third
// caption per shot, a news ticker, and now and then a stand-by card. Every
// screen samples these two textures. The low resolution and frame rate are
// part of the look, and keep the island's cost down while it isn't the world
// being walked.

const FEED_WIDTH = 320;
const FEED_HEIGHT = 240;
const FEED_INTERVAL = 1 / 15;
const OVERLAY_WIDTH = 512;
const OVERLAY_HEIGHT = 384;

interface Shot {
  kind: "shot";
  position: [number, number, number];
  lookAt: [number, number, number];
  // World units per second, applied to both camera and target: a slow dolly.
  drift: [number, number, number];
  caption: string;
  seconds: number;
}
interface StandBy {
  kind: "standby";
  seconds: number;
}

const PROGRAM: (Shot | StandBy)[] = [
  {
    kind: "shot",
    position: [0, 6.6, 16],
    lookAt: [0, 40, -600],
    drift: [0, 0, -0.35],
    caption: "The sun, holding still",
    seconds: 8,
  },
  {
    kind: "shot",
    position: [-11, 11, 9],
    lookAt: [-20, 20, -2],
    drift: [0.25, 0.05, 0],
    caption: "She has been waving for 2,000 years",
    seconds: 7,
  },
  {
    kind: "shot",
    position: [24, 7.5, -22],
    lookAt: [60, 18, -182],
    drift: [-0.3, 0, 0],
    caption: "Helios, waist-deep",
    seconds: 7,
  },
  {
    kind: "shot",
    position: [-7, 5.9, 7],
    lookAt: [-2, 4.6, -6],
    drift: [0.35, 0, 0],
    caption: "The water is always warm",
    seconds: 7,
  },
  {
    kind: "shot",
    position: [11.5, 6.6, 22.5],
    lookAt: [15, 6.1, 18],
    drift: [0.1, 0, -0.05],
    caption: "You left the music on",
    seconds: 6,
  },
  {
    kind: "shot",
    position: [6, 6.9, -13],
    lookAt: [6, 7.2, -24.5],
    drift: [0, 0, -0.25],
    caption: "The door is still open",
    seconds: 7,
  },
  { kind: "standby", seconds: 3 },
];
const PROGRAM_SECONDS = PROGRAM.reduce((sum, s) => sum + s.seconds, 0);

const TICKER =
  "PARADISE WEATHER: GOLDEN HOUR, INDEFINITELY   •   THE TIDE HAS NOT MOVED " +
  "SINCE 1989   •   PLEASE REMAIN SEATED   •   BROADCASTING LIVE FROM THE " +
  "ISLAND, 24 HOURS A DAY   •   NOTHING OUTSIDE THIS ROOM HAS CHANGED   •   " +
  "YOU ARE WATCHING PLATO TV   •   ";

export interface FeedTextures {
  feed: Texture;
  overlay: Texture;
}

interface Props {
  enabled: boolean;
  island: RefObject<Group | null>;
  cave: RefObject<Group | null>;
  islandFog: Fog;
  onTextures: (textures: FeedTextures) => void;
}

// Which segment of the program is on at `t` seconds, and how far into it.
function segmentAt(t: number) {
  let local = t % PROGRAM_SECONDS;
  for (let i = 0; i < PROGRAM.length; i++) {
    if (local < PROGRAM[i].seconds) return { index: i, local };
    local -= PROGRAM[i].seconds;
  }
  return { index: 0, local: 0 };
}

export default function IslandFeed({
  enabled,
  island,
  cave,
  islandFog,
  onTextures,
}: Props) {
  const { gl, scene } = useThree();
  const since = useRef(Infinity);
  const showTime = useRef(0);
  // Debug hook: jump the program to segment i.
  const forcedSegment = useRef<number | null>(null);

  const target = useMemo(
    () =>
      new WebGLRenderTarget(FEED_WIDTH, FEED_HEIGHT, {
        type: HalfFloatType,
        depthBuffer: true,
      }),
    [],
  );
  const camera = useMemo(
    () => new PerspectiveCamera(50, FEED_WIDTH / FEED_HEIGHT, 1, 20000),
    [],
  );
  const lookTarget = useMemo(() => new Vector3(), []);
  const driftOffset = useMemo(() => new Vector3(), []);

  const overlay = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = OVERLAY_WIDTH;
    canvas.height = OVERLAY_HEIGHT;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return { canvas, ctx: canvas.getContext("2d")!, texture };
  }, []);

  useEffect(() => {
    // The logo uses the same script face as the island's neon sign.
    const face = new FontFace("Italianno", "url(/fonts/Italianno-Regular.ttf)");
    face
      .load()
      .then((f) => document.fonts.add(f))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    onTextures({ feed: target.texture, overlay: overlay.texture });
    return () => {
      target.dispose();
      overlay.texture.dispose();
    };
  }, [onTextures, overlay, target]);

  useEffect(() => {
    window.setFeedSegment = (i: number | null) => {
      // Normalize to a valid segment index; anything non-numeric clears it.
      forcedSegment.current =
        i === null || !Number.isFinite(i)
          ? null
          : ((Math.floor(i) % PROGRAM.length) + PROGRAM.length) %
            PROGRAM.length;
    };
    return () => {
      delete window.setFeedSegment;
    };
  }, []);

  // Default priority (0) runs before the EffectComposer's frame (priority 1),
  // so the feed is ready before the cave is drawn.
  useFrame((state, delta) => {
    if (!enabled || !island.current || !cave.current) return;
    showTime.current += delta;
    since.current += delta;
    if (since.current < FEED_INTERVAL) return;
    since.current = 0;

    let { index, local } = segmentAt(showTime.current);
    if (forcedSegment.current !== null) {
      index = forcedSegment.current;
      local = 1;
    }
    const segment = PROGRAM[index];
    const elapsed = state.clock.getElapsedTime();

    drawOverlay(overlay.ctx, segment, local, elapsed);
    overlay.texture.needsUpdate = true;

    // The stand-by card covers the picture completely; skip the render.
    if (segment.kind !== "shot") return;

    driftOffset.set(...segment.drift).multiplyScalar(local);
    camera.position.set(...segment.position).add(driftOffset);
    lookTarget.set(...segment.lookAt).add(driftOffset);
    camera.lookAt(lookTarget);

    const islandVisible = island.current.visible;
    const caveVisible = cave.current.visible;
    const fog = scene.fog;
    island.current.visible = true;
    cave.current.visible = false;
    scene.fog = islandFog;

    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    // The EffectComposer turns autoClear off, so clear the target ourselves
    // or each frame is drawn over the last one's color and depth.
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(previous);

    island.current.visible = islandVisible;
    cave.current.visible = caveVisible;
    scene.fog = fog;
  });

  return null;
}

// Draws the broadcast graphics. Everything stays inside a safe area because
// the CRT shader's barrel curvature crops the edges.
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  segment: Shot | StandBy,
  local: number,
  elapsed: number,
) {
  const W = OVERLAY_WIDTH;
  const H = OVERLAY_HEIGHT;
  const mx = 42;
  const my = 34;
  ctx.clearRect(0, 0, W, H);

  if (segment.kind === "standby") {
    drawStandBy(ctx, W, H);
    return;
  }

  // Channel logo and LIVE bug, each on a dark plate so they read against the
  // bright sky.
  ctx.fillStyle = "rgba(20, 8, 40, 0.5)";
  ctx.fillRect(mx - 6, my - 4, 124, 38);
  ctx.fillRect(W - mx - 72, my - 1, 78, 26);
  ctx.save();
  ctx.font = "44px Italianno, cursive";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(255, 92, 176, 1)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "white";
  ctx.fillText("Plato TV", mx + 2, my - 6);
  ctx.restore();

  // LIVE bug with a blinking dot.
  ctx.save();
  ctx.font = "bold 17px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillStyle = "white";
  ctx.fillText("LIVE", W - mx, my + 12);
  if (Math.floor(elapsed * 1.2) % 2 === 0) {
    ctx.fillStyle = "#ff2a3d";
    ctx.beginPath();
    ctx.arc(W - mx - 56, my + 12, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Lower third: slides in shortly after each cut.
  const slide = Math.min(1, Math.max(0, (local - 0.6) / 0.5));
  if (slide > 0) {
    const y = H - my - 76;
    const barW = (W - mx * 2) * (0.35 + 0.65 * slide);
    const grad = ctx.createLinearGradient(mx, 0, mx + barW, 0);
    grad.addColorStop(0, "rgba(214, 48, 150, 0.92)");
    grad.addColorStop(0.7, "rgba(120, 60, 200, 0.75)");
    grad.addColorStop(1, "rgba(120, 60, 200, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(mx, y, barW, 34);
    ctx.fillStyle = "rgba(79, 230, 255, 0.95)";
    ctx.fillRect(mx, y, 5, 34);
    ctx.save();
    ctx.globalAlpha = slide;
    ctx.font = "bold 17px Arial, Helvetica, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(segment.caption.toUpperCase(), mx + 16, y + 18);
    ctx.restore();
  }

  // Ticker.
  const ty = H - my - 32;
  ctx.fillStyle = "rgba(10, 6, 30, 0.72)";
  ctx.fillRect(mx, ty, W - mx * 2, 24);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, ty, W - mx * 2, 24);
  ctx.clip();
  ctx.font = "bold 13px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 240, 200, 0.95)";
  const textW = ctx.measureText(TICKER).width;
  const offset = (elapsed * 42) % textW;
  for (let x = mx - offset; x < W - mx; x += textW) {
    ctx.fillText(TICKER, x, ty + 13);
  }
  ctx.restore();

  // A burst of torn scanlines right after each cut.
  if (local < 0.18) {
    for (let i = 0; i < 9; i++) {
      const y = Math.random() * H;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.35})`;
      ctx.fillRect(0, y, W, 2 + Math.random() * 6);
    }
  }
}

function drawStandBy(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bars = [
    "#c0c0c0",
    "#c0c000",
    "#00c0c0",
    "#00c000",
    "#c000c0",
    "#c00000",
    "#0000c0",
  ];
  const barH = H * 0.68;
  const bw = W / bars.length;
  bars.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * bw, 0, bw + 1, barH);
  });
  ctx.fillStyle = "#101018";
  ctx.fillRect(0, barH, W, H - barH);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, barH, W * 0.2, H * 0.08);

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(W * 0.16, H * 0.3, W * 0.68, 56);
  ctx.font = "bold 26px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText("PLEASE STAND BY", W / 2, H * 0.3 + 29);
  ctx.font = "34px Italianno, cursive";
  ctx.fillStyle = "rgba(255, 220, 240, 0.9)";
  ctx.fillText("Plato TV", W / 2, barH + (H - barH) / 2 + 4);
  ctx.textAlign = "left";
}
