// Elastic collisions between hard discs, and the quantities that are
// meant to survive them. Kept apart from the canvas so the physics can
// be checked on its own.

export const WALL_LEFT = 0;
export const WALL_RIGHT = 1;

export function createBall({ x, y, vx, vy, mass, radius, id }) {
  return { x, y, vx, vy, mass, radius, id };
}

export function totalMomentum(balls) {
  return balls.reduce(
    (sum, ball) => ({
      x: sum.x + ball.mass * ball.vx,
      y: sum.y + ball.mass * ball.vy,
    }),
    { x: 0, y: 0 },
  );
}

export function totalKineticEnergy(balls) {
  return balls.reduce(
    (sum, ball) => sum + 0.5 * ball.mass * (ball.vx ** 2 + ball.vy ** 2),
    0,
  );
}

// Head-on component swaps as in one dimension; the tangential
// component is untouched because a frictionless disc has no way to
// exert a force along the contact plane.
export function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return false;
  const nx = dx / distance;
  const ny = dy / distance;
  const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  // Already separating: colliding again would add energy from nothing.
  if (approach > 0) return false;
  const impulse = (2 * approach) / (1 / a.mass + 1 / b.mass);
  a.vx += (impulse * nx) / a.mass;
  a.vy += (impulse * ny) / a.mass;
  b.vx -= (impulse * nx) / b.mass;
  b.vy -= (impulse * ny) / b.mass;
  return true;
}

// Discs that start the step overlapping would resolve repeatedly and
// stick together, so push them apart along the contact normal, each by
// the share its mass allows.
export function separate(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 1e-9;
  const overlap = a.radius + b.radius - distance;
  if (overlap <= 0) return;
  const nx = dx / distance;
  const ny = dy / distance;
  const total = a.mass + b.mass;
  a.x -= nx * overlap * (b.mass / total);
  a.y -= ny * overlap * (b.mass / total);
  b.x += nx * overlap * (a.mass / total);
  b.y += ny * overlap * (a.mass / total);
}

// Returns the impulse the wall delivered, which is exactly the
// momentum the balls no longer have.
export function bounceOffWalls(ball, width, height) {
  const impulse = { x: 0, y: 0 };
  if (ball.x - ball.radius < 0 && ball.vx < 0) {
    ball.x = ball.radius;
    impulse.x = -2 * ball.mass * ball.vx;
    ball.vx = -ball.vx;
  } else if (ball.x + ball.radius > width && ball.vx > 0) {
    ball.x = width - ball.radius;
    impulse.x = -2 * ball.mass * ball.vx;
    ball.vx = -ball.vx;
  }
  if (ball.y - ball.radius < 0 && ball.vy < 0) {
    ball.y = ball.radius;
    impulse.y = -2 * ball.mass * ball.vy;
    ball.vy = -ball.vy;
  } else if (ball.y + ball.radius > height && ball.vy > 0) {
    ball.y = height - ball.radius;
    impulse.y = -2 * ball.mass * ball.vy;
    ball.vy = -ball.vy;
  }
  return impulse;
}

export function step(balls, dt, { width, height, walls = true }) {
  const wallImpulse = { x: 0, y: 0 };
  for (const ball of balls) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }
  for (const ball of balls) {
    if (walls) {
      const impulse = bounceOffWalls(ball, width, height);
      wallImpulse.x += impulse.x;
      wallImpulse.y += impulse.y;
    } else {
      // A torus has no wall to push back, so momentum has nothing to
      // leak into and stays constant for the whole run.
      ball.x = ((ball.x % width) + width) % width;
      ball.y = ((ball.y % height) + height) % height;
    }
  }
  let collisions = 0;
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      const a = balls[i];
      const b = balls[j];
      const touching =
        Math.hypot(b.x - a.x, b.y - a.y) <= a.radius + b.radius;
      if (!touching) continue;
      separate(a, b);
      if (resolveCollision(a, b)) collisions += 1;
    }
  }
  return { wallImpulse, collisions };
}
