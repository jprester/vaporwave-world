// Layout of the island world: the tiled platform, its pool, the pedestal and
// the columns. Shared by the island meshes, the player colliders (levels.ts)
// and the boombox arrangement (MusicPlayer.tsx).

export const OCEAN_SIZE = 10000;
export const SUN_ELEVATION = 8;
export const SUN_AZIMUTH = 180;

export const FLOOR_WIDTH = 56;
export const FLOOR_DEPTH = 50;
export const FLOOR_HEIGHT = 5.2;
export const FLOOR_TEXTURE_WORLD_SIZE = 12;
export const FRAME_THICKNESS = 1.9;

export const POOL_WIDTH = 17;
export const POOL_DEPTH = 14;
export const POOL_CENTER_X = 0;
export const POOL_CENTER_Z = -2;
export const POOL_RECESS = 1.7;
export const POOL_WATER_DROP = 0.45;

export const COLUMN_HALF = 1.3;
export const COLUMN_POSITIONS: [number, number, number][] = [
  [20, FLOOR_HEIGHT, -19],
  [20, FLOOR_HEIGHT, -10],
  [20, FLOOR_HEIGHT, 0],
  [20, FLOOR_HEIGHT, 8],
  [20, FLOOR_HEIGHT, 17],
  [-20, FLOOR_HEIGHT, -19],
  [-20, FLOOR_HEIGHT, -10],
  [-20, FLOOR_HEIGHT, 8],
  [-20, FLOOR_HEIGHT, 17],
];

export const PEDESTAL_WIDTH = 4.2;
export const PEDESTAL_HEIGHT = 12.5;
export const PEDESTAL_DEPTH = 4.2;
export const PEDESTAL_CENTER_X = -20;
export const PEDESTAL_CENTER_Z = -2;

export const DOOR_X = 6;
export const DOOR_Z = -FLOOR_DEPTH / 2 + 0.5;
