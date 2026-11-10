// Tier 0 QA loader. Bundles scripts/qa-geometry.ts with esbuild (already a
// Vite dependency) and runs it in Node, so the level data can be imported
// without a browser or a separate TS runner.
//
//   npm run check

import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = await mkdtemp(join(tmpdir(), "platos-qa-"));
const outfile = join(dir, "qa-geometry.mjs");

try {
  await build({
    entryPoints: ["scripts/qa-geometry.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile,
    logLevel: "silent",
  });

  await import(pathToFileURL(outfile).href);
} catch (error) {
  console.error("QA geometry: FAIL (bundler error)");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}
