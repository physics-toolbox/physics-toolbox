import { calculateProjectile } from "./projectile-core.mjs";

const $ = (id) => document.getElementById(id);
const inputs = {
  speed: $("initial-speed"), angleDeg: $("launch-angle"), height: $("initial-height"), gravity: $("gravity"),
};
const output = {
  flightTime: $("flight-time"), range: $("range"), peakTime: $("peak-time"), peakHeight: $("peak-height"),
  vx: $("horizontal-velocity"), vy: $("vertical-velocity"), impactSpeed: $("impact-speed"),
};
let animationFrame;
let lastCalculation;

function number(value) { return Number(value); }
function format(value) { return Number(value.toPrecision(6)).toString(); }
function formatAxis(value) { return Number(value.toPrecision(3)).toString(); }
function withUnit(value, unit) { return `${format(value)} ${unit}`; }

function readInputs() {
  const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, number(input.value)]));
  if (!Object.values(values).every(Number.isFinite) || values.speed < 0 || values.height < 0 || values.gravity <= 0 || values.angleDeg < 0 || values.angleDeg > 90) {
    throw new Error("初速度・初期高さは0以上、射出角は0〜90度、重力加速度は正の値で入力してください。");
  }
  return values;
}

function drawTrajectory(values, result, progress = 0) {
  const canvas = $("trajectory");
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = { left: 54, right: 30, top: 30, bottom: 58 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  // Keep the same physical scale on both axes so launch-angle changes alter the visible curve.
  const desiredXMax = Math.max(result.range * 1.12, 1);
  const desiredYMax = Math.max(result.peakHeight * 1.2, values.height + 1);
  const metersPerPixel = Math.max(desiredXMax / graphWidth, desiredYMax / graphHeight);
  const xMax = metersPerPixel * graphWidth;
  const yMax = metersPerPixel * graphHeight;
  const xPixel = (x) => padding.left + x / xMax * graphWidth;
  const yPixel = (y) => padding.top + graphHeight - y / yMax * graphHeight;

  context.strokeStyle = "#dce4e7";
  context.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const x = padding.left + graphWidth * i / 5;
    const y = padding.top + graphHeight * i / 5;
    context.beginPath(); context.moveTo(x, padding.top); context.lineTo(x, padding.top + graphHeight); context.stroke();
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(padding.left + graphWidth, y); context.stroke();
  }
  context.strokeStyle = "#52636c";
  context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(padding.left, padding.top); context.lineTo(padding.left, padding.top + graphHeight); context.lineTo(padding.left + graphWidth, padding.top + graphHeight); context.stroke();

  const segments = Math.max(1, Math.ceil(120 * progress));
  context.strokeStyle = "#007c76";
  context.lineWidth = 3;
  context.beginPath();
  for (let i = 0; i <= segments; i += 1) {
    const t = result.flightTime * progress * i / segments;
    const x = result.vx * t;
    const y = values.height + result.vy * t - 0.5 * values.gravity * t ** 2;
    if (i === 0) context.moveTo(xPixel(x), yPixel(y)); else context.lineTo(xPixel(x), yPixel(y));
  }
  if (progress > 0) context.stroke();

  context.fillStyle = "#007c76";
  const currentTime = result.flightTime * progress;
  const currentX = result.vx * currentTime;
  const currentY = values.height + result.vy * currentTime - 0.5 * values.gravity * currentTime ** 2;
  [[0, values.height], [currentX, currentY]].forEach(([x, y], index) => {
    context.beginPath();
    context.arc(xPixel(x), yPixel(y), index === 1 ? 7 : 4, 0, Math.PI * 2);
    context.fill();
  });
  if (progress === 1) {
    context.beginPath();
    context.arc(xPixel(result.range), yPixel(0), 4, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#52636c";
  context.font = "12px Inter, system-ui, sans-serif";
  context.textBaseline = "top";
  context.textAlign = "center";
  for (let i = 0; i <= 5; i += 1) {
    const x = padding.left + graphWidth * i / 5;
    context.fillText(formatAxis(xMax * i / 5), x, padding.top + graphHeight + 8);
  }
  context.textBaseline = "middle";
  context.textAlign = "right";
  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + graphHeight * i / 5;
    context.fillText(formatAxis(yMax * (1 - i / 5)), padding.left - 8, y);
  }
  context.textBaseline = "top";
  context.textAlign = "right";
  context.fillText("x [m]", padding.left + graphWidth, padding.top + graphHeight + 29);
  context.textBaseline = "middle";
  context.fillText("y [m]", padding.left - 8, padding.top - 14);

  const drawAnnotation = (text, x, y, align = "left") => {
    context.font = "11px Inter, system-ui, sans-serif";
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255, 255, 255, .86)";
    const textWidth = context.measureText(text).width;
    const left = align === "right" ? x - textWidth - 10 : x - 5;
    context.fillRect(left, y - 10, textWidth + 10, 20);
    context.fillStyle = "#006761";
    context.fillText(text, x, y);
  };
  const peakProgress = result.peakTime / result.flightTime;
  if (progress >= peakProgress) {
    drawAnnotation(`最高 ${formatAxis(result.peakHeight)} m`, xPixel(result.vx * result.peakTime) + 8, yPixel(result.peakHeight) + 13);
  }
  if (progress === 1) {
    drawAnnotation(`到達 ${formatAxis(result.range)} m`, xPixel(result.range) - 8, yPixel(0) - 15, "right");
  }
  const elapsed = result.flightTime * progress;
  $("trajectory-scale").textContent = `t = ${format(elapsed)} / ${format(result.flightTime)} s`;
}

function calculate({ animate = false } = {}) {
  const error = $("input-error");
  cancelAnimationFrame(animationFrame);
  try {
    const values = readInputs();
    const result = calculateProjectile(values);
    output.flightTime.textContent = withUnit(result.flightTime, "s");
    output.range.textContent = withUnit(result.range, "m");
    output.peakTime.textContent = withUnit(result.peakTime, "s");
    output.peakHeight.textContent = withUnit(result.peakHeight, "m");
    output.vx.textContent = withUnit(result.vx, "m/s");
    output.vy.textContent = withUnit(result.vy, "m/s");
    output.impactSpeed.textContent = withUnit(result.impactSpeed, "m/s");
    $("result-summary").textContent = `${format(values.speed)} m/s, ${format(values.angleDeg)}度で射出`;
    error.textContent = "";
    lastCalculation = { values, result };
    if (animate) {
      animateTrajectory(values, result);
    } else {
      drawTrajectory(values, result, 0);
    }
  } catch (reason) {
    error.textContent = reason.message;
  }
}

function animateTrajectory(values, result) {
  const duration = Math.min(Math.max(result.flightTime * 350, 900), 2200);
  let startedAt;
  const render = (timestamp) => {
    startedAt ??= timestamp;
    const progress = Math.min((timestamp - startedAt) / duration, 1);
    drawTrajectory(values, result, progress);
    if (progress < 1) animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

Object.values(inputs).forEach((input) => input.addEventListener("input", () => calculate()));
$("calculate").addEventListener("click", () => calculate({ animate: true }));
window.addEventListener("resize", () => {
  if (lastCalculation) drawTrajectory(lastCalculation.values, lastCalculation.result, 0);
});
calculate();
