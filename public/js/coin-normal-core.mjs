export function binomialProbabilities(coins) {
  const probabilities = [0.5 ** coins];
  for (let heads = 0; heads < coins; heads += 1) {
    probabilities.push(probabilities[heads] * (coins - heads) / (heads + 1));
  }
  return probabilities;
}

export function sampleHeads(coins, random = Math.random) {
  let heads = 0;
  for (let toss = 0; toss < coins; toss += 1) if (random() < 0.5) heads += 1;
  return heads;
}

export function tossCoins(coins, random = Math.random) {
  const faces = [];
  let heads = 0;
  for (let toss = 0; toss < coins; toss += 1) {
    const isHeads = random() < 0.5;
    faces.push(isHeads);
    if (isHeads) heads += 1;
  }
  return { faces, heads };
}

export function sampleSummary(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return { total, mean: 0, standardDeviation: 0 };
  const mean = counts.reduce((sum, count, heads) => sum + heads * count, 0) / total;
  const variance = counts.reduce((sum, count, heads) => sum + (heads - mean) ** 2 * count, 0) / total;
  return { total, mean, standardDeviation: Math.sqrt(variance) };
}
