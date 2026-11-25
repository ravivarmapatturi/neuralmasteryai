import { fitLocalLinear, offsetsFromSeed, trueProb, type LimeSample } from './interpretability';

export const LIME_DOMAIN = { min: -2.2, max: 2.2 } as const;
export const LIME_RADIUS = 1.5;
export const LIME_STEEPNESS = 3;

export interface LimeLocalInput {
  instX: number;
  instY: number;
  sigma: number;
  sampleCount: number;
  seed?: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LimeLocalAnalysis {
  instX: number;
  instY: number;
  sigma: number;
  sampleCount: number;
  points: LimeSample[];
  b0: number;
  b1: number;
  b2: number;
  instanceTrueProb: number;
  instanceSurrogateProb: number;
  trueGradX: number;
  trueGradY: number;
  localR2: number;
  boundarySegment: LineSegment | null;
  trace: { id: 'pick' | 'perturb' | 'weight' | 'fit'; title: string; explain: string }[];
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/** Intersect line b0 + b1*x + b2*y = 0.5 with box [min, max] x [min, max]. */
export function clipBoundaryLine(b0: number, b1: number, b2: number, min: number, max: number): LineSegment | null {
  const rhs = 0.5 - b0;
  const pts: [number, number][] = [];
  const eps = 1e-8;

  if (Math.abs(b2) > eps) {
    const yLeft = (rhs - b1 * min) / b2;
    if (yLeft >= min - eps && yLeft <= max + eps) pts.push([min, clamp(yLeft, min, max)]);
    const yRight = (rhs - b1 * max) / b2;
    if (yRight >= min - eps && yRight <= max + eps) pts.push([max, clamp(yRight, min, max)]);
  }
  if (Math.abs(b1) > eps) {
    const xBottom = (rhs - b2 * min) / b1;
    if (xBottom > min + eps && xBottom < max - eps) pts.push([xBottom, min]);
    const xTop = (rhs - b2 * max) / b1;
    if (xTop > min + eps && xTop < max - eps) pts.push([xTop, max]);
  }

  if (pts.length < 2) return null;
  // Pick the two most separated points in case a corner hit twice.
  let best: [number, number][] = [pts[0], pts[1]];
  let bestDist = -1;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d > bestDist) {
        bestDist = d;
        best = [pts[i], pts[j]];
      }
    }
  }
  return { x1: best[0][0], y1: best[0][1], x2: best[1][0], y2: best[1][1] };
}

export function analyzeLimeLocal(input: LimeLocalInput): LimeLocalAnalysis {
  const instX = clamp(input.instX, -1.5, 1.5);
  const instY = clamp(input.instY, -1.5, 1.5);
  const sigma = clamp(input.sigma, 0.2, 1.6);
  const sampleCount = Math.round(clamp(input.sampleCount, 10, 60));
  const seed = input.seed ?? 7;

  const offsets = offsetsFromSeed(seed, sampleCount, 1.1);
  const { points, b0, b1, b2 } = fitLocalLinear(instX, instY, offsets, sigma);

  const instanceTrueProb = trueProb(instX, instY, LIME_RADIUS, LIME_STEEPNESS);
  const instanceSurrogateProb = b0 + b1 * instX + b2 * instY;

  // Analytic gradient of sigmoid(k*(r^2 - x^2 - y^2))
  const dp = instanceTrueProb * (1 - instanceTrueProb);
  const trueGradX = dp * LIME_STEEPNESS * (-2 * instX);
  const trueGradY = dp * LIME_STEEPNESS * (-2 * instY);

  let wSum = 0;
  let wpSum = 0;
  for (const p of points) {
    wSum += p.weight;
    wpSum += p.weight * p.prob;
  }
  const pMean = wSum > 0 ? wpSum / wSum : 0;

  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = b0 + b1 * p.x + b2 * p.y;
    ssTot += p.weight * (p.prob - pMean) ** 2;
    ssRes += p.weight * (p.prob - pred) ** 2;
  }
  const localR2 = ssTot > 1e-9 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;
  const boundarySegment = clipBoundaryLine(b0, b1, b2, LIME_DOMAIN.min, LIME_DOMAIN.max);

  const trace = [
    {
      id: 'pick' as const,
      title: `Pick the point (${instX.toFixed(1)}, ${instY.toFixed(1)}) to explain`,
      explain: `At (${instX.toFixed(1)}, ${instY.toFixed(1)}), the black-box circle scores p = ${(instanceTrueProb * 100).toFixed(1)}% (${instanceTrueProb > 0.5 ? 'inside' : 'outside'} the 50% boundary).`,
    },
    {
      id: 'perturb' as const,
      title: `Sample ${sampleCount} nearby points and query the black box`,
      explain: `LIME creates ${sampleCount} nudged copies around (${instX.toFixed(1)}, ${instY.toFixed(1)}) and asks the black-box model for every sample's probability.`,
    },
    {
      id: 'weight' as const,
      title: `Weight nearby samples higher (width σ = ${sigma.toFixed(1)})`,
      explain: `With σ = ${sigma.toFixed(1)}, points right beside (${instX.toFixed(1)}, ${instY.toFixed(1)}) get big weights w_i while far points fade out.`,
    },
    {
      id: 'fit' as const,
      title: 'Fit the straight-line explanation and read slopes',
      explain: `Weighted least squares fits ŷ = ${b0.toFixed(2)} + (${b1.toFixed(2)})x + (${b2.toFixed(2)})y with ${(localR2 * 100).toFixed(0)}% local R² fidelity.`,
    },
  ];

  return {
    instX,
    instY,
    sigma,
    sampleCount,
    points,
    b0,
    b1,
    b2,
    instanceTrueProb,
    instanceSurrogateProb,
    trueGradX,
    trueGradY,
    localR2,
    boundarySegment,
    trace,
  };
}
