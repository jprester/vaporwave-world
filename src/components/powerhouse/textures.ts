import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32, speckle } from "../cave/textures";

// Procedural surfaces and printed matter for the powerhouse, drawn to
// canvases once when the world mounts: no image files.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const STENCIL = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const MONO = "'Courier New', Courier, monospace";

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

// Fit text into a width by shrinking the font.
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  size: number,
  family: string,
  weight = "bold",
) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

// Floor: power-station concrete painted a cold grey-green, worn pale along
// the walking lines, with saw-cut joints every 4 m (one tile).
export function makeFloorTexture(repeat: [number, number]) {
  const size = 512;
  const [c, ctx] = canvas(size, size);
  const rand = mulberry32(77);
  ctx.fillStyle = "#4f5a58";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 24 + rand() * 80;
    const v = rand() < 0.55 ? "28,34,34" : "120,132,128";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${0.05 + rand() * 0.06})`);
    g.addColorStop(1, `rgba(${v},0)`);
    ctx.fillStyle = g;
    for (const ox of [-size, 0, size])
      for (const oy of [-size, 0, size]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
      }
  }
  speckle(ctx, size, rand, 12000, 0.14);
  // Oil stains.
  for (let i = 0; i < 4; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + rand() * 30);
    g.addColorStop(0, "rgba(14,16,18,0.28)");
    g.addColorStop(1, "rgba(14,16,18,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 70, y - 70, 140, 140);
  }
  ctx.fillStyle = "rgba(14,18,18,0.6)";
  ctx.fillRect(0, 0, size, 3);
  ctx.fillRect(0, 0, 3, size);
  return tex(c, repeat);
}

// Glazed wall tiles (the dado): cream-green, 15 cm, with a darker band at
// the top. The texture is 1.2 m wide and DADO_H tall.
export function makeTileTexture(repeatX: number) {
  const w = 256;
  const h = 512;
  const [c, ctx] = canvas(w, h);
  const rand = mulberry32(12);
  ctx.fillStyle = "#5e6f63";
  ctx.fillRect(0, 0, w, h);
  const tile = 32; // 8 tiles across 1.2 m
  for (let y = 40; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      const v = 200 + Math.floor(rand() * 18);
      ctx.fillStyle = `rgb(${v - 22},${v},${v - 34})`;
      ctx.fillRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
      // Glaze highlight.
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 3, y + 3, tile - 10, 3);
    }
  }
  // The dark green cap row at the top.
  ctx.fillStyle = "#2f5248";
  ctx.fillRect(0, 0, w, 40);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(0, 6, w, 4);
  // Grime toward the floor.
  const g = ctx.createLinearGradient(0, h - 120, 0, h);
  g.addColorStop(0, "rgba(30,34,30,0)");
  g.addColorStop(1, "rgba(30,34,30,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 120, w, 120);
  const t = tex(c, [repeatX, 1]);
  t.wrapT = RepeatWrapping;
  return t;
}

// Painted blockwork above the dado: cold pale green, streaked.
export function makeUpperWallTexture(repeat: [number, number]) {
  const size = 512;
  const [c, ctx] = canvas(size, size);
  const rand = mulberry32(5);
  ctx.fillStyle = "#7d8c86";
  ctx.fillRect(0, 0, size, size);
  // Blocks: 0.45 m courses (texture is 4 m square).
  const course = size / 9;
  for (let r = 0; r < 9; r++) {
    const off = (r % 2) * 0.5;
    for (let k = -1; k < 5; k++) {
      const x = (k + off) * (size / 4.5);
      const v = rand() * 14 - 7;
      ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 200})`;
      ctx.fillRect(x, r * course, size / 4.5, course);
    }
    ctx.fillStyle = "rgba(30,40,38,0.35)";
    ctx.fillRect(0, r * course, size, 2);
  }
  for (let r = 0; r < 9; r++) {
    const off = (r % 2) * 0.5;
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = "rgba(30,40,38,0.3)";
      ctx.fillRect((k + off) * (size / 4.5), r * course, 2, course);
    }
  }
  // Streaks.
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "rgba(40,50,46,0)");
    g.addColorStop(0.5, `rgba(40,50,46,${0.05 + rand() * 0.08})`);
    g.addColorStop(1, "rgba(40,50,46,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 3 + rand() * 10, size);
  }
  speckle(ctx, size, rand, 6000, 0.1);
  return tex(c, repeat);
}

