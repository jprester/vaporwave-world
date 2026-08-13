// Re-encodes a JPEG at a target size using Chromium's encoder (clean baseline
// JFIF, no EXIF) — avoids sips' metadata quirks that break SwiftShader.
// Usage: node scripts/resize-tex.mjs <src> <out> <size>
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const [, , src, out, sizeArg] = process.argv;
const size = Number(sizeArg);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3001/", { waitUntil: "load" });
const b64 = await page.evaluate(async ([u, s]) => {
  const img = new Image();
  img.src = u;
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("load fail")); });
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, s, s);
  return c.toDataURL("image/jpeg", 0.92).split(",")[1];
}, [`http://localhost:3001${src}`, size]);
await writeFile(out, Buffer.from(b64, "base64"));
console.log("wrote", out);
await browser.close();
