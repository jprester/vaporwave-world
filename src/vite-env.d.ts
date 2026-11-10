/// <reference types="vite/client" />

declare global {
  interface Window {
    // Debug hooks used by scripts/shot.mjs for headless screenshots.
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void | Promise<void>;
    setCameraOrientation?: (yaw: number, pitch: number) => void;
    // y is the height of the floor to stand on (the mall has two levels);
    // without it the player keeps their current height.
    setPlayerPosition?: (x: number, z: number, y?: number) => void;
    travel?: (to?: "island" | "cave" | "stockroom" | "mall" | "motel") => void;
    // QA: the current world's doors (see Level.doors in levels.ts).
    qa_doors?: () => string;
    // QA: the current level (floor, bounds, colliders, doors, spawns).
    qa_level?: () => string;
    // QA: visible meshes with world position, bounds and materials.
    qa_scene?: () => string;
    // QA: raycast from (x,y,z) along (dx,dy,dz); returns the first few hits.
    qa_raycast?: (
      x: number,
      y: number,
      z: number,
      dx: number,
      dy: number,
      dz: number,
      far?: number,
    ) => string;
    // QA: draw calls, triangles and GPU memory counts over one frame.
    qa_renderInfo?: () => Promise<string>;
    setFeedSegment?: (index: number | null) => void;
  }
}

export {};
