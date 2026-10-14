import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import {
  BUCKET,
  FOUNTAIN_R,
  FOUNTAIN_Z,
  HALF_L,
  HALF_W,
  SHOPS,
  VOID_HALF_L,
  VOID_HALF_W,
  type Shop,
} from "./constants";

// Procedural canvas textures for the mall: no image files. Like the cave's
// and the stockroom's, each is drawn once when the world mounts.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function colorTexture(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

// Deterministic noise, so the mall looks the same every visit.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Polished terrazzo in 1.2 m tiles, rose and cream in a quiet check, with
// chips of colour. One texture is 4.8 m square (4 × 4 tiles).
export const TERRAZZO_SIZE = 4.8;
export function makeTerrazzoTexture(repeat: [number, number]) {
  const [c, ctx] = canvas(1024, 1024);
  const tile = 256;
  const r = rng(11);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#d6c3c4" : "#e3d6cf";
      ctx.fillRect(i * tile, j * tile, tile, tile);
    }
  }
  const chips = ["#9c7d86", "#f4ece6", "#7d8ea6", "#c48f9c", "#5e5560", "#b9a59a"];
  for (let n = 0; n < 9000; n++) {
    ctx.fillStyle = chips[Math.floor(r() * chips.length)];
    ctx.globalAlpha = 0.35 + r() * 0.5;
    const s = 1 + r() * 3.2;
    ctx.beginPath();
    ctx.ellipse(r() * 1024, r() * 1024, s, s * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Brass divider strips between the tiles.
  ctx.strokeStyle = "#8a7a62";
  ctx.lineWidth = 3;
  for (let k = 0; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(k * tile, 0);
    ctx.lineTo(k * tile, 1024);
    ctx.moveTo(0, k * tile);
    ctx.lineTo(1024, k * tile);
    ctx.stroke();
  }
  return colorTexture(c, repeat);
}

// The concourse floor's roughness, one texture over the whole floor (the
// canvas top is the north end). Polished and dry in general; freshly mopped
// arcs, and standing water in the middle of the atrium, round the fountain
// and by the mop bucket, where it's nearly a mirror. The wet floor shader
// reads it too: the lower the roughness, the stronger and sharper the
// reflection.
export function makeWetMap() {
  const W = 360;
  const H = 640;
  const [c, ctx] = canvas(W, H);
  const px = (x: number) => ((x + HALF_W) / (HALF_W * 2)) * W;
  const pz = (z: number) => ((z + HALF_L) / (HALF_L * 2)) * H;
  const scale = W / (HALF_W * 2);
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(0, 0, W, H);
  const r = rng(5);
  // Mop strokes: overlapping arcs, damp.
  ctx.lineCap = "round";
  for (let n = 0; n < 90; n++) {
    const x = (r() - 0.5) * VOID_HALF_W * 2;
    const z = 4 + (r() - 0.5) * 34;
    const g = 70 + r() * 40;
    ctx.strokeStyle = `rgba(${g},${g},${g},0.45)`;
    ctx.lineWidth = (0.35 + r() * 0.25) * scale;
    ctx.beginPath();
    ctx.arc(px(x), pz(z), (0.9 + r() * 0.6) * scale, r() * 6, r() * 6 + 2.4);
    ctx.stroke();
  }
  // Standing water: soft-edged blobs, darkest (smoothest) in the middle.
  const puddle = (x: number, z: number, rx: number, rz: number) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, "rgba(6,6,6,1)");
    g.addColorStop(0.65, "rgba(10,10,10,0.95)");
    g.addColorStop(1, "rgba(10,10,10,0)");
    ctx.save();
    ctx.translate(px(x), pz(z));
    ctx.scale(rx * scale, rz * scale);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // Round the fountain, and spreading south from it down the atrium.
  for (let n = 0; n < 26; n++) {
    const a = r() * Math.PI * 2;
    const d = FOUNTAIN_R + 0.6 + r() * 3.5;
    puddle(Math.cos(a) * d, FOUNTAIN_Z + Math.sin(a) * d, 1 + r() * 2.2, 0.8 + r() * 1.8);
  }
  for (let n = 0; n < 22; n++) {
    puddle(
      (r() - 0.5) * VOID_HALF_W * 1.6,
      -VOID_HALF_L * 0.5 + r() * VOID_HALF_L * 1.4,
      0.8 + r() * 2.6,
      0.8 + r() * 3,
    );
  }
  puddle(BUCKET[0], BUCKET[1], 2.4, 2);
  puddle(BUCKET[0] - 1.6, BUCKET[1] + 1.2, 1.4, 1.1);
  const t = new CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

// A shop's fascia: the name in brushed-metal capitals on a dark panel, with
// the unit number small at the end. Vacant units have a blank panel.
export function makeFasciaTexture(shop: Shop) {
  const [c, ctx] = canvas(1024, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#26222c");
  g.addColorStop(1, "#1a171f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = "#a59c9a";
  ctx.font = `600 18px ${SANS}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(shop.unit, 1004, 104);
  if (shop.name) {
    ctx.textAlign = "center";
    const size = shop.name.length > 18 ? 46 : 58;
    ctx.font = `500 ${size}px ${SANS}`;
    ctx.letterSpacing = `${Math.round(size * 0.22)}px`;
    const mg = ctx.createLinearGradient(0, 30, 0, 100);
    mg.addColorStop(0, "#e7e2dc");
    mg.addColorStop(1, "#8f8a88");
    ctx.fillStyle = mg;
    ctx.fillText(shop.name, 512, 66);
  }
  return colorTexture(c);
}

// A roll-down security shutter: pressed steel slats with a perforated band,
// repeating. One texture is 2 m wide and 1 m tall.
export function makeShutterTexture() {
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = "#8d8e96";
  ctx.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 16) {
    const g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, "#b7b8c0");
    g.addColorStop(0.45, "#8e9098");
    g.addColorStop(0.9, "#5d5f68");
    g.addColorStop(1, "#3c3d44");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 256, 16);
    ctx.fillStyle = "rgba(20,20,26,0.75)";
    for (let x = 4; x < 256; x += 8) {
      ctx.fillRect(x, y + 6, 3, 3);
    }
  }
  return colorTexture(c, [1, 1]);
}

// Whitewashed glass over an empty unit (the whole shopfront, 2:1), with a
// letting board in the middle.
export function makeVacantTexture(unit: string) {
  const [c, ctx] = canvas(1024, 512);
  ctx.fillStyle = "#cfcac6";
  ctx.fillRect(0, 0, 1024, 512);
  const r = rng(unit.charCodeAt(1) * 7 + unit.charCodeAt(2));
  // Brush swirls of whitewash.
  for (let n = 0; n < 420; n++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`;
    ctx.lineWidth = 6 + r() * 16;
    ctx.beginPath();
    ctx.arc(r() * 1024, r() * 512, 20 + r() * 60, r() * 6, r() * 6 + 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#2c3a6a";
  ctx.fillRect(382, 150, 260, 200);
  ctx.fillStyle = "#f3efe7";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 40px ${SANS}`;
  ctx.fillText("TO LET", 512, 200);
  ctx.font = `20px ${SANS}`;
  ctx.fillText(`UNIT ${unit}`, 512, 248);
  ctx.fillText("ALL ENQUIRIES:", 512, 290);
  ctx.fillText("MANAGEMENT SUITE", 512, 318);
  return colorTexture(c);
}

// A printed sign: dark text on a light panel, or the reverse.
export function makeSignTexture(
  lines: string[],
  { w = 512, h = 256, bg = "#f2efe8", fg = "#1f1d24", size = 48, bold = true } = {},
) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rowH = h / lines.length;
  lines.forEach((line, i) => {
    const px = i === 0 ? size : Math.round(size * 0.6);
    ctx.font = `${bold && i === 0 ? "bold" : "500"} ${px}px ${SANS}`;
    ctx.fillText(line, w / 2, rowH * (i + 0.5));
  });
  return colorTexture(c);
}

// The yellow "caution, wet floor" A-board, with its slipping figure.
export function makeWetFloorTexture() {
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = "#f2c81c";
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = "#1c1a16";
  ctx.textAlign = "center";
  ctx.font = `bold 46px ${SANS}`;
  ctx.fillText("CAUTION", 128, 80);
  ctx.font = `bold 38px ${SANS}`;
  ctx.fillText("WET", 128, 380);
  ctx.fillText("FLOOR", 128, 425);
  // The figure, mid-slip, in a triangle.
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#1c1a16";
  ctx.beginPath();
  ctx.moveTo(128, 120);
  ctx.lineTo(220, 310);
  ctx.lineTo(36, 310);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(140, 190, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.moveTo(136, 205);
  ctx.lineTo(120, 250);
  ctx.lineTo(150, 285);
  ctx.moveTo(120, 250);
  ctx.lineTo(88, 268);
  ctx.moveTo(130, 220);
  ctx.lineTo(162, 232);
  ctx.moveTo(130, 220);
  ctx.lineTo(100, 210);
  ctx.stroke();
  ctx.fillRect(70, 292, 120, 6);
  return colorTexture(c);
}

// The mall directory: a plan of both storeys with every unit numbered, the
// list of shops, and the red dot. Backlit.
export function makeDirectoryTexture() {
  const W = 768;
  const H = 1280;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2c3a6a";
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = "#f4f1ea";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 54px ${SANS}`;
  ctx.letterSpacing = "12px";
  ctx.fillText("THE AGORA", W / 2, 56);
  ctx.font = `500 22px ${SANS}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("SHOPPING & LEISURE · DIRECTORY", W / 2, 104);
  ctx.letterSpacing = "0px";

  // Plans: concourse on the left, upper mall on the right. North is up.
  const plan = (ox: number, storey: 0 | 1, title: string) => {
    const pw = 300;
    const ph = 520;
    const oy = 200;
    const sx = pw / (HALF_W * 2 + 8);
    const sz = ph / (HALF_L * 2);
    const X = (x: number) => ox + pw / 2 + x * sx;
    const Z = (z: number) => oy + (z + HALF_L) * sz;
    ctx.fillStyle = "#1f1d24";
    ctx.font = `bold 22px ${SANS}`;
    ctx.fillText(title, ox + pw / 2, oy - 34);
    // Units.
    for (const s of SHOPS.filter((u) => u.storey === storey)) {
      const x0 = s.side < 0 ? X(-HALF_W - 4) : X(HALF_W);
      ctx.fillStyle =
        s.kind === "vacant" ? "#dcd8d2" : s.kind === "hotel" ? "#c9b6d9" : "#e9c3d3";
      ctx.fillRect(x0 + 1, Z(s.z - 4) + 1, 4 * sx - 2, 8 * sz - 2);
      ctx.fillStyle = "#1f1d24";
      ctx.font = `bold 13px ${SANS}`;
      ctx.fillText(s.unit, x0 + 2 * sx, Z(s.z));
    }
    // Mall outline, and the atrium: open on the upper plan.
    ctx.strokeStyle = "#1f1d24";
    ctx.lineWidth = 3;
    ctx.strokeRect(X(-HALF_W - 4), Z(-HALF_L), (HALF_W * 2 + 8) * sx, HALF_L * 2 * sz);
    ctx.lineWidth = 2;
    ctx.setLineDash(storey === 1 ? [6, 5] : []);
    ctx.strokeRect(X(-VOID_HALF_W), Z(-VOID_HALF_L), VOID_HALF_W * 2 * sx, VOID_HALF_L * 2 * sz);
    ctx.setLineDash([]);
    // Escalators.
    ctx.fillStyle = "#7d8ea6";
    ctx.fillRect(X(-3.6), Z(-VOID_HALF_L), 7.2 * sx, 9.5 * sz);
    if (storey === 0) {
      // Fountain.
      ctx.strokeStyle = "#7d8ea6";
      ctx.beginPath();
      ctx.arc(X(0), Z(FOUNTAIN_Z), FOUNTAIN_R * sx, 0, Math.PI * 2);
      ctx.stroke();
      // Entrance.
      ctx.fillStyle = "#1f1d24";
      ctx.font = `13px ${SANS}`;
      ctx.fillText("MAIN ENTRANCE", X(0), Z(HALF_L) + 16);
      // You are here.
      ctx.fillStyle = "#e0262e";
      ctx.beginPath();
      ctx.arc(X(0), Z(16), 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `bold 15px ${SANS}`;
      ctx.fillText("YOU ARE HERE", X(0), Z(16) + 24);
    }
  };
  plan(50, 0, "CONCOURSE");
  plan(418, 1, "UPPER MALL");

  // Index of shops.
  const listed = SHOPS.filter((s) => s.kind !== "vacant")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  ctx.textAlign = "left";
  let y = 800;
  ctx.fillStyle = "#2c3a6a";
  ctx.fillRect(40, y - 26, W - 80, 4);
  listed.forEach((s, i) => {
    const col = i < Math.ceil(listed.length / 2) ? 0 : 1;
    const row = col ? i - Math.ceil(listed.length / 2) : i;
    const x = 50 + col * 350;
    const ly = y + row * 30;
    ctx.fillStyle = "#1f1d24";
    ctx.font = `500 19px ${SANS}`;
    ctx.fillText(s.name, x, ly);
    ctx.textAlign = "right";
    ctx.fillStyle = "#6a6470";
    ctx.fillText(s.unit, x + 320, ly);
    ctx.textAlign = "left";
  });
  y += Math.ceil(listed.length / 2) * 30 + 30;
  ctx.fillStyle = "#6a6470";
  ctx.font = `18px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("Opening hours: every day, 10:00 – 21:00", W / 2, y);
  ctx.fillText("Customer toilets: concourse, north end", W / 2, y + 28);
  return colorTexture(c);
}

// A travel poster for the island, as the agency sells it.
export function makeIslandPosterTexture(variant: number) {
  const [c, ctx] = canvas(512, 768);
  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, "#5a3f8c");
  sky.addColorStop(0.5, "#e86aa8");
  sky.addColorStop(1, "#ffcf9a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 520);
  // The sun, striped, sitting on the horizon.
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 470, 150, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, 320, 0, 520);
  sun.addColorStop(0, "#fff3a0");
  sun.addColorStop(1, "#ff5c9a");
  ctx.fillStyle = sun;
  ctx.fillRect(100, 300, 312, 220);
  ctx.fillStyle = sky;
  for (let k = 0; k < 6; k++) ctx.fillRect(100, 420 + k * 16, 312, 3 + k * 1.6);
  ctx.restore();
  // The sea.
  const sea = ctx.createLinearGradient(0, 520, 0, 768);
  sea.addColorStop(0, "#35c3cf");
  sea.addColorStop(1, "#1a5a7a");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 520, 512, 248);
  // The platform and its columns, in silhouette.
  ctx.fillStyle = "#f3d9e4";
  ctx.fillRect(60, 560, 392, 26);
  for (let k = 0; k < 5; k++) ctx.fillRect(80 + k * 86, 470, 16, 92);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  if (variant === 0) {
    ctx.font = `bold 44px ${SANS}`;
    ctx.fillText("PLATO'S COVE", 256, 70);
    ctx.font = `22px ${SANS}`;
    ctx.fillText("EVERY DAY IS THE SAME BEAUTIFUL DAY", 256, 110);
    ctx.font = `bold 30px ${SANS}`;
    ctx.fillText("7 NIGHTS · ALL INCLUSIVE", 256, 680);
    ctx.font = `20px ${SANS}`;
    ctx.fillText("GOLDEN HOUR GUARANTEED*", 256, 718);
    ctx.font = `13px ${SANS}`;
    ctx.fillText("*subject to availability", 256, 748);
  } else {
    ctx.font = `bold 40px ${SANS}`;
    ctx.fillText("WISH YOU WERE HERE", 256, 80);
    ctx.font = `bold 26px ${SANS}`;
    ctx.fillText("THE WATER IS ALWAYS WARM", 256, 700);
  }
  return colorTexture(c);
}

// Window bills for the outlet that sells sunsets.
export function makeSaleTexture(lines: string[], bg: string) {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    const big = /%/.test(line);
    ctx.font = `bold ${big ? 120 : 44}px ${SANS}`;
    ctx.fillText(line, 256, 110 + i * (big ? 130 : 90));
  });
  return colorTexture(c);
}

