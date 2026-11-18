// Layout of the powerhouse: the generating station behind door #11, where the
// golden hour is made. A long, high, cold turbine hall: the door from the
// stockroom in the south wall, three generators down the middle, a control
// gallery up a steel stair along the east wall, and at the far north end the
// fire, in a boiler, behind a round glass door. A spare moon hangs from the
// overhead crane in front of it. Floor at y = 0.

import type { DoorSpot, FloorPatch, Footprint } from "../levels";

export const HALF_W = 15; // x
export const HALF_L = 33; // z
export const ROOM_HEIGHT = 17;
// The glazed tile dado along the bottom of every wall.
export const DADO_H = 2.4;

// Door back to the stockroom (door #11's other side), in the south wall,
// facing up the hall (-z).
export const DOOR_X = -10.5;
export const DOOR_Z = HALF_L - 0.35;

// The fire: a brick-and-steel boiler across the north end, with a round glass
// fire door in its front face.
export const BOILER_X0 = -9;
export const BOILER_X1 = 9;
export const BOILER_FRONT_Z = -27.5;
export const BOILER_H = 8.5;
// Off-centre, west of the generators' line, so it shows from the door.
export const FIRE_X = -6;
export const FIRE_Y = 2.3;
export const FIRE_R = 1.15;

// Fuel: sacks on pallets, west of the boiler.
export const FUEL_X = -12;
export const FUEL_Z = -24.6;
export const FUEL_W = 3.4;
export const FUEL_D = 2.4;

// Three generators down the middle of the hall, axis along z.
export const GEN_X = -1.5;
export const GEN_ZS = [17, 3, -11];
export const GEN_OUT_OF_SERVICE = 1; // index: No. 2
export const PLINTH_W = 4.4;
export const PLINTH_L = 10.5;
export const PLINTH_H = 0.7;
export const CASING_R = 1.8;
export const CASING_L = 8;
export const CASING_Y = PLINTH_H + 0.25 + CASING_R; // axis height
// The chain barrier round the generator that's out of service.
export const BARRIER_HALF_X = PLINTH_W / 2 + 0.7;
export const BARRIER_HALF_Z = PLINTH_L / 2 + 0.7;

// The control gallery: a raised floor along the east wall, over a wall of
// switchgear, reached by a steel stair that climbs north to south.
export const GALLERY_X0 = 7;
export const GALLERY_X1 = HALF_W;
export const GALLERY_Z0 = 12; // north edge
export const GALLERY_Z1 = HALF_L;
export const GALLERY_Y = 4.2;
export const GALLERY_SLAB = 0.3;
export const CANOPY_Y = 8.6;
export const RAIL_H = 1.05;

export const STAIR_X0 = 11;
export const STAIR_X1 = HALF_W;
export const STAIR_Z0 = 2; // bottom, on the hall floor
export const STAIR_Z1 = GALLERY_Z0; // top, at the gallery
export const STAIR_STEPS = 16;

// The control desk on the gallery, facing the hall over the railing.
export const CONSOLE_X0 = 10.6;
export const CONSOLE_X1 = 11.6;
export const CONSOLE_Z0 = 17;
export const CONSOLE_Z1 = 26;
export const CHAIR: [number, number] = [12.7, 21.4];
// The mimic board: the network drawn on the east wall behind the desk.
export const MIMIC_Z0 = 15.3;
export const MIMIC_Z1 = 29.6;

// The overhead crane, parked over the moon.
export const CRANE_Y = 13.6;
export const CRANE_RAIL_Y = 13;
export const MOON_X = 2.5;
export const MOON_Z = -19.5;
export const MOON_R = 2;
export const MOON_Y = 5.4; // centre
export const CRADLE_W = 2.6;
export const CRADLE_H = 0.75;

// The duct that carries it all away, along the roof over the generators,
// and out through the south wall.
export const DUCT_X = GEN_X;
export const DUCT_Y = 12.2;
export const DUCT_R = 0.75;

// The meters: one per account, on the south wall between the door and the
// gallery.
export const METER_Z = HALF_L;
export const METER_XS = [-4.2, -1.4, 1.4, 4.2];
export const METER_SHELF_Y = 1.0;

