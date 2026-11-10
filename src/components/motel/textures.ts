import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { mulberry32 } from "../cave/textures";

// Procedural canvas textures for the Sunset Motel. No image files: deck,
// stucco, pool tile, curtains and signage are all drawn once on mount.

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function texture(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 16;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

// Pale, sun-bleached concrete slabs round the pool. One texture is 4 m
// square; the courtyard repeats it.
export function makeDeckTexture(repeat: [number, number] = [11, 10]) {
  const [c, ctx] = canvas(1024, 1024);
  const r = mulberry32(41);
  const slab = 256;
  const tones = ["#cbb2ae", "#d4bcb5", "#c6aaa8", "#d8c2ba"];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = tones[Math.floor(r() * tones.length)];
      ctx.fillRect(i * slab, j * slab, slab, slab);
      // A soft wash of sunset colour across each slab.
      const g = ctx.createLinearGradient(0, j * slab, 0, (j + 1) * slab);
      g.addColorStop(0, "rgba(255,178,150,0.10)");
      g.addColorStop(1, "rgba(110,70,110,0.10)");
      ctx.fillStyle = g;
      ctx.fillRect(i * slab, j * slab, slab, slab);
    }
  }
  // Aggregate and grime.
  for (let n = 0; n < 5200; n++) {
    ctx.fillStyle = r() > 0.5 ? "#9f8282" : "#e7d3c9";
    ctx.globalAlpha = 0.06 + r() * 0.14;
    const s = 0.6 + r() * 2.4;
    ctx.fillRect(r() * 1024, r() * 1024, s, s);
  }
  ctx.globalAlpha = 1;
  // Joints.
  ctx.strokeStyle = "#8f7274";
  ctx.lineWidth = 3;
  for (let k = 0; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(k * slab, 0);
    ctx.lineTo(k * slab, 1024);
    ctx.moveTo(0, k * slab);
    ctx.lineTo(1024, k * slab);
    ctx.stroke();
  }
  // A few hairline cracks and old stains.
  for (let n = 0; n < 9; n++) {
    ctx.strokeStyle = "rgba(90,66,74,0.35)";
    ctx.lineWidth = 1 + r();
    ctx.beginPath();
    let x = r() * 1024;
    let y = r() * 1024;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 90;
      y += (r() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let n = 0; n < 26; n++) {
    ctx.fillStyle = "rgba(90,58,70,0.10)";
    ctx.beginPath();
    ctx.ellipse(r() * 1024, r() * 1024, 8 + r() * 34, 6 + r() * 22, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(c, repeat);
}

// Sun-warmed stucco. Mottled, with a couple of long cracks and a tide line
// where the sprinklers hit it.
export function makeStuccoTexture(repeat: [number, number] = [8, 1]) {
  const [c, ctx] = canvas(512, 512);
  const r = mulberry32(9);
  const img = ctx.createImageData(512, 512);
  const TAU = Math.PI * 2;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const u = (x / 512) * TAU;
      const v = (y / 512) * TAU;
      // Sum of periodic sine fields: every term completes a whole number of
      // cycles across the canvas, so the texture tiles exactly. No canvas
      // edge to clip, and therefore no seam where the wall repeats it.
      const n =
        Math.sin(u * 3 + 1.7) * Math.sin(v * 2 + 0.4) * 0.5 +
        Math.sin(u * 7 + 4.2) * Math.sin(v * 5 + 2.1) * 0.26 +
        Math.sin(u * 13 + 1.1) * Math.sin(v * 9 + 3.3) * 0.13;
      const grain = (r() - 0.5) * 0.05;
      const k = 1 + n * 0.05 + grain;
      const i = (y * 512 + x) * 4;
      img.data[i] = 224 * k;
      img.data[i + 1] = 163 * k;
      img.data[i + 2] = 170 * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texture(c, repeat);
}

// Small turquoise pool tiles, 8 × 8 per texture.
export function makePoolTileTexture(repeat: [number, number] = [8, 8]) {
  const [c, ctx] = canvas(512, 512);
  const r = mulberry32(17);
  const tile = 64;
  const tones = ["#2e8f8a", "#37a49b", "#277d80", "#43b0a1"];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = tones[Math.floor(r() * tones.length)];
      ctx.fillRect(i * tile + 2, j * tile + 2, tile - 4, tile - 4);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(i * tile + 8, j * tile + 8, tile - 26, 6);
    }
  }
  ctx.strokeStyle = "#c9efe6";
  ctx.lineWidth = 3;
  for (let k = 0; k <= 8; k++) {
    ctx.beginPath();
    ctx.moveTo(k * tile, 0);
    ctx.lineTo(k * tile, 512);
    ctx.moveTo(0, k * tile);
    ctx.lineTo(512, k * tile);
    ctx.stroke();
  }
  return texture(c, repeat);
}

