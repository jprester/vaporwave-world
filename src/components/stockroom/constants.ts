// Layout of the stockroom: the prop store behind the cave's staff door, where
// the island's props are kept, spares and all. A long, high warehouse: the
// door and the clerk's desk at the south end, wall racks down both sides,
// numbered floor lots either side of a central aisle, and the spare suns at
// the far north end. Floor at y = 0.

export const ROOM_WIDTH = 28; // x
export const ROOM_LENGTH = 48; // z
export const ROOM_HEIGHT = 9;
export const HALF_W = ROOM_WIDTH / 2;
export const HALF_L = ROOM_LENGTH / 2;

// Door back to the cave, on the south wall, facing into the room (-z).
export const DOOR_X = 0;
export const DOOR_Z = HALF_L - 0.35;

// Pallet racking along both long walls.
export const RACK_DEPTH = 1.2;
export const RACK_X = HALF_W - 0.15 - RACK_DEPTH / 2;
export const RACK_Z0 = 11; // south end
export const RACK_BAYS = 10;
export const RACK_BAY = 2.8;
export const RACK_LEVELS = [0.12, 2.3, 4.5, 6.7];
export const RACK_HEIGHT = 7;
// The player walks up to the racks' faces.
export const WALK_HALF_W = RACK_X - RACK_DEPTH / 2;

// Floor lots either side of the central aisle. Each is one solid footprint.
export interface Lot {
  id: string;
  number: number;
  label: string;
  x0: number;
  x1: number;
  z0: number; // south edge
  z1: number; // north edge
}

const AISLE_HALF = 3.4;
const LOT_OUTER = 9.6;

export const LOTS: Lot[] = [
  {
    id: "venus",
    number: 1,
    label: "VENUS, WAVING",
    x0: -LOT_OUTER,
    x1: -AISLE_HALF,
    z0: 9.5,
    z1: -5.6,
  },
  {
    id: "sea",
    number: 2,
    label: "SEA, CALM (ROLLED)",
    x0: -LOT_OUTER,
    x1: -AISLE_HALF,
    z0: -9,
    z1: -16,
  },
  {
    id: "helios",
    number: 3,
    label: "HELIOS",
    x0: AISLE_HALF,
    x1: LOT_OUTER,
    z0: 9.5,
    z1: 3.5,
  },
  {
    id: "doors",
    number: 4,
    label: "DOORS",
    x0: AISLE_HALF,
    x1: LOT_OUTER,
    z0: 0,
    z1: -5.6,
  },
  {
    id: "columns",
    number: 5,
    label: "COLUMNS, DORIC",
    x0: AISLE_HALF,
    x1: LOT_OUTER,
    z0: -9,
    z1: -16,
  },
];

export function lot(id: string): Lot {
  return LOTS.find((l) => l.id === id)!;
}

// The grey door, in the north wall behind the spare suns, facing down the
// warehouse (+z). It leads to the forms.
export const GREY_DOOR_X = 10.6;
export const GREY_DOOR_Z = -HALF_L + 0.35;

// The spare suns, leaning on the north wall at the end of the central aisle.
export const SUN_Z = -HALF_L + 0.9;
export const SUN_DIAMETER = 7;

// The clerk's desk in the south-east corner, by the inventory board.
export const DESK_X = 7.2;
export const DESK_Z = 17.5;

// Closed roll-up shutter on the west wall of the front area.
export const SHUTTER_Z = 17;
export const SHUTTER_W = 5;
export const SHUTTER_H = 5.2;

// Other solid things the player shouldn't walk through.
export const PROPS_COLLIDERS = [
  // the lit sun and the spares beside it
  { cx: 0, cz: -HALF_L + 1.2, w: 16, d: 2.4 },
  // desk and chair
  { cx: DESK_X, cz: DESK_Z - 0.3, w: 2.4, d: 2.4 },
  // empty pallets and returns by the door
  { cx: -4.6, cz: 22.2, w: 1.2, d: 1.0 },
  { cx: -8.3, cz: 21.6, w: 4.0, d: 1.4 },
];
