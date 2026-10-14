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
4. **The forms.** Behind the grey doors: the island before anyone dressed
   it. Its blockout, at full size: the same platform, pool, pedestal and
   columns as untextured clay primitives with their edges drawn in, the
   statues and props as clay proxies, everything labelled the way a
   modelling viewport labels things, floating over an endless white ground
   grid under a plain noon light. *The Forms: the originals every copy is
   made from, which Plato's prisoner was meant to find outside the cave.*
   Here, outside the cave is not the real world but the source file.

Each step back is less dressed up and more honest about the island being
made. The forms are as far as that goes: nothing in them is dressed at all.
Nothing so far has reached the real "outside". That's on purpose, see the
open threads.

## Map

The worlds no longer form a corridor. Every world has a grey door to the
forms, and the forms have a door back to each, so they're the junction:

```
            island ───────── cave ───────── stockroom
         (east edge)    (west wall)    (north wall, behind the suns)
               │              │              │
               └───────── the forms ─────────┘
                 (doors where the island has its doors:
                  → cave at the island-door spot,
                  → island at the grey-door spot,
                  → stockroom mirrored on the west edge)
```

| World | Door | Leads to | Where |
| ----- | ---- | -------- | ----- |
| island | freestanding door | cave | north edge, right of the sun |
| island | grey door | forms | east edge, between the columns |
| cave | entrance | island | south wall, by the EXIT sign |
| cave | STAFF ONLY | stockroom | north wall, right of the screens |
| cave | grey door | forms | west wall, near the entrance |
| stockroom | FRONT OF HOUSE | cave | south wall, under the slogan |
| stockroom | grey door | forms | north wall, behind the spare suns |
| forms | clay door | cave | where the island's door stands |
| forms | clay door | island | where the island's grey door stands |
| forms | clay door | stockroom | the west edge, mirroring it |

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
  against something duller (carpet, concrete, fluorescent light). The
  forms are the one exception, and they're the exception on purpose: no
  palette at all, only clay grey, ink lines and white. The only colours
  there are the viewport's own (the red and green axis lines) and the
  reference kit (a colour chart, a chrome ball, a real marble bust). Don't
  dress them; anything added there is a clay proxy with a label.
- The grey door is the forms showing through: the same door model in flat
  clay, lit by nothing in the room around it. Use it only for doors that
  lead to the forms.

## Technical rules

- **Worlds** are `WorldId`s in `src/components/worldStore.ts`. Every world
  stays mounted in `Scene.tsx` once loaded; only the current one is visible
  (hidden groups cost no draw calls). Fog, camera near plane, acoustics and
  post-processing are per world (maps at the top of `Scene.tsx`, and
  `Effects.tsx`).
- **Lazy worlds.** A world with real assets can load on first need: mount
  it behind `Suspense` in `Scene.tsx` (the forms mount once a door to them
  is in reach), list it in `notReady` in worldStore, and call
  `markWorldReady` when it commits. The door fade holds on its colour until
  the destination is ready. Keep such a world's heavy imports (loaders,
  libraries) inside its own chunk; a library imported through a module the
  main bundle shares ends up in the main bundle (see `FormsEffects`).
- **Doors** list their destinations in `DOORS` (worldStore). A door in the
  scene is a `DoorTrigger` with `to="<world>"`. Each level in `levels.ts`
  lists its `doors` (position and facing) and has `arrivals` keyed by
  origin world, so you arrive in front of the door you came through
  (`inFrontOf` derives an arrival from a door). The fade color per
  destination is `FADE_BACKGROUND` in `UI.tsx`.
- **Door test.** `node scripts/door-test.mjs` (with the dev server running
  and `CHROMIUM_PATH` set) walks every door, after every route into its
  world, the way a player does: stands in front, faces it, checks
  `nearDoor` on every frame, travels with no argument and checks where it
  lands. Rerun it whenever a door, a collider or an arrival moves.
