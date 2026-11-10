// Tier 0 QA: pure geometry invariants over the level data. No browser, no
// WebGL, no screenshots. This catches the mistakes that are cheap to make
// when adding a world (a door with no way back, an arrival pointing the wrong
// way, a spawn inside a wall, a ramp that does not meet its floor) before
// anything renders.
//
// Run via `npm run check` (which also typechecks). The loader bundles this
// file with esbuild so Node can import the TypeScript level data directly.

import { LAYERS, LAYER_ORDER, MIN_LAYER_GAP, depthContractIsValid } from "../src/components/kit/depth";
import { LEVELS, patchHeight, type Level, type SpawnPoint } from "../src/components/levels";
import { WORLD_IDS, type WorldId } from "../src/components/worldStore";

// The script runs in Node; keep it typecheckable without adding @types/node.
declare const process: { exitCode?: number };

const failures: string[] = [];
const passes: string[] = [];

function pass(msg: string) {
  passes.push(msg);
}

function fail(msg: string) {
  failures.push(msg);
}

function check(condition: boolean, ok: string, bad: string) {
  if (condition) pass(ok);
  else fail(bad);
}

const n = (v: number) => Number(v.toFixed(2));
const near = (a: number, b: number, eps = 0.051) => Math.abs(a - b) <= eps;

// The facade attachments must never share a depth. This is the cheap guard
// against the window/stair/office class of z-fighting.
check(depthContractIsValid(), "depth contract is strictly ordered", "depth contract has a gap below the minimum");
for (let i = 1; i < LAYER_ORDER.length; i++) {
  const prev = LAYERS[LAYER_ORDER[i - 1]];
  const next = LAYERS[LAYER_ORDER[i]];
  check(
    next - prev >= MIN_LAYER_GAP,
    `depth ${LAYER_ORDER[i - 1]} → ${LAYER_ORDER[i]}: ${n(next - prev)} m`,
    `depth gap ${LAYER_ORDER[i - 1]} → ${LAYER_ORDER[i]} is ${n(next - prev)} m (need ${MIN_LAYER_GAP})`,
  );
}

function floorAt(level: Level, x: number, z: number, feetY: number) {
  let y = level.floorY;
  for (const p of level.floors ?? []) {
    if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
    const h = patchHeight(p, x, z);
    if (h > y && h <= feetY + 0.6) y = h;
  }
  return y;
}

function inFootprint(
  box: { cx: number; cz: number; w: number; d: number },
  x: number,
  z: number,
  pad = 0,
) {
  return (
    Math.abs(x - box.cx) <= box.w / 2 + pad &&
    Math.abs(z - box.cz) <= box.d / 2 + pad
  );
}

function inBounds(level: Level, p: { x: number; z: number }, pad = 0) {
  return (
    p.x >= level.bounds.minX + pad &&
    p.x <= level.bounds.maxX - pad &&
    p.z >= level.bounds.minZ + pad &&
    p.z <= level.bounds.maxZ - pad
  );
}

function expectedArrival(from: WorldId, to: WorldId) {
  // The arrival is in `to`, so the door that matters is `to`'s own door back
  // to `from` (the one the player physically steps out of), not `from`'s.
  const door = LEVELS[to].doors.find((d) => d.to === from);
  return door ?? null;
}

const worlds = WORLD_IDS.filter((w) => w in LEVELS);
check(
  worlds.length === WORLD_IDS.length,
  `${worlds.length}/${WORLD_IDS.length} worlds have a level`,
  `missing levels: ${WORLD_IDS.filter((w) => !(w in LEVELS)).join(", ")}`,
);

let doorCount = 0;
let arrivalCount = 0;
let colliderCount = 0;
let floorCount = 0;

