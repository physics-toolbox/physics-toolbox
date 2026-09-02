import {
  createBall,
  step,
  totalKineticEnergy,
  totalMomentum,
} from './billiards-core.mjs';

const TABLE_WIDTH = 100;
const TABLE_HEIGHT = 60;
const SUBSTEPS = 8;
const MAX_FRAME_SEC = 0.05;
const DRAG_TO_SPEED = 0.55;
const MAX_LAUNCH_SPEED = 60;
const FRICTION_PER_SEC = 0.06;
const CUE_COLOUR = '#f8fafc';
const PALETTE = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#eab308',
];

const canvas = document.getElementById('table');
const context = canvas.getContext('2d');
const ballCountInput = document.getElementById('ball-count');
const wallsInput = document.getElementById('walls');
const frictionInput = document.getElementById('friction');
const resetButton = document.getElementById('reset');
const readouts = {
  momentum: document.getElementById('momentum'),
  momentumX: document.getElementById('momentum-x'),
  momentumY: document.getElementById('momentum-y'),
  energy: document.getElementById('energy'),
  wallImpulse: document.getElementById('wall-impulse'),
  collisions: document.getElementById('collisions'),
  hint: document.getElementById('table-hint'),
};

let balls = [];
let cue = null;
let aim = null;
let collisions = 0;
let wallImpulse = { x: 0, y: 0 };
let baseline = { momentum: { x: 0, y: 0 }, energy: 0 };
let lastFrame = 0;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function placeBalls(count) {
  const placed = [];
  for (let index = 0; index < count; index += 1) {
    const radius = index === 0 ? 2.2 : random(1.6, 3.2);
    // Rejection sampling: overlapping starts would resolve into a
    // shove that looks like the simulation inventing energy.
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const x = random(radius, TABLE_WIDTH - radius);
      const y = random(radius, TABLE_HEIGHT - radius);
      const clear = placed.every(
        (other) => Math.hypot(other.x - x, other.y - y)
          > other.radius + radius + 0.6,
      );
      if (!clear) continue;
      placed.push(createBall({
        x,
        y,
        vx: 0,
        vy: 0,
        // Mass follows area, so a big ball behaving heavily is not a
        // separate fact the reader has to take on trust.
        mass: Number((radius * radius * 0.25).toFixed(2)),
        radius,
        id: index,
      }));
      break;
    }
  }
  return placed;
}

function reset() {
  const count = Math.min(12, Math.max(2, Number(ballCountInput.value) || 6));
  balls = placeBalls(count);
  cue = balls[0] ?? null;
  collisions = 0;
  wallImpulse = { x: 0, y: 0 };
  baseline = { momentum: { x: 0, y: 0 }, energy: 0 };
  aim = null;
  readouts.hint.textContent = '白い球をドラッグして離すと撃てます';
  render();
  update();
}

function toTable(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  return {
    x: ((point.clientX - rect.left) / rect.width) * TABLE_WIDTH,
    y: ((point.clientY - rect.top) / rect.height) * TABLE_HEIGHT,
  };
}

function onPointerDown(event) {
  if (!cue) return;
  const point = toTable(event);
  if (Math.hypot(point.x - cue.x, point.y - cue.y) > cue.radius * 2.5) return;
  event.preventDefault();
  aim = point;
}

function onPointerMove(event) {
  if (!aim) return;
  event.preventDefault();
  aim = toTable(event);
}

function onPointerUp() {
  if (!aim || !cue) return;
  const dx = cue.x - aim.x;
  const dy = cue.y - aim.y;
  const speed = Math.min(Math.hypot(dx, dy) * DRAG_TO_SPEED * 10,
                         MAX_LAUNCH_SPEED);
  const length = Math.hypot(dx, dy) || 1;
  cue.vx += (dx / length) * speed;
  cue.vy += (dy / length) * speed;
  aim = null;
  // The shot defines the isolated system; everything after it is what
  // the readouts are claiming to conserve.
  baseline = {
    momentum: totalMomentum(balls),
    energy: totalKineticEnergy(balls),
  };
  wallImpulse = { x: 0, y: 0 };
  collisions = 0;
  readouts.hint.textContent = '撃った直後を基準に、保存量を比べています';
  // Show the shot immediately; waiting for the next frame reads as
  // the button not having worked.
  update();
}

