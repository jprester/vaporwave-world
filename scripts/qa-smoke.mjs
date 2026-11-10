// Tier 1 QA: open one world, wait for it to be ready, and assert the player
// is standing on its floor with no page errors. One 640x360 frame is written
// for the case where a human wants to look, but it is not returned to the
// agent as an image on success.
//
//   npm run smoke -- --world motel
//   npm run smoke -- --world motel --no-shot
//
// Requires the dev server (`npm run dev`). Runs on SwiftShader/CPU; do not
// call it on every keystroke, call it after a change.

import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { arg, fail, hasFlag, launchQa, openWorld, pass } from "./qa-lib.mjs";

const world = arg("world", "motel");
const out = arg("out", `screenshots/qa-smoke-${world}.png`);
const noShot = hasFlag("no-shot");
const started = Date.now();

const browser = await launchQa(640, 360);
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 360 },
    deviceScaleFactor: 1,
  });
  const { state, level, problems } = await openWorld(page, world);

  const feet = level.spawn.y ?? level.floorY;
  const expectedEye = feet + 1.7;
  const eyeError = Math.abs(state.player.y - expectedEye);

  if (eyeError <= 0.75) {
    pass(`${world} spawn on floor (eye ${state.player.y.toFixed(2)}, expected ${expectedEye.toFixed(2)})`);
  } else {
    fail(`${world} spawn eye ${state.player.y.toFixed(2)}, expected ${expectedEye.toFixed(2)}`);
  }

  if (state.player.grounded) pass("player grounded at spawn");
  else fail("player is not grounded at spawn");

  if (state.nearDoor === null) pass("no door prompt at spawn");
  else fail(`unexpected door prompt at spawn: ${state.nearDoor}`);

  if (state.transition === "idle" && state.ready) pass("world ready and idle");
  else fail(`world not ready/idle (${state.transition}, ready=${state.ready})`);

  if (problems.length === 0) pass("no page or console errors");
  else {
    fail(`${problems.length} page/console error(s)`);
    for (const p of problems.slice(0, 4)) console.log(`        ${p}`);
  }

  if (!noShot) {
    await mkdir(dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    console.log(`  shot ${out}`);
  }

  const ms = Date.now() - started;
  console.log(
    `QA smoke ${process.exitCode ? "FAIL" : "PASS"} ${world} (${ms} ms)`,
  );
} finally {
  await browser.close();
}
