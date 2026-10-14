// Layout of the mall ("The Agora"): two storeys of shops round a long open
// atrium under a glass skylight. The concourse floor is at y = 0, the upper
// gallery runs right round the atrium at GALLERY_Y, and two stopped
// escalators climb to it at the north end of the atrium. x runs across the
// mall, z along it (north is -z). Shopfronts line both long walls on both
// storeys; the shops themselves are rooms behind the glass, out of bounds.

import type { DoorSpot, FloorPatch, Footprint } from "../levels";

export const HALF_W = 18; // the shopfront line, both storeys
export const HALF_L = 32; // the end walls
export const VOID_HALF_W = 11; // the open atrium
export const VOID_HALF_L = 25;
export const GALLERY_Y = 5.5; // upper floor level
export const SLAB = 0.45; // gallery slab thickness
export const SOFFIT_Y = GALLERY_Y - SLAB; // ceiling over the concourse
export const CEILING_Y = 11; // ceiling over the gallery; skylight eaves
export const RIDGE_Y = 15.5; // skylight ridge
export const SHOP_DEPTH = 7;

// Shop bays along each long wall, centred on these z, BAY wide.
export const BAY = 8;
export const BAY_ZS = [-20, -12, -4, 4, 12, 20];

export type ShopKind = "grille" | "glass" | "vacant" | "agency" | "hotel" | "tv";

export interface Shop {
  unit: string;
  // 0 = concourse, 1 = upper gallery.
  storey: 0 | 1;
  // -1 = west wall, 1 = east wall.
  side: -1 | 1;
  z: number;
  name: string;
  kind: ShopKind;
  // A neon sign still lit over (or in) the shop.
  neon?: "venus" | "sunset" | "helios" | "arcadia" | "open" | "plato";
}

// Every unit, north to south. Most are shuttered for the night; a few are
// glass with the lights off; a couple are to let. Some signs are still on.
export const SHOPS: Shop[] = [
  // Concourse, west.
  { unit: "G01", storey: 0, side: -1, z: -20, name: "ODYSSEY BOOKS", kind: "grille" },
  { unit: "G02", storey: 0, side: -1, z: -12, name: "VENUS", kind: "glass", neon: "venus" },
  { unit: "G03", storey: 0, side: -1, z: -4, name: "ACROPOLIS PIZZA", kind: "grille" },
  { unit: "G04", storey: 0, side: -1, z: 4, name: "PLATO'S COVE HOLIDAYS", kind: "agency", neon: "plato" },
  { unit: "G05", storey: 0, side: -1, z: 12, name: "MARBLE & CO.", kind: "grille" },
  { unit: "G06", storey: 0, side: -1, z: 20, name: "", kind: "vacant" },
  // Concourse, east.
  { unit: "G07", storey: 0, side: 1, z: -20, name: "HELIOS TANNING", kind: "grille", neon: "helios" },
  { unit: "G08", storey: 0, side: 1, z: -12, name: "ELYSIUM SHOES", kind: "grille" },
  { unit: "G09", storey: 0, side: 1, z: -4, name: "SUNSET OUTLET", kind: "glass", neon: "sunset" },
  { unit: "G10", storey: 0, side: 1, z: 4, name: "DELPHI OPTICAL", kind: "grille" },
  { unit: "G11", storey: 0, side: 1, z: 12, name: "ATLANTIS SWIMWEAR", kind: "grille" },
  { unit: "G12", storey: 0, side: 1, z: 20, name: "OCEAN BREEZE", kind: "grille", neon: "open" },
  // Upper gallery, west.
  { unit: "U01", storey: 1, side: -1, z: -20, name: "ARCADIA", kind: "grille", neon: "arcadia" },
  { unit: "U02", storey: 1, side: -1, z: -12, name: "", kind: "vacant" },
  { unit: "U03", storey: 1, side: -1, z: -4, name: "MUSIC BOX", kind: "glass" },
  { unit: "U04", storey: 1, side: -1, z: 4, name: "FOUNTAIN OF YOUTH", kind: "grille" },
  { unit: "U05", storey: 1, side: -1, z: 12, name: "PHOTO 1 HOUR", kind: "grille" },
  { unit: "U06", storey: 1, side: -1, z: 20, name: "", kind: "vacant" },
  // Upper gallery, east.
  { unit: "U07", storey: 1, side: 1, z: -20, name: "TELEVISION CITY", kind: "tv" },
  { unit: "U08", storey: 1, side: 1, z: -12, name: "HOTEL & CONFERENCE SUITES", kind: "hotel" },
  { unit: "U09", storey: 1, side: 1, z: -4, name: "", kind: "vacant" },
  { unit: "U10", storey: 1, side: 1, z: 4, name: "CHRONOS WATCHES", kind: "grille" },
  { unit: "U11", storey: 1, side: 1, z: 12, name: "ARGO LUGGAGE", kind: "grille" },
  { unit: "U12", storey: 1, side: 1, z: 20, name: "PALM COURT FOOD HALL", kind: "grille" },
];

