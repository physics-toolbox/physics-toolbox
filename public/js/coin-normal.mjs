import { binomialProbabilities, normalDensity, sampleHeads, sampleSummary, tossCoins } from "./coin-normal-core.mjs";

const $ = (id) => document.getElementById(id);
const inputs = { coins: $("coin-count"), trials: $("trial-count") };
const output = {
  expectedMean: $("expected-mean"), expectedDeviation: $("expected-deviation"),
  measuredMean: $("measured-mean"), measuredDeviation: $("measured-deviation"),
};
let animationFrame;
let model;

function format(value, digits = 5) { return Number(value.toPrecision(digits)).toString(); }
function readInputs() {
  const coins = Number(inputs.coins.value);
  const trials = Number(inputs.trials.value);
  if (!Number.isInteger(coins) || coins < 1 || coins > 100 || !Number.isInteger(trials) || trials < 1 || trials > 100000) {
    throw new Error("コイン枚数は1〜100枚、実験回数は1〜100,000回の整数で入力してください。");
  }
  return { coins, trials };
}

function setupCanvas() {
  const canvas = $("coin-histogram");
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

function drawLegend(context, x, y) {
  context.font = "12px Inter, system-ui, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = "#b8ddd7";
  context.fillRect(x, y - 5, 16, 10);
  context.fillStyle = "#40515a";
  context.fillText("実測", x + 23, y);
  context.strokeStyle = "#007c76";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(x + 72, y); context.lineTo(x + 90, y); context.stroke();
  context.fillText("二項分布", x + 97, y);
  context.strokeStyle = "#cc6c28";
  context.setLineDash([5, 4]);
  context.beginPath(); context.moveTo(x + 170, y); context.lineTo(x + 188, y); context.stroke();
  context.setLineDash([]);
  context.fillText("正規近似", x + 195, y);
}

function drawChart() {
  const { context, width, height } = setupCanvas();
  const { coins, counts, hasRun, probabilities, normal } = model;
  const summary = sampleSummary(counts);
  const measured = counts.map((count) => summary.total === 0 ? 0 : count / summary.total);
  const theoretical = hasRun ? probabilities : Array(coins + 1).fill(0);
  const normalApproximation = hasRun ? normal : Array(coins + 1).fill(0);
  const padding = { left: 52, right: 22, top: 38, bottom: 48 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const yMax = Math.max(...measured, ...theoretical, ...normalApproximation, 0.01) * 1.18;
  const xPixel = (heads) => padding.left + (heads + 0.5) / (coins + 1) * graphWidth;
  const yPixel = (probability) => padding.top + graphHeight - probability / yMax * graphHeight;
  const barWidth = graphWidth / (coins + 1);

  context.strokeStyle = "#dce4e7";
  context.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + graphHeight * i / 4;
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(padding.left + graphWidth, y); context.stroke();
  }
  context.strokeStyle = "#52636c";
  context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(padding.left, padding.top); context.lineTo(padding.left, padding.top + graphHeight); context.lineTo(padding.left + graphWidth, padding.top + graphHeight); context.stroke();
  context.fillStyle = "#b8ddd7";
  measured.forEach((probability, heads) => {
    const x = padding.left + heads / (coins + 1) * graphWidth + 1;
    context.fillRect(x, yPixel(probability), Math.max(1, barWidth - 2), padding.top + graphHeight - yPixel(probability));
  });
  const drawCurve = (values, color, dash) => {
    context.strokeStyle = color;
    context.lineWidth = 2.2;
    context.setLineDash(dash);
    context.beginPath();
    values.forEach((probability, heads) => {
      if (heads === 0) context.moveTo(xPixel(heads), yPixel(probability)); else context.lineTo(xPixel(heads), yPixel(probability));
    });
    context.stroke();
    context.setLineDash([]);
  };
  if (hasRun) {
    drawCurve(theoretical, "#007c76", []);
    drawCurve(normalApproximation, "#cc6c28", [6, 4]);
  }

  context.font = "11px Inter, system-ui, sans-serif";
  context.fillStyle = "#52636c";
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let i = 0; i <= 4; i += 1) context.fillText(`${format(yMax * (1 - i / 4), 3)}`, padding.left - 7, padding.top + graphHeight * i / 4);
  context.textAlign = "center";
  context.textBaseline = "top";
  const labelStep = coins <= 10 ? 1 : Math.ceil(coins / 5);
  for (let heads = 0; heads <= coins; heads += labelStep) context.fillText(heads, xPixel(heads), padding.top + graphHeight + 7);
  if (coins % labelStep !== 0) context.fillText(coins, xPixel(coins), padding.top + graphHeight + 7);
  context.textAlign = "right";
  context.fillText("表の回数", padding.left + graphWidth, padding.top + graphHeight + 25);
  if (hasRun) drawLegend(context, 18, 20);
  else {
    context.fillStyle = "#60707e";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("「実験する」を押すと、分布を積み上げます。", padding.left + graphWidth / 2, padding.top + graphHeight / 2);
  }
}