for (const world of WORLD_IDS) {
  const level = LEVELS[world];
  if (!level) continue;

  doorCount += level.doors.length;
  arrivalCount += Object.keys(level.arrivals).length;
  colliderCount += level.colliders.length;
  floorCount += level.floors?.length ?? 0;

  // Spawn and arrivals are walkable points inside the world.
  const points: Array<[string, SpawnPoint]> = [
    ["spawn", level.spawn],
    ...Object.entries(level.arrivals).map(
      ([from, p]) => [`arrival from ${from}`, p] as [string, SpawnPoint],
    ),
  ];
  for (const [label, p] of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.yaw)) {
      fail(`${world}: ${label} has a non-finite coordinate`);
      continue;
    }
    check(
      inBounds(level, p, 1.2),
      `${world}: ${label} inside bounds`,
      `${world}: ${label} at (${n(p.x)}, ${n(p.z)}) is outside the walkable bounds`,
    );
    const bad = level.colliders.find(
      (c) => inFootprint(c, p.x, p.z, 1.0),
    );
    if (bad) {
      fail(
        `${world}: ${label} inside collider at (${n(bad.cx)}, ${n(bad.cz)})`,
      );
    }
    const feet = p.y ?? level.floorY;
    const floor = floorAt(level, p.x, p.z, feet);
    if (!near(feet, floor, 0.061)) {
      fail(
        `${world}: ${label} feet y=${n(feet)} but floor is ${n(floor)}`,
      );
    }
  }

  // Doors: valid target, unit normal, reciprocal route, sane floor.
  for (const d of level.doors) {
    if (d.to === world) fail(`${world}: door leads to itself`);
    if (!WORLD_IDS.includes(d.to)) fail(`${world}: door leads to unknown world ${d.to}`);
    const len = Math.hypot(d.normal[0], d.normal[1]);
    if (!near(len, 1, 0.001)) fail(`${world}: door to ${d.to} normal is not unit length`);
    if (!inBounds(level, d, -0.5)) {
      fail(`${world}: door to ${d.to} at (${n(d.x)}, ${n(d.z)}) is outside bounds`);
    }
    const back = LEVELS[d.to]?.doors.some((b) => b.to === world);
    if (!back) fail(`${world} -> ${d.to}: no door back`);

    const feet = d.y ?? level.floorY;
    const floor = floorAt(level, d.x, d.z, feet);
    if (!near(feet, floor, 0.061)) {
      fail(`${world}: door to ${d.to} y=${n(feet)} but floor is ${n(floor)}`);
    }
  }

  // Every listed arrival must actually be 3.5 m straight out of the door the
  // player came through, facing away. This is the part that goes stale when a
  // door moves and is easy to miss in a screenshot.
  for (const [fromKey, arrival] of Object.entries(level.arrivals)) {
    const from = fromKey as WorldId;
    const d = expectedArrival(from, world);
    if (!d) {
      fail(`${world}: arrival from ${from}, but ${from} has no door to ${world}`);
      continue;
    }
    const dx = arrival.x - d.x;
    const dz = arrival.z - d.z;
    const out = dx * d.normal[0] + dz * d.normal[1];
    const side = Math.abs(dx * -d.normal[1] + dz * d.normal[0]);
    const yaw = Math.atan2(-d.normal[0] + 0, -d.normal[1]);
    check(
      out >= 2.5 &&
        out <= 4.5 &&
        side <= 0.01 &&
        near(arrival.yaw, yaw, 0.6) &&
        (d.y === undefined ? arrival.y === undefined : near(arrival.y ?? NaN, d.y)),
      `${world}: arrival from ${from} matches its door`,
      `${world}: arrival from ${from} is ${n(out)} m out / ${n(side)} m sideways / yaw ${n(
        arrival.yaw,
      )}; expected 2.5-4.5 m straight out, yaw ${n(yaw)}`,
    );
  }

  // Floor patches are well formed and inside the world.
  for (const [i, p] of (level.floors ?? []).entries()) {
    if (!(p.x1 > p.x0) || !(p.z1 > p.z0)) {
      fail(`${world}: floor patch ${i} has an empty footprint`);
      continue;
    }
    if (p.x0 < level.bounds.minX || p.x1 > level.bounds.maxX) {
      fail(`${world}: floor patch ${i} sticks out past the x bounds`);
    }
    if (p.z0 < level.bounds.minZ || p.z1 > level.bounds.maxZ) {
      fail(`${world}: floor patch ${i} sticks out past the z bounds`);
    }
    if (p.y2 !== undefined) {
      if (!p.axis) fail(`${world}: ramp patch ${i} has no axis`);
      const a = patchHeight(p, p.x0 + 0.01, p.z0 + 0.01);
      const b = patchHeight(p, p.x1 - 0.01, p.z1 - 0.01);
      if (!near(a, p.y, 0.02)) fail(`${world}: ramp ${i} does not start at y=${n(p.y)}`);
      if (!near(b, p.y2, 0.02)) fail(`${world}: ramp ${i} does not end at y=${n(p.y2)}`);
      if (Math.abs(p.y2 - p.y) > 0.6 * Math.hypot(p.x1 - p.x0, p.z1 - p.z0)) {
        fail(`${world}: ramp ${i} is steeper than a walkable slope`);
      }
    }
  }

  // Colliders are finite and positive. They may sit outside the walkable
  // bounds (a building the player can never enter), so only the dimensions
  // and centre are checked.
  for (const [i, c] of level.colliders.entries()) {
    if (![c.cx, c.cz, c.w, c.d].every(Number.isFinite) || c.w <= 0 || c.d <= 0) {
      fail(`${world}: collider ${i} is not a positive finite box`);
    }
    if (c.y0 !== undefined && c.y1 !== undefined && c.y1 <= c.y0) {
      fail(`${world}: collider ${i} has y1 <= y0`);
    }
  }
}

// Every world must be reachable from every other through the door graph.
const graph = new Map<WorldId, WorldId[]>();
for (const w of WORLD_IDS) graph.set(w, LEVELS[w]?.doors.map((d) => d.to) ?? []);
const seen = new Set<WorldId>(["island"]);
const queue: WorldId[] = ["island"];
while (queue.length) {
  for (const next of graph.get(queue.shift()!) ?? []) {
    if (!seen.has(next)) {
      seen.add(next);
      queue.push(next);
    }
  }
}
check(
  seen.size === WORLD_IDS.length,
  `all ${WORLD_IDS.length} worlds connected`,
  `unreachable from island: ${WORLD_IDS.filter((w) => !seen.has(w)).join(", ")}`,
);

const summary = `${worlds.length} worlds, ${doorCount} doors, ${arrivalCount} arrivals, ${colliderCount} colliders, ${floorCount} floor patches`;
if (failures.length === 0) {
  console.log(`QA geometry: PASS (${summary})`);
  for (const p of passes.slice(0, 6)) console.log(`  ok  ${p}`);
  if (passes.length > 6) console.log(`  ok  ... ${passes.length - 6} more`);
} else {
  console.log(`QA geometry: FAIL (${summary})`);
  for (const f of failures) console.log(`  FAIL ${f}`);
  for (const p of passes.slice(0, 3)) console.log(`  ok  ${p}`);
  process.exitCode = 1;
}
