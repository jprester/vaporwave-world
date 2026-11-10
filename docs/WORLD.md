# World bible

Read this before adding to Plato's Cove. It holds the concept, the rules every
world follows, and a log of what each round added and left open.

## The concept

Plato's cave, inverted. In Plato, prisoners watch shadows on a wall, and the
way out leads up into the sun and the real world. Here the sunlight comes
first: the island is the shadow play, and each door leads further back into
the machinery that produces it. That's vaporwave's real subject: manufactured
nostalgia, the consumer dream factory, paradise as stock footage.

The worlds so far, roughly in order of depth:

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
4. **The mall (The Agora).** Behind a glass shop door in each of the other
   worlds: a shopping centre after closing. Two storeys of mostly shuttered
   shops round a long atrium under a moonlit glass skylight, a dry fountain,
   plastic palms, a freshly mopped floor that mirrors the few neon signs
   still lit, stopped escalators, and muzak from the ceiling speakers. One
   shop still has its lights on: a travel agency selling holidays to the
   island. *The agora is where Socrates did his asking, the marketplace;
   here it's front of house, where the dream is sold.*
5. **The Sunset Motel.** Behind a staff door in the cave's east wall: a
   two-storey courtyard motel at permanent golden hour. The pool, the
   diving board, the VACANCY sign, one lit room, one room lit by a
   television, a maid's cart and a gate that lets you back into the cave.
   *Where you stay while the golden hour is on loan.*

The first three go further back, each less dressed up and more honest about
the island being made. The mall goes the other way, out front, to where the
island is packaged and sold, and it's the hub: every world opens onto it.
The motel is where the transaction is spent: the golden hour on loan, the
room you sleep in after the island. Nothing so far has reached the real
"outside". That's on purpose, see the open threads.

## Map

The worlds don't form a corridor. The island, the cave and the stockroom
are still joined in a line, and each also has a mall entrance; the mall has
a door back to each, so it's the hub:

```
            island ───────── cave ───────── stockroom
         (east edge)    (west wall)    (north wall, behind the suns)
               │              │              │
               │         sunset motel        │
               │        (cave east wall)     │
               │              │              │
               └────────── the mall ─────────┘
                  (travel agency,  (hotel,      (service corridor,
                   concourse)       upper mall)  concourse, north end)
```

| World | Door | Leads to | Where |
| ----- | ---- | -------- | ----- |
| island | freestanding door | cave | north edge, right of the sun |
| island | mall entrance | mall | east edge, between the columns |
| cave | entrance | island | south wall, by the EXIT sign |
| cave | STAFF ONLY | stockroom | north wall, right of the screens |
| cave | mall entrance | mall | west wall, near the entrance |
| cave | SUNSET MOTEL staff door | motel | east wall, midway along |
| motel | gate | cave | east wall of the courtyard |
| stockroom | FRONT OF HOUSE | cave | south wall, under the slogan |
| stockroom | mall entrance | mall | north wall, behind the spare suns |
| mall | Plato's Cove Holidays | island | concourse, west side, unit G04 |
| mall | Hotel & Conference Suites | cave | upper mall, east side, unit U08 |
| mall | STAFF ONLY, service corridor | stockroom | concourse, north wall, under the EXIT sign |

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
  against something duller (carpet, concrete, fluorescent light, a mall's
  moonlit blue-grey).
- The mall entrance (`mall/MallDoor.tsx`) is the mall showing through: a
  bronze-framed glass shop door with the centre's name on it, a "closed"
  card inside, and the mall at night behind the glass, whatever time it is
  where it stands. Use it only for doors that lead to the mall.

## Technical rules

- **Worlds** are `WorldId`s in `src/components/worldStore.ts`. Every world
  stays mounted in `Scene.tsx` once loaded; only the current one is visible
  (hidden groups cost no draw calls). Fog, camera near plane, acoustics and
  post-processing are per world (maps at the top of `Scene.tsx`, and
  `Effects.tsx`).