function updateResults() {
  const summary = sampleSummary(model.counts);
  output.expectedMean.textContent = format(model.coins / 2);
  output.expectedDeviation.textContent = format(Math.sqrt(model.coins) / 2);
  output.measuredMean.textContent = summary.total === 0 ? "-" : format(summary.mean);
  output.measuredDeviation.textContent = summary.total === 0 ? "-" : format(summary.standardDeviation);
  $("simulation-status").textContent = model.hasRun
    ? `${summary.total.toLocaleString("ja-JP")} / ${model.trials.toLocaleString("ja-JP")} 回の実験`
    : "実験を開始すると分布を描画します。";
}

function drawCoins() {
  const grid = $("coin-toss-grid");
  const fragment = document.createDocumentFragment();
  model.faces.forEach((face) => {
    const coin = document.createElement("span");
    coin.className = `coin-face${face === true ? " is-heads" : face === false ? " is-tails" : ""}`;
    coin.textContent = face === true ? "表" : face === false ? "裏" : "?";
    fragment.append(coin);
  });
  grid.replaceChildren(fragment);
  const lastHeads = model.faces.filter(Boolean).length;
  $("last-toss").textContent = model.hasRun ? `直前の1回: 表 ${lastHeads} 枚 / 裏 ${model.coins - lastHeads} 枚` : "実験を開始すると、ここに1回分のコイン投げを表示します。";
}

function reset() {
  cancelAnimationFrame(animationFrame);
  model = undefined;
  const error = $("coin-error");
  try {
    const values = readInputs();
    const mean = values.coins / 2;
    const deviation = Math.sqrt(values.coins) / 2;
    model = {
      ...values,
      counts: Array(values.coins + 1).fill(0),
      faces: Array(values.coins).fill(null),
      hasRun: false,
      probabilities: binomialProbabilities(values.coins),
      normal: Array.from({ length: values.coins + 1 }, (_, heads) => normalDensity(heads, mean, deviation)),
    };
    error.textContent = "";
    updateResults();
    drawCoins();
    drawChart();
  } catch (reason) {
    error.textContent = reason.message;
  }
}

function animate() {
  reset();
  if (!model) return;
  model.hasRun = true;
  const frameCount = 72;
  const batchSize = Math.ceil(model.trials / frameCount);
  const render = () => {
    const completed = sampleSummary(model.counts).total;
    const toAdd = Math.min(batchSize, model.trials - completed);
    const toss = tossCoins(model.coins);
    model.faces = toss.faces;
    model.counts[toss.heads] += 1;
    for (let i = 1; i < toAdd; i += 1) model.counts[sampleHeads(model.coins)] += 1;
    updateResults();
    drawCoins();
    drawChart();
    if (completed + toAdd < model.trials) animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

Object.values(inputs).forEach((input) => input.addEventListener("input", reset));
$("coin-launch").addEventListener("click", animate);
window.addEventListener("resize", () => { if (model) drawChart(); });
reset();