// What you see through a motel window: a gap in the curtains, a room behind.
// `kind` picks the room: still lit, lit by a television, or dark.
export function makeCurtainTexture(kind: "warm" | "tv" | "dark") {
  const [c, ctx] = canvas(512, 512);
  const r = mulberry32(kind === "warm" ? 31 : kind === "tv" ? 32 : 33);

  ctx.fillStyle = kind === "warm" ? "#3a2028" : kind === "tv" ? "#141c30" : "#151322";
  ctx.fillRect(0, 0, 512, 512);

  // The room beyond the glass, inset a little.
  const x0 = 62;
  const x1 = 450;
  if (kind === "warm") {
    const g = ctx.createRadialGradient(256, 300, 10, 256, 300, 300);
    g.addColorStop(0, "#ffdb9b");
    g.addColorStop(0.45, "#e89b62");
    g.addColorStop(1, "#5a2a3a");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 40, x1 - x0, 452);
    // Headboard and a lamp.
    ctx.fillStyle = "#6d3a3e";
    ctx.fillRect(110, 250, 292, 150);
    ctx.fillStyle = "#5a2a30";
    ctx.fillRect(130, 270, 252, 70);
    ctx.fillStyle = "#ffd9a2";
    ctx.beginPath();
    ctx.moveTo(390, 300);
    ctx.lineTo(430, 340);
    ctx.lineTo(350, 340);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe9c4";
    ctx.fillRect(384, 340, 12, 40);
  } else if (kind === "tv") {
    const g = ctx.createRadialGradient(300, 300, 10, 300, 300, 340);
    g.addColorStop(0, "#bfe7ff");
    g.addColorStop(0.35, "#4b78c8");
    g.addColorStop(1, "#151a34");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 40, x1 - x0, 452);
    // A television, on, and the end of a bed.
    ctx.fillStyle = "#0d1522";
    ctx.fillRect(160, 210, 120, 96);
    ctx.fillStyle = "#9fe4ff";
    ctx.fillRect(170, 220, 100, 70);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let y = 222; y < 290; y += 5) ctx.fillRect(170, y, 100, 2);
    ctx.fillStyle = "#22304c";
    ctx.fillRect(110, 360, 290, 100);
  } else {
    const g = ctx.createLinearGradient(0, 40, 0, 492);
    g.addColorStop(0, "#26314c");
    g.addColorStop(1, "#141322");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 40, x1 - x0, 452);
    ctx.fillStyle = "rgba(130,160,210,0.18)";
    ctx.fillRect(150, 250, 210, 120);
  }

  // Curtains: two folded panels, drawn over the room.
  const curtain = (x: number, w: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x + w, 24);
    ctx.lineTo(x + w, 490);
    ctx.lineTo(x, 490);
    ctx.closePath();
    ctx.fill();
    for (let k = 1; k < 7; k++) {
      const fx = x + (w * k) / 7;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(fx, 30);
      ctx.lineTo(fx + 8, 486);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx + 7, 30);
      ctx.lineTo(fx + 15, 486);
      ctx.stroke();
    }
  };
  const col = kind === "warm" ? "#8d454f" : kind === "tv" ? "#3f4a70" : "#2a2a44";
  curtain(0, 96, col);
  curtain(416, 96, col);

  // A valance across the top, and a diagonal reflection on the glass.
  ctx.fillStyle = kind === "warm" ? "#6f333e" : kind === "tv" ? "#2a3352" : "#211f36";
  ctx.fillRect(0, 0, 512, 34);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(40, 500);
  ctx.lineTo(470, 60);
  ctx.stroke();

  ctx.globalAlpha = 0.4 + r() * 0.05;
  return texture(c);
}

