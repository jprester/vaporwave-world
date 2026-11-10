// Flicker / z-fighting detector for the R3F scene.
//
// Stands at a viewpoint, takes a few screenshots while nudging the camera by a
// few millimetres, and diffs them. Static geometry cancels out; anything that
// crawls or fights for depth (z-fighting, shimmering textures, aliasing edges)
// lights up as a red cluster in the heatmap.
//
// Usage:
//   npm run dev
//   node scripts/qa-flicker.mjs --preset stair
//   node scripts/qa-flicker.mjs --all
//   node scripts/qa-flicker.mjs --x 16 --z -8 --yaw -1.15 --pitch 0.12
//
// Flags:
//   --url <url>        default http://localhost:3000/?qa=1
//   --world <id>       appended to the URL (e.g. motel); presets default to motel
//   --preset <name>    stair | office | balcony | gate | pool | facade | roomfront
//   --all              run every preset and print a summary
//   --x --z --y        stand here (y = feet height, optional)
//   --yaw --pitch      camera orientation
//   --frames <n>       screenshots per viewpoint, default 4
//   --step <m>         camera nudge per frame, default 0.002
//   --yaw-step <rad>   extra yaw nudge per frame, default 0.0002
//   --threshold <n>    per-channel delta counted as changed, default 12
//   --out <dir>        heatmap directory, default screenshots
//   --fail <ratio>     exit non-zero if changed pixels exceed this ratio (0–1)
//   --keep             also save the base frame for each viewpoint
//
// The heatmap keeps the base frame dimmed and paints changed pixels red, so a
// quick glance tells you whether the diff is a broad animated surface (water,
// neon) or a tight geometric seam.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const PRESETS = {
  stair: { x: 15.5, z: -8, yaw: -1.15, pitch: 0.12 },
  office: { x: -14.8, z: -10.2, yaw: 0.05, pitch: 0.18 },
  balcony: { x: -14, z: -2, yaw: 0, pitch: 0.3 },
  gate: { x: 16.5, z: 6, yaw: -1.5708, pitch: 0.08 },
  pool: { x: -3, z: 12, yaw: 0, pitch: 0.12 },
  facade: { x: -13, z: 15, yaw: -0.38, pitch: 0.07 },
  roomfront: { x: 4, z: 9, yaw: 0, pitch: 0.16 },
};

const baseUrl = arg("url", "http://localhost:3000/?qa=1");
const presetName = arg("preset", null);
const all = flag("all");
// Presets and the motel hot spots are the common case; pass --world for
// another world.
const world = arg("world", "motel");
const width = Number(arg("width", "1280"));
const height = Number(arg("height", "720"));
const frameCount = Math.max(2, Number(arg("frames", "4")));
const step = Number(arg("step", "0.002"));
const yawStep = Number(arg("yaw-step", "0.0002"));
const threshold = Number(arg("threshold", "12"));
const outDir = arg("out", "screenshots");
const failRatio = arg("fail", null) !== null ? Number(arg("fail")) : null;
const keep = flag("keep");

let views;
if (all) {
  views = Object.entries(PRESETS).map(([name, p]) => ({ name, ...p }));
} else if (presetName) {
  if (!PRESETS[presetName]) {
    console.error(`Unknown preset "${presetName}". Choose: ${Object.keys(PRESETS).join(", ")}`);
    process.exit(2);
  }
  views = [{ name: presetName, ...PRESETS[presetName] }];
} else {
  const x = Number(arg("x"));
  const z = Number(arg("z"));
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    console.error("Pass --preset <name>, --all, or --x and --z.");
    process.exit(2);
  }
  views = [
    {
      name: arg("name", "view"),
      x,
      z,
      y: arg("y", null) !== null ? Number(arg("y")) : undefined,
      yaw: Number(arg("yaw", "0")),
      pitch: Number(arg("pitch", "0.05")),
    },
  ];
}

function urlForWorld() {
  if (!world) {
    const u = new URL(baseUrl);
    u.searchParams.set("nopost", "1");
    u.searchParams.set("freeze", "1");
    return u.toString();
  }
  const u = new URL(baseUrl);
  if (!u.searchParams.has("world")) u.searchParams.set("world", world);
  // Disable post-processing (film grain changes every pixel) and freeze
  // water/palms/neon so only geometry can differ.
  u.searchParams.set("nopost", "1");
  u.searchParams.set("freeze", "1");
  return u.toString();
}

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

