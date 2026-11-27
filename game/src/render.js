// Gobble's Great Escape — every pixel the game shows.
// Canvas 2D, drawn by hand: a golden-hour farm at Thanksgiving, a
// waddling turkey, a farmer with a net, and one very hot oven. The
// renderer reads the world state and never changes it.
import {
  VIEW_W, VIEW_H, GROUND_Y, GOAL_DISTANCE, PX_PER_M,
  TURKEY_W, TURKEY_H, MAX_FEATHERS,
} from './config.js';
import { distanceLeft, formatTimer } from './world.js';

const CREAM = '#fff6dd';
const BROWN_DARK = '#4a2c14';
const BROWN = '#8b5a2b';
const ORANGE = '#e8862e';
const GOLD = '#f2c14e';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight, font) {
  ctx.font = `${weight || 700} ${size}px ${font || '"Trebuchet MS", Verdana, sans-serif'}`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function outlinedText(ctx, str, x, y, size, color, outline, align) {
  ctx.font = `900 ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size / 7;
  ctx.strokeStyle = outline;
  ctx.lineJoin = 'round';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawSky(ctx, world) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#f7b95c');
  sky.addColorStop(0.55, '#f78d4e');
  sky.addColorStop(1, '#e86a4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, GROUND_Y + 2);
  // Low golden sun.
  const sunX = 1010;
  const sunY = 190;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
  glow.addColorStop(0, 'rgba(255, 246, 200, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 220, 130, 0.45)');
  glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 260, sunY - 260, 520, 520);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 58, 0, Math.PI * 2);
  ctx.fill();
  // Slow clouds.
  ctx.fillStyle = 'rgba(255, 236, 200, 0.75)';
  const drift = (world.distance * 6) % 1400;
  for (const cx of [200 - drift, 760 - drift, 1320 - drift]) {
    ctx.beginPath();
    ctx.ellipse(cx, 120, 90, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 60, 132, 70, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarmhouse(ctx, world) {
  // The farmhouse sits far back on the right; its kitchen window glows
  // orange — the oven is on. It never moves: the turkey runs away from it.
  const baseX = 1080 - world.distance * 4;
  if (baseX < -320 || baseX > VIEW_W + 320) return;
  const baseY = GROUND_Y;
  ctx.fillStyle = '#7a3b22';
  ctx.fillRect(baseX, baseY - 190, 220, 190);
  ctx.fillStyle = '#5d2a18';
  ctx.beginPath();
  ctx.moveTo(baseX - 14, baseY - 190);
  ctx.lineTo(baseX + 110, baseY - 268);
  ctx.lineTo(baseX + 234, baseY - 190);
  ctx.closePath();
  ctx.fill();
  // Glowing oven window.
  ctx.fillStyle = '#3a1c0e';
  ctx.fillRect(baseX + 36, baseY - 130, 64, 64);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(baseX + 42, baseY - 124, 52, 52);
  ctx.fillStyle = '#e86a1e';
  ctx.fillRect(baseX + 42, baseY - 100, 52, 8);
  ctx.fillStyle = '#3a1c0e';
  ctx.fillRect(baseX + 138, baseY - 130, 46, 46);
  ctx.fillStyle = '#ffd98a';
  ctx.fillRect(baseX + 143, baseY - 125, 36, 36);
  // Chimney with smoke.
  ctx.fillStyle = '#5d2a18';
  ctx.fillRect(baseX + 168, baseY - 258, 30, 70);
  ctx.fillStyle = 'rgba(255, 240, 210, 0.5)';
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(baseX + 183 + Math.sin(world.time * 0.8 + i * 2) * 12, baseY - 290 - i * 26, 12 + i * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrees(ctx, world) {
  const off = (world.distance * PX_PER_M * 0.35) % 420;
  for (let i = -1; i < 4; i += 1) {
    const x = i * 420 - off + 60;
    const h = 150 + (i % 2) * 40;
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(x - 8, GROUND_Y - h * 0.4, 16, h * 0.4);
    // Deep green foliage, so the brown turkey always stands out against it.
    ctx.fillStyle = i % 2 ? '#4a5a1a' : '#55661e';
    ctx.beginPath();
    ctx.arc(x, GROUND_Y - h * 0.62, 62, 0, Math.PI * 2);
    ctx.arc(x - 44, GROUND_Y - h * 0.45, 42, 0, Math.PI * 2);
    ctx.arc(x + 44, GROUND_Y - h * 0.45, 42, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx, world) {
  const dirt = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
  dirt.addColorStop(0, '#b07a3e');
  dirt.addColorStop(1, '#7a4a22');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = '#a8a04a';
  ctx.fillRect(0, GROUND_Y, VIEW_W, 10);
  // Dirt path dashes scrolling with the run.
  const off = (world.distance * PX_PER_M) % 90;
  ctx.fillStyle = 'rgba(90, 50, 16, 0.35)';
  for (let x = -off; x < VIEW_W; x += 90) {
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 52, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Distance signposts every 150 metres.
  for (let m = 150; m < GOAL_DISTANCE; m += 150) {
    const x = (m - world.distance) * PX_PER_M + 300;
    if (x < -40 || x > VIEW_W + 40) continue;
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(x, GROUND_Y - 84, 7, 84);
    ctx.fillStyle = '#e8d8a8';
    roundRect(ctx, x - 34, GROUND_Y - 118, 76, 40, 6);
    ctx.fill();
    text(ctx, `${m}m`, x + 4, GROUND_Y - 97, 19, BROWN_DARK, 'center', 800);
  }
  // The forest gate at the end of the farm.
  const gateX = (GOAL_DISTANCE - world.distance) * PX_PER_M + 300;
  if (gateX > -120 && gateX < VIEW_W + 200) {
    ctx.fillStyle = '#2e4a22';
    ctx.fillRect(gateX - 14, GROUND_Y - 240, 28, 240);
    ctx.fillRect(gateX + 130, GROUND_Y - 240, 28, 240);
    ctx.fillStyle = '#3a5a2a';
    ctx.beginPath();
    ctx.arc(gateX + 72, GROUND_Y - 250, 110, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    roundRect(ctx, gateX - 6, GROUND_Y - 300, 160, 44, 8);
    ctx.fill();
    text(ctx, 'FOREST', gateX + 74, GROUND_Y - 277, 24, '#2e4a22', 'center', 900);
  }
}

function drawHaystack(ctx, x, w, h) {
  const top = GROUND_Y - h;
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y);
  ctx.quadraticCurveTo(x + w * 0.1, top + 18, x + w / 2, top);
  ctx.quadraticCurveTo(x + w * 0.9, top + 18, x + w, GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a87c22';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + w * (0.2 + i * 0.15), GROUND_Y - 8);
    ctx.quadraticCurveTo(x + w * (0.25 + i * 0.13), top + 34, x + w * (0.3 + i * 0.12), top + 12);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8b95a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, top + 26, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFence(ctx, x, w, h) {
  const top = GROUND_Y - h;
  ctx.fillStyle = '#7a4a21';
  ctx.fillRect(x, top, 10, h);
  ctx.fillRect(x + w - 10, top, 10, h);
  ctx.fillStyle = '#96622f';
  ctx.fillRect(x - 6, top + 18, w + 12, 12);
  ctx.fillRect(x - 6, top + 52, w + 12, 12);
  ctx.fillStyle = '#c98d4e';
  ctx.fillRect(x - 6, top + 18, w + 12, 4);
}

function drawPumpkin(ctx, x, w, h) {
  const cx = x + w / 2;
  const cy = GROUND_Y - h / 2 + 6;
  ctx.fillStyle = '#e8862e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b85f14';
  ctx.lineWidth = 3;
  for (const dx of [-w / 4, 0, w / 4]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * 0.5, cy, w / 5, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3a6a22';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2 + 4);
  ctx.quadraticCurveTo(cx + 8, cy - h / 2 - 12, cx + 18, cy - h / 2 - 10);
  ctx.stroke();
}

function drawKnife(ctx, x, w, h) {
  const top = GROUND_Y - h;
  ctx.save();
  ctx.translate(x + w / 2, GROUND_Y - 6);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#2e2e33';
  ctx.fillRect(-6, -h + 26, 12, 30);
  ctx.fillStyle = '#d8dce2';
  ctx.beginPath();
  ctx.moveTo(-7, -h + 26);
  ctx.lineTo(7, -h + 26);
  ctx.lineTo(0, -h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // A glint that says "sharp, do not touch".
  const gx = x + w / 2 + 8;
  const gy = top + 16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx - 10, gy);
  ctx.lineTo(gx + 10, gy);
  ctx.moveTo(gx, gy - 10);
  ctx.lineTo(gx, gy + 10);
  ctx.stroke();
}

function drawCorn(ctx, x, y, bob) {
  const cy = y + Math.sin(bob) * 5;
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.ellipse(x + 16, cy + 16, 13, 20, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 2;
  for (let i = -1; i < 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + 8 + i * 8, cy + 2);
    ctx.lineTo(x + 10 + i * 8, cy + 30);
    ctx.stroke();
  }
  ctx.fillStyle = '#5d8a2e';
  ctx.beginPath();
  ctx.moveTo(x + 4, cy + 30);
  ctx.lineTo(x + 28, cy + 30);
  ctx.lineTo(x + 16, cy + 44);
  ctx.closePath();
  ctx.fill();
}

function drawGravy(ctx, x, y, bob) {
  const cy = y + Math.sin(bob) * 5;
  ctx.fillStyle = '#f4efe2';
  ctx.beginPath();
  ctx.moveTo(x, cy + 10);
  ctx.quadraticCurveTo(x + 22, cy + 34, x + 44, cy + 10);
  ctx.quadraticCurveTo(x + 22, cy + 2, x, cy + 10);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.ellipse(x + 22, cy + 11, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 14, cy - 4);
  ctx.quadraticCurveTo(x + 10, cy - 14, x + 16, cy - 20);
  ctx.stroke();
}

function drawTurkey(ctx, world) {
  const t = world.turkey;
  const x = t.x;
  const y = t.y;
  const legSwing = t.grounded ? Math.sin(t.anim * 2.2) * 10 : 6;
  ctx.save();
  if (world.shake > 0 && t.stumbleT > 0) ctx.rotate(0.12);
  // Tail feathers, fanned.
  ctx.fillStyle = '#7a4a21';
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(x + 14, y + 34);
    ctx.rotate(-0.5 + i * 0.28 + Math.sin(t.anim) * 0.03);
    ctx.beginPath();
    ctx.ellipse(-26, 0, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a87c22';
    ctx.beginPath();
    ctx.ellipse(-48, 0, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a21';
    ctx.restore();
  }
  // Legs: running on the ground they reach the dirt; in the air they
  // tuck up under the body instead of stretching to the ground.
  ctx.strokeStyle = '#f2a541';
  ctx.lineWidth = 5;
  if (t.grounded) {
    ctx.beginPath();
    ctx.moveTo(x + 34, y + TURKEY_H - 16);
    ctx.lineTo(x + 34 + legSwing, GROUND_Y);
    ctx.moveTo(x + 52, y + TURKEY_H - 16);
    ctx.lineTo(x + 52 - legSwing, GROUND_Y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 34, y + TURKEY_H - 16);
    ctx.lineTo(x + 44, y + TURKEY_H + 6);
    ctx.moveTo(x + 52, y + TURKEY_H - 16);
    ctx.lineTo(x + 58, y + TURKEY_H + 2);
    ctx.stroke();
  }
  // Body.
  ctx.fillStyle = BROWN;
  ctx.beginPath();
  ctx.ellipse(x + 40, y + 52, 38, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a8763e';
  ctx.beginPath();
  ctx.ellipse(x + 48, y + 60, 24, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wing, flapping a little as it runs.
  const flap = t.grounded ? Math.sin(t.anim * 2.2) * 0.25 : -0.5;
  ctx.save();
  ctx.translate(x + 38, y + 44);
  ctx.rotate(flap);
  ctx.fillStyle = '#6b4423';
  ctx.beginPath();
  ctx.ellipse(0, 8, 26, 13, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Neck and head.
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(x + 62, y + 6, 12, 30);
  ctx.fillStyle = '#c65b4e';
  ctx.beginPath();
  ctx.arc(x + 70, y + 6, 13, 0, Math.PI * 2);
  ctx.fill();
  // Wattle and beak.
  ctx.fillStyle = '#d23c2e';
  ctx.beginPath();
  ctx.ellipse(x + 76, y + 16, 5, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2a541';
  ctx.beginPath();
  ctx.moveTo(x + 80, y + 2);
  ctx.lineTo(x + 96, y + 7);
  ctx.lineTo(x + 80, y + 12);
  ctx.closePath();
  ctx.fill();
  // Eye, wide with panic.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 72, y + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(x + 74, y + 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFarmer(ctx, world) {
  const gapPx = world.gap * PX_PER_M;
  const x = world.turkey.x - gapPx - 60;
  if (x < -180) return;
  const y = GROUND_Y;
  const run = Math.sin(world.time * 11);
  ctx.save();
  if (world.farmer.sliding) {
    ctx.translate(x + 40, y - 30);
    ctx.rotate(-1.35);
    ctx.translate(-40, 30);
  }
  // Legs.
  ctx.strokeStyle = '#3a5a8a';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x + 34, y - 58);
  ctx.lineTo(x + 34 + run * 14, y);
  ctx.moveTo(x + 52, y - 58);
  ctx.lineTo(x + 52 - run * 14, y);
  ctx.stroke();
  // Body: red shirt, blue overalls.
  ctx.fillStyle = '#b03a2e';
  ctx.beginPath();
  ctx.ellipse(x + 44, y - 92, 34, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a5a8a';
  ctx.fillRect(x + 18, y - 96, 52, 44);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(x + 30, y - 96, 6, 44);
  ctx.fillRect(x + 54, y - 96, 6, 44);
  // Head, beard and straw hat.
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(x + 46, y - 140, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e0c8';
  ctx.beginPath();
  ctx.arc(x + 46, y - 126, 15, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#d9b25f';
  ctx.beginPath();
  ctx.ellipse(x + 46, y - 152, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 46, y - 156, 18, Math.PI, 0);
  ctx.fill();
  // The net, held out in front.
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 66, y - 108);
  ctx.lineTo(x + 104, y - 128);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240, 230, 200, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 116, y - 136, 22, 26, 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 100, y - 150);
  ctx.lineTo(x + 132, y - 122);
  ctx.moveTo(x + 132, y - 150);
  ctx.lineTo(x + 100, y - 122);
  ctx.stroke();
  ctx.restore();
  // Stars circling his head while he slides.
  if (world.farmer.sliding) {
    ctx.fillStyle = GOLD;
    for (let i = 0; i < 3; i += 1) {
      const a = world.time * 5 + i * 2.1;
      ctx.beginPath();
      ctx.arc(x + 46 + Math.cos(a) * 34, y - 158 + Math.sin(a) * 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const alpha = 1 - p.life / p.maxLife;
    if (p.kind === 'feather') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#a8763e';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#d9b98a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Drifting autumn leaves.
  for (const leaf of world.leaves) {
    ctx.save();
    ctx.translate(leaf.x + Math.sin(leaf.sway) * 14, leaf.y);
    ctx.rotate(leaf.sway);
    ctx.fillStyle = leaf.hue > 0.5 ? '#d98a2e' : '#c65b2e';
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFeatherIcon(ctx, x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.6);
  ctx.fillStyle = filled ? '#a8763e' : 'rgba(255,246,221,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = filled ? '#6b4423' : 'rgba(255,246,221,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(14, 0);
  ctx.stroke();
  ctx.restore();
}

function drawHUD(ctx, world) {
  // Top strip.
  ctx.fillStyle = 'rgba(40, 20, 8, 0.55)';
  roundRect(ctx, 14, 12, VIEW_W - 28, 96, 16);
  ctx.fill();
  // Feathers (lives) + score, left.
  text(ctx, 'FEATHERS', 40, 34, 15, CREAM, 'left', 800);
  for (let i = 0; i < MAX_FEATHERS; i += 1) {
    drawFeatherIcon(ctx, 66 + i * 40, 62, i < world.feathers);
  }
  text(ctx, `SCORE ${Math.floor(world.score).toLocaleString('en-US')}`, 40, 92, 20, GOLD, 'left', 800);
  // The oven timer, dead centre and impossible to miss.
  const urgent = world.timer < 20;
  const pulse = urgent ? 1 + Math.sin(world.time * 8) * 0.06 : 1;
  ctx.save();
  ctx.translate(VIEW_W / 2, 60);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = urgent ? '#c22e1e' : '#e86a1e';
  roundRect(ctx, -170, -38, 340, 76, 14);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(-158, -26, 40, 52);
  ctx.fillStyle = '#ff9a3c';
  ctx.fillRect(-152, -20, 28, 40);
  ctx.fillStyle = '#7a2a10';
  ctx.fillRect(-152, -6, 28, 5);
  text(ctx, 'OVEN READY IN', -100, -18, 17, '#ffe9b0', 'left', 800);
  text(ctx, formatTimer(world.timer), -100, 16, 40, '#ffffff', 'left', 900);
  ctx.restore();
  // Distance to the forest gate + farmer gap, right.
  const left = distanceLeft(world);
  const progress = 1 - left / GOAL_DISTANCE;
  text(ctx, `FOREST GATE  ${left}m`, VIEW_W - 40, 34, 17, CREAM, 'right', 800);
  ctx.fillStyle = 'rgba(255,246,221,0.3)';
  roundRect(ctx, VIEW_W - 300, 48, 260, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#7dc24e';
  roundRect(ctx, VIEW_W - 300, 48, 260 * progress, 14, 7);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(VIEW_W - 300 + 260 * progress, 55, 9, 0, Math.PI * 2);
  ctx.fill();
  const gapText = world.turkey.hiding ? 'FARMER: LOOKING...' : `FARMER ${Math.max(0, world.gap).toFixed(0)}m BEHIND`;
  text(ctx, gapText, VIEW_W - 40, 92, 20, world.gap < 6 && !world.turkey.hiding ? '#ff8a7a' : GOLD, 'right', 800);
  // Transient message banner.
  if (world.message) {
    ctx.fillStyle = 'rgba(40, 20, 8, 0.6)';
    const w = ctx.measureText(world.message).width + 60;
    roundRect(ctx, VIEW_W / 2 - w / 2, 128, w, 52, 12);
    ctx.fill();
    text(ctx, world.message, VIEW_W / 2, 155, 26, '#ffe9b0', 'center', 900);
  }
  // Controls hint.
  text(ctx, 'SPACE / UP jump   ·   H hide in a haystack   ·   R restart   ·   M mute', VIEW_W / 2, VIEW_H - 22, 16, 'rgba(255,246,221,0.75)', 'center', 600);
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(60, 25, 5, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  outlinedText(ctx, "GOBBLE'S", VIEW_W / 2, 190, 96, GOLD, BROWN_DARK);
  outlinedText(ctx, 'GREAT ESCAPE', VIEW_W / 2, 282, 96, CREAM, BROWN_DARK);
  text(ctx, 'A Thanksgiving turkey makes one last dash for the forest.', VIEW_W / 2, 356, 26, CREAM, 'center', 600);
  // The oven timer, previewed on the title screen.
  ctx.fillStyle = 'rgba(40, 20, 8, 0.65)';
  roundRect(ctx, VIEW_W / 2 - 260, 396, 520, 74, 14);
  ctx.fill();
  text(ctx, 'THE OVEN IS HEATING — 01:40 ON THE CLOCK', VIEW_W / 2, 420, 22, '#ffb347', 'center', 800);
  text(ctx, 'Reach the forest gate before it is ready.', VIEW_W / 2, 450, 19, CREAM, 'center', 600);
  // Controls.
  ctx.fillStyle = 'rgba(40, 20, 8, 0.65)';
  roundRect(ctx, VIEW_W / 2 - 300, 496, 600, 108, 14);
  ctx.fill();
  text(ctx, 'SPACE / UP — jump the fences and pumpkins', VIEW_W / 2, 522, 21, CREAM, 'center', 600);
  text(ctx, 'H — hide in a haystack when the farmer is close', VIEW_W / 2, 552, 21, CREAM, 'center', 600);
  text(ctx, 'Grab the gravy boat — the farmer slips on it', VIEW_W / 2, 582, 21, CREAM, 'center', 600);
  const blink = Math.sin(world.time * 4) > -0.2;
  if (blink) outlinedText(ctx, 'PRESS ENTER OR CLICK TO RUN', VIEW_W / 2, 668, 34, '#ffffff', BROWN_DARK);
}

function drawEnd(ctx, world) {
  ctx.fillStyle = world.outcome === 'escaped' ? 'rgba(20, 60, 20, 0.5)' : 'rgba(60, 15, 5, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2;
  ctx.fillStyle = 'rgba(40, 20, 8, 0.72)';
  roundRect(ctx, cx - 360, 150, 720, 440, 20);
  ctx.fill();
  if (world.outcome === 'escaped') {
    outlinedText(ctx, 'FREE!', cx, 230, 92, '#7dc24e', '#12300e');
    text(ctx, 'Gobble made it to the forest. Thanksgiving is saved!', cx, 306, 24, CREAM, 'center', 600);
  } else if (world.outcome === 'oven') {
    outlinedText(ctx, 'TOO LATE!', cx, 230, 84, '#ff8a5c', BROWN_DARK);
    text(ctx, 'The oven was ready... Gobble ran out of time.', cx, 306, 24, CREAM, 'center', 600);
  } else {
    outlinedText(ctx, 'CAUGHT!', cx, 230, 92, '#ff8a5c', BROWN_DARK);
    text(ctx, 'The farmer got him — but the forest is still out there.', cx, 306, 24, CREAM, 'center', 600);
  }
  text(ctx, `SCORE  ${Math.floor(world.score).toLocaleString('en-US')}`, cx, 372, 30, GOLD, 'center', 800);
  text(ctx, `DISTANCE  ${Math.floor(world.distance)}m of ${GOAL_DISTANCE}m    ·    OVEN  ${formatTimer(world.timer)} LEFT`, cx, 414, 21, CREAM, 'center', 600);
  text(ctx, 'Best score this session: ' + Math.floor(world.score).toLocaleString('en-US'), cx, 448, 18, 'rgba(255,246,221,0.75)', 'center', 600);
  const blink = Math.sin(world.time * 4) > -0.2;
  if (blink) outlinedText(ctx, 'PRESS R OR CLICK TO RUN AGAIN', cx, 530, 30, '#ffffff', BROWN_DARK);
}

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    // Deterministic wobble (a function of game time, not Math.random),
    // so the same scene always renders the same frame.
    const wobble = Math.sin(world.time * 47) * world.shake;
    const wobble2 = Math.cos(world.time * 39) * world.shake;
    ctx.translate(wobble, wobble2);
  }
  drawSky(ctx, world);
  drawFarmhouse(ctx, world);
  drawTrees(ctx, world);
  drawGround(ctx, world);
  // Farm pieces, back to front: haystacks first (the turkey hides in them).
  for (const o of world.obstacles) {
    if (o.kind === 'haystack') drawHaystack(ctx, o.x, o.w, o.h);
  }
  for (const p of world.pickups) {
    if (p.kind === 'corn') drawCorn(ctx, p.x, p.y, p.bob);
    else drawGravy(ctx, p.x, p.y, p.bob);
  }
  for (const o of world.obstacles) {
    if (o.kind === 'fence') drawFence(ctx, o.x, o.w, o.h);
    else if (o.kind === 'pumpkin') drawPumpkin(ctx, o.x, o.w, o.h);
    else if (o.kind === 'knife') drawKnife(ctx, o.x, o.w, o.h);
  }
  // The hiding turkey: only tail feathers and two nervous eyes poke out.
  if (world.turkey.hiding) {
    const hay = world.obstacles.find((o) => o.kind === 'haystack'
      && o.x < world.turkey.x + TURKEY_W && o.x + o.w > world.turkey.x);
    if (hay) {
      ctx.fillStyle = '#7a4a21';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.ellipse(hay.x + hay.w / 2 + i * 16, GROUND_Y - hay.h - 6, 7, 14, i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hay.x + hay.w / 2 - 8, GROUND_Y - hay.h + 22, 6, 0, Math.PI * 2);
      ctx.arc(hay.x + hay.w / 2 + 8, GROUND_Y - hay.h + 22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(hay.x + hay.w / 2 - 8, GROUND_Y - hay.h + 22, 3, 0, Math.PI * 2);
      ctx.arc(hay.x + hay.w / 2 + 8, GROUND_Y - hay.h + 22, 3, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'HIDDEN!', hay.x + hay.w / 2, GROUND_Y - hay.h - 42, 26, '#ffffff', 'center', 900);
    }
  } else {
    drawTurkey(ctx, world);
  }
  if (world.phase === 'play') drawFarmer(ctx, world);
  drawParticles(ctx, world);
  // Soft vignette.
  const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(40,15,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  if (world.phase === 'play') drawHUD(ctx, world);
  else if (world.phase === 'title') drawTitle(ctx, world);
  else if (world.phase === 'over') drawEnd(ctx, world);
}
