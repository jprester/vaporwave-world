// Layout of the Lido: the poolrooms behind the motel's pool plant, where the
// reflections are made. Tiled rooms, flooded and dry, all white tile with
// pastel bands, lit as if by a sky that is a ceiling.
//
// From the door (south), an entrance with the kiosk and the lockers, then a
// footbath and the main hall: a long reflecting pool running north to a
// half sun standing in the water at the far end, which its reflection makes
// whole. East of the hall, a flooded hall of piers that ends in a mirror;
// west, the changing rooms, the showers, and a stair up to the sun terrace,
// where the slide starts.
//
// The floor of the flooded rooms is the level's base floor (WADE_Y); every
// dry floor is a floor patch at y = 0, so stepping into the water is a step
// down.

import type { DoorSpot, FloorPatch, Footprint } from "../levels";

export const HALF_W = 22; // outer walls' inner faces at x = ±22
export const NORTH_Z = -30; // north wall's inner face
export const SOUTH_Z = 32; // south wall's inner face (the door)
// Tile texture: 8 × 8 tiles of 30 cm.
export const TILE = 2.4;
export const WALL_T = 0.4;

export const WADE_Y = -0.3; // flooded floors
export const WADE_WATER_Y = -0.12; // their water surface

// ── The main hall ────────────────────────────────────────────────────────
// Its side walls are centred on x = ±HALL_X; the arch wall to the entrance
// is centred on z = HALL_S.
export const HALL_X = 9;
export const HALL_IN = HALL_X - WALL_T / 2; // 8.8, inner face
export const HALL_OUT = HALL_X + WALL_T / 2; // 9.2, outer face
export const HALL_S = 22;
export const HALL_H = 9;
// The sky: a long lightbox in the ceiling, recessed.
export const SKY_X = 5.2;
export const SKY_Z0 = -28.5;
export const SKY_Z1 = 19.5;
export const SKY_RECESS = 0.9;

// The reflecting pool runs to the north wall.
export const POOL_X = 4; // half width
export const POOL_Z0 = NORTH_Z;
export const POOL_Z1 = 12;
export const WATER_Y = -0.25;
export const POOL_BOTTOM = -1.3;
export const COPING_W = 0.45;

// The half sun, standing in the water at the north end.
export const SUN_Z = NORTH_Z + 0.75;
export const SUN_R = 4.6;

// The footbath across the way in.
export const FOOTBATH_X = 4.6;
export const FOOTBATH_Z0 = 18.6;
export const FOOTBATH_Z1 = HALL_S - WALL_T / 2; // 21.8

// Arch from the entrance into the hall.
export const ENTRY_ARCH_HALF = 3;
export const ENTRY_ARCH_H = 3.6;

// ── The entrance ─────────────────────────────────────────────────────────
export const ENTRANCE_H = 4.8;
export const DOOR_X = 0;
export const DOOR_Z = SOUTH_Z - 0.35;
// The kiosk in the south-west corner, the lockers along the east wall.
export const KIOSK_X0 = -HALL_IN;
export const KIOSK_X1 = -5.4;
export const KIOSK_Z0 = 24.2;
export const KIOSK_Z1 = 28.6;
export const LOCKER_X = HALL_IN; // their backs against the east wall
export const LOCKER_D = 0.55;
export const LOCKER_Z0 = 23.4;
export const LOCKER_Z1 = 30.6;
export const LOCKER_H = 2.1;

// ── Arches through the hall's side walls ────────────────────────────────
export const ARCH_HALF = 1.7;
export const ARCH_H = 3.0;
// The east arches open between rows of the wing's piers (PIER_ZS), so you
// can walk straight in.
export const EAST_ARCHES = [12.75, 3.75, -5.25, -14.25];
export const WEST_ARCHES = [16, 8];

// ── The east wing: flooded, a grid of piers, a mirror at the end ────────
export const WING_H = 4;
export const PIER = 1;
export const PIER_XS = [13.6, 18];
export const PIER_ZS = Array.from({ length: 10 }, (_, i) => -25.5 + i * 4.5);

// ── The west wing: changing rooms, showers, the stair, the terrace ──────
export const WEST_H = 8.2;
export const TERRACE_Y = 3.6;
export const TERRACE_Z1 = -10; // its south edge
export const STAIR_X0 = -13.2;
export const STAIR_X1 = -HALL_OUT; // -9.2, against the hall wall
export const STAIR_Z0 = TERRACE_Z1; // top
export const STAIR_Z1 = 2; // bottom
export const STAIR_STEPS = 18;
export const RAIL_H = 1.05;
// The window over the hall from the terrace, through the hall's west wall.
export const WINDOW_Z0 = -27;
export const WINDOW_Z1 = -11.5;
export const PARAPET_H = 1.0;
export const WINDOW_TOP = TERRACE_Y + 4.2;
// Changing cubicles along the west wall, showers on the south wall.
export const CUBICLE_D = 1.8;
export const CUBICLE_W = 2;
export const CUBICLE_Z0 = 4;
export const CUBICLE_COUNT = 6;
export const SHOWER_XS = [-20.2, -17.6, -15];
export const BENCH: [number, number] = [-16.2, 10];
export const BENCH_L = 6;
// On the terrace: the plunge pool, two loungers, the slide.
export const PLUNGE: [number, number] = [-18.2, -16.5];
export const PLUNGE_R = 2;
// Long along x, heads to the west, facing the window.
export const LOUNGERS: [number, number][] = [
  [-13.6, -24.2],
  [-13.6, -21.2],
];
// The slide leaves the terrace through the window and comes down into the
// pool, over the hall's west walkway, on one post by the wall.
export const SLIDE_Z = -15.8;
export const SLIDE_START_X = -11.6;
export const SLIDE_R = 0.45;
export const SLIDE_POST: [number, number] = [-8.5, SLIDE_Z];

