// Gobble's Great Escape — the farm, the chase and the oven timer.
// A pure simulation: given a seed and a fixed step size it always plays
// out the same way, which is what makes the screenshot scenes and the
// play-tests repeatable. The renderer only draws this state; it never
// changes the rules.
import {
  VIEW_W, GROUND_Y, OVEN_SECONDS, GOAL_DISTANCE, PX_PER_M,
  TURKEY_X, TURKEY_W, TURKEY_H, RUN_SPEED, STUMBLE_SPEED, STUMBLE_TIME,
  JUMP_VY, GRAVITY, FARMER_START_GAP, FARMER_CLOSE_RATE, STUMBLE_GAP_LOSS,
  GRAVY_GAP_GAIN, FARMER_PASS_GAP, HIDE_FARMER_SPEED, MAX_FEATHERS,
  CORN_SCORE, GRAVY_SCORE, HIDE_WINDOW,
} from './config.js';
import { mulberry32, range } from './random.js';

const SPAWN_GAP_MIN = 430;
const SPAWN_GAP_MAX = 720;
const OBSTACLE_DEFS = {
  fence: { w: 46, h: 96 },
  pumpkin: { w: 74, h: 54 },
  knife: { w: 34, h: 66 },
  haystack: { w: 138, h: 118 },
};

function makeTurkey() {
  return {
    x: TURKEY_X, y: GROUND_Y - TURKEY_H, vy: 0,
    grounded: true, hiding: false, hideT: 0,
    stumbleT: 0, anim: 0, waddle: 0,
  };
}

function makeLeaves(rng) {
  const leaves = [];
  for (let i = 0; i < 16; i += 1) {
    leaves.push({
      x: rng() * VIEW_W, y: 60 + rng() * 420,
      size: 7 + rng() * 9, sway: rng() * 6.28,
      fall: 12 + rng() * 22, hue: rng(),
    });
  }
  return leaves;
}

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const world = {
    seed, rng,
    phase: 'title', // title | play | over
    outcome: null, // escaped | caught | oven (once over)
    time: 0, distance: 0, score: 0,
    timer: OVEN_SECONDS, feathers: MAX_FEATHERS,
    speed: 0, gap: FARMER_START_GAP, slipT: 0,
    turkey: makeTurkey(),
    farmer: { slipT: 0, sliding: false },
    obstacles: [], pickups: [], particles: [],
    leaves: makeLeaves(rng),
    nextSpawnIn: 500, dustT: 0,
    shake: 0, message: '', messageT: 0,
    events: [], banner: '',
  };
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
  world.phase = 'play';
}

function showMessage(world, text, seconds) {
  world.message = text;
  world.messageT = seconds;
}

function burstFeathers(world, count) {
  for (let i = 0; i < count; i += 1) {
    world.particles.push({
      kind: 'feather', x: world.turkey.x + TURKEY_W / 2, y: world.turkey.y + 30,
      vx: range(world.rng, -160, 160), vy: range(world.rng, -260, -40),
      life: 0, maxLife: range(world.rng, 0.7, 1.3),
      rot: range(world.rng, 0, 6.28), vr: range(world.rng, -6, 6),
      size: range(world.rng, 7, 13),
    });
  }
}

function puffDust(world) {
  world.particles.push({
    kind: 'dust', x: world.turkey.x + 12, y: GROUND_Y - 4,
    vx: range(world.rng, -70, -20), vy: range(world.rng, -50, -10),
    life: 0, maxLife: 0.55, rot: 0, vr: 0, size: range(world.rng, 6, 12),
  });
}

