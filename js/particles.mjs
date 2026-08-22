// Masses in GeV/c^2, using PDG 2025 summary values where available.
export const particles = {
  electron: { label: "e-", mass: 0.00051099895 },
  positron: { label: "e+", mass: 0.00051099895 },
  muonMinus: { label: "mu-", mass: 0.1056583755 },
  muonPlus: { label: "mu+", mass: 0.1056583755 },
  pionMinus: { label: "pi-", mass: 0.13957039 },
  pionPlus: { label: "pi+", mass: 0.13957039 },
  pionZero: { label: "pi0", mass: 0.1349768 },
  kaonMinus: { label: "K-", mass: 0.493677 },
  kaonPlus: { label: "K+", mass: 0.493677 },
  kaonZero: { label: "K0", mass: 0.497611 },
  proton: { label: "p", mass: 0.93827208816 },
  antiproton: { label: "pbar", mass: 0.93827208816 },
  neutron: { label: "n", mass: 0.93956542052 },
  antineutron: { label: "nbar", mass: 0.93956542052 },
  deuteron: { label: "d", mass: 1.87561294257 },
  lambda: { label: "Lambda", mass: 1.115683 },
  sigmaPlus: { label: "Sigma+", mass: 1.18937 },
  sigmaZero: { label: "Sigma0", mass: 1.192642 },
  sigmaMinus: { label: "Sigma-", mass: 1.197449 },
  xiMinus: { label: "Xi-", mass: 1.32171 },
  eta: { label: "eta", mass: 0.547862 },
  etaPrime: { label: "eta'", mass: 0.95778 },
  omega: { label: "omega", mass: 0.78265 },
  phi: { label: "phi", mass: 1.019461 },
};

export const particleOptions = Object.entries(particles);