- **Lazy worlds.** A world can load on first need: mount it behind
  `Suspense` in `Scene.tsx` (the mall mounts once a door to it is in
  reach), list it in `notReady` in worldStore, and call `markWorldReady`
  when it commits. The door fade holds on its colour until the destination
  is ready. Keep such a world's heavy imports (loaders, libraries) inside
  its own chunk; a library imported through a module the main bundle
  shares ends up in the main bundle. Its door into the other worlds (like
  `MallDoor`) is in the main bundle, so keep that light.
- **Storeys.** The player controller walks one base floor (`Level.floorY`)
  plus any `Level.floors`: flat patches and ramps (a ramp rises linearly
  along x or z). It stands on the highest surface under the player's
  centre that isn't more than 0.6 m above their feet, and follows a floor
  down by up to 0.6 m instead of launching off it. Colliders can have a
  vertical extent (`y0`, `y1`), so an upstairs balustrade doesn't wall off
  the floor below; without one they're infinitely tall, as before. Close
  the underside of a ramp with a low collider that the ramp's walker is
  always above (see the escalators in `mall/constants.ts`). Doors and
  arrivals upstairs carry a floor height (`DoorSpot.y`, `SpawnPoint.y`),
  and `DoorTrigger` only answers on its own floor.
- **Doors** list their destinations in `DOORS` (worldStore). A door in the
  scene is a `DoorTrigger` with `to="<world>"`. Each level in `levels.ts`
  lists its `doors` (position and facing) and has `arrivals` keyed by
  origin world, so you arrive in front of the door you came through
  (`inFrontOf` derives an arrival from a door, upstairs or down). The fade
  color per destination is `FADE_BACKGROUND` in `UI.tsx`.
- **QA tiers.** `npm run check` typechecks and checks the level invariants
  (reciprocal doors, arrivals straight out of the right door, floor heights,
  spawns, collider boxes) with no WebGL. `npm run smoke -- --world motel`
  loads one world at 640x360 and asserts spawn/floor/errors; `npm run walk --
  --world motel` stands on every floor patch and walks into a wall. See
  `docs/QA.md`; keep the expensive sweep for CI or on demand.
- **Door test.** `node scripts/door-test.mjs` (with the dev server running
  and `CHROMIUM_PATH` set) walks every door, after every route into its
  world, the way a player does: stands in front, faces it, checks
  `nearDoor` on every frame, travels with no argument and checks where it
  lands. Rerun it whenever a door, a collider or an arrival moves.
- **Audio:** `musicStore.ts` has five acoustics: `open` (island), `tv`
  (cave, panned out of the video wall), `hall` (stockroom: PA horns into a
  synthetic 4 s concrete reverb), `mall` (muzak: summed to mono, small
  ceiling speakers, into a longer, brighter 5.6 s atrium reverb, over the
  room tone) and `court` (the motel: a short, dry 2.6 s courtyard slap
  with little high end). Reverbs are `Space`s passed to `hallImpulse`.
  Add a mode rather than special-casing one.