// Stencilled letters on a transparent ground, for walls, the duct and the
// floor. Width-fitted, one line.
export function makeStencilTexture(
  text: string,
  color: string,
  { w = 1024, h = 192, size = 140 } = {},
) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitFont(ctx, text, w * 0.94, size, STENCIL, "900");
  ctx.fillText(text, w / 2, h / 2 + 4);
  // Stencil bridges and wear.
  ctx.globalCompositeOperation = "destination-out";
  const rand = mulberry32(text.length * 31 + 7);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.3 + rand() * 0.6})`;
    ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 6, 2 + rand() * 4);
  }
  ctx.globalCompositeOperation = "source-over";
  return tex(c);
}

// The safety board by the door.
export function makeDaysBoardTexture() {
  const [c, ctx] = canvas(1024, 768);
  ctx.fillStyle = "#1f5d4b";
  ctx.fillRect(0, 0, 1024, 768);
  ctx.strokeStyle = "#e9e4d2";
  ctx.lineWidth = 10;
  ctx.strokeRect(22, 22, 980, 724);
  ctx.fillStyle = "#e9e4d2";
  ctx.textAlign = "center";
  ctx.font = `bold 58px ${SANS}`;
  ctx.fillText("THIS STATION HAS RUN", 512, 132);
  // The number, on white flip cards.
  const digits = "12,784";
  const cw = 104;
  const x0 = 512 - (digits.length * cw) / 2;
  for (let i = 0; i < digits.length; i++) {
    const ch = digits[i];
    const x = x0 + i * cw;
    if (ch !== ",") {
      ctx.fillStyle = "#f4f1e6";
      ctx.fillRect(x + 6, 190, cw - 12, 200);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 6, 288, cw - 12, 4);
    }
    ctx.fillStyle = ch === "," ? "#e9e4d2" : "#1b1b1b";
    ctx.font = `bold 170px ${SANS}`;
    ctx.fillText(ch, x + cw / 2, 352);
  }
  ctx.fillStyle = "#e9e4d2";
  ctx.font = `bold 58px ${SANS}`;
  ctx.fillText("DAYS WITHOUT A NIGHT", 512, 480);
  ctx.font = `28px ${SANS}`;
  ctx.fillText("LAST NIGHT RECORDED: 20 JUNE 1987", 512, 570);
  ctx.fillText("PREVIOUS BEST: NONE", 512, 616);
  ctx.font = `bold 30px ${SANS}`;
  ctx.fillText("KEEP IT GOLDEN", 512, 690);
  return tex(c);
}

// One account's meter face: a cyclometer register, the account name and a
// disc window (the disc itself is a separate spinning mesh).
export function makeMeterTexture(account: string, reading: string, note: string) {
  const [c, ctx] = canvas(512, 640);
  ctx.fillStyle = "#e7e2d2";
  ctx.fillRect(0, 0, 512, 640);
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 484, 612);
  ctx.fillStyle = "#2b2b2b";
  ctx.textAlign = "center";
  ctx.font = `bold 30px ${SANS}`;
  ctx.fillText("PLATO'S COVE LIGHT & POWER", 256, 66);
  ctx.font = `22px ${SANS}`;
  ctx.fillText("GOLDEN HOUR · kWh(g)", 256, 100);
  // Register.
  const digits = reading.padStart(7, "0");
  for (let i = 0; i < digits.length; i++) {
    const x = 60 + i * 56;
    ctx.fillStyle = i === digits.length - 1 ? "#a8243a" : "#151515";
    ctx.fillRect(x, 130, 50, 74);
    ctx.fillStyle = "#f3f0e4";
    ctx.font = `bold 52px ${MONO}`;
    ctx.fillText(digits[i], x + 25, 186);
  }
  // Disc window (dark slot).
  ctx.fillStyle = "#151515";
  ctx.fillRect(96, 240, 320, 60);
  ctx.fillStyle = "#2b2b2b";
  ctx.font = `bold 20px ${SANS}`;
  ctx.fillText("375 REV = 1 HOUR (GOLDEN)", 256, 330);
  // Account plate.
  ctx.fillStyle = "#1f5d4b";
  ctx.fillRect(40, 370, 432, 150);
  ctx.fillStyle = "#f3f0e4";
  ctx.font = `bold 22px ${SANS}`;
  ctx.fillText("ACCOUNT", 256, 404);
  fitFont(ctx, account, 400, 52, SANS);
  ctx.fillText(account, 256, 466);
  ctx.font = `bold 22px ${SANS}`;
  ctx.fillText(note, 256, 504);
  ctx.fillStyle = "#2b2b2b";
  ctx.font = `20px ${SANS}`;
  ctx.fillText("PAYER: THE OCCUPIER", 256, 566);
  ctx.fillText("SEAL INTACT · DO NOT TAMPER", 256, 598);
  return tex(c);
}

// The tariff, pinned up by the meters.
export function makeTariffTexture() {
  const [c, ctx] = canvas(512, 720);
  ctx.fillStyle = "#f2efe4";
  ctx.fillRect(0, 0, 512, 720);
  ctx.fillStyle = "#1f5d4b";
  ctx.fillRect(0, 0, 512, 110);
  ctx.fillStyle = "#f2efe4";
  ctx.textAlign = "center";
  ctx.font = `bold 50px ${SANS}`;
  ctx.fillText("TARIFF", 256, 72);
  ctx.fillStyle = "#222";
  ctx.textAlign = "left";
  const rows: [string, string][] = [
    ["DAWN", "N/A"],
    ["MORNING", "N/A"],
    ["NOON", "N/A"],
    ["AFTERNOON", "N/A"],
    ["GOLDEN HOUR", "ON LOAN"],
    ["DUSK", "N/A"],
    ["NIGHT", "SEE MOON"],
  ];
  rows.forEach(([a, b], i) => {
    const y = 180 + i * 62;
    ctx.font = `bold 30px ${SANS}`;
    ctx.fillText(a, 40, y);
    ctx.textAlign = "right";
    ctx.fillText(b, 472, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(40, y + 16, 432, 2);
    ctx.fillStyle = "#222";
  });
  ctx.font = `22px ${SANS}`;
  ctx.fillText("Standing charge waived while the", 40, 640);
  ctx.fillText("sun is held. Interest accrues daily.", 40, 672);
  return tex(c);
}

// An envelope, face up in the tray.
export function makeEnvelopeTexture() {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = "#efe9da";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#b5262f";
  ctx.lineWidth = 8;
  ctx.strokeRect(300, 26, 180, 70);
  ctx.fillStyle = "#b5262f";
  ctx.textAlign = "center";
  ctx.font = `bold 26px ${SANS}`;
  ctx.fillText("FINAL", 390, 58);
  ctx.fillText("NOTICE", 390, 88);
  ctx.fillStyle = "#2a2a2a";
  ctx.textAlign = "left";
  ctx.font = `bold 30px ${MONO}`;
  ctx.fillText("THE OCCUPIER", 60, 160);
  ctx.font = `24px ${MONO}`;
  ctx.fillText("PLATO'S COVE", 60, 196);
  ctx.fillText("(THE ISLAND)", 60, 226);
  return tex(c);
}

// The generator's cast nameplate.
export function makeNameplateTexture(n: number) {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = "#b99a5b";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#5a4520";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = "#3a2c12";
  ctx.textAlign = "center";
  ctx.font = `bold 34px ${SANS}`;
  ctx.fillText("GOLDEN HOUR GENERATOR", 256, 66);
  ctx.font = `bold 92px ${SANS}`;
  ctx.fillText(`No. ${n}`, 256, 160);
  ctx.font = `bold 24px ${SANS}`;
  ctx.fillText("18:47 · 50 Hz · 1987", 256, 214);
  return tex(c);
}

// A sack of fuel.
export function makeSackTexture() {
  const [c, ctx] = canvas(512, 512);
  const rand = mulberry32(19);
  ctx.fillStyle = "#c8b98f";
  ctx.fillRect(0, 0, 512, 512);
  // Weave.
  for (let y = 0; y < 512; y += 4) {
    ctx.fillStyle = `rgba(90,70,40,${0.05 + rand() * 0.06})`;
    ctx.fillRect(0, y, 512, 2);
  }
  for (let x = 0; x < 512; x += 4) {
    ctx.fillStyle = `rgba(90,70,40,${0.03 + rand() * 0.05})`;
    ctx.fillRect(x, 0, 2, 512);
  }
  ctx.fillStyle = "#8e2c4a";
  ctx.textAlign = "center";
  ctx.font = `900 92px ${STENCIL}`;
  ctx.fillText("NOSTALGIA", 256, 210);
  ctx.font = `bold 50px ${SANS}`;
  ctx.fillText("GRADE B", 256, 290);
  ctx.font = `bold 40px ${SANS}`;
  ctx.fillText("25 kg", 256, 360);
  ctx.font = `24px ${SANS}`;
  ctx.fillText("KEEP DRY · BURNS SLOWLY", 256, 420);
  return tex(c);
}

// The spare moon: pale and cold, maria and craters.
export function makeMoonTexture() {
  const w = 1024;
  const h = 512;
  const [c, ctx] = canvas(w, h);
  const rand = mulberry32(3);
  ctx.fillStyle = "#d8dce4";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = rand() * w;
    const y = h * 0.2 + rand() * h * 0.6;
    const r = 40 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,128,146,0.55)");
    g.addColorStop(1, "rgba(120,128,146,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 160; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 3 + rand() * rand() * 26;
    ctx.strokeStyle = "rgba(90,96,112,0.45)";
    ctx.lineWidth = 1 + r * 0.15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  speckle(ctx, w, rand, 9000, 0.12);
  return tex(c);
}

// The big output gauge on the switchgear: one band is golden.
export function makeGaugeTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#ece8da";
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#202020";
  ctx.lineWidth = 12;
  ctx.stroke();
  const a0 = Math.PI * 0.8;
  const a1 = Math.PI * 2.2;
  // Bands: dark, dusk (lilac), golden, too bright (pink).
  const bands: [number, number, string][] = [
    [0, 0.55, "#3a3f4a"],
    [0.55, 0.72, "#9a7fc4"],
    [0.72, 0.86, "#f2b33a"],
    [0.86, 1, "#e8507e"],
  ];
  for (const [t0, t1, col] of bands) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(256, 256, 196, a0 + (a1 - a0) * t0, a0 + (a1 - a0) * t1);
    ctx.stroke();
  }
  ctx.strokeStyle = "#202020";
  ctx.lineWidth = 4;
  for (let k = 0; k <= 20; k++) {
    const a = a0 + ((a1 - a0) * k) / 20;
    const r0 = k % 5 ? 168 : 152;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
    ctx.lineTo(256 + Math.cos(a) * 214, 256 + Math.sin(a) * 214);
    ctx.stroke();
  }
  ctx.fillStyle = "#202020";
  ctx.textAlign = "center";
  ctx.font = `bold 30px ${SANS}`;
  ctx.fillText("NIGHT", 120, 400);
  ctx.fillText("NOON", 392, 400);
  ctx.font = `bold 36px ${SANS}`;
  ctx.fillText("OUTPUT", 256, 330);
  ctx.font = `bold 22px ${SANS}`;
  ctx.fillText("GOLDEN HOUR", 256, 362);
  return tex(c);
}

// Switchgear cabinet fronts: a run of grey-green panels with labels, lamps
// and handles. One texture is one cabinet, 1.5 m wide by 3.6 m tall.
export function makeSwitchgearTexture(repeat: [number, number]) {
  const w = 256;
  const h = 616;
  const [c, ctx] = canvas(w, h);
  const rand = mulberry32(41);
  ctx.fillStyle = "#6b7d78";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(20,26,26,0.7)";
  ctx.fillRect(0, 0, 4, h);
  ctx.fillRect(w - 4, 0, 4, h);
  // Doors.
  for (const [y0, y1] of [
    [30, 250],
    [270, 590],
  ]) {
    ctx.strokeStyle = "rgba(20,26,26,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, y0, w - 36, y1 - y0);
    ctx.fillStyle = "#cfcab8";
    ctx.fillRect(w - 46, (y0 + y1) / 2 - 30, 10, 60);
  }
  // Label strip, lamps.
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(40, 54, 140, 30);
  ctx.fillStyle = "#e8e4d6";
  ctx.font = `bold 18px ${SANS}`;
  ctx.textAlign = "center";
  const labels = ["FEEDER", "BUS TIE", "AUX", "SUN", "DUSK"];
  ctx.fillText(labels[Math.floor(rand() * labels.length)], 110, 76);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? "#3fd27a" : i === 1 ? "#d23f4f" : "#e0b23a";
    ctx.beginPath();
    ctx.arc(60 + i * 46, 130, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small dial.
  ctx.fillStyle = "#ece8da";
  ctx.beginPath();
  ctx.arc(110, 196, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#202020";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(110, 196);
  ctx.lineTo(110 + Math.cos(-0.6 - rand()) * 28, 196 + Math.sin(-0.6 - rand()) * 28);
  ctx.stroke();
  // Danger plate.
  ctx.fillStyle = "#f0d23a";
  ctx.fillRect(56, 330, 110, 70);
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.moveTo(111, 340);
  ctx.lineTo(136, 384);
  ctx.lineTo(86, 384);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f0d23a";
  ctx.font = `bold 32px ${SANS}`;
  ctx.fillText("!", 111, 380);
  // Scuffs.
  speckle(ctx, w, rand, 2000, 0.12);
  return tex(c, repeat);
}

// A wide warning sign for the switchgear.
export function makeDangerTexture() {
  const [c, ctx] = canvas(1024, 384);
  ctx.fillStyle = "#f0d23a";
  ctx.fillRect(0, 0, 1024, 384);
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(0, 0, 1024, 110);
  ctx.fillStyle = "#f0d23a";
  ctx.textAlign = "center";
  ctx.font = `bold 84px ${SANS}`;
  ctx.fillText("DANGER", 512, 86);
  ctx.fillStyle = "#1c1c1c";
  ctx.font = `bold 52px ${SANS}`;
  ctx.fillText("GOLDEN HOUR · 11,000 LUX", 512, 200);
  ctx.font = `bold 40px ${SANS}`;
  ctx.fillText("DO NOT LOOK DIRECTLY AT THE SUPPLY", 512, 290);
  ctx.font = `28px ${SANS}`;
  ctx.fillText("AUTHORISED PERSONNEL ONLY", 512, 350);
  return tex(c);
}

// The mimic board: the network as a diagram, lamps lit along every line.
export function makeMimicTexture() {
  const w = 2048;
  const h = 410;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = "#3b5752";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  const line = (pts: [number, number][], col = "#f2c14e") => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 12;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.stroke();
  };
  const box = (x: number, y: number, label: string, sub?: string) => {
    ctx.fillStyle = "#e9e4d2";
    ctx.fillRect(x - 110, y - 44, 220, 88);
    ctx.fillStyle = "#1e2a28";
    ctx.textAlign = "center";
    fitFont(ctx, label, 200, 30, SANS);
    ctx.fillText(label, x, y + (sub ? -2 : 10));
    if (sub) {
      ctx.font = `bold 18px ${SANS}`;
      ctx.fillText(sub, x, y + 28);
    }
  };
  const lamp = (x: number, y: number, on = true) => {
    ctx.fillStyle = on ? "#ffe08a" : "#2a2f2e";
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e2a28";
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  // Left to right: the fire, the generators, the bus, the customers. The
  // board faces west, so read it from the gallery.
  const fx = 180;
  const busX = 980;
  line([[fx, 205], [500, 205]], "#f08a3a");
  for (const [i, y] of [80, 205, 330].entries()) {
    line([[500, 205], [500, y], [620, y]], "#f08a3a");
    line([[620, y], [busX, y], [busX, 205]], i === 1 ? "#5b6664" : "#f2c14e");
  }
  const customers: [string, string][] = [
    ["ISLAND", "SUN · SEA"],
    ["SUNSET MOTEL", "POOL · SIGN"],
    ["THE AGORA", "OUTLET ONLY"],
    ["PLATO TV", "24 HRS"],
  ];
  customers.forEach((_, i) => {
    const y = 60 + i * 96;
    line([[busX, 205], [busX + 140, 205], [busX + 140, y], [1560, y]]);
  });
  line([[busX, 60], [busX, 350]]);
  box(fx, 205, "THE FIRE", "LIT 1987");
  for (const [i, y] of [80, 205, 330].entries()) {
    box(700, y, `GEN ${i + 1}`, i === 1 ? "OUT OF SERVICE" : "RUNNING");
    lamp(830, y, i !== 1);
  }
  customers.forEach(([label, sub], i) => {
    const y = 60 + i * 96;
    box(1680, y, label, sub);
    lamp(1530, y);
  });
  ctx.fillStyle = "#e9e4d2";
  ctx.textAlign = "left";
  ctx.font = `bold 26px ${SANS}`;
  ctx.fillText("GOLDEN HOUR NETWORK", 24, 380);
  ctx.textAlign = "right";
  ctx.fillText("NIGHT: NOT CONNECTED", w - 24, 380);
  return tex(c);
}

// The station log, open on the desk. Every entry is the same time.
export function makeLogbookTexture() {
  const [c, ctx] = canvas(1024, 640);
  ctx.fillStyle = "#f1ecdc";
  ctx.fillRect(0, 0, 1024, 640);
  // Spine shadow.
  const g = ctx.createLinearGradient(482, 0, 542, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(0,0,0,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(482, 0, 60, 640);
  ctx.strokeStyle = "rgba(60,90,160,0.3)";
  ctx.lineWidth = 2;
  for (let y = 90; y < 620; y += 40) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(1004, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(190,40,60,0.4)";
  ctx.beginPath();
  ctx.moveTo(130, 20);
  ctx.lineTo(130, 620);
  ctx.moveTo(642, 20);
  ctx.lineTo(642, 620);
  ctx.stroke();
  ctx.fillStyle = "#1f2b5a";
  ctx.font = `bold 30px ${MONO}`;
  ctx.fillText("STATION LOG", 140, 60);
  ctx.fillText("STATION LOG", 652, 60);
  const left = [
    "SUNSET. HELD.",
    "FIRE FED, 2 SACKS (B)",
    "SUNSET. HELD.",
    "GEN 2 STILL DOWN",
    "SUNSET. HELD.",
    "MOON BACK FROM AGORA",
    "SUNSET. HELD.",
    "PHONE RANG AT MOTEL",
    "SUNSET. HELD.",
    "FIRE FED, 2 SACKS (B)",
    "SUNSET. HELD.",
    "SUNSET. HELD.",
  ];
  const right = [
    "SUNSET. HELD.",
    "GRADE A: NONE LEFT",
    "SUNSET. HELD.",
    "FINAL NOTICE (FILED)",
    "SUNSET. HELD.",
    "NO RELIEF YET",
    "SUNSET. HELD.",
    "SUNSET. HELD.",
    "BACK IN 5 MIN",
  ];
  ctx.font = `24px ${MONO}`;
  left.forEach((t, i) => {
    ctx.fillText("18:47", 30, 116 + i * 40);
    ctx.fillText(t, 140, 116 + i * 40);
  });
  right.forEach((t, i) => {
    ctx.fillText("18:47", 542, 116 + i * 40);
    ctx.fillText(t, 652, 116 + i * 40);
  });
  return tex(c);
}

// A wall clock, stopped at 6:47 (in the evening, the log says).
export function makeClockTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#f2efe8";
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1f1d24";
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.fillStyle = "#1f1d24";
  for (let k = 0; k < 12; k++) {
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate((k / 12) * Math.PI * 2);
    ctx.fillRect(-6, -226, 12, k % 3 ? 26 : 46);
    ctx.restore();
  }
  ctx.textAlign = "center";
  ctx.font = `bold 26px ${SANS}`;
  ctx.fillText("PCL&P", 256, 180);
  const hand = (angle: number, len: number, width: number) => {
    ctx.lineCap = "round";
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(256, 256);
    ctx.lineTo(256 + Math.sin(angle) * len, 256 - Math.cos(angle) * len);
    ctx.stroke();
  };
  ctx.strokeStyle = "#1f1d24";
  hand(((6 + 47 / 60) / 12) * Math.PI * 2, 120, 16);
  hand((47 / 60) * Math.PI * 2, 190, 10);
  return tex(c);
}

// Cast plaque on the boiler.
export function makeFirePlaqueTexture() {
  const [c, ctx] = canvas(1024, 384);
  ctx.fillStyle = "#3a2e22";
  ctx.fillRect(0, 0, 1024, 384);
  ctx.strokeStyle = "#c9a35c";
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 992, 352);
  ctx.fillStyle = "#e3c27a";
  ctx.textAlign = "center";
  ctx.font = `bold 96px ${SANS}`;
  ctx.fillText("THE FIRE", 512, 136);
  ctx.font = `bold 40px ${SANS}`;
  ctx.fillText("LIT 21 JUNE 1987, AT 18:47", 512, 220);
  ctx.font = `bold 34px ${SANS}`;
  ctx.fillText("NOT TO BE LET OUT", 512, 290);
  ctx.font = `24px ${SANS}`;
  ctx.fillText("ALL SHADOWS ARE PROPERTY OF PLATO'S COVE HOLIDAYS", 512, 340);
  return tex(c);
}

// The sign over the door, on the powerhouse side.
export function makeDoorSignTexture() {
  const [c, ctx] = canvas(512, 160);
  ctx.fillStyle = "#1f5d4b";
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = "#e8e4d8";
  ctx.textAlign = "center";
  ctx.font = `bold 60px ${SANS}`;
  ctx.fillText("STORES", 256, 72);
  ctx.font = `bold 26px ${SANS}`;
  ctx.fillText("DOOR No. 11 · KEEP SHUT", 256, 126);
  return tex(c);
}

// The station's name board, high on the south wall.
export function makeStationBoardTexture() {
  const [c, ctx] = canvas(2048, 320);
  ctx.fillStyle = "#e9e4d2";
  ctx.fillRect(0, 0, 2048, 320);
  ctx.fillStyle = "#1f5d4b";
  ctx.fillRect(0, 0, 2048, 24);
  ctx.fillRect(0, 296, 2048, 24);
  ctx.textAlign = "center";
  ctx.font = `bold 120px ${SANS}`;
  ctx.fillText("PLATO'S COVE LIGHT & POWER", 1024, 160);
  ctx.fillStyle = "#c8466e";
  ctx.font = `bold 58px ${SANS}`;
  ctx.fillText("GOLDEN HOUR GENERATING STATION No. 1", 1024, 252);
  return tex(c);
}

// A control-desk top: switches, lamps and a chart recorder window.
export function makeDeskTopTexture() {
  const [c, ctx] = canvas(1024, 160);
  const rand = mulberry32(8);
  ctx.fillStyle = "#56706a";
  ctx.fillRect(0, 0, 1024, 160);
  for (let i = 0; i < 26; i++) {
    const x = 30 + i * 38;
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(x, 30, 22, 40);
    ctx.fillStyle = "#d9d4c4";
    ctx.fillRect(x + 6, rand() < 0.8 ? 34 : 50, 10, 16);
    const col = rand();
    ctx.fillStyle = col < 0.7 ? "#ffd56a" : col < 0.9 ? "#5fe08a" : "#ff5a6a";
    ctx.beginPath();
    ctx.arc(x + 11, 100, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e9e4d2";
  ctx.font = `bold 18px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("FEEDERS · SUN · SEA · SIGN · POOL · OUTLET · TV", 30, 146);
  return tex(c);
}

