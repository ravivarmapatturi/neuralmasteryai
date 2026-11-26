import { binomialPmf, entropy, gaussianPdf } from './probstat';

export type DistributionFamily = 'bernoulli' | 'binomial' | 'gaussian' | 'categorical';

export interface DistributionBar {
  label: string;
  xValue: number;
  prob: number;
  cdf: number;
}

export interface GaussianCurvePoint {
  x: number;
  pdf: number;
  cdf: number;
}

export interface CategoricalWordInput {
  word: string;
  logit: number;
}

export const DEFAULT_CATEGORICAL_WORDS: readonly CategoricalWordInput[] = [
  { word: 'the', logit: 1.48 },
  { word: 'cat', logit: 1.32 },
  { word: 'sat', logit: 0.63 },
  { word: 'on', logit: 0.41 },
  { word: 'mat', logit: 0.0 },
];

export interface DistributionAnalysis {
  family: DistributionFamily;
  isContinuous: boolean;
  bars: DistributionBar[];
  curve: GaussianCurvePoint[];
  mean: number | null;
  variance: number | null;
  stdDev: number | null;
  entropyBits: number;
  totalMass: number;
  probeIndex: number;
  probeLabel: string;
  probeValue: number;
  probeProbOrDensity: number;
  probeCdf: number;
  probeStepCount: number;
  explain: string;
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function normalCdf(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / (sigma || 1e-9);
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

export function softmaxWithTemperature(
  words: readonly CategoricalWordInput[],
  temperature: number,
): { word: string; logit: number; prob: number; cdf: number }[] {
  const T = clamp(temperature, 0.2, 3.0);
  const scaled = words.map((w) => w.logit / T);
  const maxLogit = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  let running = 0;
  return words.map((w, idx) => {
    const prob = exps[idx] / sum;
    running += prob;
    return { word: w.word, logit: w.logit, prob, cdf: Math.min(1, running) };
  });
}

/**
 * Computes exact probability mass / density, CDF, mean, variance, entropy,
 * and step-by-step probe highlight across Bernoulli, Binomial, Gaussian, and Categorical.
 */
export function analyzeDistribution({
  family,
  p = 0.5,
  n = 10,
  mu = 0,
  sigma = 1,
  temperature = 1.0,
  categoricalWords = DEFAULT_CATEGORICAL_WORDS,
  probeStep = 0,
}: {
  family: DistributionFamily;
  p?: number;
  n?: number;
  mu?: number;
  sigma?: number;
  temperature?: number;
  categoricalWords?: readonly CategoricalWordInput[];
  probeStep?: number;
}): DistributionAnalysis {
  const cleanP = Math.round(clamp(p, 0.05, 0.95) * 100) / 100;
  const cleanN = Math.round(clamp(n, 2, 24));
  const cleanMu = Math.round(clamp(mu, -2.0, 2.0) * 10) / 10;
  const cleanSigma = Math.round(clamp(sigma, 0.4, 2.2) * 10) / 10;
  const cleanTemp = Math.round(clamp(temperature, 0.2, 3.0) * 10) / 10;

  if (family === 'bernoulli') {
    const bars: DistributionBar[] = [
      { label: '0 (Miss)', xValue: 0, prob: 1 - cleanP, cdf: 1 - cleanP },
      { label: '1 (Hit)', xValue: 1, prob: cleanP, cdf: 1 },
    ];
    const probeIdx = Math.max(0, Math.min(1, Math.round(probeStep) % 2));
    const active = bars[probeIdx];
    const mean = cleanP;
    const variance = cleanP * (1 - cleanP);
    const stdDev = Math.sqrt(variance);
    const entropyBits = entropy(bars.map((b) => b.prob));

    return {
      family,
      isContinuous: false,
      bars,
      curve: [],
      mean,
      variance,
      stdDev,
      entropyBits,
      totalMass: 1,
      probeIndex: probeIdx,
      probeLabel: active.label,
      probeValue: active.xValue,
      probeProbOrDensity: active.prob,
      probeCdf: active.cdf,
      probeStepCount: 2,
      explain: `Bernoulli(p = ${cleanP.toFixed(2)}): A single coin flip with Hit = ${(cleanP * 100).toFixed(0)}% and Miss = ${((1 - cleanP) * 100).toFixed(0)}%. Highlighted ${active.label} has probability ${active.prob.toFixed(3)}.`,
    };
  }

  if (family === 'binomial') {
    let running = 0;
    const bars: DistributionBar[] = Array.from({ length: cleanN + 1 }, (_, k) => {
      const prob = binomialPmf(k, cleanN, cleanP);
      running += prob;
      return {
        label: String(k),
        xValue: k,
        prob,
        cdf: Math.min(1, running),
      };
    });
    const mean = cleanN * cleanP;
    const variance = cleanN * cleanP * (1 - cleanP);
    const stdDev = Math.sqrt(variance);
    const entropyBits = entropy(bars.map((b) => b.prob));

    const keyKs = Array.from(
      new Set([
        0,
        Math.max(0, Math.round(mean - stdDev)),
        Math.min(cleanN, Math.round(mean)),
        Math.min(cleanN, Math.round(mean + stdDev)),
        cleanN,
      ]),
    ).sort((a, b) => a - b);

    const stepCount = keyKs.length;
    const stepIdx = ((Math.round(probeStep) % stepCount) + stepCount) % stepCount;
    const kFocus = keyKs[stepIdx];
    const active = bars[kFocus] ?? bars[0];

    return {
      family,
      isContinuous: false,
      bars,
      curve: [],
      mean,
      variance,
      stdDev,
      entropyBits,
      totalMass: running,
      probeIndex: kFocus,
      probeLabel: `k = ${kFocus} hits`,
      probeValue: kFocus,
      probeProbOrDensity: active.prob,
      probeCdf: active.cdf,
      probeStepCount: stepCount,
      explain: `Binomial(n = ${cleanN}, p = ${cleanP.toFixed(2)}): Average is μ = ${mean.toFixed(2)} hits (σ² = ${variance.toFixed(2)}). Getting exactly ${kFocus} hits has chance ${(active.prob * 100).toFixed(1)}%, and ≤ ${kFocus} hits is ${(active.cdf * 100).toFixed(1)}%.`,
    };
  }

  if (family === 'categorical') {
    const items = softmaxWithTemperature(categoricalWords, cleanTemp);
    const bars: DistributionBar[] = items.map((item, idx) => ({
      label: item.word,
      xValue: idx,
      prob: item.prob,
      cdf: item.cdf,
    }));
    const entropyBits = entropy(bars.map((b) => b.prob));
    const stepCount = bars.length;
    const probeIdx = ((Math.round(probeStep) % stepCount) + stepCount) % stepCount;
    const active = bars[probeIdx];

    return {
      family,
      isContinuous: false,
      bars,
      curve: [],
      mean: null,
      variance: null,
      stdDev: null,
      entropyBits,
      totalMass: 1,
      probeIndex: probeIdx,
      probeLabel: `“${active.label}”`,
      probeValue: probeIdx,
      probeProbOrDensity: active.prob,
      probeCdf: active.cdf,
      probeStepCount: stepCount,
      explain: `Categorical (temp T = ${cleanTemp.toFixed(1)}): Word “${active.label}” gets ${(active.prob * 100).toFixed(1)}% probability (cumulative ${(active.cdf * 100).toFixed(1)}%). Lower T sharpens on top words; higher T flattens toward uniform.`,
    };
  }

  // Gaussian (Normal): continuous bell curve over [-4.5, 4.5]
  const xs = Array.from({ length: 91 }, (_, i) => -4.5 + i * 0.1);
  const curve: GaussianCurvePoint[] = xs.map((x) => ({
    x: Number(x.toFixed(2)),
    pdf: gaussianPdf(x, cleanMu, cleanSigma),
    cdf: normalCdf(x, cleanMu, cleanSigma),
  }));
  const variance = cleanSigma * cleanSigma;
  // Differential entropy in bits: 0.5 * log2(2 * pi * e * sigma^2)
  const entropyBits = 0.5 * Math.log2(2 * Math.PI * Math.E * variance);

  const probeXs = [-2, -1, 0, 1, 2].map((z) =>
    Number(clamp(cleanMu + z * cleanSigma, -4.2, 4.2).toFixed(2)),
  );
  const stepIdx = ((Math.round(probeStep) % probeXs.length) + probeXs.length) % probeXs.length;
  const xFocus = probeXs[stepIdx];
  const densityAtFocus = gaussianPdf(xFocus, cleanMu, cleanSigma);
  const cdfAtFocus = normalCdf(xFocus, cleanMu, cleanSigma);

  return {
    family: 'gaussian',
    isContinuous: true,
    bars: [],
    curve,
    mean: cleanMu,
    variance,
    stdDev: cleanSigma,
    entropyBits,
    totalMass: 1,
    probeIndex: stepIdx,
    probeLabel: `x = ${xFocus.toFixed(1)}`,
    probeValue: xFocus,
    probeProbOrDensity: densityAtFocus,
    probeCdf: cdfAtFocus,
    probeStepCount: probeXs.length,
    explain: `Gaussian(μ = ${cleanMu.toFixed(1)}, σ = ${cleanSigma.toFixed(1)}): Peak sits at μ = ${cleanMu.toFixed(1)} (variance σ² = ${variance.toFixed(2)}). The shaded area up to x = ${xFocus.toFixed(1)} holds ${(cdfAtFocus * 100).toFixed(1)}% of all probability.`,
  };
}
