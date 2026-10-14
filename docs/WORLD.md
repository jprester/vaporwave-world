# World bible

Read this before adding to Plato's Cove. It holds the concept, the rules every
world follows, and a log of what each round added and left open.

## The concept

Plato's cave, inverted. In Plato, prisoners watch shadows on a wall, and the
way out leads up into the sun and the real world. Here the sunlight comes
first: the island is the shadow play, and each door leads further back into
the machinery that produces it. That's vaporwave's real subject: manufactured
nostalgia, the consumer dream factory, paradise as stock footage.

The worlds so far, in order of depth:

1. **The island (Plato's Cove).** A tiled poolroom platform on an endless sea
   at a frozen golden-hour sunset. Doric columns, a waving statue on a
   pedestal under a neon sign, a giant Helios bust half-sunk in the sea, a
   boombox. Idyllic and manufactured. *The shadows on the wall.*
2. **The cave.** Behind the island's freestanding door: a closed-down hotel
   conference room. Rows of empty plastic chairs face a wall of CRTs showing
   "Plato TV", a live broadcast of the island. *The prisoners' seats.*
3. **The stockroom.** Behind the cave's STAFF ONLY door, beside the screens:
   the prop store the island is dressed from. A dim, high warehouse of pallet
   racks and numbered floor lots holding spares of everything on the island,
   counted and tagged, down to the sun. *The objects carried behind the wall,
   whose shadows the prisoners take for the world.*

Each step back is less dressed up and more honest about the island being
made. Nothing so far has reached "outside". That's on purpose, see the open
threads.

## Tone rules

- Quiet, eerie, deadpan-funny. Never horror, never jump scares, no monsters,
  no chases. Nobody is ever present; there are only traces of people (a
  turned chair, a mug, a "back in 5 minutes" card).
- Small details reward curiosity: tags, captions, counts that add up, things
  you only see if you walk round the back of something. The jokes are dry
  and never wink at the player.
- Every new world should feel like the next room in the same dream, joined
  to an existing one by a door, and should re-use the island's own props
  wherever it can, because their reuse *is* the point.
- Keep the palette in the family: pinks, lilac, teal and sunset gradients
  against something duller (carpet, concrete, fluorescent light).

## Technical rules

- **Worlds** are `WorldId`s in `src/components/worldStore.ts`. Every world
  stays mounted in `Scene.tsx`; only the current one is visible. Fog, camera
  near plane and acoustics are per world (maps at the top of `Scene.tsx`).
- **Doors** list their destinations in `DOORS` (worldStore). A door in the
  scene is a `DoorTrigger` with `to="<world>"`. Each level in `levels.ts` has
  `arrivals` keyed by origin world, so you arrive in front of the door you
  came through. The fade color per destination is `FADE_BACKGROUND` in
  `UI.tsx`.
- **Audio:** `musicStore.ts` has three acoustics: `open` (island), `tv`
  (cave, panned out of the video wall) and `hall` (stockroom: PA horns into a
  synthetic 4 s concrete reverb). Add a mode rather than special-casing one.
- **Plato TV** (`IslandFeed.tsx`) renders the island into a texture while any
  world in `WATCHES_TV` (Scene) is current or being travelled to. Hide new
  worlds' groups via its `others` prop.
- **Assets:** no new binary assets unless their license is certain. Use
  procedural canvas textures (`cave/textures.ts`, `stockroom/textures.ts`),
  shaders, and the existing GLBs. `stockroom/models.ts` has `useFittedModel`
  to clone a GLB at a given height, standing on y = 0.
- **Rendering:** the postprocessing chain tone-maps the whole frame (ACES,
  exposure 0.6). Bloom threshold is 1.45, so emissive parts need
  `toneMapped: false` and colors above ~1.5. Custom shaders output linear
  HDR. The EffectComposer turns `autoClear` off, so manual render-target
  renders must `gl.clear()` first.
- **Player:** radius 1.2, eye height 1.7. Keep walkways at least 2.6 wide.
  The door model is an arched double door, 1.9 m wide and 4 m tall.
- **Debug:** `?qa=1` hides the UI and skips the compatibility gate;
  `?world=cave|stockroom` starts there. Hooks: `window.render_game_to_text`,
  `advanceTime`, `setCameraOrientation(yaw, pitch)`,
  `setPlayerPosition(x, z)`, `travel(world?)`, `setFeedSegment(i)`. In QA
  mode the keyboard is off, so drive with the hooks.
- **Screenshots:** `npm run dev`, then
  `CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome node
  scripts/shot.mjs --url "http://localhost:3000/?qa=1&world=..." --out x.png
  --x .. --z .. --yaw .. --pitch 0.08`. Yaw 0 looks toward -z, and +yaw turns
  left. SwiftShader can render black frames at pitch near 0, so use 0.05 or
  more. When killing the dev server, don't use a `pkill` pattern that also
  matches your own shell command.

## Log

### Round 1: the stockroom

**Added.** A third world behind a STAFF ONLY door in the cave's north wall,
right of the video wall (cold light leaks from under it). The stockroom is a
28 × 48 m warehouse:

- Wall racks of boxes; on the shelves, an unplugged spare "Plato's Cove"
  neon sign and eleven boxed boomboxes.
- Five floor lots, each under a hanging sign and with a stock tag:
  1. five copies of the waving statue on pallets, all waving at the aisle
     (one still shrink-wrapped, one pallet empty: "OUT 1 → ISLAND");
  2. the sea, rolled up like carpet;
  3. Helios heads in crates (the empty crate says where the third went:
     "→ SEA, WAIST-DEEP");
  4. a leaning stack of identical doors, plus door #11, "NOT YET HUNG,
     DESTINATION: TBC";
  5. doric columns lying on chocks.
- At the end of the aisle, the money shot: a 7 m striped vaporwave sun,
  plugged into the wall for testing, washing the back of the warehouse in
  pink. Two wrapped spares stand beside it.
- The front of the warehouse has the clerk's desk (a CRT turned to the empty
  chair, still showing Plato TV; a lamp; a mug; "BACK IN 5 MINUTES"), an
  inventory whiteboard whose counts match what's in the lots ("GOLDEN HOUR:
  ON LOAN, INDEFINITELY"; sticky note: "Nobody returns anything. — mgmt"),
  the slogan EVERY DAY IS THE SAME BEAUTIFUL DAY over the door, and a closed
  loading-bay shutter.
