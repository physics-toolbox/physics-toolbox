import { calculateProjectile } from "./projectile-core.mjs";

const $ = (id) => document.getElementById(id);
const inputs = {
  speed: $("initial-speed"), angleDeg: $("launch-angle"), height: $("initial-height"), gravity: $("gravity"),
};
const output = {
  flightTime: $("flight-time"), range: $("range"), peakTime: $("peak-time"), peakHeight: $("peak-height"),
  vx: $("horizontal-velocity"), vy: $("vertical-velocity"), impactSpeed: $("impact-speed"),
};

function number(value) { return Number(value); }
function format(value) { return Number(value.toPrecision(6)).toString(); }
function withUnit(value, unit) { return `${format(value)} ${unit}`; }

function readInputs() {
  const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, number(input.value)]));
  if (!Object.values(values).every(Number.isFinite) || values.speed < 0 || values.height < 0 || values.gravity <= 0 || values.angleDeg < 0 || values.angleDeg > 90) {
    throw new Error("初速度・初期高さは0以上、射出角は0〜90度、重力加速度は正の値で入力してください。");
  }
  return values;
}

function drawTrajectory(values, result) {
  const canvas = $("trajectory");
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = { left: 54, right: 25, top: 26, bottom: 42 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const xMax = Math.max(result.range * 1.08, 1);
  const yMax = Math.max(result.peakHeight * 1.18, values.height + 1);
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

  context.strokeStyle = "#007c76";
  context.lineWidth = 3;
  context.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const t = result.flightTime * i / 120;
    const x = result.vx * t;
    const y = values.height + result.vy * t - 0.5 * values.gravity * t ** 2;
    if (i === 0) context.moveTo(xPixel(x), yPixel(y)); else context.lineTo(xPixel(x), yPixel(y));
  }
  context.stroke();

  context.fillStyle = "#007c76";
  [[0, values.height], [result.range, 0]].forEach(([x, y]) => { context.beginPath(); context.arc(xPixel(x), yPixel(y), 4, 0, Math.PI * 2); context.fill(); });
  context.fillStyle = "#52636c";
  context.font = "12px Inter, system-ui, sans-serif";
  context.fillText("x [m]", width - padding.right - 33, height - 14);
  context.fillText("y [m]", 8, padding.top + 5);
  $("trajectory-scale").textContent = `x: 0–${format(xMax)} m / y: 0–${format(yMax)} m`;
}

function calculate() {
  const error = $("input-error");
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
    drawTrajectory(values, result);
  } catch (reason) {
    error.textContent = reason.message;
  }
}

Object.values(inputs).forEach((input) => input.addEventListener("input", calculate));
$("calculate").addEventListener("click", calculate);
window.addEventListener("resize", calculate);
calculate();
