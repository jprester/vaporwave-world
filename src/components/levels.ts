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
import type { WorldId } from "./worldStore";

// A level is everything the player controller needs to walk a world: the
// floor height, the walkable rectangle, solid footprints to slide around, and
// where to stand on arrival. Colliders are axis-aligned boxes on the XZ plane.

export interface Footprint {
  cx: number;
  cz: number;
  w: number;
  d: number;
}

export interface Level {
  floorY: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  colliders: Footprint[];
  spawn: SpawnPoint;
  // Where the player appears when arriving from each neighbouring world: in
  // front of the door they came through, facing into the room.
  arrivals: Partial<Record<WorldId, SpawnPoint>>;
}

export interface SpawnPoint {
  x: number;
  z: number;
  yaw: number;
}

export const ISLAND_LEVEL: Level = {
  floorY: FLOOR_HEIGHT,
  bounds: {
    minX: -FLOOR_WIDTH / 2,
    maxX: FLOOR_WIDTH / 2,
    minZ: -FLOOR_DEPTH / 2,
    maxZ: FLOOR_DEPTH / 2,
  },
  colliders: [
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
    // the freestanding door
    { cx: DOOR_X, cz: DOOR_Z, w: 1.9, d: 0.55 },
  ],
  spawn: { x: 0, z: FLOOR_DEPTH / 2 - 5, yaw: 0 },
  arrivals: {
    // Just stepped out of the door, facing away from it toward the pool.
    cave: { x: DOOR_X, z: DOOR_Z + 3.5, yaw: Math.PI },
  },
};

const CHAIR_BLOCK_CX =
  (CAVE.CHAIR_SEATS_X[0] +
    CAVE.CHAIR_SEATS_X[CAVE.CHAIR_SEATS_X.length - 1]) /
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
    { cx: CAVE.CAVE_DOOR_X, cz: CAVE.CAVE_DOOR_Z, w: 1.9, d: 0.55 },
    { cx: CAVE.STAFF_DOOR_X, cz: CAVE.STAFF_DOOR_Z, w: 1.9, d: 0.55 },
  ],
  spawn: { x: 0, z: CAVE.HALF_L - 4, yaw: 0 },
  arrivals: {
    island: { x: 0, z: CAVE.HALF_L - 4, yaw: 0 },
    // Back out of the staff door, facing the room.
    stockroom: { x: CAVE.STAFF_DOOR_X, z: CAVE.STAFF_DOOR_Z + 3, yaw: Math.PI - 0.45 },
  },
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
    { cx: STOCK.DOOR_X, cz: STOCK.DOOR_Z, w: 1.9, d: 0.55 },
  ],
  spawn: { x: 0, z: STOCK.HALF_L - 4, yaw: 0 },
  arrivals: {
    cave: { x: 0, z: STOCK.HALF_L - 4, yaw: 0 },
  },
};
