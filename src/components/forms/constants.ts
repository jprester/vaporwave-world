// Layout of the forms: the island's blockout. The platform, pool, pedestal
// and columns stand exactly where the island has them (island/constants.ts),
// as untextured primitives, floating over an endless ground grid at y = 0.
// The doors out stand where the island has doors: the cave door where the
// island's is, the island door where the island's grey door is, and the
// stockroom door mirrored on the west edge.

import {
  DOOR_X,
  DOOR_Z,
  FLOOR_HEIGHT,
  GREY_DOOR_X,
  GREY_DOOR_Z,
} from "../island/constants";

export const CAVE_DOOR_X = DOOR_X;
export const CAVE_DOOR_Z = DOOR_Z;
export const ISLAND_DOOR_X = GREY_DOOR_X;
export const ISLAND_DOOR_Z = GREY_DOOR_Z;
export const STOCKROOM_DOOR_X = -GREY_DOOR_X;
export const STOCKROOM_DOOR_Z = GREY_DOOR_Z;

// The reference: a real scanned bust on a plinth, a chrome ball and a grey
// ball on a stand, and a colour chart, south-west of the pool.
export const REFERENCE_X = -12.5;
export const REFERENCE_Z = 11;

// The opening shot's camera, where the island first puts the player.
export const CAMERA_GIZMO_Z = 20;
export const PLATFORM_TOP = FLOOR_HEIGHT;