// ── Main hall fittings ───────────────────────────────────────────────────
// The lifeguard's chair is on the deck, off the line from the door to the
// sun; the palms keep clear of every arch and walkway.
export const LIFEGUARD: [number, number] = [-2.6, 15.4];
export const RULES: [number, number] = [6.8, 18.2];
export const PALMS: [number, number, number][] = [
  [7.3, -27.6, 6.2],
  [-7.3, -27.6, 5.6],
  [6.4, 20.3, 4.6],
  [-6.4, 20.3, 5],
];
export const PLANTER = 1.3;
// The sun's plaque, on a stand at the north end of the east walkway.
export const SUN_PLAQUE: [number, number] = [5.4, -24.4];

export const DOORS: DoorSpot[] = [
  { to: "motel", x: DOOR_X, z: DOOR_Z, normal: [0, -1] },
];

// ── Floors ───────────────────────────────────────────────────────────────
// Every dry floor is a patch at y = 0; the flooded wing and the footbath
// are the base floor.
export const FLOORS: FloorPatch[] = [
  // The entrance, up to the arch wall's far face.
  { x0: -HALL_OUT, x1: HALL_OUT, z0: FOOTBATH_Z1, z1: SOUTH_Z, y: 0 },
  // Beside the footbath.
  { x0: -HALL_OUT, x1: -FOOTBATH_X, z0: FOOTBATH_Z0, z1: FOOTBATH_Z1, y: 0 },
  { x0: FOOTBATH_X, x1: HALL_OUT, z0: FOOTBATH_Z0, z1: FOOTBATH_Z1, y: 0 },
  // The hall's deck, south of the footbath, and its two walkways. They run
  // through the side walls' thickness so the arches are dry underfoot.
  { x0: -HALL_OUT, x1: HALL_OUT, z0: POOL_Z1, z1: FOOTBATH_Z0, y: 0 },
  { x0: -HALL_OUT, x1: -POOL_X, z0: NORTH_Z, z1: POOL_Z1, y: 0 },
  { x0: POOL_X, x1: HALL_OUT, z0: NORTH_Z, z1: POOL_Z1, y: 0 },
  // The west wing's floor, and the terrace over its north end.
  { x0: -HALF_W, x1: -HALL_OUT, z0: TERRACE_Z1, z1: HALL_S, y: 0 },
  { x0: -HALF_W, x1: -HALL_OUT, z0: NORTH_Z, z1: TERRACE_Z1, y: TERRACE_Y },
  // The stair: it climbs from the wing to the terrace as z decreases.
  {
    x0: STAIR_X0,
    x1: STAIR_X1,
    z0: STAIR_Z0,
    z1: STAIR_Z1,
    y: TERRACE_Y,
    y2: 0,
    axis: "z",
  },
];

const GROUND = { y0: -1, y1: 2.2 };
const UPSTAIRS = { y0: TERRACE_Y - 0.3, y1: TERRACE_Y + 2.2 };

// A wall along z at x, from z0 to z1, broken by arches.
function wallAlongZ(x: number, z0: number, z1: number, arches: number[]) {
  const cuts = [...arches].sort((a, b) => a - b);
  const pieces: Footprint[] = [];
  let from = z0;
  for (const c of cuts) {
    const to = c - ARCH_HALF;
    if (to > from) {
      pieces.push({ cx: x, cz: (from + to) / 2, w: WALL_T, d: to - from });
    }
    from = c + ARCH_HALF;
  }
  if (z1 > from) pieces.push({ cx: x, cz: (from + z1) / 2, w: WALL_T, d: z1 - from });
  return pieces;
}

const SOUTH_BLOCK_D = SOUTH_Z - (HALL_S - WALL_T / 2);