// Chart recorder paper: a perfectly flat line at the same height.
export function makeChartTexture() {
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = "#f3efe2";
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = "rgba(200,60,80,0.35)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#1f2b5a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(176, 0);
  ctx.lineTo(176, 512);
  ctx.stroke();
  ctx.fillStyle = "#1f2b5a";
  ctx.font = `bold 18px ${MONO}`;
  ctx.fillText("18:47", 190, 120);
  ctx.fillText("18:47", 190, 380);
  return tex(c);
}

// Firebrick, for the boiler's setting.
export function makeBrickTexture(repeat: [number, number]) {
  const w = 512;
  const h = 256;
  const [c, ctx] = canvas(w, h);
  const rand = mulberry32(23);
  ctx.fillStyle = "#2a2220";
  ctx.fillRect(0, 0, w, h);
  const bw = 128;
  const bh = 42.67;
  for (let r = 0; r < 6; r++) {
    const off = (r % 2) * (bw / 2);
    for (let k = -1; k < 5; k++) {
      const v = rand();
      ctx.fillStyle = `rgb(${110 + v * 40},${54 + v * 18},${44 + v * 12})`;
      ctx.fillRect(k * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
      ctx.fillStyle = `rgba(0,0,0,${0.1 + rand() * 0.25})`;
      ctx.fillRect(k * bw + off + 3, r * bh + bh - 12, bw - 6, 9);
    }
  }
  speckle(ctx, w, rand, 5000, 0.18);
  return tex(c, repeat);
}

// A tall window, painted over from outside: dark panes in a steel grid, a
// few scratches that show only more dark.
export function makeBlackoutWindowTexture() {
  const w = 256;
  const h = 640;
  const [c, ctx] = canvas(w, h);
  const rand = mulberry32(61);
  ctx.fillStyle = "#2b3533";
  ctx.fillRect(0, 0, w, h);
  const cols = 4;
  const rows = 10;
  const pw = w / cols;
  const ph = h / rows;
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const v = 18 + rand() * 10;
      ctx.fillStyle = `rgb(${v},${v + 6},${v + 10})`;
      ctx.fillRect(k * pw + 5, r * ph + 5, pw - 10, ph - 10);
      // Brush marks in the paint.
      ctx.fillStyle = "rgba(60,72,76,0.25)";
      for (let i = 0; i < 4; i++)
        ctx.fillRect(k * pw + 8, r * ph + 8 + rand() * (ph - 20), pw - 16, 2);
    }
  ctx.strokeStyle = "rgba(4,6,8,0.9)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 40, y + rand() * 30);
    ctx.stroke();
  }
  return tex(c);
}
