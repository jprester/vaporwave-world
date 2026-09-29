import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

// Procedural surfaces for the conference room, drawn once to canvases so the
// cave needs no extra image assets. All are tileable.

// Deterministic PRNG so the pattern is identical on every load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1) {
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  count: number,
  alpha: number,
) {
  for (let i = 0; i < count; i++) {
    const v = rand() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// Draw `fn` at the point and at its wrapped copies, so shapes crossing an edge
// continue on the opposite side and the tile repeats seamlessly.
function drawWrapped(size: number, x: number, y: number, fn: (x: number, y: number) => void) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      fn(x + ox, y + oy);
    }
  }
}

// 90s hotel / arcade carpet: deep indigo with confetti squiggles, triangles
// and rings in teal, magenta and mustard.
export function makeCarpetTexture(repeatX: number, repeatY: number) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(7);

  ctx.fillStyle = "#1e1838";
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, rand, 9000, 0.18);

  const colors = ["#2fb7a8", "#d0418f", "#d9a93a", "#6d5bd0", "#e46a4f"];
  for (let i = 0; i < 70; i++) {
    const color = colors[Math.floor(rand() * colors.length)];
    const x = rand() * size;
    const y = rand() * size;
    const kind = rand();
    const rot = rand() * Math.PI * 2;
    const s = 10 + rand() * 18;
    drawWrapped(size, x, y, (px, py) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      if (kind < 0.4) {
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.bezierCurveTo(-s / 2, -s, s / 2, s, s, 0);
        ctx.stroke();
      } else if (kind < 0.7) {
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.6);
        ctx.lineTo(s * 0.55, s * 0.4);
        ctx.lineTo(-s * 0.55, s * 0.4);
        ctx.closePath();
        ctx.fill();
      } else if (kind < 0.85) {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(-s * 0.5, -2, s, 4);
        ctx.fillRect(-2, -s * 0.5, 4, s);
      }
      ctx.restore();
    });
  }
  // Worn, slightly dusty look.
  ctx.fillStyle = "rgba(40, 30, 60, 0.18)";
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, repeatX, repeatY);
}

// Dusty mauve wallpaper with faint vertical stripes above a darker wainscot
// and a chair rail. One texture spans the full wall height (repeatY = 1).
export function makeWallTexture(repeatX: number) {
  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(11);

  const railY = h * 0.66; // canvas y grows downward
  ctx.fillStyle = "#8e7488";
  ctx.fillRect(0, 0, w, railY);
  for (let x = 0; x < w; x += 32) {
    ctx.fillStyle = "rgba(255, 230, 245, 0.07)";
    ctx.fillRect(x, 0, 12, railY);
    ctx.fillStyle = "rgba(60, 30, 60, 0.08)";
    ctx.fillRect(x + 14, 0, 2, railY);
  }
  // Wainscot panels.
  ctx.fillStyle = "#4d3a52";
  ctx.fillRect(0, railY, w, h - railY);
  ctx.strokeStyle = "rgba(20, 10, 25, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(16, railY + 26, w - 32, h - railY - 70);
  // Chair rail.
  ctx.fillStyle = "#c9b3c3";
  ctx.fillRect(0, railY - 6, w, 10);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, railY + 4, w, 3);
  // Baseboard.
  ctx.fillStyle = "#2a1f2e";
  ctx.fillRect(0, h - 22, w, 22);
  speckle(ctx, Math.max(w, h), rand, 5000, 0.08);
  return toTexture(canvas, repeatX, 1);
}

// Off-white drop-ceiling tile with a dark T-bar grid edge and fissured speckle.
export function makeCeilingTexture(repeatX: number, repeatY: number) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(3);

  ctx.fillStyle = "#cfc8bf";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(70, 60, 55, ${0.25 * rand()})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1);
  }
  // Grid bars.
  ctx.fillStyle = "#8f877f";
  ctx.fillRect(0, 0, size, 4);
  ctx.fillRect(0, 0, 4, size);
  return toTexture(canvas, repeatX, repeatY);
}
