export function beamKinematics(momentum, mass) {
  const energy = Math.hypot(momentum, mass);
  return {
    energy,
    kineticEnergy: energy - mass,
    beta: momentum / energy,
    gamma: energy / mass,
  };
}

export function fixedTargetKinematics(momentum, beamMass, targetMass) {
  const beam = beamKinematics(momentum, beamMass);
  const s = beamMass ** 2 + targetMass ** 2 + 2 * targetMass * beam.energy;
  const sqrtS = Math.sqrt(Math.max(0, s));
  const betaCM = momentum / (beam.energy + targetMass);
  return { ...beam, s, sqrtS, betaCM, gammaCM: 1 / Math.sqrt(1 - betaCM ** 2) };
}

export function excessEnergy(sqrtS, finalMass) {
  return sqrtS - finalMass;
}
