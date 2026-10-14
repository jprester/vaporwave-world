import {
  BOOMBOX_CENTER_X,
  BOOMBOX_CENTER_Z,
  BOOMBOX_TABLE_DEPTH,
  BOOMBOX_TABLE_WIDTH,
} from "./MusicPlayer";
import {
  COLUMN_HALF,
  COLUMN_POSITIONS,
  DOOR_X,
  DOOR_Z,
  FLOOR_DEPTH,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  MALL_DOOR_X,
  MALL_DOOR_Z,
  PEDESTAL_CENTER_X,
  PEDESTAL_CENTER_Z,
  PEDESTAL_DEPTH,
  PEDESTAL_WIDTH,
  POOL_CENTER_X,
  POOL_CENTER_Z,
  POOL_DEPTH,
  POOL_WIDTH,
} from "./island/constants";
import * as CAVE from "./cave/constants";
import * as STOCK from "./stockroom/constants";
import * as MALL from "./mall/constants";
import type { WorldId } from "./worldStore";

// A level is everything the player controller needs to walk a world: the
// floor height, the walkable rectangle, solid footprints to slide around, and
// where to stand on arrival. Colliders are axis-aligned boxes on the XZ plane.
// A world with more than one storey adds floor patches (raised floors and
// ramps) and gives its colliders a vertical extent, so a balustrade upstairs
// doesn't stop you walking underneath it.

export interface Footprint {
  cx: number;
  cz: number;
  w: number;
  d: number;
  // Vertical extent; without it the collider is infinitely tall. The player
  // collides when their body (feet to head) overlaps it.
  y0?: number;
  y1?: number;
}

// A walkable surface above the base floor: flat at `y`, or a ramp rising
// linearly from `y` at its low-coordinate edge to `y2` at its high-coordinate
// edge along `axis`. The player stands on the highest surface under their
// centre that isn't more than a step above their feet.
export interface FloorPatch {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  y2?: number;
  axis?: "x" | "z";
}

export function patchHeight(p: FloorPatch, x: number, z: number) {
  if (p.y2 === undefined) return p.y;
  const t =
    p.axis === "x" ? (x - p.x0) / (p.x1 - p.x0) : (z - p.z0) / (p.z1 - p.z0);
  return p.y + (p.y2 - p.y) * Math.min(1, Math.max(0, t));
}

