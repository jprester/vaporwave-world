// Layout of the cave: a closed-down hotel conference room behind the island's
// door. Rows of empty chairs face a wall of CRTs showing the island live.
// The floor sits at y = 0; the island and the cave are never drawn together,
// so their coordinates can overlap.

export const ROOM_WIDTH = 16; // x
export const ROOM_LENGTH = 36; // z
export const ROOM_HEIGHT = 4.6;
export const HALF_W = ROOM_WIDTH / 2;
export const HALF_L = ROOM_LENGTH / 2;

// Entry door on the south wall, facing into the room (-z).
export const CAVE_DOOR_X = 0;
export const CAVE_DOOR_Z = HALF_L - 0.35;

// Video wall against the north wall.
export const WALL_COLS = 5;
export const WALL_ROWS = 3;
export const CRT_W = 1.5;
export const CRT_H = 1.12;
export const CRT_D = 1.15;
export const STAND_H = 0.75;
export const STAND_D = 1.3;
export const STAND_Z = -HALF_L + STAND_D / 2 + 0.2;

// Audience: two blocks of chairs either side of a centre aisle, facing north.
export const CHAIR_ROWS_Z = [3, -0.6, -4.2];
export const CHAIR_SEATS_X = [2.3, 3.3, 4.3, 5.3];
export const CHAIR_BLOCK_W = 4.0;
export const CHAIR_DEPTH = 0.9;

// AV carts along the side walls, each with one CRT.
export const CARTS: { x: number; z: number; yaw: number }[] = [
  { x: -6.6, z: 9, yaw: 0.6 },
  { x: 6.6, z: 9, yaw: -0.6 },
  { x: -6.6, z: -10, yaw: 0.35 },
  { x: 6.6, z: -10, yaw: -0.35 },
];
export const CART_W = 1.2;
export const CART_D = 0.8;
export const CART_H = 1.05;