// Brass room number, screwed to the door.
export function makeNumberTexture(n: number) {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#e5bd7e");
  g.addColorStop(0.5, "#bd8f4f");
  g.addColorStop(1, "#8f6734");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#6c4a25";
  ctx.lineWidth = 6;
  ctx.strokeRect(7, 7, 114, 114);
  ctx.fillStyle = "#3b2714";
  ctx.font = "bold 70px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), 64, 68);
  // Two screw heads.
  ctx.fillStyle = "#6f4e28";
  for (const [x, y] of [
    [18, 18],
    [110, 18],
    [18, 110],
    [110, 110],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(c);
}

// The big neon sign: a sun over the name, chrome border, and the amenities
// in small type underneath.
export function makeMotelBoardTexture() {
  const [c, ctx] = canvas(1024, 512);
  const r = mulberry32(77);
  ctx.fillStyle = "#241428";
  ctx.fillRect(0, 0, 1024, 512);
  // Inner glow wash.
  const g = ctx.createRadialGradient(260, 220, 20, 260, 220, 520);
  g.addColorStop(0, "rgba(255,120,150,0.28)");
  g.addColorStop(1, "rgba(40,16,48,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  // Border.
  ctx.strokeStyle = "#d9ae6c";
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, 984, 472);
  ctx.strokeStyle = "#6f4c60";
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, 936, 424);

  // The sun, half set, with the classic cut stripes.
  const cx = 220;
  const cy = 238;
  const sun = ctx.createLinearGradient(0, cy - 130, 0, cy + 130);
  sun.addColorStop(0, "#ffe28a");
  sun.addColorStop(0.5, "#ff9a6a");
  sun.addColorStop(1, "#ff5e86");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 128, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - 140, cy - 140, 280, 280);
  ctx.fillStyle = "#241428";
  for (let k = 0; k < 7; k++) {
    const y = cy + 12 + k * 17;
    ctx.fillRect(cx - 140, y, 280, 4 + k * 1.6);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,220,170,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 132, 0, Math.PI * 2);
  ctx.stroke();

  // The name.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffe8c8";
  ctx.font = "italic 700 128px Georgia, 'Times New Roman', serif";
  ctx.fillText("Sunset", 390, 214);
  ctx.font = "700 96px Georgia, 'Times New Roman', serif";
  ctx.letterSpacing = "14px";
  ctx.fillStyle = "#ffb1c4";
  ctx.fillText("MOTEL", 394, 330);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#d9b79a";
  ctx.font = "500 30px Helvetica, Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText("COLOR TV · AIR CONDITIONED · POOL", 396, 400);
  ctx.letterSpacing = "0px";

  // A few dead bulbs in the border.
  for (let k = 0; k < 24; k++) {
    const x = 26 + k * 42;
    ctx.fillStyle = r() > 0.78 ? "#5a3a46" : "#ffe4b0";
    ctx.beginPath();
    ctx.arc(x, 26, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, 486, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(c);
}

// The painted board over the gate: smaller, plainer, no bulbs.
export function makeGateBoardTexture() {
  const [c, ctx] = canvas(1024, 256);
  ctx.fillStyle = "#2a1830";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "#c99e62";
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 996, 228);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffe3bd";
  ctx.font = "italic 700 108px Georgia, 'Times New Roman', serif";
  ctx.fillText("Sunset Motel", 512, 104);
  ctx.fillStyle = "#f0a9bb";
  ctx.font = "500 32px Helvetica, Arial, sans-serif";
  ctx.letterSpacing = "10px";
  ctx.fillText("WELCOME", 512, 194);
  return texture(c);
}

// A vending machine front: cold drinks, and one row that's sold out.
export function makeVendingTexture() {
  const [c, ctx] = canvas(256, 512);
  const r = mulberry32(5);
  ctx.fillStyle = "#11162a";
  ctx.fillRect(0, 0, 256, 512);
  const head = ctx.createLinearGradient(0, 0, 0, 80);
  head.addColorStop(0, "#ff7aa2");
  head.addColorStop(1, "#8a3d78");
  ctx.fillStyle = head;
  ctx.fillRect(8, 8, 240, 70);
  ctx.fillStyle = "#fff4dd";
  ctx.font = "bold 34px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("COLD DRINKS", 128, 44);
  const cans = ["#ff6b84", "#63d7d1", "#ffd36e", "#b48cff", "#7fe3a2", "#ff9b57"];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 26 + col * 72;
      const y = 106 + row * 88;
      ctx.fillStyle = "#242b45";
      ctx.fillRect(x - 4, y - 4, 56, 74);
      if (row === 2 && col === 1) {
        ctx.fillStyle = "#0d1020";
        ctx.fillRect(x + 2, y + 2, 44, 62);
        ctx.fillStyle = "#6d5670";
        ctx.font = "10px Helvetica, Arial, sans-serif";
        ctx.fillText("SOLD", x + 24, y + 28);
        ctx.fillText("OUT", x + 24, y + 40);
      } else {
        ctx.fillStyle = cans[Math.floor(r() * cans.length)];
        ctx.fillRect(x + 2, y + 2, 44, 62);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(x + 8, y + 10, 5, 46);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 2, y + 40, 44, 8);
      }
    }
  }
  ctx.fillStyle = "#0a0d18";
  ctx.fillRect(20, 456, 216, 34);
  ctx.fillStyle = "#5be0c8";
  ctx.fillRect(30, 464, 60, 8);
  return texture(c);
}

