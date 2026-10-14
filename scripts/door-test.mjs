// Door test: walks every door the way a player uses it.
//
// For every world W and every route into W (each world O with a door to W),
// it loads ?world=O, goes through O's door to W, and then, in W, tries each
// of W's doors in turn: stand in front of it, face it, pump frames and check
// that nearDoor names the door's destination on every frame, then travel()
// with no argument (as Click / Enter does) and check the arrival: the right
// world, standing in front of the door back to W, facing away from it. Then
// it comes back through that door (checked the same way) and moves on to W's
// next door.
//
// The doors come from the level data (window.qa_doors, see Level.doors in
// src/components/levels.ts); the check is that the scene's real triggers
// answer where the level says the doors are. A door with a floor height
// (the mall's upstairs door) is approached on that floor, and an arrival in
// front of one must be standing on it.
//
// Usage:
//   npm run dev
//   CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//     node scripts/door-test.mjs [--url http://localhost:3000] [--only mall]
//
// Exits non-zero if any check fails.

import { chromium } from "playwright";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const base = arg("url", "http://localhost:3000");
const only = arg("only", null);
const STAND_OUT = 2.6; // metres in front of the door face
const FRAMES = 6; // frames to watch nearDoor for
const EYE_HEIGHT = 1.7;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

let failures = 0;
let checks = 0;
function check(ok, message) {
  checks++;
  if (ok) {
    console.log(`  ok   ${message}`);
  } else {
    failures++;
    console.log(`  FAIL ${message}`);
  }
}

async function state(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

async function doors(page) {
  return JSON.parse(await page.evaluate(() => window.qa_doors()));
}

async function frames(page, n) {
  for (let i = 0; i < n; i++) await page.evaluate(() => window.advanceTime(16));
}

// Stand in front of `door`, face it, and check nearDoor on every frame.
async function approach(page, door, label) {
  const [nx, nz] = door.normal;
  await page.evaluate(
    ([x, z, y]) => window.setPlayerPosition(x, z, y ?? undefined),
    [door.x + nx * STAND_OUT, door.z + nz * STAND_OUT, door.y ?? null],
  );
  // Facing the door is looking along -normal: yaw = atan2(nx, nz).
  await page.evaluate(([y]) => window.setCameraOrientation(y, 0.05), [
    Math.atan2(nx, nz),
  ]);
  await frames(page, 2);
  const seen = [];
  for (let i = 0; i < FRAMES; i++) {
    await frames(page, 1);
    seen.push((await state(page)).nearDoor);
  }
  check(
    seen.every((d) => d === door.to),
    `${label}: at the door to ${door.to}, nearDoor on ${FRAMES} frames = ${JSON.stringify(seen)}`,
  );
}

// travel() with no argument, then wait for the fade to finish.
async function goThrough(page) {
  await page.evaluate(() => window.travel());
  await page.waitForFunction(
    () => {
      const s = JSON.parse(window.render_game_to_text());
      return s.transition === "idle";
    },
    null,
    { timeout: 60000, polling: 200 },
  );
  // Let the arrival settle (the respawn runs in an effect).
  await frames(page, 3);
}

// After arriving from `from`, check we're in `to`, in front of its door back
// to `from`, facing away from it.
async function checkArrival(page, from, to, label) {
  const s = await state(page);
  check(s.world === to, `${label}: arrived in ${to} (got ${s.world})`);
  if (s.world !== to) return null;
  const back = (await doors(page)).find((d) => d.to === from);
  check(Boolean(back), `${label}: ${to} has a door back to ${from}`);
  if (!back) return null;
  const [nx, nz] = back.normal;
  const dx = s.player.x - back.x;
  const dz = s.player.z - back.z;
  const out = dx * nx + dz * nz;
  const side = Math.abs(dx * -nz + dz * nx);
  check(
    out > 1.5 && out < 4.3 && side < 1.8,
    `${label}: standing in front of the door back to ${from} (out ${out.toFixed(2)} m, side ${side.toFixed(2)} m)`,
  );
  if (back.y !== undefined) {
    const feet = s.player.y - EYE_HEIGHT;
    check(
      Math.abs(feet - back.y) < 0.3,
      `${label}: on that door's floor (feet at ${feet.toFixed(2)} m, door at ${back.y} m)`,
    );
  }
  // Facing direction for a yaw: (-sin yaw, -cos yaw).
  const fx = -Math.sin(s.player.yaw);
  const fz = -Math.cos(s.player.yaw);
  const away = fx * nx + fz * nz;
  check(away > 0.5, `${label}: facing away from that door (dot ${away.toFixed(2)})`);
  check(s.nearDoor === null, `${label}: no door prompt on arrival (nearDoor ${s.nearDoor})`);
  return s;
}

const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
const problems = [];
page.on("pageerror", (e) => problems.push(e.message ?? String(e)));

async function load(world) {
  await page.goto(`${base}/?qa=1&world=${world}`, { waitUntil: "load" });
  // Wait for the world itself, not just the scene: a lazily loaded world
  // (the mall) mounts its doors a moment later.
  await page.waitForFunction(
    () =>
      typeof window.qa_doors === "function" &&
      typeof window.setPlayerPosition === "function" &&
      JSON.parse(window.render_game_to_text()).ready,
    null,
    { timeout: 60000, polling: 200 },
  );
  await frames(page, 3);
}

try {
  // Discover the graph from the level data, starting at the island.
  const graph = {};
  const queue = ["island"];
  while (queue.length) {
    const w = queue.shift();
    if (graph[w]) continue;
    await load(w);
    graph[w] = await doors(page);
    for (const d of graph[w]) if (!graph[d.to]) queue.push(d.to);
  }
  console.log(
    "Doors:",
    Object.entries(graph)
      .map(([w, ds]) => `${w} → ${ds.map((d) => d.to).join(", ")}`)
      .join(" | "),
  );

  for (const [world, worldDoors] of Object.entries(graph)) {
    if (only && world !== only) continue;
    const origins = Object.keys(graph).filter((o) =>
      graph[o].some((d) => d.to === world),
    );
    check(origins.length > 0, `${world} is reachable from some world`);
    for (const origin of origins) {
      const route = `${origin} → ${world}`;
      console.log(`\n${route}`);
      await load(origin);
      const entry = graph[origin].find((d) => d.to === world);
      await approach(page, entry, `${origin}`);
      await goThrough(page);
      if (!(await checkArrival(page, origin, world, route))) continue;

      for (const door of worldDoors) {
        const label = `${world} (via ${origin})`;
        await approach(page, door, label);
        await goThrough(page);
        const there = `${world} → ${door.to}`;
        if (!(await checkArrival(page, world, door.to, there))) break;
        // And back again through the door we arrived by.
        const back = (await doors(page)).find((d) => d.to === world);
        await approach(page, back, door.to);
        await goThrough(page);
        if (!(await checkArrival(page, door.to, world, `${door.to} → ${world}`)))
          break;
      }
    }
  }
} finally {
  await browser.close();
}

const passed = checks - failures;
if (problems.length) {
  failures += problems.length;
  console.log(`\n${problems.length} page error(s):`);
  for (const p of problems) console.log("  -", p);
}
console.log(`\n${passed}/${checks} checks passed, ${problems.length} page error(s)`);
process.exit(failures ? 1 : 0);
