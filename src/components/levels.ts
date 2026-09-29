import {
  BOOMBOX_CENTER_X,
  BOOMBOX_CENTER_Z,
  BOOMBOX_TABLE_DEPTH,
  BOOMBOX_TABLE_WIDTH,
} from "./MusicPlayer";
import {
  COLUMN_HALF,
  COLUMN_POSITIONS,
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
  spawn: { x: number; z: number; yaw: number };
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
  ],
  spawn: { x: 0, z: FLOOR_DEPTH / 2 - 5, yaw: 0 },
};
