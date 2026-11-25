import {
  FEATURE_NAMES,
  LAMBDA_MAX,
  TRUE_B,
  TRUE_W,
  generateData,
  lassoSolve,
  mse,
  regularizationPath,
  type PathPoint,
  type Row,
} from './lasso';

import { separateLabelPositions } from './ridgeExplorer';

export { FEATURE_NAMES, LAMBDA_MAX, TRUE_B, TRUE_W, separateLabelPositions };

export const LASSO_FEATURE_META = [
  { name: 'x1', plain: 'x₁ (twin A, true 3)', short: 'x₁' },
  { name: 'x2', plain: 'x₂ (twin B, true 3)', short: 'x₂' },
  { name: 'x3', plain: 'x₃ (noise, true 0)', short: 'x₃' },
  { name: 'x4', plain: 'x₄ (weak cue, true 1.5)', short: 'x₄' },
] as const;

export const LASSO_PLAYBACK_LAMBDAS = [0, 0.15, 0.35, 0.75, 1.25, 1.75, 2.5, 3.0] as const;

export interface LassoFeatureSignal {
  name: string;
  short: string;
  plain: string;
  rho: number;
  absRho: number;
  z: number;
  weight: number;
  dropped: boolean;
}

export interface LassoAnalysis {
  rows: Row[];
  lambda: number;
  correlation: number;
  noise: number;
  seed: number;
  path: PathPoint[];
  olsWeights: number[];
  olsMse: number;
  currentWeights: number[];
  currentBias: number;
  currentMse: number;
  scaledFee: number;
  l1Penalty: number;
  objectiveTotal: number;
  zeroedCount: number;
  twinSum: number;
  features: LassoFeatureSignal[];
  explain: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function analyzeLasso({
  correlation = 0.9,
  noise = 1.5,
  seed = 5,
  lambda = 1.0,
}: {
  correlation?: number;
  noise?: number;
  seed?: number;
  lambda?: number;
} = {}): LassoAnalysis {
  const safeCorr = clamp(Number.isFinite(correlation) ? correlation : 0.9, 0, 0.98);
  const safeNoise = clamp(Number.isFinite(noise) ? noise : 1.5, 0.2, 4.0);
  const safeSeed = Math.max(1, Math.min(999, Math.round(Number.isFinite(seed) ? seed : 5)));
  const safeLambda = clamp(Number.isFinite(lambda) ? lambda : 0, 0, LAMBDA_MAX);

  const rows = generateData(40, safeCorr, safeNoise, safeSeed);
  const path = regularizationPath(rows, 30);
  const ols = lassoSolve(rows, 0);
  const current = lassoSolve(rows, safeLambda);
  const cleanW = current.w.map((v) => (v === 0 ? 0 : v));

  const n = rows.length;
  const d = rows[0].x.length;
  const xMean = new Array(d).fill(0);
  rows.forEach((r) => r.x.forEach((v, j) => { xMean[j] += v / n; }));
  const yMean = rows.reduce((s, r) => s + r.y, 0) / n;
  const Xc = rows.map((r) => r.x.map((v, j) => v - xMean[j]));
  const yc = rows.map((r) => r.y - yMean);

  const scaledFee = (safeLambda * n) / 2;
  const features: LassoFeatureSignal[] = LASSO_FEATURE_META.map((meta, j) => {
    let rho = 0;
    let z = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let k = 0; k < d; k++) pred += Xc[i][k] * cleanW[k];
      const residualWithoutJ = yc[i] - pred + cleanW[j] * Xc[i][j];
      rho += Xc[i][j] * residualWithoutJ;
      z += Xc[i][j] * Xc[i][j];
    }
    return {
      name: meta.name,
      short: meta.short,
      plain: meta.plain,
      rho,
      absRho: Math.abs(rho),
      z,
      weight: cleanW[j],
      dropped: cleanW[j] === 0,
    };
  });

  const olsMse = mse(rows, ols.b, ols.w);
  const currentMse = mse(rows, current.b, cleanW);
  const l1Penalty = cleanW.reduce((s, v) => s + Math.abs(v), 0);
  const objectiveTotal = currentMse / 2 + safeLambda * l1Penalty;
  const zeroedCount = cleanW.filter((v) => v === 0).length;
  const droppedNames = features.filter((f) => f.dropped).map((f) => f.short);
  const twinSum = cleanW[0] + cleanW[1];

  let explain = '';
  if (safeLambda < 0.02) {
    explain = `At λ = 0 (entry fee = 0), every feature stays in the model (even noisy x₃ = ${cleanW[2].toFixed(2)}), and twins split credit unevenly (${cleanW[0].toFixed(2)} vs ${cleanW[1].toFixed(2)}).`;
  } else if (zeroedCount === 0) {
    explain = `At λ = ${safeLambda.toFixed(2)} (entry fee ${scaledFee.toFixed(1)}), all 4 feature signals still clear the fee—shrinkage lowers weights without dropping any yet.`;
  } else {
    explain = `At λ = ${safeLambda.toFixed(2)}, the entry fee (${scaledFee.toFixed(1)}) beats weak signals: ${droppedNames.join(' & ')} hit exact 0 (${zeroedCount} of 4 dropped), while surviving twins read ${cleanW[0].toFixed(2)} and ${cleanW[1].toFixed(2)}.`;
  }

  return {
    rows,
    lambda: safeLambda,
    correlation: safeCorr,
    noise: safeNoise,
    seed: safeSeed,
    path,
    olsWeights: ols.w,
    olsMse,
    currentWeights: cleanW,
    currentBias: current.b,
    currentMse,
    scaledFee,
    l1Penalty,
    objectiveTotal,
    zeroedCount,
    twinSum,
    features,
    explain,
  };
}
