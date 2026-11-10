// Tier 2 QA: stand on every floor patch (including the motel stair and
// balcony), at every arrival, then walk into a wall and into the world bounds.
// It teleports rather than simulating a full playthrough, so it stays under
// ~10 s per world while still exercising the floor and collision code.
//
//   npm run walk -- --world motel
//
// Requires the dev server. Run in CI or on demand, not on every edit.

import { arg, fail, launchQa, openWorld, pass } from "./qa-lib.mjs";

const world = arg("world", "motel");
const started = Date.now();

function floorAt(level, x, z, feet) {
  let y = level.floorY;
  for (const p of level.floors ?? []) {
    if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
    const t =
      p.y2 === undefined
        ? 0
        : p.axis === "x"
          ? (x - p.x0) / (p.x1 - p.x0)
          : (z - p.z0) / (p.z1 - p.z0);
    const h = p.y2 === undefined ? p.y : p.y + (p.y2 - p.y) * Math.min(1, Math.max(0, t));
    if (h > y && h <= feet + 0.6) y = h;
  }
  return y;
}

function inBox(c, x, z, pad = 0) {
  return Math.abs(x - c.cx) <= c.w / 2 + pad && Math.abs(z - c.cz) <= c.d / 2 + pad;
}

function inBounds(level, x, z, pad = 1.2) {
  return (
    x >= level.bounds.minX + pad &&
    x <= level.bounds.maxX - pad &&
    z >= level.bounds.minZ + pad &&
    z <= level.bounds.maxZ - pad
  );
}