- **Plato TV** (`IslandFeed.tsx`) renders the island into a texture while any
  world in `WATCHES_TV` (Scene) is current or being travelled to (the
  cave, the stockroom, and the mall, for Television City's window). Hide
  new worlds' groups via its `others` prop.
- **Assets:** no new binary assets unless their license is certain. Poly
  Haven (CC0) is fine: record each download in `ASSETS.md`, compress meshes
  (`@gltf-transform/cli optimize --compress meshopt --texture-compress
  webp`), use 1K textures, and load them lazily with the world that uses
  them. Otherwise use procedural canvas textures (`cave/textures.ts`,
  `stockroom/textures.ts`, `mall/textures.ts`), shaders, and the existing
  GLBs. `stockroom/models.ts` has `useFittedModel` to clone a GLB at a
  given height, standing on y = 0.
- **Rendering:** App sets ACES tone mapping, but `@react-three/postprocessing`'s
  EffectComposer sets the renderer to `NoToneMapping` while it's mounted,
  and no pass in the chain tone-maps, so (going by the code) frames reach
  the screen untone-mapped; grade with light and material values. Bloom threshold is 1.2, so emissive parts need
  `toneMapped: false` and colors above ~1.5. Custom shaders output linear
  HDR. The EffectComposer turns `autoClear` off, so manual render-target
  renders must `gl.clear()` first. A world can adjust the grade in
  `GRADE` (Effects): the mall's bloom is wider and its vignette darker.
- **Reflections.** The mall's concourse has real planar reflections
  (`mall/wetFloor.ts`): the scene rendered from the mirrored camera into a
  half-float target with mipmaps, only while the mall is the current world,
  and added (not multiplied) into the floor by a shader patch. The floor's
  roughness map is also its wetness map: puddles reflect sharply and
  strongly, polished dry terrazzo softly (a blurrier mip). It roughly
  doubles the mall's draw calls; use it on one big floor, not everywhere.
- **Player:** radius 1.2, eye height 1.7. Keep walkways at least 2.6 wide.
  The door model is an arched double door, 1.9 m wide and 4 m tall.
- **Debug:** `?qa=1` hides the UI and skips the compatibility gate;
  `?world=cave|stockroom|mall|motel` starts there. Hooks: `window.render_game_to_text`,
  `advanceTime`, `setCameraOrientation(yaw, pitch)`,
  `setPlayerPosition(x, z, y?)` (y is the floor to stand on), `travel(world?)`, `setFeedSegment(i)`,
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
- **Flicker test:** `npm run flicker -- --preset stair` (or `--all`) loads a
  viewpoint, captures a few frames while nudging the camera by 2 mm, and diffs
  them with post-processing off (`?nopost=1`) and water/palms/neon frozen
  (`?freeze=1`). `scripts/qa-flicker.mjs` writes a heatmap and prints the
  changed and eroded-solid percentages; a z-fight is a solid cluster, ordinary
  parallax is a thin edge. Presets are motel-specific; `--world`, `--x`, `--z`,
  `--yaw` and `--pitch` work for any world.

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

### Round 2: the mall

**Added.** A fourth world, the hub, and a door from every world into it.
(This round first built a different world, a clay blockout of the island
behind grey doors. It was too niche and too close to the island, and was
replaced; its plumbing stayed.)

- **The mall entrance.** The island, the cave and the stockroom each get
  one more door: a shopping centre's glass entrance, bronze frame and push
  bars, "THE AGORA · SHOPPING & LEISURE · OPEN 7 DAYS · 10–21" in vinyl, and
  a "SORRY, WE'RE CLOSED" card hanging inside. Behind the glass it's always
  night: a dark concourse with the blurred discs of a few lit signs and
  their reflections in a wet floor. On the island the door stands on its
  own on the east edge, between two columns, so from behind you see the
  night too and the lettering reads backwards. In the cave it's on the west
  wall near the entrance; in the stockroom, in the north wall behind the
  spare suns.
- **The Agora** is a 36 × 64 m shopping centre after closing:
  - two storeys of shops (24 units) round a long atrium, under a pitched
    glass skylight. The moon is high in the north, visible through the
    glass, and the skylight's steel throws a grid of moonlight down the
    concourse;
  - the concourse has just been mopped: real reflections in the floor,
    sharp in the standing water round the fountain and down the middle,
    soft on the dry terrazzo. CAUTION WET FLOOR boards and the mop bucket
    are where the cleaner stopped;
  - a dry three-tier fountain, coins all over the bottom, with a brass
    placard: PLEASE DO NOT THROW COINS IN THE FOUNTAIN;
  - four palms in marble planters. They're plastic; one has a tag at eye
    height: ARTIFICIAL, DO NOT WATER;
  - most units are shuttered for the night. A few signs are still on:
    Venus (three Venuses in the window, the island's statue as mannequins,
    waving at the concourse), SUNSET OUTLET ("GOLDEN HOUR 70% OFF",
    "EVERYTHING MUST GO", the rails nearly empty), HELIOS TANNING (one tube
    failing), ARCADIA upstairs, and a red OPEN sign in front of a closed
    shutter. Three units are whitewashed and to let;
  - **Plato's Cove Holidays** (G04) is the only shop with its lights on:
    posters of the island ("7 NIGHTS · ALL INCLUSIVE · GOLDEN HOUR
    GUARANTEED*", "*subject to availability"), a desk and an empty chair, a
    1:50 model of the island under perspex in the window, and the island's
    own neon sign, smaller, in the other window. Its door says "ONE
    DESTINATION ONLY", the card in it says BACK IN 5 MINUTES, and it opens
    onto the island;
  - upstairs, **Television City** (U07) has a wall of sets in the window, all
    showing Plato TV, and next door is the **Hotel & Conference Suites**
    entrance (U08): marble, a brass sign, two wall lights left on, and the
    island's door model, through to the conference level (the cave);
  - the escalators are switched off, so both are stairs: OUT OF ORDER,
    PLEASE USE AS STAIRS. You can walk up them, round the whole upper mall,
    and down again;
  - the directory: a backlit plan of both storeys with every unit, an
    index, and YOU ARE HERE;
  - the main entrance at the south end is shuttered, with a notice: THIS
    ENTRANCE IS CLOSED, please use another entrance. There isn't one. Above
    it, THE AGORA, and a clock stopped at nine;
  - at the north end, under a green EXIT sign, a STAFF ONLY door to the
    service corridor: the stockroom. The customer toilets are closed for
    cleaning.
- **Look.** Blue moonlight, warm night lights here and there, neon. The
  vaporwave grade, with the bloom a little wider and the corners darker.
  The fade into the mall is a deep night blue.
- **Sound.** Muzak: the music summed to mono and played through small
  ceiling speakers (you can see them) into a long, bright atrium reverb,
  over the air handling.

**Why this one.** The first try, the island's own blockout, was the next
step of the allegory (Plato's Forms), but too niche to read and too close
to the island to be worth the trip. The mall goes the other way: not
further back behind the show but out front, to where it's sold. The round
1 log had rejected a dead mall as "a different dream, not the next room";
as the hub it doesn't have to be the next room, and it makes the
connections mean something: you book the island at a travel agent, the
cave is the hotel's conference room, the stockroom is the mall's back of
house. It's squarely in vaporwave's own territory (dead malls, muzak,
plastic palms) and it reuses the island's props as merchandise: the
statue as mannequins, the boombox as stock, the columns in the model, the
neon in the window, Plato TV in the TV shop.

**Plumbing changed.** Kept from the first try: doors as level data
(`Level.doors`) with derived arrivals, lazy worlds (`notReady` /
`markWorldReady`), per-world post-processing, `qa_doors` / `qa_renderInfo`,
and `scripts/door-test.mjs`. New: storeys (floor patches and ramps,
colliders with a vertical extent, doors and arrivals with a floor height,
door triggers per floor), the `mall` acoustic (replacing `dry`), real floor
reflections, and a frame-time cap in the controller (0.1 s) so a hitch
can't carry the player through a collider or off a ramp. The first try's
two Poly Haven assets and the n8ao dependency were removed; the mall uses
no downloaded files. First-load cost: the mall entrance (canvas
textures and boxes) and the mall's layout data are in the main bundle; the
mall's code (15 KB gzipped) loads when a door to it is first in reach.
In the mall itself, expect around 650–1,050 draw calls a frame (the
reflection pass roughly doubles the scene, and Plato TV renders the island
for the TV shop); hidden, it costs the other worlds nothing.

**Open threads for future rounds.**

- **The other entrance.** The notice on the shuttered main entrance says to
  use another entrance. There isn't one, and the shutter is the only thing
  between the mall and its car park, which nobody has seen. Like the
  loading bay, it's a way "outside"; best kept shut.
- **Who's back in 5 minutes.** The travel agency's card says the same as
  the stockroom clerk's. It may be the same person; there is never anyone
  there.
- **Golden hour, guaranteed.** The agency's poster guarantees the golden
  hour, subject to availability. The stockroom's inventory has it on loan,
  indefinitely. The outlet downstairs has it at 70% off.
- **The upper mall** has three empty units (to let) and a closed food hall,
  the Palm Court. Room for something, behind a shutter or a whitewashed
  window.
- Door #11 is still "NOT YET HUNG". The mall entrances aren't stock doors
  (they're the mall's, glass and bronze), so the stockroom's count stays
  honest: 11 doors, 3 out.

### Round 3: the Sunset Motel

**Added.** A fifth world, reached through a staff door in the cave's east
wall. It is a 44 × 34 m courtyard motel at permanent golden hour, the kind
of place the mall's Hotel & Conference Suites would put you up in if the
conference had run long.

- **The door.** A plain staff door in the cave's east wall, midway along,
  with a teal plaque: SUNSET MOTEL · VACANCY. The same warm light leaks
  under it as under the stockroom's door, which is the only clue that the
  sun is on the other side.
- **The courtyard.** The gate you arrive through is in the east wall,
  between two pylons under a board: SUNSET MOTEL, VACANCY, and a small
  plaque: GOLDEN HOUR PROVIDED BY PLATO'S COVE HOLIDAYS. The building is
  two storeys, six bays, a balcony running the length of it with towels
  over the rail, and an outside stair at the east end. The office is the
  far west bay: counter, key rack, clock stopped at six, guest book, bell,
  a lamp left on, and the Helios bust on the counter.
- **The pool.** 14 × 8 m, empty of people, full of water that reflects the
  sunset; a sun painted on the bottom, a diving board, a chrome ladder, a
  ring left floating. The pool rules are on a post by the shallow end. The
  water is fine. Please do not feed the sun.
- **Rooms 1–11.** Ground floor 1–5, upper 6–11. One room is lit warm
  (number 2), one is lit blue by a television (number 9), the rest are
  dark. A DO NOT DISTURB hangs on 8. The keys are all in their slots.
- **Around the courtyard.** Four loungers and two parasols, a plastic
  table with two chairs and a boombox, three palms, the Venus statue on a
  plinth by the pool, the maid's cart parked under the balcony, a vending
  machine and an ice machine by the gate, a payphone with its cord, a
  standing ashtray with one cigarette in it, and a sign by the pool.
- **Look.** Everything the island has, one layer down and with a front
  desk: pink stucco, teal doors and railings, chrome, cream deck paint,
  a low sun in the west behind two ridges, stars already out at the top of
  the sky, neon VACANCY and a neon border on the board. Fog is warm and
  close, the bloom a little wider than the island's, the vignette a little
  darker. The fade in is the colour of the deck at sunset.
- **Sound.** A fifth acoustic, `court`: the music through the motel's
  outdoor speaker, into a short 2.6 s slap off the building, dry and
  closed-in, with the air handling gone. It is the quietest world; the
  water is the loudest thing in it.

**Why this one.** The island is the show, the cave the audience, the
stockroom the props, the mall the box office. The motel is where the
audience stays: the golden hour is on loan from the stockroom, sold by the
travel agency, and provided by Plato's Cove Holidays. It is also the most
directly vaporwave room left — the empty resort at dusk, the pool nobody
swims in, the ice machine humming — and it reuses the island's own
vocabulary (Venus, Helios, the boombox, the sun) as furniture rather than
merchandise. After the mall's dark blue night, a world that is all warm
low sun made a good fifth room.

**Plumbing changed.** A new lazy world (`notReady` / `markWorldReady`),
a fifth acoustic (`court`), and one new door each way in `worldStore` and
`levels.ts`. All textures are procedural canvas (`motel/textures.ts`); no
new binary assets. The water is a custom shader: sky reflection, sun
glitter, a little sparkle, no planar reflection pass. The motel is 411
draw calls and 36k triangles in the courtyard, and hidden it costs the
other worlds nothing. Its group is in `IslandFeed`'s `others`, though it
does not watch Plato TV. The door test covers cave → motel → cave.

**Open threads for future rounds.**

- **The other guest.** The maid's cart is full, the ice machine is on, and
  the payphone has a dial tone. Whoever is back in five minutes is not
  here either.
- **The golden hour.** The plaque says it is provided by Plato's Cove
  Holidays. The agency's poster says guaranteed, subject to availability.
  The stockroom has it on loan, indefinitely. The motel is where those
  three sentences meet, and none of them explains who is paying.
- **The rooms upstairs.** Only one is lit. The rest have their keys in the
  rack, their curtains drawn, and their televisions off. They could be
  empty, or the motel could be full; there is no register to check.
- **The road.** There is no road to the motel, only the gate back into the
  cave. The hills outside the fence are silhouettes and nothing else. Like
  the loading bay and the mall's car park, the way out is best kept shut.
