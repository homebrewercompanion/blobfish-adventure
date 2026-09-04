# Blobfish Adventure

A 3D underwater adventure game. Runs in any modern browser — no install, no app store,
no downloads. Built for a tablet with touch controls, works with keyboard on a PC.

## How to run it

**Double-click `play.bat`.**

That starts the local web server, opens the game on this PC, and prints the address
to type on the tablet. Leave that black window open while playing; close it to stop.

The game uses ES modules, so it has to be served over HTTP — double-clicking
`index.html` will *not* work. That is the only reason the server is needed.

### Playing on the tablet

`play.bat` prints something like `http://192.168.0.42:8123/` (yours will differ). Type that into Chrome
on the tablet. Both devices must be on the same Wi-Fi, and the PC must stay on.

### Making it work without the PC (optional)

The repo is private, and free GitHub Pages only serves **public** repos. To get a
permanent URL that works any time:

1. GitHub → the repo → Settings → General → bottom → *Change visibility* → Public
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)` → Save
3. Wait about a minute for `https://homebrewercompanion.github.io/blobfish-adventure/`

On the tablet, open that URL, then Chrome menu → *Add to Home screen*. It launches
fullscreen like a real app, with no PC involved.

## Controls

|            | Tablet                          | Keyboard          |
| ---------- | ------------------------------- | ----------------- |
| Move       | Left thumbstick (touch anywhere on the left) | WASD / arrows |
| Look       | Drag the right side of the screen | Drag with the mouse |
| Jump       | JUMP button                     | Space             |
| Dash       | DASH button (unlocked in quest 1) | Shift           |
| Talk / use | TALK button                     | E                 |
| Quests     | Quests button                   | J                 |
| Menu       | Menu button                     | Esc               |

Progress saves automatically to the browser. **Menu → Bubble Travel** teleports
between any area already visited, so nobody has to walk 150 units back to a shop.

## The story

The Great Bubble Vent that keeps the Deep warm has gone out. Five Glow Pearls are
missing from its sockets. Find all five and light it back up.

1. **Snack Attack** — Grandma Wobble. Learn to move and collect. Unlocks DASH.
2. **The Vent Went Out** — Professor Glub sends you to look at the dead Vent.
3. **Crabby Business** — Shelly Shopkeep's crates were stolen by crabs. → **Pearl 1**
4. **Into the Tangle** — Buy a Glow Lantern, then light three anemones in the pitch-dark
   Kelp Tangle. → **Pearl 2**
5. **A Very Fair Deal** — Mr. Pennysquish will sell you a pearl for 200 Blubbles, *or*
   give it free if you find his lost lucky coin. Two ways to solve it. → **Pearl 3**
6. **The Vault Run** — Grab 25 gold coins in 60 seconds. Retryable. → **Pearl 4**
7. **Cheering Up a King** — King Grumpfish is cold, his throne is lumpy, and nobody has
   made him laugh in a year. Fix all three. → **Pearl 5** + the crown
8. **Light the Deep** — Return to the Vent. The whole ocean warms up and changes colour.

Side quests: **Hide and Squeak** (find Pip three times) and **Twelve Little Friends**
(twelve baby blobfish hidden across the map) keep going after the story ends.

## What makes it moreish

- Blubbles everywhere, with a combo counter that raises the pickup pitch as you chain
  them and pays a bonus every 5 — the core "just one more" loop.
- XP bar and eight rank titles (Tiny Blob → Legend of the Deep) that fill constantly.
- A shop with upgrades that visibly change play: Snack Magnet, Bubble Belt (higher
  jump), Speedy Fins, plus eight collectable hats and a wardrobe to switch them.
- A golden arrow that always points at the current objective, so nobody gets lost or
  stuck — it hides when you are close.
- No death, no fail state, no timers except one retryable minigame.
- Zone title cards, screen shake, particle bursts, squash-and-stretch on every jump.
- The world visibly changes at the end: the fog turns warm and the lights come up.

## How it is built

| File               | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `index.html`       | UI, HUD, dialogue, shop/journal/menu panels, touch controls      |
| `src/blobfish.js`  | Procedural blobfish + hats + the blobfish-shaped shop building   |
| `src/world.js`     | Sea floor, zones, landmarks, kelp, colliders, ambience           |
| `src/story.js`     | All quests, NPCs, dialogue and shop stock — pure data            |
| `src/game.js`      | Game loop, player, camera, quest engine, save, UI wiring         |
| `src/audio.js`     | Synthesised sound effects (WebAudio)                             |

**No 3D model files and no textures.** Every character, hat and building is generated
from spheres, boxes and cones in code, so there is no asset pipeline, nothing to
export from Blender, and nothing that can fail to download. The only external
dependency is Three.js from a CDN.

To change the story — new quests, dialogue, prices, NPCs — edit `src/story.js` only.
The engine reads it as data.

`window.__blob` is exposed in the browser console (`__blob.P` for player position,
`__blob.warp(x, z)` to teleport, `__blob.save` for save state) for debugging.