function update() {
  const momentum = totalMomentum(balls);
  const energy = totalKineticEnergy(balls);
  const withWall = {
    x: momentum.x + wallImpulse.x,
    y: momentum.y + wallImpulse.y,
  };
  readouts.momentum.textContent = `${Math.hypot(momentum.x, momentum.y)
    .toFixed(2)} kg·m/s`;
  readouts.momentumX.textContent = `${momentum.x.toFixed(2)} kg·m/s`;
  readouts.momentumY.textContent = `${momentum.y.toFixed(2)} kg·m/s`;
  readouts.energy.textContent = `${energy.toFixed(2)} J`;
  readouts.collisions.textContent = String(collisions);
  const drift = Math.hypot(
    withWall.x - baseline.momentum.x,
    withWall.y - baseline.momentum.y,
  );
  readouts.wallImpulse.textContent = wallsInput.checked
    ? `${Math.hypot(wallImpulse.x, wallImpulse.y).toFixed(2)} kg·m/s`
    : '0.00 kg·m/s（壁なし）';
  readouts.wallImpulse.dataset.drift = drift.toFixed(3);
}

function render() {
  const scale = canvas.width / TABLE_WIDTH;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0f3d2e';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const ball of balls) {
    context.beginPath();
    context.arc(ball.x * scale, ball.y * scale, ball.radius * scale,
                0, Math.PI * 2);
    context.fillStyle = ball === cue
      ? CUE_COLOUR
      : PALETTE[ball.id % PALETTE.length];
    context.fill();
    context.lineWidth = Math.max(1, scale * 0.12);
    context.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    context.stroke();
  }
  if (aim && cue) {
    context.beginPath();
    context.moveTo(cue.x * scale, cue.y * scale);
    context.lineTo(aim.x * scale, aim.y * scale);
    context.strokeStyle = 'rgba(248, 250, 252, 0.85)';
    context.lineWidth = Math.max(1, scale * 0.1);
    context.setLineDash([scale, scale]);
    context.stroke();
    context.setLineDash([]);
  }
}

function frame(now) {
  const elapsed = Math.min((now - lastFrame) / 1000 || 0, MAX_FRAME_SEC);
  lastFrame = now;
  const dt = elapsed / SUBSTEPS;
  for (let index = 0; index < SUBSTEPS; index += 1) {
    const result = step(balls, dt, {
      width: TABLE_WIDTH,
      height: TABLE_HEIGHT,
      walls: wallsInput.checked,
    });
    wallImpulse.x += result.wallImpulse.x;
    wallImpulse.y += result.wallImpulse.y;
    collisions += result.collisions;
  }
  if (frictionInput.checked) {
    // Off by default: it is the one thing here that destroys both
    // conserved quantities, so it has to be a deliberate choice.
    const damping = Math.exp(-FRICTION_PER_SEC * elapsed * 10);
    for (const ball of balls) {
      ball.vx *= damping;
      ball.vy *= damping;
    }
  }
  render();
  update();
  requestAnimationFrame(frame);
}

function resize() {
  const width = canvas.parentElement.clientWidth;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = (width * TABLE_HEIGHT / TABLE_WIDTH) * ratio;
  canvas.style.height = `${width * TABLE_HEIGHT / TABLE_WIDTH}px`;
  render();
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);
resetButton.addEventListener('click', reset);
ballCountInput.addEventListener('change', reset);
window.addEventListener('resize', resize);

resize();
reset();
requestAnimationFrame(frame);