- The music plays over the warehouse PA, as a long reverberant wash.

**Why this one.** Candidates considered: a broadcast control room (too close
to what the cave already says), a dead-mall food court (on-genre but a
different dream, not the next room), a hotel lobby or check-in (good, but
it's *front* of house, the wrong direction), a waiting room. The prop store
won because it's literally the next layer of Plato's allegory (the
artifacts carried along behind the wall, whose shadows are the show). It
also lets the game reuse its own models as the content, and the joke (the
sublime island is a stock-keeping problem) is dry and quiet in the house
style.

**Plumbing changed.** Worlds and doors were generalised: doors name their
destination, arrivals are per origin, fades, fog and acoustics are per-world
maps, and the island feed hides any number of other worlds.

**Open threads for future rounds.**

- **The loading bay.** The shutter on the stockroom's west wall
  ("LOADING BAY 2 — DELIVERIES ONLY") is closed, and under it is a line of
  warm, *ordinary* daylight, the only light in the game that isn't pink or
  fluorescent. Plato's prisoner eventually walks out into the real sun.
  Should the game ever let you, and what would "outside" be? Possibly the
  last world, and best handled with restraint (or never opened).
- **Door #11.** A spare door in lot 4 is tagged "NOT YET HUNG, DESTINATION:
  TBC". A future world could be reached by finding where it got hung. The
  inventory says 11 doors, 3 out; keep the count honest if you add one
  (3 out = the island door and the cave's two).
- The inventory board lists **GOLDEN HOUR: ON LOAN, INDEFINITELY**. Nobody
  has looked into who it's on loan to.
