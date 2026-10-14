import { CanvasTexture, SRGBColorSpace } from "three";
import { mulberry32, speckle, toTexture } from "../cave/textures";

// Procedural surfaces and printed matter for the stockroom, drawn to
// canvases so the world needs no image assets.

function canvas2d(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function plainTexture(canvas: HTMLCanvasElement) {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Sealed concrete slab: mottled grey with a faint lilac cast, saw-cut
// control joints and tyre scuffs.
export function makeConcreteTexture(repeatX: number, repeatY: number) {
  const size = 512;
  const { canvas, ctx } = canvas2d(size, size);
  const rand = mulberry32(31);
  ctx.fillStyle = "#6c6870";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 70;
    const v = rand() < 0.5 ? "40,36,48" : "150,144,160";
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${v},${0.06 + rand() * 0.06})`);
    grad.addColorStop(1, `rgba(${v},0)`);
    ctx.fillStyle = grad;
    for (const ox of [-size, 0, size])
      for (const oy of [-size, 0, size]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
      }
  }
  speckle(ctx, size, rand, 14000, 0.16);
  // Tyre scuffs.
  ctx.strokeStyle = "rgba(25, 22, 30, 0.12)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 5; i++) {
    const x = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 40, size * 0.3, x - 40, size * 0.7, x, size);
    ctx.stroke();
  }
  // Control joints at the tile edge.
  ctx.fillStyle = "rgba(20, 18, 24, 0.55)";
  ctx.fillRect(0, 0, size, 3);
  ctx.fillRect(0, 0, 3, size);
  return toTexture(canvas, repeatX, repeatY);
}

// Painted cinder block, pale lilac-grey above a dark scuffed band.
export function makeBlockWallTexture(repeatX: number) {
  const w = 256;
  const h = 1024;
  const { canvas, ctx } = canvas2d(w, h);
  const rand = mulberry32(17);
  ctx.fillStyle = "#9d97a6";
  ctx.fillRect(0, 0, w, h);
  const bh = 28; // block course height in px (~0.25 m at 9 m / 1024 px)
  const bw = 64;
  for (let row = 0; row * bh < h; row++) {
    const y = row * bh;
    const shift = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const shade = 0.94 + rand() * 0.1;
      ctx.fillStyle = `rgba(${Math.round(157 * shade)},${Math.round(151 * shade)},${Math.round(166 * shade)},1)`;
      ctx.fillRect(x + shift + 2, y + 2, bw - 4, bh - 4);
    }
    ctx.fillStyle = "rgba(60, 54, 70, 0.5)";
    ctx.fillRect(0, y, w, 2);
  }
  for (let row = 0; row * bh < h; row++) {
    const shift = row % 2 ? bw / 2 : 0;
    ctx.fillStyle = "rgba(60, 54, 70, 0.45)";
    for (let x = shift; x < w; x += bw) ctx.fillRect(x, row * bh, 2, bh);
  }
  // Dark dado band along the bottom 1.2 m, and a yellow kick line.
  const band = h - Math.round((1.2 / 9) * h);
  ctx.fillStyle = "rgba(48, 44, 66, 0.82)";
  ctx.fillRect(0, band, w, h - band);
  ctx.fillStyle = "#c9a93a";
  ctx.fillRect(0, band - 8, w, 8);
  speckle(ctx, Math.max(w, h), rand, 6000, 0.1);
  return toTexture(canvas, repeatX, 1);
}

// Corrugated cardboard with brown tape and a smudged shipping label.
export function makeCardboardTexture() {
  const size = 256;
  const { canvas, ctx } = canvas2d(size, size);
  const rand = mulberry32(5);
  ctx.fillStyle = "#b08a5c";
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, rand, 3000, 0.12);
  ctx.fillStyle = "rgba(150, 110, 70, 0.6)";
  ctx.fillRect(size * 0.42, 0, size * 0.16, size);
  // Label.
  ctx.fillStyle = "#e9e1cf";
  ctx.fillRect(size * 0.08, size * 0.62, size * 0.28, size * 0.22);
  ctx.fillStyle = "rgba(40, 30, 30, 0.7)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(size * 0.1, size * (0.65 + i * 0.045), size * (0.12 + rand() * 0.12), 4);
  }
  // "This side up" arrows.
  ctx.strokeStyle = "rgba(40, 30, 30, 0.55)";
  ctx.lineWidth = 5;
  for (const x of [size * 0.72, size * 0.84]) {
    ctx.beginPath();
    ctx.moveTo(x, size * 0.32);
    ctx.lineTo(x, size * 0.14);
    ctx.moveTo(x - 9, size * 0.22);
    ctx.lineTo(x, size * 0.13);
    ctx.lineTo(x + 9, size * 0.22);
    ctx.stroke();
  }
  return plainTexture(canvas);
}

// Hanging lot sign: dark green board, white stencil lettering.
export function makeLotSignTexture(number: number, label: string) {
  const w = 1024;
  const h = 256;
  const { canvas, ctx } = canvas2d(w, h);
  ctx.fillStyle = "#1d3b33";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#e8e4d8";
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = "#e8e4d8";
  ctx.fillRect(14, 14, 220, h - 28);
  ctx.fillStyle = "#1d3b33";
  ctx.font = "bold 150px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number).padStart(2, "0"), 124, h / 2 + 8);
  ctx.fillStyle = "#e8e4d8";
  ctx.textAlign = "left";
  let size = 92;
  ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`;
  while (ctx.measureText(label).width > w - 300 && size > 40) {
    size -= 4;
    ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`;
  }
  ctx.fillText(label, 270, h / 2 + 6);
  return plainTexture(canvas);
}

// Small manila stock tag, the kind tied to a pallet: a few lines of type.
export function makeTagTexture(lines: string[]) {
  const w = 512;
  const h = 320;
  const { canvas, ctx } = canvas2d(w, h);
  ctx.fillStyle = "#e3cf98";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(120, 90, 40, 0.18)";
  for (let y = 70; y < h; y += 52) ctx.fillRect(24, y + 22, w - 48, 3);
  ctx.fillStyle = "#3a2f22";
  ctx.font = "bold 46px 'Courier New', Courier, monospace";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, i) => {
    let size = i === 0 ? 46 : 38;
    ctx.font = `bold ${size}px 'Courier New', Courier, monospace`;
    while (ctx.measureText(line).width > w - 48 && size > 18) {
      size -= 2;
      ctx.font = `bold ${size}px 'Courier New', Courier, monospace`;
    }
    ctx.fillText(line, 24, 62 + i * 52);
  });
  // Eyelet.
  ctx.fillStyle = "#9b8a62";
  ctx.beginPath();
  ctx.arc(w - 40, 40, 16, 0, Math.PI * 2);
  ctx.fill();
  return plainTexture(canvas);
}

// The inventory whiteboard by the desk.
export function makeInventoryTexture() {
  const w = 1536;
  const h = 832;
  const { canvas, ctx } = canvas2d(w, h);
  ctx.fillStyle = "#f2f1ec";
  ctx.fillRect(0, 0, w, h);
  // Ghosts of old, badly erased entries.
  ctx.fillStyle = "rgba(90, 100, 140, 0.08)";
  ctx.font = "60px 'Comic Sans MS', 'Marker Felt', cursive";
  ctx.fillText("GOLDEN HOUR — EXTEND?", 380, 300);
  ctx.fillText("re-paint horizon", 820, 700);

  const ink = "#1f2b6e";
  const red = "#b3203a";
  ctx.fillStyle = ink;
  ctx.font = "bold 72px 'Comic Sans MS', 'Marker Felt', 'Trebuchet MS', cursive";
  ctx.fillText("ISLAND — STOCK", 60, 100);
  ctx.fillRect(60, 118, 640, 5);

  const rows: [string, string, string][] = [
    ["SUN, SETTING", "4", "1 OUT"],
    ["SEA, CALM (ROLLED)", "6", "1 OUT"],
    ["VENUS, WAVING", "6", "1 OUT"],
    ["HELIOS (HEAD ONLY)", "3", "1 OUT"],
    ["COLUMN, DORIC", "14", "9 OUT"],
    ["DOOR", "11", "3 OUT"],
    ["BOOMBOX", "12", "1 OUT"],
  ];
  ctx.font = "52px 'Comic Sans MS', 'Marker Felt', 'Trebuchet MS', cursive";
  rows.forEach(([item, qty, out], i) => {
    const y = 210 + i * 74;
    ctx.fillStyle = ink;
    ctx.fillText(item, 60, y);
    ctx.fillText(qty, 760, y);
    ctx.fillStyle = red;
    ctx.fillText(out, 900, y);
  });
  ctx.fillStyle = ink;
  ctx.fillText("GOLDEN HOUR", 60, 210 + rows.length * 74);
  ctx.fillStyle = red;
  ctx.fillText("ON LOAN, INDEFINITELY", 760, 210 + rows.length * 74);

  // Sticky note.
  ctx.save();
  ctx.translate(1180, 120);
  ctx.rotate(0.06);
  ctx.fillStyle = "#ff9ccd";
  ctx.fillRect(0, 0, 300, 280);
  ctx.fillStyle = "#3a1630";
  ctx.font = "40px 'Comic Sans MS', 'Marker Felt', cursive";
  ["Nobody", "returns", "anything.", "  — mgmt"].forEach((l, i) =>
    ctx.fillText(l, 24, 70 + i * 56),
  );
  ctx.restore();
  // Marker tray shadow.
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, h - 16, w, 16);
  return plainTexture(canvas);
}

// "BACK IN 5 MINUTES" tent card for the desk.
export function makeBackSoonTexture() {
  const { canvas, ctx } = canvas2d(512, 256);
  ctx.fillStyle = "#f4efe3";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 488, 232);
  ctx.fillStyle = "#2a2a2a";
  ctx.textAlign = "center";
  ctx.font = "bold 64px Arial, Helvetica, sans-serif";
  ctx.fillText("BACK IN", 256, 110);
  ctx.fillText("5 MINUTES", 256, 190);
  return plainTexture(canvas);
}

// Ribbed roll-up shutter, with the bay stencilled across it.
export function makeShutterTexture() {
  const w = 512;
  const h = 512;
  const { canvas, ctx } = canvas2d(w, h);
  const rand = mulberry32(23);
  ctx.fillStyle = "#77808a";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    const g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.5, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, 16);
  }
  speckle(ctx, w, rand, 4000, 0.12);
  // Rust streaks.
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(120, 60, 30, ${0.05 + rand() * 0.1})`;
    ctx.fillRect(rand() * w, rand() * h * 0.5, 3 + rand() * 5, 60 + rand() * 200);
  }
  ctx.fillStyle = "rgba(240, 236, 220, 0.85)";
  ctx.font = "bold 64px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LOADING BAY 2", w / 2, h * 0.36);
  ctx.font = "bold 40px Arial, Helvetica, sans-serif";
  ctx.fillText("DELIVERIES ONLY", w / 2, h * 0.36 + 56);
  // Hazard stripes along the bottom rail.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, h - 36, w, 36);
  ctx.clip();
  for (let x = -40; x < w + 40; x += 40) {
    ctx.fillStyle = "#e0b522";
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 20, h - 36);
    ctx.lineTo(x + 40, h - 36);
    ctx.lineTo(x + 20, h);
    ctx.fill();
  }
  ctx.restore();
  return plainTexture(canvas);
}

