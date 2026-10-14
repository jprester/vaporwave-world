import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";

// A shopping-centre entrance: a pair of bronze-framed glass doors with push
// bars, the centre's name in vinyl on the glass and a "closed" card hanging
// inside. One stands in each world and leads to the mall. Through the glass
// it's always night: a dark concourse with a few signs still lit, out of
// focus. On the island the door stands on its own, so the night is there
// from behind too (and the lettering reads backwards).
//
// Inside the mall the same door, without the night behind it, is the travel
// agency's shop door.

const ENTRANCE_VINYL = ["THE AGORA", "SHOPPING & LEISURE", "OPEN 7 DAYS · 10–21"];

export const MALL_DOOR_WIDTH = 2.3;
export const MALL_DOOR_HEIGHT = 3.2;
const LEAF_HEIGHT = 2.5;
const FRAME = 0.1;

interface Props {
  x: number;
  y?: number;
  z: number;
  // Unit vector out of the door's front face, on the XZ plane.
  normal: [number, number];
  // The vinyl lettering: a name on the transom and a small block of text on
  // the right-hand leaf.
  transom?: string;
  vinyl?: string[];
  // The card hanging inside the left leaf, or none.
  card?: string | null;
  // Paint a dark concourse behind the glass (in a wall, or freestanding) or
  // leave the glass clear (a shop door in the mall).
  night?: boolean;
}

export default function MallDoor({
  x,
  y = 0,
  z,
  normal,
  transom = "THE AGORA",
  vinyl = ENTRANCE_VINYL,
  card = "SORRY, WE'RE CLOSED",
  night = true,
}: Props) {
  // Compare the lettering by content, so a fresh array doesn't rebuild it.
  const vinylKey = vinyl.join("\n");
  const m = useMemo(() => {
    const frame = new MeshStandardMaterial({
      color: "#4a3f36",
      metalness: 0.75,
      roughness: 0.35,
    });
    const chrome = new MeshStandardMaterial({
      color: "#d9d6d2",
      metalness: 1,
      roughness: 0.18,
    });
    const glass = new MeshStandardMaterial({
      color: "#a9c4d4",
      metalness: 0.4,
      roughness: 0.04,
      transparent: true,
      opacity: night ? 0.22 : 0.12,
      depthWrite: false,
      side: DoubleSide,
    });
    const transomVinyl = new MeshStandardMaterial({
      map: vinylTexture([transom], 1024, 160, 92),
      transparent: true,
      alphaTest: 0.3,
      roughness: 0.6,
      side: DoubleSide,
    });
    const leafVinyl = new MeshStandardMaterial({
      map: vinylTexture(vinylKey.split("\n"), 512, 256, 34),
      transparent: true,
      alphaTest: 0.3,
      roughness: 0.6,
      side: DoubleSide,
    });
    const closed = card
      ? new MeshStandardMaterial({ map: cardTexture(card), roughness: 0.7 })
      : null;
    const backing = night
      ? new MeshBasicMaterial({ map: nightTexture(), side: DoubleSide })
      : null;
    return { frame, chrome, glass, transomVinyl, leafVinyl, closed, backing };
  }, [transom, vinylKey, card, night]);

  useEffect(
    () => () =>
      Object.values(m).forEach((mat) => {
        if (!mat) return;
        mat.map?.dispose();
        mat.dispose();
      }),
    [m],
  );

  const half = MALL_DOOR_WIDTH / 2;
  const leafW = (MALL_DOOR_WIDTH - FRAME * 2) / 2;
  const [nx, nz] = normal;
  return (
    <group
      name="mall-door"
      position={[x, y, z]}
      rotation={[0, Math.atan2(nx, nz), 0]}>
      {/* Frame: jambs, head, transom bar, centre stiles, bottom rail. */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (half - FRAME / 2), MALL_DOOR_HEIGHT / 2, 0]}
          material={m.frame}
          castShadow>
          <boxGeometry args={[FRAME, MALL_DOOR_HEIGHT, 0.2]} />
        </mesh>
      ))}
      <mesh
        position={[0, MALL_DOOR_HEIGHT - FRAME / 2, 0]}
        material={m.frame}
        castShadow>
        <boxGeometry args={[MALL_DOOR_WIDTH, FRAME, 0.2]} />
      </mesh>
      <mesh position={[0, LEAF_HEIGHT, 0]} material={m.frame} castShadow>
        <boxGeometry args={[MALL_DOOR_WIDTH, 0.09, 0.16]} />
      </mesh>
      <mesh position={[0, LEAF_HEIGHT / 2, 0]} material={m.frame}>
        <boxGeometry args={[0.08, LEAF_HEIGHT, 0.12]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={m.frame}>
        <boxGeometry args={[MALL_DOOR_WIDTH, 0.14, 0.14]} />
      </mesh>
      {/* Glass: two leaves and the transom light. */}
      <mesh position={[0, LEAF_HEIGHT / 2, 0]} material={m.glass}>
        <planeGeometry args={[MALL_DOOR_WIDTH - FRAME * 2, LEAF_HEIGHT]} />
      </mesh>
      <mesh
        position={[0, (LEAF_HEIGHT + MALL_DOOR_HEIGHT - FRAME) / 2, 0]}
        material={m.glass}>
        <planeGeometry
          args={[MALL_DOOR_WIDTH - FRAME * 2, MALL_DOOR_HEIGHT - FRAME - LEAF_HEIGHT]}
        />
      </mesh>
      <mesh
        position={[0, (LEAF_HEIGHT + MALL_DOOR_HEIGHT - FRAME) / 2, 0.012]}
        material={m.transomVinyl}>
        <planeGeometry args={[1.9, 0.3]} />
      </mesh>
      <mesh position={[leafW / 2, 1.55, 0.012]} material={m.leafVinyl}>
        <planeGeometry args={[0.8, 0.4]} />
      </mesh>
      {/* Push bars on both faces. */}
      {[-1, 1].map((s) =>
        [-1, 1].map((face) => (
          <group key={`${s}${face}`} position={[s * leafW * 0.5, 1.05, face * 0.11]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
              <cylinderGeometry args={[0.022, 0.022, leafW * 0.75, 10]} />
            </mesh>
            {[-1, 1].map((e) => (
              <mesh
                key={e}
                position={[e * leafW * 0.33, 0, -face * 0.04]}
                rotation={[Math.PI / 2, 0, 0]}
                material={m.chrome}>
                <cylinderGeometry args={[0.014, 0.014, 0.08, 8]} />
              </mesh>
            ))}
          </group>
        )),
      )}
      {m.closed && (
        <group position={[-leafW / 2, 1.62, -0.03]} rotation={[0, 0, 0.04]}>
          <mesh material={m.closed}>
            <planeGeometry args={[0.42, 0.21]} />
          </mesh>
          <mesh position={[0, 0.25, 0]} material={m.frame}>
            <boxGeometry args={[0.004, 0.3, 0.004]} />
          </mesh>
        </group>
      )}
      {m.backing && (
        <mesh position={[0, MALL_DOOR_HEIGHT / 2, -0.07]} material={m.backing}>
          <planeGeometry args={[MALL_DOOR_WIDTH - 0.04, MALL_DOOR_HEIGHT - 0.04]} />
        </mesh>
      )}
    </group>
  );
}