function spawnPattern(world) {
  const roll = world.rng();
  const x = VIEW_W + 90;
  if (roll < 0.30) {
    world.obstacles.push({ kind: 'fence', ...OBSTACLE_DEFS.fence, x, hit: false });
  } else if (roll < 0.52) {
    world.obstacles.push({ kind: 'pumpkin', ...OBSTACLE_DEFS.pumpkin, x, hit: false });
  } else if (roll < 0.70) {
    world.obstacles.push({ kind: 'knife', ...OBSTACLE_DEFS.knife, x, hit: false });
  } else if (roll < 0.82) {
    world.obstacles.push({ kind: 'haystack', ...OBSTACLE_DEFS.haystack, x, hit: false });
  } else if (roll < 0.92) {
    for (let i = 0; i < 3; i += 1) {
      world.pickups.push({ kind: 'corn', x: x + i * 64, y: GROUND_Y - 46, taken: false, bob: i * 2.1 });
    }
  } else {
    world.pickups.push({ kind: 'gravy', x, y: GROUND_Y - 44, taken: false, bob: 0 });
  }
  world.nextSpawnIn = range(world.rng, SPAWN_GAP_MIN, SPAWN_GAP_MAX);
}

function stumble(world, obstacle) {
  obstacle.hit = true;
  const turkey = world.turkey;
  turkey.stumbleT = STUMBLE_TIME;
  turkey.vy = 0;
  world.feathers -= 1;
  world.gap -= STUMBLE_GAP_LOSS;
  world.shake = 16;
  burstFeathers(world, 9);
  world.events.push('stumble');
  if (world.feathers <= 0) {
    world.phase = 'over';
    world.outcome = 'caught';
    world.events.push('caught');
    showMessage(world, 'CAUGHT!', 3);
  } else {
    showMessage(world, 'OUCH! The farmer gains!', 1.4);
  }
}

function stepParticles(world, dt) {
  for (const p of world.particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'feather') p.vy += 500 * dt;
    if (p.kind === 'dust') p.size += 14 * dt;
    p.rot += p.vr * dt;
  }
  world.particles = world.particles.filter((p) => p.life < p.maxLife);
  for (const leaf of world.leaves) {
    leaf.sway += dt * 1.4;
    leaf.x -= (18 + leaf.fall * 0.4) * dt;
    leaf.y += leaf.fall * dt * 0.35;
    if (leaf.x < -20) { leaf.x = VIEW_W + 10; leaf.y = 40 + world.rng() * 300; }
    if (leaf.y > GROUND_Y) leaf.y = 50;
  }
}

