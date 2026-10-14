/// <reference types="vite/client" />

declare global {
  interface Window {
    // Debug hooks used by scripts/shot.mjs for headless screenshots.
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void | Promise<void>;
    setCameraOrientation?: (yaw: number, pitch: number) => void;
    setPlayerPosition?: (x: number, z: number) => void;
    travel?: (to?: "island" | "cave" | "stockroom" | "forms") => void;
    // QA: the current world's doors (see Level.doors in levels.ts).
    qa_doors?: () => string;
    // QA: draw calls, triangles and GPU memory counts over one frame.
    qa_renderInfo?: () => Promise<string>;
    setFeedSegment?: (index: number | null) => void;
  }
}

export {};
