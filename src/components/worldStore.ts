// World store: which world the player is in and the door transition between
// them. Like musicStore, it lives outside the Canvas so both the DOM overlay
// (UI.tsx) and the R3F scene read the same state via useSyncExternalStore.
//
// Worlds are joined by doors. Each door names the world it leads to; the
// destination places the player by the door they came through (see the
// per-origin arrivals in levels.ts).

export const WORLD_IDS = ["island", "cave", "stockroom", "forms"] as const;
export type WorldId = (typeof WORLD_IDS)[number];

// idle → out (screen fades to the destination's color) → world swaps →
// in (fades back) → idle.
export type TransitionPhase = "idle" | "out" | "in";

export const FADE_OUT_MS = 900;
export const FADE_IN_MS = 1400;

// Where a world's doors lead, in the order the debug hook falls back to when
// travel() is called away from any door.
// The forms are the junction: every other world has a grey door into them,
// and they have a door out to each.
const DOORS: Record<WorldId, WorldId[]> = {
  island: ["cave", "forms"],
  cave: ["island", "stockroom", "forms"],
  stockroom: ["cave", "forms"],
  forms: ["island", "cave", "stockroom"],
};

// The world you'd have come from when starting somewhere via ?world=.
const DEFAULT_ORIGIN: Record<WorldId, WorldId | null> = {
  island: null,
  cave: "island",
  stockroom: "cave",
  forms: "island",
};

// Worlds whose assets load lazily, the first time they're needed. The fade
// holds on its color until the destination reports it's ready.
const notReady = new Set<WorldId>(["forms"]);
const READY_POLL_MS = 100;

export function markWorldReady(world: WorldId) {
  notReady.delete(world);
}

export function isWorldReady(world: WorldId) {
  return !notReady.has(world);
}

interface Snapshot {
  world: WorldId;
  // Where the current transition is heading (equals `world` when idle).
  destination: WorldId;
  phase: TransitionPhase;
  // The world the player last came from, or null before the first trip: the
  // island's first spawn is the opening view, later arrivals put the player
  // in front of the door they came through.
  cameFrom: WorldId | null;
  // Destination of the door the player is at and looking at, if any.
  nearDoor: WorldId | null;
  // Which trigger set nearDoor. Two doors can lead to the same world (the
  // island's and the stockroom's both go to the cave), so a trigger may only
  // clear the state it set itself.
  nearDoorOwner: string | null;
}

const start = initialWorld();
let snapshot: Snapshot = {
  world: start,
  destination: start,
  phase: "idle",
  cameFrom: DEFAULT_ORIGIN[start],
  nearDoor: null,
  nearDoorOwner: null,
};

const listeners = new Set<() => void>();

function update(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

// ?world=cave, ?world=stockroom or ?world=forms starts there (screenshots and debugging).
function initialWorld(): WorldId {
  if (typeof window === "undefined") return "island";
  const w = new URLSearchParams(window.location.search).get("world");
  return (WORLD_IDS as readonly string[]).includes(w ?? "")
    ? (w as WorldId)
    : "island";
}

// Go through a door. Without an argument, uses the door the player is at, or
// (for the debug hook) the current world's first door.
export function travel(to?: WorldId) {
  if (snapshot.phase !== "idle") return;
  const from = snapshot.world;
  const destination = to ?? snapshot.nearDoor ?? DOORS[from][0];
  if (destination === from || !DOORS[from].includes(destination)) return;
  update({ phase: "out", destination, nearDoor: null, nearDoorOwner: null });
  const arrive = () => {
    if (!isWorldReady(destination)) {
      window.setTimeout(arrive, READY_POLL_MS);
      return;
    }
    update({ world: destination, phase: "in", cameFrom: from });
    window.setTimeout(() => update({ phase: "idle" }), FADE_IN_MS);
  };
  window.setTimeout(arrive, FADE_OUT_MS);
}

// Each DoorTrigger reports for its own door (identified by `owner`), so doors
// in other worlds, or other doors leading to the same place, never clear it.
export function setNearDoor(owner: string, door: WorldId, near: boolean) {
  if (near) {
    if (snapshot.nearDoorOwner !== owner || snapshot.nearDoor !== door) {
      update({ nearDoor: door, nearDoorOwner: owner });
    }
  } else if (snapshot.nearDoorOwner === owner) {
    update({ nearDoor: null, nearDoorOwner: null });
  }
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