export function shop(unit: string): Shop {
  return SHOPS.find((s) => s.unit === unit)!;
}

export function storeyY(storey: 0 | 1) {
  return storey === 0 ? 0 : GALLERY_Y;
}

// The doors out. The travel agency's shop door leads to the island; the
// hotel entrance on the upper gallery, to the hotel's old conference room
// (the cave); the service door at the north end, to the stockroom.
const AGENCY = shop("G04");
const HOTEL = shop("U08");
export const STAFF_DOOR_X = 9;
export const DOORS: DoorSpot[] = [
  { to: "island", x: -HALF_W, z: AGENCY.z, y: 0, normal: [1, 0] },
  // (The door model stands 0.3 m out from its wall.)
  { to: "cave", x: HALF_W - 0.3, z: HOTEL.z, y: GALLERY_Y, normal: [-1, 0] },
  { to: "stockroom", x: STAFF_DOOR_X, z: -HALF_L + 0.3, y: 0, normal: [0, 1] },
];

// Escalators: a pair side by side in the atrium, rising north to the
// gallery at 30°. Both are switched off, so both are stairs. Lane centres,
// the clear width between the balustrades, and where they start and land.
export const ESCALATOR_X = [-2.1, 2.1];
export const ESCALATOR_CLEAR = 2.7;
export const ESCALATOR_RAIL = 0.15;
export const ESCALATOR_TOP_Z = -VOID_HALF_L;
export const ESCALATOR_RUN = GALLERY_Y / Math.tan(Math.PI / 6);
export const ESCALATOR_BOTTOM_Z = ESCALATOR_TOP_Z + ESCALATOR_RUN;
const ESC_HALF_OUT = ESCALATOR_CLEAR / 2 + ESCALATOR_RAIL; // lane centre to outer face
export const ESCALATOR_OUTER = ESCALATOR_X[1] + ESC_HALF_OUT; // the pair's outer edge

export function escalatorHeight(z: number) {
  const t = (ESCALATOR_BOTTOM_Z - z) / ESCALATOR_RUN;
  return GALLERY_Y * Math.min(1, Math.max(0, t));
}

// The dry fountain in the middle of the atrium.
export const FOUNTAIN_Z = 2;
export const FOUNTAIN_R = 4.2;

// Palms in planters, round the fountain.
export const PLANTERS: [number, number][] = [
  [-7.5, -9],
  [7.5, -9],
  [-7.5, 12],
  [7.5, 12],
];
export const PLANTER_SIZE = 2.4;

// Benches facing the fountain, east and west of it.
export const BENCHES: { x: number; z: number; yaw: number }[] = [
  { x: -7.2, z: FOUNTAIN_Z, yaw: -Math.PI / 2 },
  { x: 7.2, z: FOUNTAIN_Z, yaw: Math.PI / 2 },
];

// The "YOU ARE HERE" directory, south of the fountain, facing the main
// entrance (+z).
export const DIRECTORY_Z = 16;

// The mop bucket and wet floor signs where the cleaner left off: [x, z, yaw].
export const BUCKET: [number, number] = [4.6, 8.4];
export const WET_FLOOR_BOARDS: [number, number, number][] = [
  [3.2, 7.4, 0.5],
  [6.3, 10.6, -0.4],
  [-5.4, -13.6, 0.3],
];

// The out-of-order sign at the foot of the escalators.
export const ESCALATOR_SIGN: [number, number] = [
  ESCALATOR_X[1] + ESCALATOR_CLEAR / 2 + ESCALATOR_RAIL + 1.2,
  ESCALATOR_BOTTOM_Z + 1.4,
];

