// Gobble's Great Escape — the hand-in program (Node 22, standard
// library only). It copies the game and its screenshots from beside
// this file into the output directory and writes the dossier the judge
// reads, using the kit's vendored buildDossier. The game itself is
// plain static files under game/ (index.html and its ES modules, no
// library, no network request), so what the grader runs is exactly
// what a browser plays.
//
// The repository directory is found from this file's own URL, never
// from the working directory: the grader runs `node /bot/main.ts`
// from elsewhere, and process.cwd() would point at the wrong place.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error(`game/index.html not found next to main.ts (${gameDir})`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes
// shapes the bytes; the others refuse an entry the scorer would
// refuse (more than 4 screenshots or one over 256 KiB; more than 993
// files in game/ or 48 MiB of game files, in all, or a path under
// game/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Read the dossier back and check it parses: a hand-in that cannot
// be read back is not a hand-in. Also confirm the screenshots landed
// in a fixed order (the first by name is the cover the judge sees).
const written = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (typeof written !== 'object' || written === null) {
  throw new Error('dossier.json did not read back as JSON');
}
const shotNames = readdirSync(join(out, 'screenshots')).sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`Gobble's Great Escape handed in to ${out}`);
console.log(`screenshots: ${shotNames.join(', ')} (dossier.json ${dossierBytes} bytes)`);
