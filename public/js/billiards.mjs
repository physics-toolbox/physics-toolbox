import {
  createBall,
  step,
  totalKineticEnergy,
  totalMomentum,
} from './billiards-core.mjs';

// A small table so two balls meet quickly and the collision, not
// the travelling, is what you watch.
const TABLE_WIDTH = 60;
const TABLE_HEIGHT = 36;
const SUBSTEPS = 8;
const MAX_FRAME_SEC = 0.05;
// Metres per second per table unit dragged.
const DRAG_TO_SPEED = 2;
const MAX_LAUNCH_SPEED = 30;
const FRICTION_PER_SEC = 0.06;
const CUE_COLOUR = '#f8fafc';
// The cue always starts here, so a different result comes from the
// shot rather than from where the ball happened to be put.
const CUE_RADIUS = 1.8;
const CUE_X = TABLE_WIDTH * 0.25;
const CUE_Y = TABLE_HEIGHT / 2;
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
const ballRows = document.getElementById('ball-rows');
const readouts = {
  sumMomentum: document.getElementById('sum-momentum'),
  sumEnergy: document.getElementById('sum-energy'),
  momentum: document.getElementById('momentum'),
  momentumXY: document.getElementById('momentum-xy'),
  momentumTotal: document.getElementById('momentum-total'),
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
let cells = [];

function viewport() {
  // Fit the table inside whatever box the CSS gives us, rather
  // than assuming the box matches the table's proportions. It did
  // not: .canvas-wrap is 16/7 and the table is 5/3, so the bottom
  // of the table was being clipped away.
  const scale = Math.min(
    canvas.width / TABLE_WIDTH,
    canvas.height / TABLE_HEIGHT,
  );
  return {
    scale,
    offsetX: (canvas.width - TABLE_WIDTH * scale) / 2,
    offsetY: (canvas.height - TABLE_HEIGHT * scale) / 2,
  };
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function placeBalls(count) {
  const placed = [createBall({
    x: CUE_X,
    y: CUE_Y,
    vx: 0,
    vy: 0,
    mass: Number((CUE_RADIUS * CUE_RADIUS * 0.25).toFixed(2)),
    radius: CUE_RADIUS,
    id: 0,
  })];
  for (let index = 1; index < count; index += 1) {
    const radius = random(1.4, 2.6);
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


function ballColour(ball) {
  return ball === cue ? CUE_COLOUR : PALETTE[ball.id % PALETTE.length];
}


function buildRows() {
  // Rebuilt only when the balls change, so a frame just writes text.
  ballRows.textContent = '';
  cells = balls.map((ball) => {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = ballColour(ball);
    name.appendChild(swatch);
    name.appendChild(document.createTextNode(
      ball === cue ? '白' : String(ball.id)));
    row.appendChild(name);
    const made = [];
    for (let index = 0; index < 4; index += 1) {
      const cell = document.createElement('td');
      row.appendChild(cell);
      made.push(cell);
    }
    ballRows.appendChild(row);
    return made;
  });
}


function reset() {
  const count = Math.min(12, Math.max(2, Number(ballCountInput.value) || 2));
  balls = placeBalls(count);
  cue = balls[0] ?? null;
  collisions = 0;
  wallImpulse = { x: 0, y: 0 };
  baseline = { momentum: { x: 0, y: 0 }, energy: 0 };
  aim = null;
  buildRows();
  readouts.hint.textContent = '白い球をドラッグして離すと撃てます';
  render();
  update();
}

function toTable(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  const { scale, offsetX, offsetY } = viewport();
  // rect is in CSS pixels, the canvas in device pixels.
  const density = canvas.width / rect.width;
  return {
    x: ((point.clientX - rect.left) * density - offsetX) / scale,
    y: ((point.clientY - rect.top) * density - offsetY) / scale,
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
  const speed = Math.min(Math.hypot(dx, dy) * DRAG_TO_SPEED,
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
  balls.forEach((ball, index) => {
    const row = cells[index];
    if (!row) return;
    const speed = Math.hypot(ball.vx, ball.vy);
    row[0].textContent = ball.mass.toFixed(2);
    row[1].textContent = speed.toFixed(2);
    // Per ball the momentum is shown by component: the sum below is
    // a vector sum, and magnitudes would not add up to it.
    row[2].textContent =
      `(${(ball.mass * ball.vx).toFixed(1)}, `
      + `${(ball.mass * ball.vy).toFixed(1)})`;
    row[3].textContent =
      (0.5 * ball.mass * speed ** 2).toFixed(1);
  });
  readouts.sumMomentum.textContent =
    `(${momentum.x.toFixed(1)}, ${momentum.y.toFixed(1)})`;
  readouts.sumEnergy.textContent = energy.toFixed(1);
  readouts.momentum.textContent =
    `${Math.hypot(momentum.x, momentum.y).toFixed(2)} kg·m/s`;
  readouts.momentumXY.textContent =
    `(${momentum.x.toFixed(1)}, ${momentum.y.toFixed(1)})`;
  readouts.energy.textContent = `${energy.toFixed(2)} J`;
  readouts.collisions.textContent = String(collisions);
  const walls = wallsInput.checked;
  readouts.wallImpulse.textContent = walls
    ? `${Math.hypot(wallImpulse.x, wallImpulse.y).toFixed(2)} kg·m/s`
    : '壁なし';
  // The wall's impulse J is what it added to the balls, so the sum
  // fixed at the shot is p - J, not p + J. This is the number that
  // stays put while |Σp| alone does not.
  readouts.momentumTotal.textContent = `${Math.hypot(
    momentum.x - wallImpulse.x,
    momentum.y - wallImpulse.y,
  ).toFixed(2)} kg·m/s`;
}


function render() {
  const { scale, offsetX, offsetY } = viewport();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0b2b21';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0f3d2e';
  context.fillRect(offsetX, offsetY,
                   TABLE_WIDTH * scale, TABLE_HEIGHT * scale);
  context.save();
  context.translate(offsetX, offsetY);
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
  context.restore();
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
  const box = canvas.parentElement;
  const ratio = window.devicePixelRatio || 1;
  // Take the box as given. Its height is the CSS aspect-ratio's to
  // decide, and viewport() fits the table into whatever results.
  canvas.width = Math.max(1, box.clientWidth * ratio);
  canvas.height = Math.max(1, box.clientHeight * ratio);
  canvas.style.width = `${box.clientWidth}px`;
  canvas.style.height = `${box.clientHeight}px`;
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