// Advance the simulation by dt seconds. `input` is { jump, hide } where
// each field is true only on the frame the key was pressed.
export function stepWorld(world, input, dt) {
  world.events = [];
  if (world.phase !== 'play') return world.events;
  const turkey = world.turkey;
  world.time += dt;

  // The oven timer is the heart of the game: it never stops, not even
  // while the turkey hides in a haystack.
  world.timer -= dt;
  if (world.timer <= 0) {
    world.timer = 0;
    world.phase = 'over';
    world.outcome = 'oven';
    world.events.push('caught');
    showMessage(world, 'THE OVEN IS READY...', 3);
    return world.events;
  }

  // Hiding: the turkey crouches inside a haystack and the farmer runs
  // straight past it. Distance stalls while hidden — hiding costs time.
  if (turkey.hiding) {
    turkey.hideT += dt;
    world.gap -= HIDE_FARMER_SPEED * dt;
    if (world.gap <= -8) {
      world.gap = FARMER_PASS_GAP;
      turkey.hiding = false;
      turkey.hideT = 0;
      world.events.push('farmer-passed');
      showMessage(world, 'He ran right past!', 1.6);
    } else if (turkey.hideT >= HIDE_WINDOW || input.jump || input.hide) {
      turkey.hiding = false;
      turkey.hideT = 0;
    }
  } else if (input.hide) {
    const nearHay = world.obstacles.some((o) => o.kind === 'haystack'
      && !o.hit && o.x < turkey.x + TURKEY_W + 40 && o.x + o.w > turkey.x - 40);
    if (nearHay && turkey.grounded) {
      turkey.hiding = true;
      turkey.hideT = 0;
      world.events.push('hide');
      showMessage(world, 'HIDDEN! Hold still...', 1.6);
    }
  }

  // Speed: full tilt, slower while recovering from a stumble, stopped
  // while hiding.
  const target = turkey.hiding ? 0 : turkey.stumbleT > 0 ? STUMBLE_SPEED : RUN_SPEED;
  world.speed += (target - world.speed) * Math.min(1, dt * 6);
  if (turkey.stumbleT > 0) turkey.stumbleT -= dt;

  // Jump physics.
  if (input.jump && turkey.grounded && !turkey.hiding) {
    turkey.vy = JUMP_VY;
    turkey.grounded = false;
    world.events.push('jump');
  }
  if (!turkey.grounded) {
    turkey.vy += GRAVITY * dt;
    turkey.y += turkey.vy * dt;
    if (turkey.y >= GROUND_Y - TURKEY_H) {
      turkey.y = GROUND_Y - TURKEY_H;
      turkey.vy = 0;
      turkey.grounded = true;
    }
  }
  turkey.anim += dt * (turkey.grounded ? world.speed : 2);
  turkey.waddle = Math.sin(turkey.anim * 2.2) * 4;

  // The farmer closes in, unless he is flat on his back after slipping.
  if (world.farmer.slipT > 0) {
    world.farmer.slipT -= dt;
    if (world.farmer.slipT <= 0) world.farmer.sliding = false;
  } else if (!turkey.hiding) {
    world.gap -= FARMER_CLOSE_RATE * dt;
  }
  if (world.gap <= 0.5 && !turkey.hiding) {
    world.phase = 'over';
    world.outcome = 'caught';
    world.events.push('caught');
    showMessage(world, 'CAUGHT!', 3);
    return world.events;
  }

  // Scroll the farm and earn distance + score.
  const scrollPx = world.speed * PX_PER_M * dt;
  world.distance += world.speed * dt;
  world.score += world.speed * dt;
  if (world.distance >= GOAL_DISTANCE) {
    world.distance = GOAL_DISTANCE;
    world.score += Math.ceil(world.timer) * 10;
    world.phase = 'over';
    world.outcome = 'escaped';
    world.events.push('escape');
    showMessage(world, 'FREE!', 3);
    return world.events;
  }

  // Spawn new farm pieces ahead.
  world.nextSpawnIn -= scrollPx;
  if (world.nextSpawnIn <= 0) spawnPattern(world);

  // Move everything left and resolve collisions.
  const tLeft = turkey.x + 10;
  const tRight = turkey.x + TURKEY_W - 10;
  const tBottom = turkey.y + TURKEY_H;
  for (const o of world.obstacles) {
    o.x -= scrollPx;
    if (o.hit || o.kind === 'haystack') continue;
    const top = GROUND_Y - o.h;
    if (o.x < tRight && o.x + o.w > tLeft && tBottom > top + 14 && !turkey.hiding) {
      stumble(world, o);
      if (world.phase !== 'play') return world.events;
    }
  }
  for (const p of world.pickups) {
    p.x -= scrollPx;
    p.bob += dt * 4;
    if (p.taken) continue;
    const py = p.y + Math.sin(p.bob) * 5;
    if (p.x < tRight + 14 && p.x + 44 > tLeft - 14
      && py < tBottom && py + 40 > turkey.y + 20) {
      p.taken = true;
      if (p.kind === 'corn') {
        world.score += CORN_SCORE;
        world.events.push('corn');
      } else {
        world.score += GRAVY_SCORE;
        world.gap += GRAVY_GAP_GAIN;
        world.farmer.slipT = 2.4;
        world.farmer.sliding = true;
        world.events.push('gravy');
        showMessage(world, 'GRAVY! The farmer slipped!', 1.8);
      }
    }
  }
  world.obstacles = world.obstacles.filter((o) => o.x + o.w > -160);
  world.pickups = world.pickups.filter((p) => p.x > -120 && !p.taken);

  // Dust while running, shake decay, message decay.
  world.dustT -= dt;
  if (turkey.grounded && !turkey.hiding && world.speed > 4 && world.dustT <= 0) {
    puffDust(world);
    world.dustT = 0.13;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 40);
  if (world.messageT > 0) {
    world.messageT -= dt;
    if (world.messageT <= 0) world.message = '';
  }
  stepParticles(world, dt);
  return world.events;
}

// How far the turkey still has to run, in whole metres.
export function distanceLeft(world) {
  return Math.max(0, Math.ceil(GOAL_DISTANCE - world.distance));
}

export function formatTimer(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
