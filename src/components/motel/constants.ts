// Layout of the Sunset Motel: a two-storey courtyard motel built round a
// swimming pool, frozen at the moment the sun goes down. The building runs
// along the north side (z = -14), the gate back to the cave is in the east
// wall, and the courtyard is open to a permanent sunset in the west.
//
// One storey of rooms sits at ground level, the other along an open balcony
// reached by an outside stair at the east end. The player can walk the
// courtyard, climb the stair and walk the balcony; the rooms are all shut.

import type { DoorSpot, FloorPatch, Footprint } from "../levels";

export const HALF_W = 22;
export const HALF_L = 17;

// The building: facade at z = -14, six bays of 7 m, 6 m deep.
export const MOTEL_FRONT_Z = -14;
export const MOTEL_BACK_Z = -20;
export const MOTEL_DEPTH = 6;
export const STOREY_Y = 3.5;
export const ROOF_Y = 7;
export const PARAPET_Y = 7.9;

// The open balcony runs along the front of the first floor.
export const BALCONY_DEPTH = 2.4;
export const BALCONY_Z = MOTEL_FRONT_Z + BALCONY_DEPTH; // -11.6
export const BALCONY_RAIL_Y = STOREY_Y + 0.95;

export const BAY = 7;
export const BAY_XS = [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5];

// Openings within a bay: a window toward the north, the door toward the
// south. The office occupies the ground floor of the westmost bay.
export const WINDOW_W = 2;
export const WINDOW_H = 1.25;
export const WINDOW_SILL = 1;
export const WINDOW_DX = -1.5;
export const DOOR_W = 0.95;
export const DOOR_H = 2.05;
export const DOOR_DX = 1.15;
export const NUMBER_Y = 2.32;

export const OFFICE_BAY = 0;
export const OFFICE_X0 = -21;
export const OFFICE_X1 = -14;
export const OFFICE_DOOR_X = -14.9;
export const OFFICE_WINDOW_X = -18.2;
export const OFFICE_WINDOW_W = 4.6;
export const OFFICE_BACK_Z = -16.9;

// Ground rooms 1–5 fill bays 1–5; rooms 6–11 sit above the whole facade.
export const GROUND_ROOM_NUMBERS = [1, 2, 3, 4, 5];
export const UPPER_ROOM_NUMBERS = [6, 7, 8, 9, 10, 11];
// One room is still lit, and one upstairs has a television on.
export const LIT_ROOM = 2; // ground bay index 2
export const TV_ROOM = 9; // upper bay 3 (room numbers, not bay indexes)

// The pool, centred a little west of the courtyard.
export const POOL_X = -3;
export const POOL_Z = 2.5;
export const POOL_W = 14;
export const POOL_D = 8;
export const POOL_DEPTH = 1.6;
export const WATER_Y = -0.32;

// The stair up to the balcony, at the east end: it climbs from the courtyard
// to the balcony as z decreases.
export const STAIR_X0 = 18.9;
export const STAIR_X1 = 21.6;
export const STAIR_Z0 = BALCONY_Z; // top, at the balcony
export const STAIR_Z1 = -5.2; // bottom, in the courtyard
export const STAIR_STEPS = 12;

// The gate back to the cave, in the east wall.
export const MOTEL_DOOR_X = HALF_W - 0.35; // 21.65
export const MOTEL_DOOR_Z = 6;
export const GATE_OPEN_HALF = 1; // through the wall
export const GATE_PYLON_Z = [4.5, 7.5];
export const GATE_HEIGHT = 5.4;

// The neon sign on its pole, west of the pool.
export const SIGN_X = -17;
export const SIGN_Z = -9.8;
export const SIGN_POLE_H = 10.2;

export const VENDING: [number, number] = [21.15, -0.8];
export const ICE: [number, number] = [21.15, 2.2];
export const PAYPHONE: [number, number] = [21.72, 11];
export const MAID_CART: [number, number] = [13.6, -12.35];
export const POOL_SIGN: [number, number] = [7.2, 8.8];
export const ASHTRAY: [number, number] = [8.6, -8.2];

export const PALMS: [number, number, number][] = [
  [-18.5, 14.5, 6.6],
  [16.5, 15.4, 5.9],
  [18.4, -2.8, 5.3],
];

// Loungers face the pool from the south side.
export const LOUNGERS: [number, number][] = [
  [-8.4, 9.3],
  [-4.2, 9.3],
  [0.6, 9.3],
  [4.8, 9.3],
];
export const UMBRELLAS: [number, number][] = [
  [-6.3, 10.1],
  [2.7, 10.1],
];