const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});

const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

// Decode the PNGs in the page (no extra Node image dependency) and produce a
// dimmed base frame with changed pixels painted red.
async function diffFrames(frames) {
  return page.evaluate(
    async ({ frames, threshold }) => {
      async function load(b64) {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        return { img, data: ctx.getImageData(0, 0, c.width, c.height) };
      }

      const base = await load(frames[0]);
      const w = base.img.width;
      const h = base.img.height;
      const results = [];

      for (let f = 1; f < frames.length; f++) {
        const other = await load(frames[f]);
        const A = base.data.data;
        const B = other.data.data;
        const heat = document.createElement("canvas");
        heat.width = w;
        heat.height = h;
        const hctx = heat.getContext("2d");
        const out = hctx.createImageData(w, h);
        let changed = 0;
        let sum = 0;
        let max = 0;
        const mask = new Uint8Array(w * h);
        let x0 = w;
        let y0 = h;
        let x1 = -1;
        let y1 = -1;

        for (let i = 0; i < A.length; i += 4) {
          const dr = Math.abs(A[i] - B[i]);
          const dg = Math.abs(A[i + 1] - B[i + 1]);
          const db = Math.abs(A[i + 2] - B[i + 2]);
          const d = Math.max(dr, dg, db);
          if (d > max) max = d;
          const o = i;
          if (d > threshold) {
            changed++;
            mask[i / 4] = 1;
            sum += d;
            const p = i / 4;
            const x = p % w;
            const y = (p / w) | 0;
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
            if (x > x1) x1 = x;
            if (y > y1) y1 = y;
            out.data[o] = 255;
            out.data[o + 1] = 48;
            out.data[o + 2] = 32;
            out.data[o + 3] = 255;
          } else {
            // Dim the original so the red diff reads clearly.
            out.data[o] = A[o] * 0.45;
            out.data[o + 1] = A[o + 1] * 0.45;
            out.data[o + 2] = A[o + 2] * 0.45;
            out.data[o + 3] = 255;
          }
        }
        // Erode one pixel: a normal parallax edge is 1 px wide and vanishes,
        // while a z-fighting patch / shimmering surface survives as a solid
        // region. Paint surviving pixels bright red, plain edges dim orange.
        const solid = new Uint8Array(w * h);
        let solidCount = 0;
        for (let p = 0; p < mask.length; p++) {
          if (!mask[p]) continue;
          const px = p % w;
          const py = (p / w) | 0;
          if (
            px > 0 && mask[p - 1] &&
            px < w - 1 && mask[p + 1] &&
            py > 0 && mask[p - w] &&
            py < h - 1 && mask[p + w]
          ) {
            solid[p] = 1;
            solidCount++;
            const o = p * 4;
            out.data[o] = 255;
            out.data[o + 1] = 30;
            out.data[o + 2] = 20;
          }
        }

        hctx.putImageData(out, 0, 0);

        // Largest 4-connected blob: a z-fighting seam is one solid cluster,
        // while ordinary parallax shows up as thousands of 1 px edge specks.
        let largest = 0;
        let largestBbox = null;
        const seen = new Uint8Array(w * h);
        const stack = [];
        for (let p = 0; p < solid.length; p++) {
          if (!solid[p] || seen[p]) continue;
          let area = 0;
          let ax0 = w;
          let ay0 = h;
          let ax1 = -1;
          let ay1 = -1;
          stack.length = 0;
          stack.push(p);
          seen[p] = 1;
          while (stack.length) {
            const q = stack.pop();
            area++;
            const qx = q % w;
            const qy = (q / w) | 0;
            if (qx < ax0) ax0 = qx;
            if (qy < ay0) ay0 = qy;
            if (qx > ax1) ax1 = qx;
            if (qy > ay1) ay1 = qy;
            if (qx > 0 && solid[q - 1] && !seen[q - 1]) {
              seen[q - 1] = 1;
              stack.push(q - 1);
            }
            if (qx < w - 1 && solid[q + 1] && !seen[q + 1]) {
              seen[q + 1] = 1;
              stack.push(q + 1);
            }
            if (qy > 0 && solid[q - w] && !seen[q - w]) {
              seen[q - w] = 1;
              stack.push(q - w);
            }
            if (qy < h - 1 && solid[q + w] && !seen[q + w]) {
              seen[q + w] = 1;
              stack.push(q + w);
            }
          }
          if (area > largest) {
            largest = area;
            largestBbox = [ax0, ay0, ax1, ay1];
          }
        }

        results.push({
          changed,
          ratio: changed / (w * h),
          mean: changed ? sum / changed : 0,
          max,
          bbox: changed ? [x0, y0, x1, y1] : null,
          solidCount,
          solidRatio: solidCount / (w * h),
          largest,
          largestBbox,
          heat: heat.toDataURL("image/png"),
        });
      }
      return results;
    },
    { frames, threshold },
  );
}