const browser = await launchQa(640, 360);
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 360 },
    deviceScaleFactor: 1,
  });
  const { state, level, problems } = await openWorld(page, world);

  if (state.world === world && state.ready) pass(`${world} loaded`);
  else fail(`${world} did not load`);

  if (problems.length === 0) pass("no page or console errors");
  else fail(`${problems.length} page/console error(s): ${problems[0]}`);

  async function probe(x, z, feet, label) {
    await page.evaluate(
      ([px, pz, py]) => window.setPlayerPosition?.(px, pz, py),
      [x, z, feet],
    );
    await page.evaluate(() => window.advanceTime?.(16));
    await page.evaluate(() => window.advanceTime?.(16));
    await page.waitForTimeout(60);
    const s = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    const floor = floorAt(level, x, z, feet);
    const expected = floor + 1.7;
    const error = Math.abs(s.player.y - expected);
    if (error <= 0.1 && s.player.grounded) {
      pass(`${label} (floor ${floor.toFixed(2)})`);
    } else {
      fail(
        `${label}: eye ${s.player.y.toFixed(2)}, expected ${expected.toFixed(2)} (floor ${floor.toFixed(2)}, grounded=${s.player.grounded})`,
      );
    }
  }

  // Every floor patch, sampled at its centre and along a ramp.
  for (const [i, p] of (level.floors ?? []).entries()) {
    const cx = (p.x0 + p.x1) / 2;
    const cz = (p.z0 + p.z1) / 2;
    const samples =
      p.y2 === undefined
        ? [[cx, cz]]
        : [0.2, 0.5, 0.8].map((t) =>
            p.axis === "x"
              ? [p.x0 + (p.x1 - p.x0) * t, cz]
              : [cx, p.z0 + (p.z1 - p.z0) * t],
          );
    for (const [x, z] of samples) {
      const t =
        p.y2 === undefined
          ? 0
          : p.axis === "x"
            ? (x - p.x0) / (p.x1 - p.x0)
            : (z - p.z0) / (p.z1 - p.z0);
      const h =
        p.y2 === undefined ? p.y : p.y + (p.y2 - p.y) * Math.min(1, Math.max(0, t));
      await probe(x, z, h, `floor ${i}${p.y2 === undefined ? "" : " ramp"}`);
    }
  }

  // Every arrival, from the same data the transition uses.
  for (const [from, a] of Object.entries(level.arrivals)) {
    await probe(a.x, a.z, a.y ?? level.floorY, `arrival from ${from}`);
  }

  // Advance a fixed number of frames while a key is held. Wall-clock waits
  // are frame-rate dependent on SwiftShader (the mall can run at ~1 fps), so
  // a 800 ms hold would be one or two frames and look like a collision.
  async function hold(key, frames) {
    await page.keyboard.down(key);
    for (let i = 0; i < frames; i++) {
      await page.evaluate(() => window.advanceTime?.(16));
    }
    await page.keyboard.up(key);
    await page.evaluate(() => window.advanceTime?.(16));
  }

  // One short walk from spawn: movement, ground tracking and bounds.
  const spawnY = level.spawn.y ?? level.floorY;
  await page.evaluate(
    ([x, z, y, yaw]) => {
      window.setPlayerPosition?.(x, z, y);
      window.setCameraOrientation?.(yaw, 0);
    },
    [level.spawn.x, level.spawn.z, spawnY, level.spawn.yaw],
  );
  await page.waitForTimeout(80);
  const before = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  await hold("w", 8);
  const after = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const moved = Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z);
  if (moved >= 0.25) pass(`spawn walk moved ${moved.toFixed(2)} m`);
  else fail(`spawn walk only moved ${moved.toFixed(2)} m`);
  if (after.player.grounded) pass("still grounded after spawn walk");
  else fail("left the ground after spawn walk");

  // Walk at the +x bound and check the clamp.
  await page.evaluate(
    ([x, z, y]) => {
      window.setPlayerPosition?.(x, z, y);
      window.setCameraOrientation?.(-Math.PI / 2, 0);
    },
    [level.bounds.maxX - 2, (level.bounds.minZ + level.bounds.maxZ) / 2, spawnY],
  );
  await page.waitForTimeout(60);
  await hold("w", 8);
  const edge = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  if (edge.player.x <= level.bounds.maxX - 0.05) {
    pass(`stayed inside +x bound at x=${edge.player.x.toFixed(2)}`);
  } else {
    fail(`walked past the +x bound: x=${edge.player.x.toFixed(2)} (max ${level.bounds.maxX})`);
  }

  // Walk into the biggest ground-level collider and check we are stopped
  // outside it. This is the "solid room" check that a door test cannot do.
  const candidates = level.colliders
    .filter(
      (c) =>
        (c.y0 ?? -Infinity) <= 0.5 &&
        (c.y1 ?? Infinity) >= 1.7 &&
        c.w > 1 &&
        c.d > 1,
    )
    .sort((a, b) => b.w * b.d - a.w * a.d);
  let collisionDone = false;
  for (const c of candidates.slice(0, 4)) {
    const x = c.cx;
    const z = c.cz + c.d / 2 + 4;
    if (!inBounds(level, x, z) || level.colliders.some((o) => o !== c && inBox(o, x, z, 1.0))) {
      continue;
    }
    await page.evaluate(
      ([px, pz, py]) => {
        window.setPlayerPosition?.(px, pz, py);
        window.setCameraOrientation?.(0, 0);
      },
      [x, z, spawnY],
    );
    await page.waitForTimeout(60);
    await hold("w", 12);
    const s = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    const inside = inBox(c, s.player.x, s.player.z, 1.0);
    if (inside) {
      fail(
        `walked into collider at (${c.cx.toFixed(1)}, ${c.cz.toFixed(1)}): player (${s.player.x.toFixed(2)}, ${s.player.z.toFixed(2)})`,
      );
    } else {
      pass(`stopped outside collider (${c.w.toFixed(1)}x${c.d.toFixed(1)})`);
    }
    collisionDone = true;
    break;
  }
  if (!collisionDone) pass("no ground-level collider to walk into");

  const ms = Date.now() - started;
  console.log(`QA walk ${process.exitCode ? "FAIL" : "PASS"} ${world} (${ms} ms)`);
} finally {
  await browser.close();
}
