import { particleOptions, particles } from "./particles.mjs";
import { excessEnergy, fixedTargetKinematics } from "./kinematics.mjs";

const presets = {
  custom: [],
  "lambda-eta": ["lambda", "eta"],
  "k-xi": ["kaonPlus", "xiMinus"],
  "lambda-pi0": ["lambda", "pionZero"],
};

const $ = (id) => document.getElementById(id);
const particleSelectOptions = particleOptions.map(([id, particle]) => `<option value="${id}">${particle.label} (${format(particle.mass, 6)} GeV/c²)</option>`).join("");
const elements = {
  beamParticle: $("beam-particle"), beamMomentum: $("beam-momentum"), targetParticle: $("target-particle"), targetMass: $("target-mass"),
  targetParticleField: $("target-particle-field"), targetMassField: $("target-mass-field"), reactionPreset: $("reaction-preset"), reactionList: $("reaction-list"),
};

elements.beamParticle.innerHTML = particleSelectOptions;
elements.targetParticle.innerHTML = particleSelectOptions;
elements.beamParticle.value = "kaonMinus";
elements.targetParticle.value = "proton";

function format(value, digits = 5) {
  if (!Number.isFinite(value)) return "-";
  return Number(value.toPrecision(digits)).toString();
}
function formatEnergyGeV(value) { return `${format(value, 6)} GeV`; }
function formatMeV(value) { return `${format(Math.abs(value) * 1000, 6)} MeV`; }
function finalRows() { return [...elements.reactionList.querySelectorAll(".reaction-row")]; }

function addFinalRow(particleId = "pionPlus") {
  const row = document.createElement("div");
  row.className = "reaction-row";
  row.innerHTML = `<div class="field"><label>Count</label><input class="final-count" type="number" min="1" step="1" value="1" inputmode="numeric" /></div><div class="field"><label>Particle</label><select class="final-particle">${particleSelectOptions}</select></div><button class="row-action" type="button" aria-label="Remove final-state particle" title="Remove particle">×</button>`;
  row.querySelector(".final-particle").value = particleId;
  row.querySelector(".row-action").addEventListener("click", () => { row.remove(); elements.reactionPreset.value = "custom"; calculate(); });
  row.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", () => { elements.reactionPreset.value = "custom"; calculate(); }));
  elements.reactionList.append(row);
}

function setFinalState(ids) {
  elements.reactionList.replaceChildren();
  ids.forEach(addFinalRow);
}

function getTargetMass() {
  const mode = document.querySelector("input[name='target-mode']:checked").value;
  return mode === "particle" ? particles[elements.targetParticle.value].mass : Number(elements.targetMass.value);
}

function setText(id, value) { $(id).textContent = value; }
function setError(message) {
  setText("reaction-summary", message);
  $("reaction-status").className = "reaction-status";
  $("reaction-status").innerHTML = `<strong>Input needed</strong><span>${message}</span>`;
  ["beam-energy", "kinetic-energy", "beam-beta", "beam-gamma", "sqrt-s", "s-value", "cm-beta", "cm-gamma"].forEach((id) => setText(id, "-"));
}

function calculate() {
  const momentum = Number(elements.beamMomentum.value);
  const targetMass = getTargetMass();
  if (!Number.isFinite(momentum) || momentum < 0 || !Number.isFinite(targetMass) || targetMass <= 0) {
    setError("Use a non-negative beam momentum and a positive target mass.");
    return;
  }
  const beam = particles[elements.beamParticle.value];
  const targetName = document.querySelector("input[name='target-mode']:checked").value === "particle" ? particles[elements.targetParticle.value].label : "custom target";
  const result = fixedTargetKinematics(momentum, beam.mass, targetMass);
  setText("beam-energy", formatEnergyGeV(result.energy));
  setText("kinetic-energy", formatEnergyGeV(result.kineticEnergy));
  setText("beam-beta", format(result.beta, 7));
  setText("beam-gamma", format(result.gamma, 7));
  setText("sqrt-s", formatEnergyGeV(result.sqrtS));
  setText("s-value", `${format(result.s, 7)} GeV²`);
  setText("cm-beta", format(result.betaCM, 7));
  setText("cm-gamma", format(result.gammaCM, 7));
  setText("reaction-summary", `${beam.label}, ${format(momentum, 6)} GeV/c + ${targetName} at rest`);

  const finalState = finalRows().map((row) => ({ count: Number(row.querySelector(".final-count").value), particle: particles[row.querySelector(".final-particle").value] }));
  const finalMass = finalState.reduce((sum, item) => sum + (Number.isInteger(item.count) && item.count > 0 ? item.count * item.particle.mass : NaN), 0);
  if (!Number.isFinite(finalMass) || finalState.length === 0) {
    $("reaction-status").className = "reaction-status";
    $("reaction-status").innerHTML = "<strong>No final state selected</strong><span>Add one or more particles to compare with a threshold.</span>";
    return;
  }
  const excess = excessEnergy(result.sqrtS, finalMass);
  const finalLabel = finalState.map(({ count, particle }) => `${count > 1 ? `${count} × ` : ""}${particle.label}`).join(" + ");
  const state = excess >= 0 ? "is-open" : "is-closed";
  const headline = excess >= 0 ? `Open: +${formatMeV(excess)} excess energy` : `Closed: ${formatMeV(excess)} below threshold`;
  $("reaction-status").className = `reaction-status ${state}`;
  $("reaction-status").innerHTML = `<strong>${headline}</strong><span>${finalLabel}; threshold mass ${formatEnergyGeV(finalMass)}</span>`;
}

document.querySelectorAll("input[name='target-mode']").forEach((radio) => radio.addEventListener("change", () => {
  const particleMode = radio.checked && radio.value === "particle";
  if (radio.checked) { elements.targetParticleField.classList.toggle("is-hidden", !particleMode); elements.targetMassField.classList.toggle("is-hidden", particleMode); }
  calculate();
}));
[elements.beamParticle, elements.beamMomentum, elements.targetParticle, elements.targetMass].forEach((input) => input.addEventListener("input", calculate));
elements.reactionPreset.addEventListener("change", () => { setFinalState(presets[elements.reactionPreset.value]); calculate(); });
$("add-particle").addEventListener("click", () => { elements.reactionPreset.value = "custom"; addFinalRow(); calculate(); });
$("calculate").addEventListener("click", calculate);
setFinalState(presets["lambda-eta"]);
calculate();
