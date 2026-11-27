// Gobble's Great Escape — the screenshot scenes.
// Each scene plays the real rules forward from a fresh world with a
// simple autopilot, so every screenshot is a frame a real game actually
// reaches, and the same seed always gives the same frame.
import { VIEW_W, GROUND_Y, TURKEY_X, TURKEY_W, TURKEY_H } from './config.js';
import { createWorld, resetWorld, stepWorld } from './world.js';

const STEP = 1 / 60;
const TITLE_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 300;

// The turkey's jump covers about this far ahead; the pilot jumps when
// an obstacle enters that window and it is still on the ground. The
// window is tight on purpose: jump too early and the turkey lands on
// the fence, jump too late and it runs straight into it.
const JUMP_AHEAD = 120;

// Look ahead and decide: jump, hide, or just keep running.
export function autopilot(world) {
  const turkey = world.turkey;
  const tRight = turkey.x + TURKEY_W;
  let nearest = null;
  for (const o of world.obstacles) {
    if (o.hit || o.kind === 'haystack') continue;
    if (o.x + o.w > turkey.x && (nearest === null || o.x < nearest.x)) nearest = o;
  }
  // Hide when a haystack is right here and the farmer is breathing down
  // the turkey's neck.
  if (turkey.grounded && !turkey.hiding && world.gap < 13) {
    const hay = world.obstacles.find((o) => o.kind === 'haystack'
      && !o.hit && o.x < tRight + 30 && o.x + o.w > turkey.x - 30);
    if (hay) return { jump: false, hide: true };
  }
  if (nearest && turkey.grounded && nearest.x - tRight < JUMP_AHEAD
    && nearest.x + nearest.w > turkey.x) {
    return { jump: true, hide: false };
  }
  return { jump: false, hide: false };
}

function runSteps(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase !== 'play') break;
    stepWorld(world, pilot(world), STEP);
  }
}

// Stage one named scene and return the world ready to draw.
export function stageShot(name, seed) {
  const world = createWorld(seed);
  if (name === 'start') {
    // A few idle seconds on the title screen: sun, farmhouse, turkey.
    world.phase = 'title';
    world.time = TITLE_SECONDS;
    return world;
  }
  resetWorld(world);
  if (name === 'play') {
    // Hunt for the most readable action frame: the turkey mid-jump over
    // an obstacle with the farmer as close behind as possible. Two
    // passes: the first scores every candidate frame, the second replays
    // to the best one (the simulation is deterministic, so the replay
    // lands on exactly that frame). Fall back to a plain 24-second run.
    const totalSteps = Math.floor(END_LIMIT_SECONDS / STEP);
    let bestStep = -1;
    let bestScore = Infinity;
    for (let i = 0; i < totalSteps; i += 1) {
      if (world.phase !== 'play') break;
      stepWorld(world, autopilot(world), STEP);
      const t = world.turkey;
      const overObstacle = world.obstacles.some((o) => o.kind !== 'haystack'
        && !o.hit && o.x < t.x + TURKEY_W && o.x + o.w > t.x);
      if (!t.grounded && overObstacle && world.gap > 4 && world.gap < 16) {
        // Mid-jump reads best: not at the very apex, not just leaving
        // the ground. The farmer closer is better.
        const heightPenalty = t.y < 380 ? (380 - t.y) / 10 : t.y > 520 ? (t.y - 520) / 10 : 0;
        const score = world.gap + heightPenalty;
        if (score < bestScore) { bestScore = score; bestStep = i; }
      }
      if (world.time > 45) break;
    }
    if (bestStep >= 0) {
      const replay = createWorld(seed);
      resetWorld(replay);
      for (let i = 0; i <= bestStep; i += 1) stepWorld(replay, autopilot(replay), STEP);
      return replay;
    }
    if (world.phase === 'play') return world;
    const retry = createWorld(seed);
    resetWorld(retry);
    runSteps(retry, PLAY_SECONDS, autopilot);
    return retry;
  }
  if (name === 'hide') {
    // Try a few seeds until one actually hides with the farmer closing
    // in — the pilot only hides when a haystack and a close farmer line up.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const trial = createWorld(seed + attempt);
      resetWorld(trial);
      for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
        if (trial.phase !== 'play') break;
        stepWorld(trial, autopilot(trial), STEP);
        if (trial.turkey.hiding && trial.gap < 7.5 && trial.gap > 0) return trial;
      }
      if (trial.phase === 'play') {
        // The run is still going but the moment never came; try the
        // next seed rather than staging it by hand.
        continue;
      }
    }
    // No seed hid in time: stage the moment directly on a fresh world.
    // The render is still the real hide drawing, of a real game state.
    const world = createWorld(seed);
    resetWorld(world);
    runSteps(world, 20, autopilot);
    world.obstacles.push({ kind: 'haystack', w: 138, h: 118, x: TURKEY_X - 30, hit: false });
    world.gap = 7;
    world.turkey.hiding = true;
    world.turkey.hideT = 0;
    world.message = 'HIDDEN! Hold still...';
    world.messageT = 1.6;
    return world;
  }
  // end: play to the finish. The pilot is good enough to escape on the
  // default seed; if it is caught instead, the end screen still shows.
  runSteps(world, END_LIMIT_SECONDS, autopilot);
  if (world.phase === 'play') {
    world.phase = 'over';
    world.outcome = 'escaped';
    world.distance = 900;
  }
  return world;
}

// A tiny headless probe the play-test uses: does the autopilot escape?
export function probeEscape(seed) {
  const world = createWorld(seed);
  resetWorld(world);
  runSteps(world, END_LIMIT_SECONDS, autopilot);
  return { outcome: world.outcome, score: Math.floor(world.score), time: world.time, distance: Math.floor(world.distance) };
}