- **Audio:** `musicStore.ts` has four acoustics: `open` (island), `tv`
  (cave, panned out of the video wall), `hall` (stockroom: PA horns into a
  synthetic 4 s concrete reverb) and `dry` (forms: summed to mono, no room,
  no ambience; level from the clay boombox's distance, like the island).
  Add a mode rather than special-casing one.
- **Plato TV** (`IslandFeed.tsx`) renders the island into a texture while any
  world in `WATCHES_TV` (Scene) is current or being travelled to. Hide new
  worlds' groups via its `others` prop.
- **Assets:** no new binary assets unless their license is certain. Poly
  Haven (CC0) is fine: record each download in `ASSETS.md`, compress meshes
  (`@gltf-transform/cli optimize --compress meshopt --texture-compress
  webp`), use 1K textures, and load them lazily with the world that uses
  them. Otherwise use procedural canvas textures (`cave/textures.ts`,
  `stockroom/textures.ts`), shaders, and the existing GLBs.
  `stockroom/models.ts` has `useFittedModel` to clone a GLB at a given
  height, standing on y = 0; `forms/clay.ts` has `clayClone` (a GLB in one
  material, optionally with edge lines) and the viewport label texture.
- **Rendering:** App sets ACES tone mapping, but `@react-three/postprocessing`'s
  EffectComposer sets the renderer to `NoToneMapping` while it's mounted,
  and no pass in the chain tone-maps, so (going by the code) frames reach
  the screen untone-mapped; grade with light and material values. Bloom threshold is 1.2, so emissive parts need
  `toneMapped: false` and colors above ~1.5. Custom shaders output linear
  HDR. The EffectComposer turns `autoClear` off, so manual render-target
  renders must `gl.clear()` first. The forms have their own composer
  (`FormsEffects`): ambient occlusion only.
- **Player:** radius 1.2, eye height 1.7. Keep walkways at least 2.6 wide.
  The door model is an arched double door, 1.9 m wide and 4 m tall.
- **Debug:** `?qa=1` hides the UI and skips the compatibility gate;
  `?world=cave|stockroom|forms` starts there. Hooks: `window.render_game_to_text`,
  `advanceTime`, `setCameraOrientation(yaw, pitch)`,
  `setPlayerPosition(x, z)`, `travel(world?)`, `setFeedSegment(i)`,
  `qa_doors()` (the current world's doors) and `qa_renderInfo()` (draw
  calls, triangles and GPU memory over one frame). In QA mode the keyboard
  is off, so drive with the hooks.
- **Screenshots:** `npm run dev`, then
  `CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome node
  scripts/shot.mjs --url "http://localhost:3000/?qa=1&world=..." --out x.png
  --x .. --z .. --yaw .. --pitch 0.08`. Yaw 0 looks toward -z, and +yaw turns
  left. SwiftShader can render black frames at pitch near 0, so use 0.05 or
  more. When killing the dev server, don't use a `pkill` pattern that also
  matches your own shell command (`[v]ite`-style tricks don't help when the
  pattern text is in your own command line); kill it by PID.

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

### Round 2: the forms, and the grey doors

**Added.** A fourth world, and a door from every world into it.

- **The grey door.** The island, the cave and the stockroom each get one
  more door: the same door model as the others, but undressed, flat clay
  grey with its edges inked in, and lit by nothing around it (a matcap, so
  it stays the same neutral grey in the island's pink sunset, the cave's
  purple dark and the stockroom's sun-wash). On the island it stands on the
  east edge between two columns, visible from the opening shot if you look
  right. In the cave it's on the west wall near the entrance; in the
  stockroom, in the north wall behind the spare suns, so you find it at the
  very back of the props.
- **The forms** are the island's blockout at full size, in a white void:
  - the platform as five slabs round an empty pool, a faint layout grid
    where the tiles go, the pedestal, nine columns reduced to plinth, plain
    shaft and abacus, each labelled (`column.000` to `column.008`), and
    dimension lines along the deck: 56.000 m, 50.000 m, 5.200 m to the
    ground;
  - Venus on the pedestal and Helios in the "sea" as clay proxies of the
    island's own models; the boombox, its table and chair likewise;
  - where the neon sign goes, a default text object that says `Text`;
  - the sun, low in the south where the island keeps it: a grey UV sphere
    with its segments drawn, lit from above like everything else, because
    the only light is a plain key light at noon, 6500 K (its gizmo hangs
    over the platform with a dashed line down; the golden hour is still
    out on loan);
  - at the bottom of the empty pool, nobody deleted the default `Cube`;
  - where the island first puts the player, a camera gizmo: the opening
    shot. Stand in it and its frame outlines the view;
  - the endless ground: a white plane with a viewport grid, the x axis in
    red and the z axis in green, swallowed by white haze;
  - **the reference**: on a plinth south-west of the pool, the only real
    thing in the forms, a photo-scanned marble bust (Poly Haven), next to a
    chrome ball and a grey ball on a stand and a colour chart, labelled
    `reference (real)`. The chrome ball reflects a photo studio that isn't
    there (the HDRI the forms are lit with);
  - three clay doors out, labelled `door → cave`, `door → island`,
    `door → stockroom`, standing where the island has its doors (the cave
    door where the island's door is, the island door where the island's
    grey door is) and the stockroom door mirrored on the west edge.
- **Look.** Everything the other worlds do, the forms don't: no pink, no
  bloom, no chromatic aberration, no grain, no vignette. Clay, ink lines,
  constant-size labels that fade in as you approach, white fog, and only
  ambient occlusion in post. The fade into it is a flat white.
- **Sound.** The music plays from the clay boombox, summed to mono, bone
  dry, with no room tone and no hum: an anechoic white.

**Why this one.** World candidates: *outside* through the stockroom's
loading bay (the most striking contrast, ordinary photo-real daylight from
scanned assets, but it spends the ending the bible asked to save); a stock
photography studio (white cyc, softboxes, real props; on-theme, but another
production room like the last two); a vector-grid "cyberspace" (a
different look on paper, but that's vaporwave's own palette again); a dead
mall (a different dream, not the next room). The forms won because they're
the next step of the allegory: in Plato the way out of the cave leads to
the Forms, the perfect originals. Inverted, the original of the island
isn't a truer world but its blockout, the source file. It's the end of
the rule that each world is less dressed than the last, it reuses the
island's own models (as clay), and it gives the strongest possible
contrast in look while being unmistakably the same place.

Connection candidates: more freestanding doors in a ring on the island
(more doors, no reason for them); a hotel corridor of numbered doors as a
separate hub (a hub with no meaning, and a cliché); the new world as the
junction. The last fits: the source is where every scene is opened from,
so it opening onto all of them needs no explaining, and its doors stand
where the island's doors stand. The grey doors are the source showing
through in each world, one motif, recognisable on sight.

**Plumbing changed.** Doors are level data (`Level.doors`) with arrivals
derived from them; worlds can load lazily, with the fade waiting for them;
post-processing is per world; `dry` acoustics; QA hooks `qa_doors` and
`qa_renderInfo`; `scripts/door-test.mjs`. First-load cost: the grey doors
reuse the already-loaded door model; the main bundle grew about 2 KB
gzipped. The forms' code (85 KB gzipped, mostly the AO library) and assets
(the bust, 358 KB, and the HDRI, 1.4 MB) load when a door to them is first
in reach.

**Open threads for future rounds.**

- **The reference.** The one real object in the forms is a scanned bust,
  and something in the forms was lit for it: the chrome ball shows a photo
  studio with lights and a cyclorama, and none of it is there. Someone
  scanned a real thing somewhere real. That's the closest the game has
  come to the outside; the loading bay is still shut.
- **The camera.** The opening shot has a camera, standing where the island
  first puts the player. If the player is the camera, who framed the shot?
  (Restraint: there's never anyone there.)
- Door #11 is still "NOT YET HUNG". The grey doors aren't stock doors (they
  were never dressed, so they were never stocked), so the stockroom's
  count stays honest: 11 doors, 3 out.
