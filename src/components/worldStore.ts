// World store: which world the player is in and the door transition between
// them. Like musicStore, it lives outside the Canvas so both the DOM overlay
// (UI.tsx) and the R3F scene read the same state via useSyncExternalStore.

export type WorldId = "island" | "cave";

// idle → out (screen fades to the destination's color) → world swaps →
// in (fades back) → idle.
export type TransitionPhase = "idle" | "out" | "in";

export const FADE_OUT_MS = 900;
export const FADE_IN_MS = 1400;

interface Snapshot {
  world: WorldId;
  // Where the current transition is heading (equals `world` when idle).
  destination: WorldId;
  phase: TransitionPhase;
  // False until the first trip: the island's first spawn is the opening view,
  // later arrivals put the player in front of its door.
  arrivedByDoor: boolean;
  nearDoor: boolean;
}

let snapshot: Snapshot = {
  world: initialWorld(),
  destination: initialWorld(),
  phase: "idle",
  arrivedByDoor: initialWorld() !== "island",
  nearDoor: false,
};

const listeners = new Set<() => void>();

function update(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

// ?world=cave starts in the cave (handy for screenshots and debugging).
function initialWorld(): WorldId {
  if (typeof window === "undefined") return "island";
  const w = new URLSearchParams(window.location.search).get("world");
  return w === "cave" ? "cave" : "island";
}

export function travel() {
  if (snapshot.phase !== "idle") return;
  const destination: WorldId = snapshot.world === "island" ? "cave" : "island";
  update({ phase: "out", destination, nearDoor: false });
  window.setTimeout(() => {
    update({ world: destination, phase: "in", arrivedByDoor: true });
    window.setTimeout(() => update({ phase: "idle" }), FADE_IN_MS);
  }, FADE_OUT_MS);
}

export function setNearDoor(v: boolean) {
  if (v === snapshot.nearDoor) return;
  update({ nearDoor: v });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Snapshot {
  return snapshot;
}
