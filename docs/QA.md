# QA

The QA layer is deliberately thin. It exists to give the agent and the human
the same cheap facts — door routing, floor heights, spawn points, collisions —
without turning every edit into a GPU render.

The rule: **assert cheaply, render rarely, put the expensive render in CI.**

## Tiers

| Tier | Command | What it checks | Cost |
| --- | --- | --- | --- |
| 0 | `npm run check` | Typecheck + pure geometry invariants over `levels.ts` and the facade depth contract: reciprocal doors, arrivals match their doors, spawn/arrival on the floor, floor patches inside bounds, colliders finite, every world reachable, depth layers strictly ordered | ~5 s, no WebGL |
| 1 | `npm run smoke -- --world motel` | Loads one world, waits for `ready`/`idle`, asserts spawn on the floor, grounded, no door prompt, no page errors; writes one 640×360 shot | ~10–25 s |
| 2 | `npm run doors -- --only motel` | Walks every door the way a player does; checks the arrival side, floor, facing and prompt | ~20 s |
| 2 | `npm run walk -- --world motel` | Stands on every floor patch (stair, balcony, gallery), every arrival, walks from spawn, walks at a bound, walks into the biggest collider | ~15–35 s |
| 3 | `npm run flicker -- --all` | Diagnoses shimmer/z-fighting from a few nudged frames; writes heatmaps | ~30–60 s, only on demand |

Tiers 1–3 need the dev server (`npm run dev`, port 3000). Use `--url` if it is
elsewhere. Tier 3 is a diagnostic, not a gate: specular and parallax produce
false positives.

## What not to do

- Don't run the full world × door × screenshot matrix on every edit.
- Don't compare golden images for every camera angle.
- Don't put video or a full flicker sweep on every PR.
- Don't keep a browser running in the background.
- Don't read screenshots into context on success. The scripts print a compact
  PASS/FAIL summary; open `screenshots/qa-smoke-<world>.png` only when a check
  fails.

## Keeping the laptop cool

The browser scripts force SwiftShader (software WebGL) and use 640×360, frozen
animations and no post-processing. That keeps the discrete GPU out of the loop;
it is slower per frame, which is why the walk test advances frames instead of
waiting on wall-clock time.

For the full suite, use CI rather than a laptop. A minimal GitHub Actions job:

```yaml
name: qa
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run check
      - run: npm run build
      - run: npm run dev & npx wait-on http://localhost:3000
      - run: npm run doors
      - run: npm run walk -- --world motel
```

Run the whole-world walk/flicker sweep nightly or on demand, not per PR.

## Adding a world

`LEVELS` in `src/components/levels.ts` is the single map used by the scene and
the QA scripts. Add the world there, give it a `Level` with `doors` and
`arrivals`, and Tier 0 will check the routing and floor invariants for free.
`window.qa_level()`, `qa_scene()` and `qa_raycast()` are available in QA mode
for one-off probes.