// Walkable floors above the concourse: the gallery ring and the escalators.
export const FLOORS: FloorPatch[] = [
  { x0: -HALF_W, x1: -VOID_HALF_W, z0: -HALF_L, z1: HALF_L, y: GALLERY_Y },
  { x0: VOID_HALF_W, x1: HALF_W, z0: -HALF_L, z1: HALF_L, y: GALLERY_Y },
  { x0: -VOID_HALF_W, x1: VOID_HALF_W, z0: -HALF_L, z1: -VOID_HALF_L, y: GALLERY_Y },
  { x0: -VOID_HALF_W, x1: VOID_HALF_W, z0: VOID_HALF_L, z1: HALF_L, y: GALLERY_Y },
  ...ESCALATOR_X.map((cx) => ({
    x0: cx - ESCALATOR_CLEAR / 2,
    x1: cx + ESCALATOR_CLEAR / 2,
    z0: ESCALATOR_TOP_Z,
    z1: ESCALATOR_BOTTOM_Z,
    y: GALLERY_Y,
    y2: 0,
    axis: "z" as const,
  })),
];

// Upstairs only: the glass balustrade round the atrium (open where the
// escalators land). It stops a jump too, so it reaches well above the rail.
const RAIL_Y0 = GALLERY_Y - 0.2;
const RAIL_Y1 = GALLERY_Y + 2.5;
const BALUSTRADES: Footprint[] = [
  { cx: -VOID_HALF_W - 0.05, cz: 0, w: 0.1, d: VOID_HALF_L * 2, y0: RAIL_Y0, y1: RAIL_Y1 },
  { cx: VOID_HALF_W + 0.05, cz: 0, w: 0.1, d: VOID_HALF_L * 2, y0: RAIL_Y0, y1: RAIL_Y1 },
  { cx: 0, cz: VOID_HALF_L + 0.05, w: VOID_HALF_W * 2, d: 0.1, y0: RAIL_Y0, y1: RAIL_Y1 },
  ...[-1, 1].map((s) => ({
    cx: (s * (VOID_HALF_W + ESCALATOR_OUTER)) / 2,
    cz: -VOID_HALF_L - 0.05,
    w: VOID_HALF_W - ESCALATOR_OUTER,
    d: 0.1,
    y0: RAIL_Y0,
    y1: RAIL_Y1,
  })),
];

// The escalators' balustrades run from the floor to well above the top
// landing (a jump at the top doesn't clear them). Underneath, the escalators
// are solid to the floor: two blockers, each stopping at a height a player
// on the steps is always above (their centre can be one radius short of a
// blocker, where the steps are 0.7 m lower; 0.2 m to spare). The high one
// is too tall to jump onto from the concourse; the low one is only reached
// over the high one or from the steps.
function underEscalator(z0: number, z1: number): Footprint {
  return {
    cx: 0,
    cz: (z0 + z1) / 2,
    w: ESCALATOR_OUTER * 2,
    d: z1 - z0,
    y0: -1,
    y1: escalatorHeight(z1) - 0.9,
  };
}
const ESCALATORS: Footprint[] = [
  ...ESCALATOR_X.flatMap((cx) =>
    [-1, 1].map((s) => ({
      cx: cx + s * (ESCALATOR_CLEAR / 2 + ESCALATOR_RAIL / 2),
      cz: (ESCALATOR_TOP_Z + ESCALATOR_BOTTOM_Z) / 2,
      w: ESCALATOR_RAIL,
      d: ESCALATOR_RUN,
      y0: -1,
      y1: GALLERY_Y + 2.5,
    })),
  ),
  underEscalator(ESCALATOR_TOP_Z, -21),
  underEscalator(-21, -18.2),
];

// On the concourse only.
const GROUND = { y0: -1, y1: 2 };
const FURNITURE: Footprint[] = [
  { cx: 0, cz: FOUNTAIN_Z, w: FOUNTAIN_R * 2, d: FOUNTAIN_R * 2, ...GROUND },
  ...PLANTERS.map(([cx, cz]) => ({ cx, cz, w: PLANTER_SIZE, d: PLANTER_SIZE, ...GROUND })),
  ...BENCHES.map(({ x, z }) => ({ cx: x, cz: z, w: 0.7, d: 2.2, ...GROUND })),
  { cx: 0, cz: DIRECTORY_Z, w: 1.7, d: 0.5, ...GROUND },
  { cx: BUCKET[0], cz: BUCKET[1], w: 0.6, d: 0.6, ...GROUND },
  ...WET_FLOOR_BOARDS.map(([cx, cz]) => ({ cx, cz, w: 0.4, d: 0.4, ...GROUND })),
  { cx: ESCALATOR_SIGN[0], cz: ESCALATOR_SIGN[1], w: 0.4, d: 0.4, ...GROUND },
];

export const COLLIDERS: Footprint[] = [...BALUSTRADES, ...ESCALATORS, ...FURNITURE];
