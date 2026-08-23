import { interpolateTheta, pendulumParameters, simulatePendulum } from "./pendulum-core.mjs";

const $ = (id) => document.getElementById(id);
const inputs = {
  length: $("pendulum-length"), angleDeg: $("pendulum-angle"), gravity: $("pendulum-gravity"),
};
const output = {
  smallPeriod: $("small-period"), nonlinearPeriod: $("nonlinear-period"), increase: $("period-increase"), omega: $("angular-frequency"),
};
let animationFrame;
let model;

function format(value, digits = 6) { return Number(value.toPrecision(digits)).toString(); }
function withUnit(value, unit) { return `${format(value)} ${unit}`; }
function readInputs() {
  const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, Number(input.value)]));
  if (!Object.values(values).every(Number.isFinite) || values.length <= 0 || values.gravity <= 0 || values.angleDeg < 0 || values.angleDeg > 85) {
    throw new Error("長さと重力加速度は正の値、初期角度は0〜85度で入力してください。");
  }
  return values;
}

function setupCanvas(canvas) {
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function pendulumGeometry(width, height) {
  return {
    pivot: { x: width / 2, y: 38 },
    rodLength: Math.min(height - 76, width * 0.31),
  };
}

function drawMotion(progress) {
  const { samples, duration } = model;
  const { context, width, height } = setupCanvas($("pendulum-motion"));
  const { pivot, rodLength } = pendulumGeometry(width, height);
  const time = duration * progress;
  const nonlinearTheta = interpolateTheta(samples, time);
  const point = (theta) => ({ x: pivot.x + rodLength * Math.sin(theta), y: pivot.y + rodLength * Math.cos(theta) });
  const nonlinearPoint = point(nonlinearTheta);

  context.strokeStyle = "#e1e7e9";
  context.lineWidth = 1;
  context.beginPath(); context.arc(pivot.x, pivot.y, rodLength, 0, Math.PI, false); context.stroke();
  context.strokeStyle = "#007c76";
  context.lineWidth = 3;
  context.beginPath(); context.moveTo(pivot.x, pivot.y); context.lineTo(nonlinearPoint.x, nonlinearPoint.y); context.stroke();
  context.fillStyle = "#007c76";
  context.beginPath(); context.arc(nonlinearPoint.x, nonlinearPoint.y, 10, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#18222c";
  context.beginPath(); context.arc(pivot.x, pivot.y, 5, 0, Math.PI * 2); context.fill();
  $("pendulum-time").textContent = `t = ${format(time, 4)} / ${format(duration, 4)} s`;
}

function drawSimpleHarmonicMotion(progress) {
  const { parameters, duration } = model;
  const { context, width, height } = setupCanvas($("simple-harmonic-motion"));
  const motionCanvas = $("pendulum-motion");
  const { rodLength } = pendulumGeometry(motionCanvas.clientWidth, motionCanvas.clientHeight);
  const time = duration * progress;
  const center = { x: width / 2, y: height / 2 + 8 };
  const amplitude = Math.min(rodLength * parameters.angle, width * 0.42);
  const position = center.x + amplitude * Math.cos(parameters.omega * time);

  context.strokeStyle = "#dce4e7";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(center.x - amplitude, center.y); context.lineTo(center.x + amplitude, center.y); context.stroke();
  context.strokeStyle = "#b6c3c8";
  context.lineWidth = 1;
  context.setLineDash([4, 4]);
  [center.x - amplitude, center.x, center.x + amplitude].forEach((x) => {
    context.beginPath(); context.moveTo(x, center.y - 28); context.lineTo(x, center.y + 28); context.stroke();
  });
  context.setLineDash([]);
  context.font = "12px Inter, system-ui, sans-serif";
  context.fillStyle = "#52636c";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText("-θ₀", center.x - amplitude, center.y + 36);
  context.fillText("0", center.x, center.y + 36);
  context.fillText("+θ₀", center.x + amplitude, center.y + 36);
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("x / L ≈ θ", 18, 16);
  context.fillStyle = "#cc6c28";
  context.beginPath(); context.arc(position, center.y, 12, 0, Math.PI * 2); context.fill();
}

function drawPlot(progress) {
  const { values, parameters, samples, duration } = model;
  const { context, width, height } = setupCanvas($("pendulum-plot"));
  const padding = { left: 52, right: 22, top: 25, bottom: 48 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const yMax = Math.max(values.angleDeg * 1.18, 5);
  const xPixel = (time) => padding.left + time / duration * graphWidth;
  const yPixel = (angle) => padding.top + graphHeight / 2 - angle / yMax * graphHeight / 2;
  const shownTime = duration * progress;

  context.strokeStyle = "#dce4e7";
  context.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const x = padding.left + graphWidth * i / 4;
    const y = padding.top + graphHeight * i / 4;
    context.beginPath(); context.moveTo(x, padding.top); context.lineTo(x, padding.top + graphHeight); context.stroke();
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(padding.left + graphWidth, y); context.stroke();
  }
  context.strokeStyle = "#52636c";
  context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(padding.left, padding.top); context.lineTo(padding.left, padding.top + graphHeight); context.lineTo(padding.left + graphWidth, padding.top + graphHeight); context.stroke();
  context.font = "11px Inter, system-ui, sans-serif";
  context.fillStyle = "#52636c";
  context.textBaseline = "top";
  context.textAlign = "center";
  for (let i = 0; i <= 4; i += 1) context.fillText(format(duration * i / 4, 3), padding.left + graphWidth * i / 4, padding.top + graphHeight + 7);
  context.textBaseline = "middle";
  context.textAlign = "right";
  for (let i = 0; i <= 4; i += 1) context.fillText(format(yMax * (1 - i / 2), 3), padding.left - 7, padding.top + graphHeight * i / 4);
  context.textBaseline = "top";
  context.fillText("t [s]", padding.left + graphWidth, padding.top + graphHeight + 25);
  context.textBaseline = "middle";
  context.fillText("θ [deg]", padding.left - 7, padding.top - 13);

  const drawCurve = (color, dash, thetaAtTime) => {
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.setLineDash(dash);
    context.beginPath();
    const segments = Math.max(1, Math.ceil(200 * progress));
    for (let i = 0; i <= segments; i += 1) {
      const time = shownTime * i / segments;
      const angle = thetaAtTime(time) * 180 / Math.PI;
      if (i === 0) context.moveTo(xPixel(time), yPixel(angle)); else context.lineTo(xPixel(time), yPixel(angle));
    }
    context.stroke();
    context.setLineDash([]);
  };
  drawCurve("#007c76", [], (time) => interpolateTheta(samples, time));
  drawCurve("#cc6c28", [7, 5], (time) => parameters.angle * Math.cos(parameters.omega * time));
}

function update({ shouldAnimate = false } = {}) {
  cancelAnimationFrame(animationFrame);
  const error = $("pendulum-error");
  try {
    const values = readInputs();
    const parameters = pendulumParameters(values);
    const duration = parameters.nonlinearPeriod * 2;
    model = { values, parameters, duration, samples: simulatePendulum({ ...values, duration }) };
    output.smallPeriod.textContent = withUnit(parameters.smallAnglePeriod, "s");
    output.nonlinearPeriod.textContent = withUnit(parameters.nonlinearPeriod, "s");
    output.increase.textContent = `${format(parameters.periodIncrease, 4)} %`;
    output.omega.textContent = withUnit(parameters.omega, "rad/s");
    $("pendulum-summary").textContent = `${format(values.angleDeg)}度から静かに離した場合`;
    error.textContent = "";
    if (shouldAnimate) animate(); else { drawMotion(0); drawSimpleHarmonicMotion(0); drawPlot(0); }
  } catch (reason) {
    error.textContent = reason.message;
  }
}

function animate() {
  const visualDuration = 2300;
  let startedAt;
  const render = (timestamp) => {
    startedAt ??= timestamp;
    const progress = Math.min((timestamp - startedAt) / visualDuration, 1);
    drawMotion(progress);
    drawSimpleHarmonicMotion(progress);
    drawPlot(progress);
    if (progress < 1) animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

Object.values(inputs).forEach((input) => input.addEventListener("input", () => update()));
$("pendulum-launch").addEventListener("click", () => update({ shouldAnimate: true }));
window.addEventListener("resize", () => { if (model) { drawMotion(0); drawSimpleHarmonicMotion(0); drawPlot(0); } });
update();
