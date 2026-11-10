// Shared plumbing for the small QA scripts. Kept deliberately thin: launch a
// CPU-rendered browser, open one world with post/FX frozen, and return its
// state + level data. No video, no image comparison, no persistent browser.

import { chromium } from "playwright";

export function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export const BASE_URL = arg("url", "http://localhost:3000");

// Software WebGL keeps the discrete GPU out of the loop; 640x360 + frozen
// animations keeps each smoke run to a few seconds.
export async function launchQa(width = 640, height = 360) {
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });
}

export async function openWorld(page, world, timeout = 30000) {
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message ?? e}`));

  const url = `${BASE_URL}/?qa=1&world=${encodeURIComponent(world)}&nopost=1&freeze=1`;
  await page.goto(url, { waitUntil: "load", timeout });
  await page.waitForFunction(
    () =>
      typeof window.render_game_to_text === "function" &&
      typeof window.qa_level === "function",
    null,
    { timeout },
  );
  await page.waitForFunction(
    (w) => {
      try {
        const s = JSON.parse(window.render_game_to_text());
        return s.world === w && s.ready === true && s.transition === "idle";
      } catch {
        return false;
      }
    },
    world,
    { timeout, polling: 100 },
  );

  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const level = JSON.parse(await page.evaluate(() => window.qa_level()));
  return { url, state, level, problems };
}

export function pass(message) {
  console.log(`  ok  ${message}`);
}

export function fail(message) {
  console.log(`  FAIL ${message}`);
  process.exitCode = 1;
}