// A faded striped parasol.
export function makeUmbrellaTexture() {
  const [c, ctx] = canvas(512, 128);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 ? "#ffd9bc" : "#ff7f96";
    ctx.fillRect(i * 32, 0, 32, 128);
  }
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(90,40,70,0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  return texture(c);
}

// Stencilled pool rules, in the motel's own handwriting.
export function makePoolRulesTexture() {
  const [c, ctx] = canvas(512, 384);
  ctx.fillStyle = "#f1e2cf";
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = "#7d4a4c";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 484, 356);
  ctx.fillStyle = "#4b3038";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Helvetica, Arial, sans-serif";
  ctx.fillText("POOL RULES", 256, 74);
  ctx.font = "500 26px Helvetica, Arial, sans-serif";
  const lines = [
    "NO LIFEGUARD ON DUTY",
    "NO GLASS IN THE POOL AREA",
    "THE WATER IS FINE",
    "PLEASE DO NOT FEED THE SUN",
    "HOURS 6 AM – 10 PM",
  ];
  lines.forEach((line, i) => ctx.fillText(line, 256, 150 + i * 44));
  return texture(c);
}

// The little brass plaque by reception: where the golden hour comes from.
export function makeGoldenHourPlaque() {
  const [c, ctx] = canvas(512, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#d8b47c");
  g.addColorStop(1, "#9b7243");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#6b4b28";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = "#33220f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 30px Georgia, 'Times New Roman', serif";
  ctx.fillText("GOLDEN HOUR", 256, 54);
  ctx.font = "500 18px Helvetica, Arial, sans-serif";
  ctx.fillText("PROVIDED BY", 256, 94);
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  ctx.fillText("PLATO'S COVE HOLIDAYS", 256, 126);
  ctx.font = "500 18px Helvetica, Arial, sans-serif";
  ctx.fillText("ON LOAN INDEFINITELY", 256, 166);
  ctx.font = "italic 17px Georgia, 'Times New Roman', serif";
  ctx.fillText("Please do not adjust the sun.", 256, 206);
  return texture(c);
}

// "BACK IN 5 MINUTES" for the office door, and the DO NOT DISTURB hanger.
export function makeOfficeSignTexture() {
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = "#f4e7d2";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#6f4d50";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = "#4d333c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 26px Helvetica, Arial, sans-serif";
  ctx.fillText("BACK IN", 128, 44);
  ctx.font = "bold 34px Helvetica, Arial, sans-serif";
  ctx.fillText("5 MINUTES", 128, 84);
  return texture(c);
}

export function makeDisturbTexture() {
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = "#efe1c4";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#9a6d54";
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = "#7a3348";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 26px Helvetica, Arial, sans-serif";
  ctx.fillText("DO NOT", 128, 46);
  ctx.fillText("DISTURB", 128, 82);
  return texture(c);
}

// Small enamel plaques for the ice machine and the payphone.
export function makeSmallSignTexture(top: string, bottom: string) {
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = "#202b3c";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#b9c6ce";
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = "#e9f4f2";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px Helvetica, Arial, sans-serif";
  ctx.fillText(top, 128, 50);
  ctx.font = "500 18px Helvetica, Arial, sans-serif";
  ctx.fillText(bottom, 128, 92);
  return texture(c);
}