export interface Level {
  // The base floor, everywhere inside the bounds.
  floorY: number;
  floors?: FloorPatch[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  colliders: Footprint[];
  spawn: SpawnPoint;
  // Where the player appears when arriving from each neighbouring world: in
  // front of the door they came through, facing into the room.
  arrivals: Partial<Record<WorldId, SpawnPoint>>;
  // The world's doors, as its DoorTriggers place them. The worlds render
  // their own triggers; this list is for the door test (scripts/door-test.mjs
  // via window.qa_doors) and keeps the routing in one readable place.
  doors: DoorSpot[];
}

export interface DoorSpot {
  to: WorldId;
  x: number;
  z: number;
  // Floor height at the door, in worlds with more than one storey.
  y?: number;
  // Unit vector out of the door's front face, on the XZ plane.
  normal: [number, number];
}

// The door model is 1.9 m wide and 0.55 m deep; a door facing along x needs
// the footprint turned.
// A door given a floor height only stops you on that storey.
function doorFootprint({ x, y, z, normal }: DoorSpot): Footprint {
  const alongX = Math.abs(normal[0]) > 0.5;
  return {
    cx: x,
    cz: z,
    w: alongX ? 0.55 : 1.9,
    d: alongX ? 1.9 : 0.55,
    ...(y !== undefined && { y0: y - 1, y1: y + 4.5 }),
  };
}

// Where to stand on arriving through a door: `out` metres in front of it,
// facing away from it.
function inFrontOf({ x, z, y, normal }: DoorSpot, out: number): SpawnPoint {
  const [nx, nz] = normal;
  // yaw 0 looks toward -z and +yaw turns left, so facing (nx, nz) is
  // atan2(-nx, -nz).
  // (+ 0 turns -0 into 0, so a door facing +z gives π rather than -π.)
  return {
    x: x + nx * out,
    z: z + nz * out,
    yaw: Math.atan2(-nx + 0, -nz),
    ...(y !== undefined && { y }),
  };
}

const ISLAND_DOORS: DoorSpot[] = [
  { to: "cave", x: DOOR_X, z: DOOR_Z, normal: [0, 1] },
  { to: "mall", x: MALL_DOOR_X, z: MALL_DOOR_Z, normal: [-1, 0] },
];
const CAVE_DOORS: DoorSpot[] = [
  { to: "island", x: CAVE.CAVE_DOOR_X, z: CAVE.CAVE_DOOR_Z, normal: [0, -1] },
  {
    to: "stockroom",
    x: CAVE.STAFF_DOOR_X,
    z: CAVE.STAFF_DOOR_Z,
    normal: [0, 1],
  },
  { to: "mall", x: CAVE.MALL_DOOR_X, z: CAVE.MALL_DOOR_Z, normal: [1, 0] },
];
const STOCKROOM_DOORS: DoorSpot[] = [
  { to: "cave", x: STOCK.DOOR_X, z: STOCK.DOOR_Z, normal: [0, -1] },
  { to: "mall", x: STOCK.MALL_DOOR_X, z: STOCK.MALL_DOOR_Z, normal: [0, 1] },
];
function door(doors: DoorSpot[], to: WorldId) {
  return doors.find((d) => d.to === to)!;
}

export interface SpawnPoint {
  x: number;
  z: number;
  yaw: number;
  // Floor height to stand on, if not the level's base floor.
  y?: number;
}

// Solid things on the island platform, doors aside.
const ISLAND_PROPS: Footprint[] = [
  { cx: POOL_CENTER_X, cz: POOL_CENTER_Z, w: POOL_WIDTH, d: POOL_DEPTH },
  {
    cx: PEDESTAL_CENTER_X,
    cz: PEDESTAL_CENTER_Z,
    w: PEDESTAL_WIDTH,
    d: PEDESTAL_DEPTH,
  },
  ...COLUMN_POSITIONS.map(([cx, , cz]) => ({
    cx,
    cz,
    w: COLUMN_HALF * 2,
    d: COLUMN_HALF * 2,
  })),
  {
    cx: BOOMBOX_CENTER_X,
    cz: BOOMBOX_CENTER_Z,
    w: BOOMBOX_TABLE_WIDTH,
    d: BOOMBOX_TABLE_DEPTH,
  },
];

export const ISLAND_LEVEL: Level = {
  floorY: FLOOR_HEIGHT,
  bounds: {
    minX: -FLOOR_WIDTH / 2,
    maxX: FLOOR_WIDTH / 2,
    minZ: -FLOOR_DEPTH / 2,
    maxZ: FLOOR_DEPTH / 2,
  },
  colliders: [
    ...ISLAND_PROPS,
    // the freestanding doors
    ...ISLAND_DOORS.map(doorFootprint),
  ],
  spawn: { x: 0, z: FLOOR_DEPTH / 2 - 5, yaw: 0 },
  arrivals: {
    // Just stepped out of the door, facing away from it toward the pool.
    cave: inFrontOf(door(ISLAND_DOORS, "cave"), 3.5),
    mall: inFrontOf(door(ISLAND_DOORS, "mall"), 3.5),
  },
  doors: ISLAND_DOORS,
};

const CHAIR_BLOCK_CX =
  (CAVE.CHAIR_SEATS_X[0] + CAVE.CHAIR_SEATS_X[CAVE.CHAIR_SEATS_X.length - 1]) /
  2;

export const CAVE_LEVEL: Level = {
  floorY: 0,
  bounds: {
    minX: -CAVE.HALF_W,
    maxX: CAVE.HALF_W,
    minZ: -CAVE.HALF_L,
    maxZ: CAVE.HALF_L,
  },
  colliders: [
    // video wall stand
    {
      cx: 0,
      cz: CAVE.STAND_Z,
      w: CAVE.WALL_COLS * CAVE.CRT_W + 0.4,
      d: CAVE.STAND_D,
    },
    // chair blocks
    ...CAVE.CHAIR_ROWS_Z.flatMap((cz) =>
      [-1, 1].map((side) => ({
        cx: side * CHAIR_BLOCK_CX,
        cz,
        w: CAVE.CHAIR_BLOCK_W,
        d: CAVE.CHAIR_DEPTH,
      })),
    ),
    // Carts are rotated, so collide with the axis-aligned box around the
    // turned footprint (square, to cover the CRT's tube housing too).
    ...CAVE.CARTS.map(({ x, z, yaw }) => {
      const size = CAVE.CART_W;
      const extent = size * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
      return { cx: x, cz: z, w: extent, d: extent };
    }),
    // the doors
    ...CAVE_DOORS.map(doorFootprint),
  ],
  spawn: { x: 0, z: CAVE.HALF_L - 4, yaw: 0 },
  arrivals: {
    island: { x: 0, z: CAVE.HALF_L - 4, yaw: 0 },
    // Back out of the staff door, facing the room.
    stockroom: {
      x: CAVE.STAFF_DOOR_X,
      z: CAVE.STAFF_DOOR_Z + 3,
      yaw: Math.PI - 0.45,
    },
    // Out of the mall entrance, turned a little toward the screens.
    mall: {
      ...inFrontOf(door(CAVE_DOORS, "mall"), 3),
      yaw: -Math.PI / 2 + 0.5,
    },
  },
  doors: CAVE_DOORS,
};

export const STOCKROOM_LEVEL: Level = {
  floorY: 0,
  bounds: {
    minX: -STOCK.WALK_HALF_W,
    maxX: STOCK.WALK_HALF_W,
    minZ: -STOCK.HALF_L,
    maxZ: STOCK.HALF_L,
  },
  colliders: [
    ...STOCK.LOTS.map(({ x0, x1, z0, z1 }) => ({
      cx: (x0 + x1) / 2,
      cz: (z0 + z1) / 2,
      w: Math.abs(x1 - x0),
      d: Math.abs(z1 - z0),
    })),
    ...STOCK.PROPS_COLLIDERS,
    ...STOCKROOM_DOORS.map(doorFootprint),
  ],
  spawn: { x: 0, z: STOCK.HALF_L - 4, yaw: 0 },
  arrivals: {
    cave: { x: 0, z: STOCK.HALF_L - 4, yaw: 0 },
    mall: inFrontOf(door(STOCKROOM_DOORS, "mall"), 3),
  },
  doors: STOCKROOM_DOORS,
};

// The mall: two storeys round an open atrium. The ground floor is the
// level's floor; the gallery ring and the two (stopped) escalators up to it
// are floor patches. Everything solid has a vertical extent, so the
// gallery's balustrades don't wall off the concourse below.
const MALL_DOORS: DoorSpot[] = MALL.DOORS;

export const MALL_LEVEL: Level = {
  floorY: 0,
  floors: MALL.FLOORS,
  bounds: {
    minX: -MALL.HALF_W,
    maxX: MALL.HALF_W,
    minZ: -MALL.HALF_L,
    maxZ: MALL.HALF_L,
  },
  colliders: [...MALL.COLLIDERS, ...MALL_DOORS.map(doorFootprint)],
  spawn: { x: 0, z: MALL.HALF_L - 5, yaw: 0 },
  arrivals: {
    island: inFrontOf(door(MALL_DOORS, "island"), 3.5),
    cave: inFrontOf(door(MALL_DOORS, "cave"), 3.5),
    stockroom: inFrontOf(door(MALL_DOORS, "stockroom"), 3.5),
  },
  doors: MALL_DOORS,
};