// The sun: the classic striped vaporwave disc, warm yellow at the top to hot
// pink at the bottom, with horizontal slots cut through its lower half. Alpha
// marks the cut-outs (use with alphaTest).
export function makeSunTexture() {
  const size = 512;
  const { canvas, ctx } = canvas2d(size, size);
  const r = size / 2;
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#ffe37a");
  grad.addColorStop(0.45, "#ffa24f");
  grad.addColorStop(0.75, "#ff4f8e");
  grad.addColorStop(1, "#e2307f");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  // Slots get thicker toward the bottom.
  for (let i = 0; i * 32 + size * 0.52 < size; i++) {
    ctx.fillRect(0, size * 0.52 + i * 32, size, 3 + i * 3.4);
  }
  return plainTexture(canvas);
}

// Company slogan stencilled across the wall above the door, on a transparent
// background so the blockwork shows through.
export function makeSloganTexture(text: string) {
  const w = 2048;
  const h = 160;
  const { canvas, ctx } = canvas2d(w, h);
  ctx.fillStyle = "rgba(232, 226, 236, 0.82)";
  ctx.font = "bold 112px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 112;
  while (ctx.measureText(text).width > w - 40 && size > 40) {
    size -= 4;
    ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`;
  }
  ctx.fillText(text, w / 2, h / 2 + 4);
  // Wear: knock specks out of the paint.
  ctx.globalCompositeOperation = "destination-out";
  const rand = mulberry32(99);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.8})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 4, 1 + rand() * 3);
  }
  return plainTexture(canvas);
}
