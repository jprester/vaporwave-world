// Depth contract for things attached to a wall or a facade.
//
// Every offset is measured in metres along the surface normal, starting at
// the wall's front face. The values are deliberately small but never equal:
// two coplanar planes at the same depth are the single most common source of
// the "shimmering texture" bug, and a 6 mm gap is invisible at walking pace.
//
// If you need a new kind of attachment, add a named layer here rather than
// putting another magic number into the scene. The order is checked by
// `scripts/qa-geometry.ts`, so the contract cannot silently drift.

export const LAYERS = {
  /** The wall itself. Never attach anything here. */
  WALL: 0,
  /** Fabric or a blind, just in front of the wall, behind the glass. */
  CURTAIN: 0.008,
  /** Window glass. */
  GLASS: 0.024,
  /** A door leaf. */
  LEAF: 0.04,
  /** Door and window frames, mullions, architraves. */
  FRAME: 0.056,
  /** Sills, thresholds, mouldings that stand proud of the frame. */
  TRIM: 0.074,
  /** House numbers, plaques, decals and other flat signs. */
  SIGN: 0.09,
} as const;

export type DepthLayer = keyof typeof LAYERS;

/** Explicit order, so `Object.keys` can never surprise the QA check. */
export const LAYER_ORDER = [
  "WALL",
  "CURTAIN",
  "GLASS",
  "LEAF",
  "FRAME",
  "TRIM",
  "SIGN",
] as const satisfies readonly DepthLayer[];

/** Smallest allowed gap between two layers, in metres. */
export const MIN_LAYER_GAP = 0.006;

/** Local z for an attachment on the given layer. */
export function layerZ(layer: DepthLayer, nudge = 0): number {
  return LAYERS[layer] + nudge;
}

/** True when the contract's values are finite, start at zero and strictly rise. */
export function depthContractIsValid(): boolean {
  if (LAYERS.WALL !== 0) return false;
  for (let i = 1; i < LAYER_ORDER.length; i++) {
    const a = LAYERS[LAYER_ORDER[i - 1]];
    const b = LAYERS[LAYER_ORDER[i]];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (b - a < MIN_LAYER_GAP) return false;
  }
  return true;
}