// Three posts hold up the balcony; they sit just inside the railing.
export const BALCONY_POSTS = [-15, -5, 5, 15];

// The Venus statue is out by the pool, on a low plinth.
export const VENUS: [number, number] = [-14.2, 7.2];
export const VENUS_PLINTH_H = 0.55;

// A plastic table and two chairs, in the corner by the west fence.
export const TABLE: [number, number] = [-12, 11.2];

export const DOORS: DoorSpot[] = [
  { to: "cave", x: MOTEL_DOOR_X, z: MOTEL_DOOR_Z, normal: [-1, 0] },
];

// The balcony and the stair are floor patches above the courtyard.
export const FLOORS: FloorPatch[] = [
  {
    x0: -HALF_W,
    x1: HALF_W,
    z0: MOTEL_FRONT_Z,
    z1: BALCONY_Z,
    y: STOREY_Y,
  },
  {
    x0: STAIR_X0,
    x1: STAIR_X1,
    z0: STAIR_Z0,
    z1: STAIR_Z1,
    y: STOREY_Y,
    y2: 0,
    axis: "z",
  },
];

const GROUND = { y0: -1, y1: 2 };

export const COLLIDERS: Footprint[] = [
  // The building itself: every room, and the office, is behind this.
  { cx: 0, cz: (MOTEL_FRONT_Z + MOTEL_BACK_Z) / 2, w: HALF_W * 2, d: MOTEL_DEPTH, y0: -1, y1: PARAPET_Y },
  // The pool is a hole, not a surface.
  { cx: POOL_X, cz: POOL_Z, w: POOL_W, d: POOL_D, y0: -2, y1: 0.16 },
  // Loungers and their umbrellas.
  ...LOUNGERS.map(([cx, cz]) => ({ cx, cz, w: 0.85, d: 1.95, ...GROUND })),
  ...UMBRELLAS.map(([cx, cz]) => ({ cx, cz, w: 0.16, d: 0.16, ...GROUND })),
  // Palms.
  ...PALMS.map(([cx, cz]) => ({ cx, cz, w: 0.9, d: 0.9, ...GROUND })),
  // Poolside fittings.
  { cx: VENDING[0], cz: VENDING[1], w: 0.85, d: 1.5, ...GROUND },
  { cx: ICE[0], cz: ICE[1], w: 0.95, d: 1.2, ...GROUND },
  { cx: PAYPHONE[0], cz: PAYPHONE[1], w: 0.5, d: 0.9, ...GROUND },
  { cx: MAID_CART[0], cz: MAID_CART[1], w: 1.25, d: 0.8, ...GROUND },
  { cx: POOL_X, cz: POOL_Z - POOL_D / 2 - 0.6, w: 1.0, d: 1.2, ...GROUND },
  { cx: POOL_SIGN[0], cz: POOL_SIGN[1], w: 0.5, d: 0.5, ...GROUND },
  { cx: ASHTRAY[0], cz: ASHTRAY[1], w: 0.45, d: 0.45, ...GROUND },
  // The Venus statue and the poolside table.
  { cx: VENUS[0], cz: VENUS[1], w: 1.45, d: 1.45, ...GROUND },
  { cx: TABLE[0], cz: TABLE[1], w: 5.6, d: 4.2, ...GROUND },
  // The neon sign's pole.
  { cx: SIGN_X, cz: SIGN_Z, w: 0.55, d: 0.55, y0: -1, y1: SIGN_POLE_H },
  // The balcony railing, and the stair's outer rail.
  {
    cx: (-HALF_W + STAIR_X0) / 2,
    cz: BALCONY_Z,
    w: STAIR_X0 + HALF_W,
    d: 0.14,
    y0: STOREY_Y - 0.2,
    y1: STOREY_Y + 2.15,
  },
  {
    cx: STAIR_X0 - 0.08,
    cz: (STAIR_Z0 + STAIR_Z1) / 2,
    w: 0.14,
    d: STAIR_Z1 - STAIR_Z0,
    y0: -1,
    y1: STOREY_Y + 2.15,
  },
  // Balcony posts (they stand on the courtyard, under the slab).
  ...BALCONY_POSTS.map((cx) => ({
    cx,
    cz: BALCONY_Z - 0.2,
    w: 0.22,
    d: 0.22,
    ...GROUND,
  })),
  // Gate pylons.
  ...GATE_PYLON_Z.map((cz) => ({
    cx: HALF_W - 0.1,
    cz,
    w: 0.7,
    d: 0.6,
    y0: -1,
    y1: GATE_HEIGHT,
  })),
];
