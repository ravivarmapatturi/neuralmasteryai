import {
  FEATURE_NAMES,
  LAMBDA_MAX,
  TRUE_B,
  TRUE_W,
  generateData,
  mse,
  regularizationPath,
  ridgeSolve,
  type PathPoint,
  type Row,
} from './ridge';

export { FEATURE_NAMES, LAMBDA_MAX, TRUE_B, TRUE_W };

export const RIDGE_FEATURE_META = [
  { name: 'x1', plain: 'x₁ (twin A, true 3)', short: 'x₁' },
  { name: 'x2', plain: 'x₂ (twin B, true 3)', short: 'x₂' },
  { name: 'x3', plain: 'x₃ (noise, true 0)', short: 'x₃' },
  { name: 'x4', plain: 'x₄ (weak cue, true 1.5)', short: 'x₄' },
] as const;

export const RIDGE_PLAYBACK_LAMBDAS = [0, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0] as const;

export interface RidgeContourEllipse {
  levelLabel: string;
  points: [number, number][];
}

export interface RidgeAnalysis {
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
  sse: number;
  l2Penalty: number;
  objectiveTotal: number;
  twinSum: number;
  olsTwinSum: number;
  twinGap: number;
  olsTwinGap: number;
  vif: number;
  sliceCenter: [number, number];
  l2Radius: number;
  contours: RidgeContourEllipse[];
  explain: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function separateLabelPositions(
  items: { idx: number; rawY: number; label: string; color: string }[],
  minY: number,
  maxY: number,
  minGap = 18,
) {
  const sorted = [...items].sort((a, b) => a.rawY - b.rawY).map((it) => ({
    ...it,
    y: Math.max(minY, Math.min(maxY, it.rawY)),
  }));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) {
      sorted[i].y = sorted[i - 1].y + minGap;
    }
  }
  if (sorted.length > 0 && sorted[sorted.length - 1].y > maxY) {
    sorted[sorted.length - 1].y = maxY;
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (sorted[i + 1].y - sorted[i].y < minGap) {
        sorted[i].y = sorted[i + 1].y - minGap;
      }
    }
  }
  return sorted;
}

function computeConditionalContours(
  rows: Row[],
  b: number,
  w: number[],
): { sliceCenter: [number, number]; contours: RidgeContourEllipse[] } {
  // Fix b, w3, w4 at current solve; compute exact 2x2 SSE quadratic over (w1, w2).
  let h00 = 0;
  let h01 = 0;
  let h11 = 0;
  let g0 = 0;
  let g1 = 0;
  for (const row of rows) {
    const x1 = row.x[0];
    const x2 = row.x[1];
    const r = row.y - b - w[2] * row.x[2] - w[3] * row.x[3];
    h00 += x1 * x1;
    h01 += x1 * x2;
    h11 += x2 * x2;
    g0 += x1 * r;
    g1 += x2 * r;
  }
  const det = h00 * h11 - h01 * h01;
  const wc0 = Math.abs(det) > 1e-8 ? (h11 * g0 - h01 * g1) / det : w[0];
  const wc1 = Math.abs(det) > 1e-8 ? (h00 * g1 - h01 * g0) / det : w[1];

  // Eigen-decompose 2x2 symmetric H so we draw exact rotated SSE ellipses.
  const trace = h00 + h11;
  const disc = Math.sqrt(Math.max(0, (h00 - h11) ** 2 + 4 * h01 * h01));
  const eig1 = Math.max(1e-4, (trace + disc) / 2);
  const eig2 = Math.max(1e-4, (trace - disc) / 2);
  const angle = Math.abs(h01) < 1e-9 && h00 >= h11 ? 0 : 0.5 * Math.atan2(2 * h01, h00 - h11);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const dw0 = w[0] - wc0;
  const dw1 = w[1] - wc1;
  const currentQ = Math.max(0.25, h00 * dw0 * dw0 + 2 * h01 * dw0 * dw1 + h11 * dw1 * dw1);

  const levels = [
    { label: 'tight', q: currentQ },
    { label: 'mid', q: currentQ * 2.5 + 3 },
  ];

  const contours: RidgeContourEllipse[] = levels.map(({ label, q }) => {
    const rx = Math.sqrt(q / eig1);
    const ry = Math.sqrt(q / eig2);
    const pts: [number, number][] = [];
    const nPts = 48;
    for (let i = 0; i <= nPts; i++) {
      const th = (i / nPts) * Math.PI * 2;
      const u = rx * Math.cos(th);
      const v = ry * Math.sin(th);
      pts.push([wc0 + u * cosA - v * sinA, wc1 + u * sinA + v * cosA]);
    }
    return { levelLabel: label, points: pts };
  });

  return { sliceCenter: [wc0, wc1], contours };
}

