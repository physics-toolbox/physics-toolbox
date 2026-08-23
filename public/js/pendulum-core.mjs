const TAU = 2 * Math.PI;

export function pendulumParameters({ length, angleDeg, gravity }) {
  const angle = angleDeg * Math.PI / 180;
  const omega = Math.sqrt(gravity / length);
  const smallAnglePeriod = TAU / omega;
  const k = Math.sin(angle / 2);
  let a = 1;
  let b = Math.sqrt(1 - k ** 2);
  while (Math.abs(a - b) > 1e-14) {
    const nextA = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = nextA;
  }
  const completeEllipticK = Math.PI / (2 * a);
  const nonlinearPeriod = 4 * Math.sqrt(length / gravity) * completeEllipticK;
  return { angle, omega, smallAnglePeriod, nonlinearPeriod, periodIncrease: (nonlinearPeriod / smallAnglePeriod - 1) * 100 };
}

export function simulatePendulum({ length, angleDeg, gravity, duration, steps = 900 }) {
  const theta0 = angleDeg * Math.PI / 180;
  const dt = duration / steps;
  let theta = theta0;
  let angularVelocity = 0;
  const acceleration = (angle) => -(gravity / length) * Math.sin(angle);
  const samples = [{ time: 0, theta }];

  for (let index = 1; index <= steps; index += 1) {
    const k1Theta = angularVelocity;
    const k1Omega = acceleration(theta);
    const k2Theta = angularVelocity + k1Omega * dt / 2;
    const k2Omega = acceleration(theta + k1Theta * dt / 2);
    const k3Theta = angularVelocity + k2Omega * dt / 2;
    const k3Omega = acceleration(theta + k2Theta * dt / 2);
    const k4Theta = angularVelocity + k3Omega * dt;
    const k4Omega = acceleration(theta + k3Theta * dt);
    theta += dt * (k1Theta + 2 * k2Theta + 2 * k3Theta + k4Theta) / 6;
    angularVelocity += dt * (k1Omega + 2 * k2Omega + 2 * k3Omega + k4Omega) / 6;
    samples.push({ time: index * dt, theta });
  }
  return samples;
}

export function interpolateTheta(samples, time) {
  if (time <= 0) return samples[0].theta;
  const last = samples.at(-1);
  if (time >= last.time) return last.theta;
  const step = samples[1].time - samples[0].time;
  const index = Math.floor(time / step);
  const before = samples[index];
  const after = samples[index + 1];
  const fraction = (time - before.time) / (after.time - before.time);
  return before.theta + (after.theta - before.theta) * fraction;
}