const rows = [];
try {
  await page.goto(urlForWorld(), { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(
    () => {
      if (typeof window.setCameraOrientation !== "function") return false;
      try {
        return JSON.parse(window.render_game_to_text?.() ?? "null")?.ready === true;
      } catch {
        return false;
      }
    },
    null,
    { timeout: 45000 },
  );

  await mkdir(outDir, { recursive: true });

  for (const view of views) {
    await page.evaluate(
      ([v]) => {
        window.setPlayerPosition?.(v.x, v.z, v.y);
        window.setCameraOrientation?.(v.yaw, v.pitch);
      },
      [view],
    );
    await page.waitForTimeout(500);
    for (let i = 0; i < 8; i++) await page.evaluate(() => window.advanceTime?.());

    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const a = i * 2.399963;
      const x = view.x + Math.cos(a) * step * i;
      const z = view.z + Math.sin(a) * step * i;
      const yaw = view.yaw + Math.sin(i * 1.7) * yawStep * i;
      const pitch = view.pitch + Math.cos(i * 1.3) * yawStep * 0.5 * i;
      await page.evaluate(
        ([px, pz, py, yw, pt]) => {
          window.setPlayerPosition?.(px, pz, py);
          window.setCameraOrientation?.(yw, pt);
        },
        [x, z, view.y, yaw, pitch],
      );
      // Three frames so the camera transform and any frustum-culling updates
      // have definitely landed before the capture.
      for (let k = 0; k < 3; k++) await page.evaluate(() => window.advanceTime?.());
      frames.push((await page.screenshot({ type: "png" })).toString("base64"));
    }

    if (keep) {
      await writeFile(join(outDir, `flicker-${view.name}-base.png`), Buffer.from(frames[0], "base64"));
    }

    const results = await diffFrames(frames);
    const worst = results.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    const heatPath = join(outDir, `flicker-${view.name}.png`);
    await writeFile(heatPath, Buffer.from(worst.heat.split(",")[1], "base64"));

    rows.push({
      name: view.name,
      ratio: worst.ratio,
      max: worst.max,
      bbox: worst.bbox,
      solidRatio: worst.solidRatio,
      largest: worst.largest,
      largestBbox: worst.largestBbox,
      path: heatPath,
    });
    console.log(
      `${view.name.padEnd(10)} ${(worst.ratio * 100).toFixed(3)}% changed  ` +
        `solid ${(worst.solidRatio * 100).toFixed(3)}%  largest ${worst.largest}px ` +
        `${worst.largestBbox ? `@${worst.largestBbox.join(",")}` : ""}  -> ${heatPath}`,
    );
  }

  console.log("\nSummary (worst pair per viewpoint):");
  const sorted = [...rows].sort((a, b) => b.ratio - a.ratio);
  for (const r of sorted) {
    console.log(
      `  ${r.name.padEnd(10)} ${(r.ratio * 100).toFixed(3)}% changed  ` +
        `${(r.solidRatio * 100).toFixed(3)}% solid  largest ${String(r.largest).padStart(5)}px  ${r.path}`,
    );
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`\n${errors.length} page error(s):`);
  for (const e of errors.slice(0, 10)) console.log("  -", e);
}
if (failRatio !== null && rows.some((r) => r.ratio > failRatio)) {
  console.error(`\nFlicker above --fail ${(failRatio * 100).toFixed(2)}%.`);
  process.exit(1);
}
