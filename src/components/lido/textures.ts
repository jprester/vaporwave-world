import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32 } from "../cave/textures";

// Procedural pictures and printed matter for the Lido, drawn to canvases
// when the world mounts. The tiles themselves are the island's own (the
// Tiles105 set), tinted.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const ROUND = '"Avenir Next", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, family = SANS, weight = "bold") {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

// The half sun: the top half of the vaporwave disc, yellow at the crown to
// hot pink at the waterline, with the slots cut through it thickening
// toward the water. The bottom edge is the diameter; the reflection
// supplies the rest. Alpha marks the cut-outs (use with alphaTest).
export function makeHalfSunTexture() {
  const w = 1024;
  const h = 512;
  const [c, ctx] = canvas(w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#fff08a");
  grad.addColorStop(0.45, "#ffb054");
  grad.addColorStop(0.8, "#ff5a8c");
  grad.addColorStop(1, "#ff3f86");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(w / 2, h, h - 2, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 6; i++) {
    const y = h * 0.5 + i * 44 + i * i * 2;
    ctx.fillRect(0, y, w, 4 + i * 4);
  }
  return tex(c);
}

// The mural behind the sun: a sunset in mosaic, small tiles with grout,
// lilac at the top going to peach and pink at the waterline, a few long
// pixel clouds, stars, and a palm silhouette at each edge. 17.6 × 9.2 m.
export function makeMosaicTexture() {
  const cols = 128;
  const rows = 67;
  const cell = 8;
  const [c, ctx] = canvas(cols * cell, rows * cell);
  const rand = mulberry32(1987);
  const sky = [
    [0, [86, 52, 140]],
    [0.35, [168, 92, 190]],
    [0.62, [242, 128, 178]],
    [0.82, [255, 170, 150]],
    [1, [255, 206, 160]],
  ] as const;
  const at = (t: number) => {
    for (let i = 1; i < sky.length; i++) {
      const [t1, c1] = sky[i];
      const [t0, c0] = sky[i - 1];
      if (t <= t1) {
        const k = (t - t0) / (t1 - t0);
        return c0.map((v, j) => v + (c1[j] - v) * k);
      }
    }
    return [...sky[sky.length - 1][1]];
  };
  // Cloud bands: rows that are a shade lighter, broken.
  const clouds = [
    { row: 30, x0: 6, x1: 40 },
    { row: 31, x0: 12, x1: 34 },
    { row: 38, x0: 82, x1: 120 },
    { row: 39, x0: 90, x1: 112 },
    { row: 46, x0: 20, x1: 52 },
    { row: 51, x0: 74, x1: 104 },
  ];
  // A palm: trunk leaning in, fronds as rays.
  const palm = (px: number, lean: number, top: number) => {
    const cellsOn = new Set<string>();
    for (let r = rows - 1; r >= top; r--) {
      const t = (rows - 1 - r) / (rows - 1 - top);
      const x = Math.round(px + lean * t * t * 10);
      cellsOn.add(`${x},${r}`);
      cellsOn.add(`${x + 1},${r}`);
    }
    const tx = Math.round(px + lean * 10);
    for (let f = 0; f < 9; f++) {
      const a = Math.PI * (0.05 + f * 0.112);
      for (let s = 1; s < 13; s++) {
        const x = Math.round(tx + Math.cos(a) * s * 1.2);
        const y = Math.round(top + -Math.sin(a) * s * 0.6 + (s * s) / 18);
        cellsOn.add(`${x},${y}`);
      }
    }
    return cellsOn;
  };
  const palms = [palm(10, 1, 22), palm(cols - 12, -1, 26)];
  ctx.fillStyle = "#e8dfe8";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      let [R, G, B] = at(r / (rows - 1));
      if (clouds.some((k) => k.row === r && q >= k.x0 && q <= k.x1 && rand() > 0.12)) {
        R += 22;
        G += 26;
        B += 20;
      }
      if (r < 22 && rand() < 0.012) {
        R = G = B = 245;
      }
      if (palms.some((p) => p.has(`${q},${r}`))) {
        R = 52;
        G = 26;
        B = 78;
      }
      // Every tile a touch different, as if hand-set.
      const n = (rand() - 0.5) * 14;
      ctx.fillStyle = `rgb(${R + n | 0},${G + n | 0},${B + n | 0})`;
      ctx.fillRect(q * cell + 1, r * cell + 1, cell - 1, cell - 1);
    }
  }
  const t = tex(c);
  t.magFilter = NearestFilter;
  return t;
}

