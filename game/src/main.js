// Gobble's Great Escape — boot and main loop.
// ?shot=start|play|hide|end&seed=N renders one frozen scene for the
// screenshots. Without it, the game runs interactively: title screen,
// play, end screen, restart.
import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { drawWorld } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const audio = createAudio();
const input = createInput(canvas);

function playEventSound(event) {
  if (event === 'jump') audio.jump();
  else if (event === 'corn') audio.corn();
  else if (event === 'gravy') audio.gravy();
  else if (event === 'stumble') audio.stumble();
  else if (event === 'hide') audio.hide();
  else if (event === 'escape') audio.fanfare();
  else if (event === 'caught') audio.caught();
  else if (event === 'farmer-passed') audio.gobble();
}

if (shotName) {
  // Screenshot mode: stage the scene once and draw it. No loop, no
  // sound, no input — the frame is exactly what the autopilot reached.
  const world = stageShot(shotName, seed);
  drawWorld(ctx, world);
  document.title = `Gobble's Great Escape — ${shotName}`;
} else {
  const world = createWorld((Date.now() % 100000) + 7);
  world.phase = 'title';
  let last = performance.now();
  let gobbleT = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const edges = input.drain();
    audio.setMuted(input.muted);
    if (edges.start || edges.click) audio.unlock();

    if (world.phase === 'title') {
      world.time += dt;
      gobbleT += dt;
      if (gobbleT > 6) { gobbleT = 0; audio.gobble(); }
      if (edges.start || edges.click) {
        resetWorld(world);
        audio.gobble();
      }
    } else if (world.phase === 'play') {
      const events = stepWorld(world, { jump: edges.jump, hide: edges.hide }, dt);
      for (const event of events) playEventSound(event);
    } else if (world.phase === 'over') {
      world.time += dt;
      if (edges.restart || edges.start || edges.click) {
        resetWorld(world);
        audio.gobble();
      }
    }
    drawWorld(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
