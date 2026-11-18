---
name: surprise-round
description: Build the next "surprise round" of Plato's Cove — a new world (or a substantial new section of an existing one) joined to the others by a door, chosen by Claude from the world bible, built, verified in the browser, logged, and merged into main locally. Run only when the user types /surprise-round.
argument-hint: "[optional hint, e.g. 'something underwater' — or nothing for a full surprise]"
disable-model-invocation: true
---

# Surprise round

The user wants to be surprised when they next play. Don't ask them which idea
to build or show them a plan for approval: pick, build, verify, and report.
They don't read the code much, so the screenshots and the playable result are
what count. Spoilers in the final report are fine.

User's hint for this round (may be empty): $ARGUMENTS

## 1. Start clean

- `git status` must be clean and you must be on `main`. If it isn't, stop and
  tell the user what's uncommitted rather than stashing or discarding it.
- Read **all** of `docs/WORLD.md`: the concept, map, tone rules, technical
  rules, the **Pitfalls** list, and the whole log including every round's
  open threads. It's the bible; everything below assumes it.
- The round number N is one more than the last `### Round N` in the log.
  Create `claude/surprise-round-N` from `main`.

## 2. Choose the idea

- Pick something that is the next room in the same dream: it deepens the
  concept (the island as a manufactured shadow play, and the machinery
  behind or in front of it). Prefer pulling on an open thread from an
  earlier round; a fresh idea is fine if it fits better. Honour the hint if
  one was given.
- Usually that's a new world with a door from at least one existing world.
  It can also be a substantial new section of an existing world (a new
  floor, a back room, an outside area), or a change to an existing world
  that the new idea needs. Changing existing worlds is allowed; keep their
  doors, arrivals and tests working.
- Make it different from the last two rounds in light, palette, scale and
  sound (e.g. after the warm open motel, something enclosed, or cold, or
  vast). Re-use the island's props where it makes sense: the reuse is the
  point.
- Scope it to what you can build *and verify* well in one session: one
  world of roughly the mall's or motel's richness, not three thin ones.

## 3. Build

Follow the technical rules in the bible. In short, for a new world:

- `src/components/<world>/` with `constants.ts` (layout, doors, floors,
  colliders: the single source of every position), `<World>World.tsx`, and
  `textures.ts` for procedural canvas textures.
- Wire it through `worldStore.ts` (`WORLD_IDS`, `DOORS`, `DEFAULT_ORIGIN`,
  `notReady` if lazy), `levels.ts` (level, arrivals, doors), `Scene.tsx`
  (lazy mount behind `Suspense`, fog, camera near, acoustics, `IslandFeed`
  `others`), `Effects.tsx` (`GRADE`, if it needs one), `UI.tsx`
  (`FADE_BACKGROUND`), `musicStore.ts` (a new acoustic mode if it's a new
  kind of space), and the door in the world it's entered from (with its
  `DoorTrigger` and its entry in that level's doors).
- Lazy-load it like the mall and the motel, and call `markWorldReady`.
- No new binary assets unless the bible's asset rule allows it (Poly Haven
  CC0, recorded in `ASSETS.md`). Prefer procedural textures, shaders and the
  existing GLBs.
- Run `npx tsc --noEmit -p .` as you go.

Keep the **Pitfalls** list open while you build. They are the mistakes this
project has actually shipped: shared GLTF transforms, coplanar faces, the
2.4 m-wide player, open undersides, visuals and colliders drifting apart,
props hanging in the air.

## 4. Verify (don't skip any of this)

Start the dev server in the background (`npm run dev`, port 3000) and note
its PID so you can kill it by PID at the end. Playwright's bundled Chromium
works on this machine without `CHROMIUM_PATH`. Put screenshots and scratch
scripts in your scratchpad, not the repo.

1. `npm run build` passes.
2. `node scripts/door-test.mjs --only <world>`, plus `--only` each world
   whose doors you touched. All checks pass.
3. **Screenshots.** Write a small Playwright script (load
   `?qa=1&world=<world>`, wait for `render_game_to_text().ready`, then use
   `setPlayerPosition` and `setCameraOrientation`). Cover every area at
   eye level, every upper floor from on top of it, the arrival view, and
   views looking up at corners and joints. **Look at every image** and fix
   what's wrong: things floating, clipping, hanging off edges, z-fighting,
   text overflowing, black frames. Re-shoot after fixing.
4. **Walk tests.** In the same script, hold keys (`page.keyboard.down`)
   while pumping `advanceTime()` and read the player position back. Walk
   every stair and ramp up and along, walk into the underside of every
   raised thing from the ground, and walk the length of every walkway.
   SwiftShader is slow, so hold keys long enough (several seconds).
5. **Flicker.** `node scripts/qa-flicker.mjs --world <world> --x .. --z ..
   --yaw .. --pitch ..` on the busiest views, especially facades, corners
   and layered surfaces. A solid cluster in the heatmap is z-fighting; fix
   it. Thin edge outlines are just parallax.
6. If you changed an existing world, screenshot it too and rerun its door
   test.
7. `git diff --check` is clean.

## 5. Log, commit, merge

- Add `### Round N: <name>` to the log in `docs/WORLD.md`, in the style of
  the earlier rounds: **Added** (what's there, detail by detail), **Why
  this one**, **Plumbing changed**, and **Open threads for future rounds**
  (three or four, so the next round has somewhere to go). Update the
  concept list, the map and the door table. If you hit a new kind of bug,
  add it to **Pitfalls**.
- Update `README.md`'s world list. If you like a screenshot, save one to
  `screenshots/` and use it in the README.
- Commit on the branch with a descriptive message (and the attribution
  trailer from the system's instructions), then merge into `main` locally
  with `git merge --no-ff`, so the user can just `npm run dev`. Keep the
  branch. **Don't push and don't open a PR** unless the user asks.
- Kill the dev server by PID.

## 6. Report

Tell the user, briefly and in plain words:

- What the new world is, where its door is, and how to get there from the
  island.
- Two or three things worth finding there.
- Anything you couldn't finish or verify, said plainly.
- That it's merged into `main` locally (not pushed), and that
  `git revert -m 1 <merge commit>` undoes the whole round.