// The sky in the ceiling: a long lightbox, warm over the sun at the north
// end, cooling to lilac over the door. v runs north (0) to south (1).
export function makeSkyTexture() {
  const [c, ctx] = canvas(256, 1024);
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#ffd0a8");
  grad.addColorStop(0.18, "#ffaacb");
  grad.addColorStop(0.5, "#e7b4f2");
  grad.addColorStop(0.8, "#bfc8ff");
  grad.addColorStop(1, "#b4e4f2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1024);
  // Soft streaks of cloud.
  const rand = mulberry32(47);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 26; i++) {
    const y = rand() * 1024;
    const x = rand() * 256;
    ctx.beginPath();
    ctx.ellipse(x, y, 40 + rand() * 90, 4 + rand() * 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return tex(c);
}

// The pool rules, on an enamel board by the deck.
export function makeRulesTexture() {
  const [c, ctx] = canvas(512, 768);
  ctx.fillStyle = "#f4f7f6";
  ctx.fillRect(0, 0, 512, 768);
  ctx.fillStyle = "#1e8b8c";
  ctx.fillRect(0, 0, 512, 132);
  ctx.fillStyle = "#ff7cb4";
  ctx.fillRect(0, 132, 512, 10);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fit(ctx, "POOL RULES", 460, 64, ROUND);
  ctx.fillText("POOL RULES", 256, 58);
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText("PLATO'S COVE LIDO", 256, 108);
  const rules = [
    ["1.", "LOOK AT THE WATER."],
    ["2.", "THE SUN IS FOR REFLECTION", "USE ONLY. DO NOT LOOK UP."],
    ["3.", "NO DIVING. THE POOL IS", "DEEPER IN REFLECTION", "THAN IN FACT."],
    ["4.", "NO RUNNING. NO TURNING ROUND."],
    ["5.", "BATHERS MUST BE REFLECTED", "AT ALL TIMES."],
    ["6.", "SHADOWS TO BE LEFT AT THE", "KIOSK."],
  ];
  ctx.textAlign = "left";
  ctx.fillStyle = "#24323a";
  let y = 186;
  for (const [n, ...lines] of rules) {
    ctx.font = `bold 25px ${SANS}`;
    ctx.fillText(n, 36, y);
    ctx.font = `600 25px ${SANS}`;
    lines.forEach((line, i) => ctx.fillText(line, 82, y + i * 31));
    y += lines.length * 31 + 22;
  }
  ctx.font = `500 18px ${SANS}`;
  ctx.fillStyle = "#6c7c84";
  ctx.textAlign = "center";
  ctx.fillText("LIFEGUARD ON DUTY: SEE CHAIR", 256, 738);
  return tex(c);
}

// The kiosk's price board, white letters pushed into a black peg board.
export function makePriceBoardTexture() {
  const [c, ctx] = canvas(1024, 512);
  ctx.fillStyle = "#1c1b22";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let y = 8; y < 512; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#ff8fc6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 62px ${SANS}`;
  ctx.fillText("ADMISSION", 512, 64);
  const rows: [string, string][] = [
    ["ADULTS", "1 GOLDEN HOUR"],
    ["CHILDREN", "½ GOLDEN HOUR"],
    ["REFLECTIONS", "INCLUDED"],
    ["TOWEL HIRE", "SEE LOCKERS"],
    ["SHADOWS", "PLEASE LEAVE AT KIOSK"],
  ];
  ctx.font = `600 40px ${SANS}`;
  rows.forEach(([a, b], i) => {
    const y = 150 + i * 70;
    ctx.fillStyle = "#f2f0ea";
    ctx.textAlign = "left";
    ctx.fillText(a, 60, y);
    ctx.textAlign = "right";
    ctx.fillStyle = i === 4 ? "#8ff0ea" : "#f2f0ea";
    ctx.fillText(b, 964, y);
  });
  return tex(c);
}

// Lost property: a shadow, folded, with its tag.
export function makeShadowTexture() {
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = "#0e0a14";
  // A standing figure, arms a little out: the shape a person leaves.
  ctx.beginPath();
  ctx.arc(128, 62, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(84, 112);
  ctx.quadraticCurveTo(128, 100, 172, 112);
  ctx.lineTo(214, 270);
  ctx.lineTo(192, 276);
  ctx.lineTo(164, 180);
  ctx.lineTo(166, 300);
  ctx.lineTo(160, 500);
  ctx.lineTo(134, 500);
  ctx.lineTo(128, 320);
  ctx.lineTo(122, 320);
  ctx.lineTo(116, 500);
  ctx.lineTo(90, 500);
  ctx.lineTo(90, 300);
  ctx.lineTo(92, 180);
  ctx.lineTo(64, 276);
  ctx.lineTo(42, 270);
  ctx.closePath();
  ctx.fill();
  return tex(c);
}

// The lockers: a bank of 36 in three tiers, pastel, numbered, a key with an
// orange tag in every lock. Number 7 is open (drawn dark; the door is a
// separate mesh). 7.2 × 2.1 m.
export const OPEN_LOCKER = 7;
export const LOCKER_COLS = 12;
export const LOCKER_ROWS = 3;
export function makeLockerTexture() {
  const w = 2048;
  const h = 600;
  const [c, ctx] = canvas(w, h);
  const cw = w / LOCKER_COLS;
  const rh = h / LOCKER_ROWS;
  const colors = ["#ffc0d8", "#a8ece6", "#d6c4ff"];
  for (let col = 0; col < LOCKER_COLS; col++) {
    for (let row = 0; row < LOCKER_ROWS; row++) {
      const n = col * LOCKER_ROWS + row + 1;
      const x = col * cw;
      const y = row * rh;
      ctx.fillStyle = "#e9e4ea";
      ctx.fillRect(x, y, cw, rh);
      if (n === OPEN_LOCKER) {
        ctx.fillStyle = "#2a2232";
        ctx.fillRect(x + 6, y + 6, cw - 12, rh - 12);
        continue;
      }
      ctx.fillStyle = colors[(col + row) % 3];
      ctx.fillRect(x + 6, y + 6, cw - 12, rh - 12);
      // Vents.
      ctx.fillStyle = "rgba(40,30,50,0.35)";
      for (let v = 0; v < 4; v++) ctx.fillRect(x + cw * 0.3, y + 26 + v * 12, cw * 0.4, 4);
      // Number plate.
      ctx.fillStyle = "#fbfaf6";
      ctx.fillRect(x + cw / 2 - 30, y + rh * 0.48 - 20, 60, 40);
      ctx.fillStyle = "#2a2a30";
      ctx.font = `bold 30px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), x + cw / 2, y + rh * 0.48 + 1);
      // Lock and key, with its tag.
      ctx.fillStyle = "#b8bcc4";
      ctx.beginPath();
      ctx.arc(x + cw - 34, y + rh * 0.5, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff8a3c";
      ctx.fillRect(x + cw - 42, y + rh * 0.5 + 14, 16, 30);
    }
  }
  return tex(c);
}

// The pool's pace clock: a big sixty-second face, stopped.
export function makePaceClockTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#fbfbf8";
  ctx.beginPath();
  ctx.arc(256, 256, 252, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1e8b8c";
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.fillStyle = "#24323a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 40px ${SANS}`;
  for (let s = 0; s < 60; s += 5) {
    const a = (s / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(String(s === 0 ? 60 : s), 256 + Math.cos(a) * 196, 256 + Math.sin(a) * 196);
  }
  for (let s = 0; s < 60; s++) {
    const a = (s / 60) * Math.PI * 2 - Math.PI / 2;
    const r0 = s % 5 ? 228 : 218;
    ctx.lineWidth = s % 5 ? 3 : 6;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
    ctx.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240);
    ctx.stroke();
  }
  ctx.font = `600 22px ${SANS}`;
  ctx.fillStyle = "#ff5a9c";
  ctx.fillText("PACE", 256, 330);
  // The red sweep hand, stopped at 47.
  const a = (47 / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = "#e0294f";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(256 - Math.cos(a) * 40, 256 - Math.sin(a) * 40);
  ctx.lineTo(256 + Math.cos(a) * 214, 256 + Math.sin(a) * 214);
  ctx.stroke();
  ctx.fillStyle = "#e0294f";
  ctx.beginPath();
  ctx.arc(256, 256, 16, 0, Math.PI * 2);
  ctx.fill();
  return tex(c);
}

// Wet footprints, from the footbath onto the deck, drying as they go.
// Transparent, for a decal on the floor. v runs from the footbath (1) away
// from it (0).
export function makeFootprintsTexture() {
  const [c, ctx] = canvas(256, 1024);
  const rand = mulberry32(11);
  for (let i = 0; i < 9; i++) {
    const y = 1000 - i * 112;
    const left = i % 2 === 0;
    const x = 128 + (left ? -26 : 26) + (rand() - 0.5) * 8;
    const alpha = 0.55 * (1 - i / 10);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((left ? -0.06 : 0.06) + (rand() - 0.5) * 0.08);
    ctx.fillStyle = `rgba(30, 60, 70, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, -14, 15, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 30, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let t = 0; t < 5; t++) {
      ctx.beginPath();
      ctx.arc((left ? 1 : -1) * (-12 + t * 6), -50 - (t === 0 ? 2 : t * 0.6), 4 - t * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return tex(c);
}

// Stripes for the rubber ring and the beach ball.
export function makeStripeTexture(colors: string[], vertical = false) {
  const [c, ctx] = canvas(256, 256);
  const n = colors.length;
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    if (vertical) ctx.fillRect((i * 256) / n, 0, 256 / n + 1, 256);
    else ctx.fillRect(0, (i * 256) / n, 256, 256 / n + 1);
  });
  return tex(c);
}

// An enamel or printed plaque: a title line and smaller lines under it.
export function makePlaqueTexture(
  lines: string[],
  { w = 512, h = 256, bg = "#f4f7f6", fg = "#24323a", accent = "#1e8b8c", size = 46 } = {},
) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const top = h * 0.16;
  const rowH = (h - top * 2) / lines.length;
  lines.forEach((line, i) => {
    const px = i === 0 ? size : Math.round(size * 0.58);
    fit(ctx, line, w - 60, px, SANS, i === 0 ? "bold" : "600");
    ctx.fillText(line, w / 2, top + rowH * (i + 0.5));
  });
  return tex(c);
}

// "PLATO'S COVE LIDO" over the sun, as neon script on a transparent ground.
export function makeLidoNeonTexture() {
  const w = 1024;
  const h = 256;
  const [c, ctx] = canvas(w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = "Plato's Cove Lido";
  fit(ctx, text, w * 0.84, 132, '"Brush Script MT", "Snell Roundhand", "Segoe Script", cursive', "italic 600");
  const color = "#ff4fa8";
  ctx.shadowColor = color;
  ctx.lineJoin = "round";
  for (const [blur, alpha, width] of [
    [44, 0.5, 16],
    [18, 0.8, 9],
  ] as const) {
    ctx.shadowBlur = blur;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeText(text, w / 2, h / 2);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(text, w / 2, h / 2);
  return tex(c);
}
