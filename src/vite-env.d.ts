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
    travel?: (to?: "island" | "cave" | "stockroom" | "mall") => void;
    // QA: the current world's doors (see Level.doors in levels.ts).
    qa_doors?: () => string;
    // QA: draw calls, triangles and GPU memory counts over one frame.
    qa_renderInfo?: () => Promise<string>;
    setFeedSegment?: (index: number | null) => void;
  }
}

export {};