// White vinyl lettering, centred, one size for the first line and smaller
// for the rest.
function vinylTexture(lines: string[], w: number, h: number, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2efe8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rowH = h / (lines.length + 0.4);
  lines.forEach((line, i) => {
    const px = i === 0 ? size : Math.round(size * 0.62);
    const font = (size: number) =>
      `${i === 0 ? "600" : "400"} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.font = font(px);
    // Letter-spaced capitals, the way shopfront vinyl is cut, shrunk to fit.
    ctx.letterSpacing = `${Math.round(px * 0.18)}px`;
    const fit = Math.min(1, (w * 0.94) / ctx.measureText(line).width);
    if (fit < 1) {
      ctx.font = font(Math.floor(px * fit));
      ctx.letterSpacing = `${Math.round(px * fit * 0.18)}px`;
    }
    ctx.fillText(line, w / 2, rowH * (i + 0.7));
  });
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cardTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#efe9dc";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#b8324a";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = "#b8324a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const [first, ...rest] = text.split(", ");
  ctx.font = 'bold 30px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillText(rest.length ? `${first},` : first, 128, rest.length ? 46 : 64);
  if (rest.length) ctx.fillText(rest.join(", "), 128, 84);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// The concourse at night through the glass, out of focus: a dark blue depth,
// a pale streak of wet floor, and the blurred discs of the few signs left on.
function nightTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, "#0b0f22");
  g.addColorStop(0.55, "#141a33");
  g.addColorStop(0.72, "#1d2141");
  g.addColorStop(1, "#0a0c18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 384);
  // Moonlight from the skylight, falling down the middle.
  const moon = ctx.createRadialGradient(140, 60, 0, 140, 60, 180);
  moon.addColorStop(0, "rgba(120,150,220,0.28)");
  moon.addColorStop(1, "rgba(120,150,220,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, 256, 384);
  const blobs: [number, number, number, string][] = [
    [48, 150, 26, "255,92,176"],
    [70, 158, 16, "255,140,200"],
    [205, 140, 22, "70,230,220"],
    [176, 210, 14, "255,190,120"],
    [118, 190, 10, "255,92,176"],
    [228, 250, 12, "160,130,255"],
  ];
  for (const [bx, by, r, rgb] of blobs) {
    const b = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    b.addColorStop(0, `rgba(${rgb},0.85)`);
    b.addColorStop(0.6, `rgba(${rgb},0.45)`);
    b.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = b;
    ctx.fillRect(bx - r, by - r, r * 2, r * 2);
    // Their reflections in the wet floor, stretched and fainter.
    const ry = 384 - (by - 120) * 0.5 - 70;
    const rb = ctx.createRadialGradient(bx, ry, 0, bx, ry, r * 0.8);
    rb.addColorStop(0, `rgba(${rgb},0.3)`);
    rb.addColorStop(1, `rgba(${rgb},0)`);
    ctx.save();
    ctx.translate(bx, ry);
    ctx.scale(0.7, 1.8);
    ctx.translate(-bx, -ry);
    ctx.fillStyle = rb;
    ctx.fillRect(bx - r, ry - r, r * 2, r * 2);
    ctx.restore();
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}