export const COLLIDERS: Footprint[] = [
  // The hall's side walls, with their arches. The west wall is solid
  // beside the stair and the terrace (the window is above a parapet).
  ...wallAlongZ(HALL_X, NORTH_Z, HALL_S, EAST_ARCHES),
  ...wallAlongZ(-HALL_X, NORTH_Z, HALL_S, WEST_ARCHES),
  // The arch wall between the entrance and the hall.
  {
    cx: -(HALL_X + ENTRY_ARCH_HALF) / 2,
    cz: HALL_S,
    w: HALL_X - ENTRY_ARCH_HALF,
    d: WALL_T,
  },
  {
    cx: (HALL_X + ENTRY_ARCH_HALF) / 2,
    cz: HALL_S,
    w: HALL_X - ENTRY_ARCH_HALF,
    d: WALL_T,
  },
  // Outside the entrance, both sides: solid (the wings end at HALL_S).
  {
    cx: (HALL_X + HALF_W) / 2 - WALL_T / 4,
    cz: HALL_S - WALL_T / 2 + SOUTH_BLOCK_D / 2,
    w: HALF_W - HALL_X + WALL_T / 2,
    d: SOUTH_BLOCK_D,
  },
  {
    cx: -((HALL_X + HALF_W) / 2 - WALL_T / 4),
    cz: HALL_S - WALL_T / 2 + SOUTH_BLOCK_D / 2,
    w: HALF_W - HALL_X + WALL_T / 2,
    d: SOUTH_BLOCK_D,
  },
  // The reflecting pool is a hole, not a floor.
  {
    cx: 0,
    cz: (POOL_Z0 + POOL_Z1) / 2,
    w: POOL_X * 2,
    d: POOL_Z1 - POOL_Z0,
    y0: -2,
    y1: 0.2,
  },
  // The entrance: the kiosk and the lockers.
  {
    cx: (KIOSK_X0 + KIOSK_X1) / 2,
    cz: (KIOSK_Z0 + KIOSK_Z1) / 2,
    w: KIOSK_X1 - KIOSK_X0,
    d: KIOSK_Z1 - KIOSK_Z0,
  },
  {
    cx: LOCKER_X - LOCKER_D / 2,
    cz: (LOCKER_Z0 + LOCKER_Z1) / 2,
    w: LOCKER_D,
    d: LOCKER_Z1 - LOCKER_Z0,
    ...GROUND,
  },
  // The east wing's piers.
  ...PIER_XS.flatMap((cx) =>
    PIER_ZS.map((cz) => ({ cx, cz, w: PIER, d: PIER })),
  ),
  // The hall's fittings.
  { cx: LIFEGUARD[0], cz: LIFEGUARD[1], w: 1.1, d: 1.1, ...GROUND },
  { cx: RULES[0], cz: RULES[1], w: 0.4, d: 0.3, ...GROUND },
  ...PALMS.map(([cx, cz]) => ({ cx, cz, w: PLANTER, d: PLANTER, ...GROUND })),
  { cx: SLIDE_POST[0], cz: SLIDE_POST[1], w: 0.3, d: 0.3, ...GROUND },
  { cx: SUN_PLAQUE[0], cz: SUN_PLAQUE[1], w: 0.4, d: 0.4, ...GROUND },
  // The west wing: cubicles, bench.
  {
    cx: -HALF_W + CUBICLE_D / 2,
    cz: CUBICLE_Z0 + (CUBICLE_W * CUBICLE_COUNT) / 2,
    w: CUBICLE_D,
    d: CUBICLE_W * CUBICLE_COUNT,
    ...GROUND,
  },
  { cx: BENCH[0], cz: BENCH[1], w: 0.6, d: BENCH_L, ...GROUND },
  // The terrace is solid underneath. It stops low enough that someone on
  // the stair is above it wherever its footprint, grown by the player's
  // radius, reaches the treads.
  {
    cx: (-HALF_W - HALL_OUT) / 2,
    cz: (NORTH_Z + TERRACE_Z1) / 2,
    w: HALF_W - HALL_OUT,
    d: TERRACE_Z1 - NORTH_Z,
    y0: -1,
    y1: TERRACE_Y - 0.6,
  },
  // The stair's open side: its balustrade, floor to above head height on
  // the stair, so nobody walks in under it.
  {
    cx: STAIR_X0,
    cz: (STAIR_Z0 + STAIR_Z1) / 2,
    w: 0.14,
    d: STAIR_Z1 - STAIR_Z0,
    y0: -1,
    y1: TERRACE_Y + 2.2,
  },
  // The terrace's railing, along its south edge beside the stairhead.
  {
    cx: (-HALF_W + STAIR_X0 - 0.1) / 2,
    cz: TERRACE_Z1,
    w: STAIR_X0 - 0.1 + HALF_W,
    d: 0.14,
    ...UPSTAIRS,
  },
  // On the terrace: the plunge pool, the loungers.
  {
    cx: PLUNGE[0],
    cz: PLUNGE[1],
    w: PLUNGE_R * 2 + 0.3,
    d: PLUNGE_R * 2 + 0.3,
    ...UPSTAIRS,
  },
  ...LOUNGERS.map(([cx, cz]) => ({ cx, cz, w: 2.0, d: 0.85, ...UPSTAIRS })),
  // The slide's top, where it leaves the terrace.
  {
    cx: (SLIDE_START_X - 1 - HALL_OUT) / 2,
    cz: SLIDE_Z,
    w: -HALL_OUT - SLIDE_START_X + 1,
    d: 1.4,
    ...UPSTAIRS,
  },
];