// A palm frond: leaflets either side of a midrib, in an alpha mask. The
// fronds are plastic; the tag says so.
export function makeFrondTexture() {
  const [c, ctx] = canvas(256, 512);
  ctx.clearRect(0, 0, 256, 512);
  ctx.strokeStyle = "#5f7a3a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 512);
  ctx.lineTo(128, 0);
  ctx.stroke();
  for (let y = 500; y > 10; y -= 13) {
    const t = 1 - y / 512;
    const len = 118 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95));
    for (const s of [-1, 1]) {
      const g = ctx.createLinearGradient(128, y, 128 + s * len, y - 40);
      g.addColorStop(0, "#4f7d34");
      g.addColorStop(1, "#86b04e");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.quadraticCurveTo(128 + s * len * 0.5, y - 26, 128 + s * len, y - 46);
      ctx.quadraticCurveTo(128 + s * len * 0.5, y - 14, 128, y + 6);
      ctx.fill();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function makeBarkTexture(): Texture {
  const [c, ctx] = canvas(64, 256);
  ctx.fillStyle = "#7a6650";
  ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) {
    const g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, "#9c8466");
    g.addColorStop(0.7, "#6f5b46");
    g.addColorStop(1, "#4a3c2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 64, 16);
  }
  return colorTexture(c, [2, 6]);
}

