export function calculateProjectile({ speed, angleDeg, height, gravity }) {
  const angle = angleDeg * Math.PI / 180;
  const vx = speed * Math.cos(angle);
  const vy = speed * Math.sin(angle);
  const flightTime = (vy + Math.sqrt(vy ** 2 + 2 * gravity * height)) / gravity;
  const peakTime = vy / gravity;
  const peakHeight = height + vy ** 2 / (2 * gravity);
  return {
    vx,
    vy,
    flightTime,
    range: vx * flightTime,
    peakTime,
    peakHeight,
    impactSpeed: Math.sqrt(speed ** 2 + 2 * gravity * height),
  };
}