export const DOORS: DoorSpot[] = [
  { to: "stockroom", x: DOOR_X, z: DOOR_Z, normal: [0, -1] },
];

export const FLOORS: FloorPatch[] = [
  {
    x0: GALLERY_X0,
    x1: GALLERY_X1,
    z0: GALLERY_Z0,
    z1: GALLERY_Z1,
    y: GALLERY_Y,
  },
  {
    x0: STAIR_X0,
    x1: STAIR_X1,
    z0: STAIR_Z0,
    z1: STAIR_Z1,
    y: 0,
    y2: GALLERY_Y,
    axis: "z",
  },
];

const GROUND = { y0: -1, y1: 2.2 };
const UPSTAIRS = { y0: GALLERY_Y - 0.3, y1: GALLERY_Y + 2.2 };

export const COLLIDERS: Footprint[] = [
  // The boiler and the fuel.
  {
    cx: (BOILER_X0 + BOILER_X1) / 2,
    cz: (BOILER_FRONT_Z - HALF_L) / 2,
    w: BOILER_X1 - BOILER_X0,
    d: HALF_L + BOILER_FRONT_Z,
  },
  { cx: FUEL_X, cz: FUEL_Z, w: FUEL_W, d: FUEL_D, ...GROUND },
  // The generators on their plinths; No. 2 is roped off.
  ...GEN_ZS.map((cz, i) =>
    i === GEN_OUT_OF_SERVICE
      ? { cx: GEN_X, cz, w: BARRIER_HALF_X * 2, d: BARRIER_HALF_Z * 2, ...GROUND }
      : { cx: GEN_X, cz, w: PLINTH_W, d: PLINTH_L, y0: -1, y1: 5 },
  ),
  // The moon's cradle.
  { cx: MOON_X, cz: MOON_Z, w: CRADLE_W, d: CRADLE_W, ...GROUND },
  // The switchgear under the gallery. It stops low enough that someone
  // climbing the stair is always above it wherever its footprint, grown by
  // the player's radius, reaches the treads.
  {
    cx: (GALLERY_X0 + GALLERY_X1) / 2,
    cz: (GALLERY_Z0 + GALLERY_Z1) / 2,
    w: GALLERY_X1 - GALLERY_X0,
    d: GALLERY_Z1 - GALLERY_Z0,
    y0: -1,
    y1: 3.4,
  },
  // The stair's open side: its handrail, floor to above head height on the
  // stair, so nobody walks in under the treads from the hall.
  {
    cx: STAIR_X0,
    cz: (STAIR_Z0 + STAIR_Z1) / 2,
    w: 0.14,
    d: STAIR_Z1 - STAIR_Z0,
    y0: -1,
    y1: GALLERY_Y + 2.2,
  },
  // Gallery railings: along the front, and across its north end beside the
  // stairhead.
  {
    cx: GALLERY_X0,
    cz: (GALLERY_Z0 + GALLERY_Z1) / 2,
    w: 0.14,
    d: GALLERY_Z1 - GALLERY_Z0,
    ...UPSTAIRS,
  },
  {
    cx: (GALLERY_X0 + STAIR_X0 - 0.1) / 2,
    cz: GALLERY_Z0,
    w: STAIR_X0 - 0.1 - GALLERY_X0,
    d: 0.14,
    ...UPSTAIRS,
  },
  // The control desk and its chair.
  {
    cx: (CONSOLE_X0 + CONSOLE_X1) / 2,
    cz: (CONSOLE_Z0 + CONSOLE_Z1) / 2,
    w: CONSOLE_X1 - CONSOLE_X0,
    d: CONSOLE_Z1 - CONSOLE_Z0,
    ...UPSTAIRS,
  },
  { cx: CHAIR[0], cz: CHAIR[1], w: 0.7, d: 0.7, ...UPSTAIRS },
  // The meters' shelf.
  { cx: 0, cz: HALF_L - 0.25, w: 11, d: 0.5, ...GROUND },
];
