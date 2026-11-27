// Headless play-test for Gobble's Great Escape (Node, no browser).
// Runs the autopilot from several seeds, checks determinism, and checks
// that a careless player (never jumps) gets caught while a pilot escapes.
import { createWorld, resetWorld, stepWorld } from './game/src/world.js';
import { probeEscape, autopilot as autopilotForTest } from './game/src/shots.js';

const STEP = 1 / 60;
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures += 1;
}

// 1. Autopilot escapes on the default seed and on a few others.
for (const seed of [1, 2, 3, 7, 42]) {
  const r = probeEscape(seed);
  check(`autopilot escapes seed=${seed}`, r.outcome === 'escaped',
    `outcome=${r.outcome} score=${r.score} time=${r.time.toFixed(1)}s dist=${r.distance}m`);
}

// 2. Determinism: two identical runs give identical states.
function runTrace(seed) {
  const w = createWorld(seed);
  resetWorld(w);
  const trace = [];
  for (let i = 0; i < 60 * 30; i += 1) {
    stepWorld(w, { jump: i % 90 === 0, hide: false }, STEP);
    if (i % 300 === 0) trace.push([w.distance.toFixed(3), Math.floor(w.score), w.feathers, w.gap.toFixed(3)]);
    if (w.phase !== 'play') break;
  }
  return JSON.stringify(trace) + '|' + w.phase + '|' + w.outcome;
}
check('deterministic trace seed=5', runTrace(5) === runTrace(5), runTrace(5).slice(0, 120));

// 3. A player who never jumps gets caught (the game can be lost).
{
  const w = createWorld(1);
  resetWorld(w);
  for (let i = 0; i < 60 * 120 && w.phase === 'play'; i += 1) stepWorld(w, { jump: false, hide: false }, STEP);
  check('never-jump player is caught', w.phase === 'over' && w.outcome !== 'escaped',
    `outcome=${w.outcome} feathers=${w.feathers} time=${w.time.toFixed(1)}s`);
}

// 4. The oven timer alone can end a run: a world with 3 seconds left
// on the clock ends with outcome 'oven', whatever the turkey does.
{
  const w = createWorld(1);
  resetWorld(w);
  w.timer = 3;
  for (let i = 0; i < 60 * 10 && w.phase === 'play'; i += 1) stepWorld(w, { jump: false, hide: false }, STEP);
  check('oven timer ends a run at zero', w.phase === 'over' && w.outcome === 'oven',
    `outcome=${w.outcome} timer=${w.timer.toFixed(1)}s time=${w.time.toFixed(1)}s`);
}

// 5. Gravy pickup slips the farmer (gap grows). Steer with the same
// autopilot the screenshots use, so the turkey actually survives to
// reach a gravy boat.
{
  const w = createWorld(3);
  resetWorld(w);
  let sawGravy = false;
  let gapBefore = 0;
  let gapAfter = 0;
  for (let i = 0; i < 60 * 120 && w.phase === 'play'; i += 1) {
    gapBefore = w.gap;
    const ev = stepWorld(w, autopilotForTest(w), STEP);
    if (ev.includes('gravy')) { sawGravy = true; gapAfter = w.gap; break; }
  }
  check('gravy pickup slips the farmer', sawGravy && gapAfter > gapBefore,
    `gap ${gapBefore.toFixed(1)} -> ${gapAfter.toFixed(1)}`);
}

console.log(failures === 0 ? 'ALL PLAY-TESTS PASSED' : `${failures} PLAY-TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