// Neon lettering on a transparent ground: a soft halo under a hot core. The
// material adds it to whatever is behind and pushes it past the bloom
// threshold.
export function makeNeonTexture(
  text: string,
  color: string,
  { w = 1024, h = 256, size = 150, font = SANS, weight = "600", spacing = 0.12 } = {},
) {
  const [c, ctx] = canvas(w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Shrink to fit, leaving room for the glow.
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.letterSpacing = `${Math.round(size * spacing)}px`;
  const fit = Math.min(1, (w * 0.86) / ctx.measureText(text).width);
  if (fit < 1) {
    ctx.font = `${weight} ${Math.floor(size * fit)}px ${font}`;
    ctx.letterSpacing = `${Math.round(size * fit * spacing)}px`;
  }
  ctx.shadowColor = color;
  ctx.lineJoin = "round";
  for (const [blur, alpha, width] of [
    [48, 0.5, 18],
    [20, 0.8, 10],
  ] as const) {
    ctx.shadowBlur = blur;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeText(text, w / 2, h / 2);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(text, w / 2, h / 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// The night sky through the skylight is a shader (MallWorld); the clock on
// the south wall is drawn here, stopped at closing time.
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
    const a = (k / 12) * Math.PI * 2;
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(a);
    ctx.fillRect(-6, -226, 12, k % 3 ? 26 : 46);
    ctx.restore();
  }
  // 9:00.
  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(256, 256);
  ctx.lineTo(256 - 120, 256);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(256, 256);
  ctx.lineTo(256, 256 - 190);
  ctx.stroke();
  return colorTexture(c);
}