export function analyzeRidge({
  correlation = 0.9,
  noise = 1.5,
  seed = 5,
  lambda = 1.0,
}: {
  correlation?: number;
  noise?: number;
  seed?: number;
  lambda?: number;
} = {}): RidgeAnalysis {
  const safeCorr = clamp(Number.isFinite(correlation) ? correlation : 0.9, 0, 0.98);
  const safeNoise = clamp(Number.isFinite(noise) ? noise : 1.5, 0.2, 4.0);
  const safeSeed = Math.max(1, Math.min(999, Math.round(Number.isFinite(seed) ? seed : 5)));
  const safeLambda = clamp(Number.isFinite(lambda) ? lambda : 0, 0, LAMBDA_MAX);

  const rows = generateData(40, safeCorr, safeNoise, safeSeed);
  const path = regularizationPath(rows, 40);
  const ols = ridgeSolve(rows, 0);
  const current = ridgeSolve(rows, safeLambda);

  const olsMse = mse(rows, ols.b, ols.w);
  const currentMse = mse(rows, current.b, current.w);
  const sse = currentMse * rows.length;
  const l2Penalty = current.w.reduce((s, v) => s + v * v, 0);
  const objectiveTotal = sse + safeLambda * l2Penalty;

  const twinSum = current.w[0] + current.w[1];
  const olsTwinSum = ols.w[0] + ols.w[1];
  const twinGap = Math.abs(current.w[0] - current.w[1]);
  const olsTwinGap = Math.abs(ols.w[0] - ols.w[1]);
  const vif = 1 / Math.max(1e-4, 1 - safeCorr * safeCorr);
  const l2Radius = Math.hypot(current.w[0], current.w[1]);

  const { sliceCenter, contours } = computeConditionalContours(rows, current.b, current.w);

  let explain = '';
  if (safeLambda < 0.02) {
    explain =
      safeCorr >= 0.85
        ? `At λ = 0 (plain OLS) with ρ = ${safeCorr.toFixed(2)}, variance inflation is ${vif.toFixed(1)}×: twins w₁=${current.w[0].toFixed(2)} and w₂=${current.w[1].toFixed(2)} split by ${twinGap.toFixed(2)} while their sum stays ${twinSum.toFixed(2)}.`
        : `At λ = 0 (plain OLS) with low correlation ρ = ${safeCorr.toFixed(2)}, inputs barely overlap (VIF = ${vif.toFixed(1)}×), so OLS weights already sit close to truth.`;
  } else {
    explain = `At λ = ${safeLambda.toFixed(2)}, the L2 circle pulls twins toward equal credit (gap drops from ${olsTwinGap.toFixed(2)} to ${twinGap.toFixed(2)}, sum = ${twinSum.toFixed(2)}) while MSE barely rises (${olsMse.toFixed(2)} → ${currentMse.toFixed(2)}).`;
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
    currentWeights: current.w,
    currentBias: current.b,
    currentMse,
    sse,
    l2Penalty,
    objectiveTotal,
    twinSum,
    olsTwinSum,
    twinGap,
    olsTwinGap,
    vif,
    sliceCenter,
    l2Radius,
    contours,
    explain,
  };
}
