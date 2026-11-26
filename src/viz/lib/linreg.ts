// Real data + real math for the Linear Regression Studio -- generates a
// noisy "study hours -> exam score" dataset and computes MSE / gradients
// exactly as derived in linear-regression.md (Sections 2-4), no shortcuts.

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface Stats {
  mse: number;
  dw: number;
  db: number;
}

export interface GDStep {
  w: number;
  b: number;
  dw: number;
  db: number;
}

export interface LinearTraceStep extends GDStep {
  step: number;
  mse: number;
}

export const X_DOMAIN: [number, number] = [0, 11];
export const Y_DOMAIN: [number, number] = [0, 110];
export const W_DOMAIN: [number, number] = [-2, 16];
export const B_DOMAIN: [number, number] = [0, 100];

// A dramatic outlier: studied a lot, scored terribly -- a big vertical miss
// no matter how the line is fit, for the "why does one large mistake hurt
// so much" MSE experiment.
export const OUTLIER_POINT: Point = { x: 9, y: 28 };

export function generateData(n: number, noise: number, seed: number): Point[] {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = 1 + rand() * 9;
    const trueY = 6 * x + 40;
    const y = trueY + (rand() - 0.5) * 2 * noise;
    points.push({ x, y: Math.max(0, Math.min(110, y)) });
  }
  return points;
}

/** Real MSE, dw, db over the given points at (w, b) -- exactly Sections 2-4. */
export function computeStats(points: Point[], w: number, b: number): Stats {
  let sumSq = 0;
  let sumErr = 0;
  let sumErrX = 0;
  points.forEach((p) => {
    const pred = w * p.x + b;
    const err = pred - p.y;
    sumSq += err * err;
    sumErr += err;
    sumErrX += err * p.x;
  });
  const n = points.length || 1;
  return { mse: sumSq / n, dw: (2 / n) * sumErrX, db: (2 / n) * sumErr };
}

export function gradientStep(points: Point[], w: number, b: number, lr: number): GDStep {
  const { dw, db } = computeStats(points, w, b);
  return { w: w - lr * dw, b: b - lr * db, dw, db };
}

export function runLinearGradientDescent(
  points: Point[],
  start: { w: number; b: number },
  lr: number,
  steps: number,
): LinearTraceStep[] {
  const initial = computeStats(points, start.w, start.b);
  const trace: LinearTraceStep[] = [{ step: 0, w: start.w, b: start.b, dw: initial.dw, db: initial.db, mse: initial.mse }];
  let current = start;
  for (let step = 1; step <= Math.max(0, Math.round(steps)); step += 1) {
    const update = gradientStep(points, current.w, current.b, lr);
    current = { w: update.w, b: update.b };
    const stats = computeStats(points, current.w, current.b);
    trace.push({ step, ...update, mse: stats.mse });
    if (!Number.isFinite(stats.mse) || Math.abs(current.w) > 1e6 || Math.abs(current.b) > 1e6) break;
  }
  return trace;
}
