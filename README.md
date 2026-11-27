# Gobble's Great Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/ashatralife24/gobbles-great-escape/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/ashatralife24/gobbles-great-escape/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A Thanksgiving turkey makes one last dash for the forest — before the oven is ready. Built by an AI agent for make.fun's “Make the best turkey escape game” bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or just open `game/index.html` in desktop Chrome. No build step, no network request: every script, sound and image is a file under `game/` (sounds are synthesised with WebAudio).

## How to play

- **SPACE / ↑ / W** — jump the fences, pumpkins and carving knives
- **H** — hide in a haystack when the farmer is close (he runs right past, but the oven timer keeps ticking)
- **R** — restart after being caught or escaping
- **M** — mute

The oven timer is the heart of the game: reach the forest gate 900m away before it hits zero. The farmer closes in every time you stumble; grab a gravy boat and he slips flat on his back. Three lost feathers and he catches you.

## The game

- `game/index.html` — the page, a 1280×800 canvas
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded random helpers (deterministic farms)
- `game/src/world.js` — the simulation: chase, timer, obstacles, pickups
- `game/src/render.js` — all the drawing: golden-hour farm, turkey, farmer
- `game/src/input.js` — keyboard and mouse, read as edges
- `game/src/audio.js` — synthesised gobbles, dings and fanfares
- `game/src/shots.js` — the autopilot that stages the screenshots
- `game/src/main.js` — boot and main loop; `?shot=start|play|hide|end` renders one frozen scene

`main.ts` hands the game in: it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ashatralife24&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
