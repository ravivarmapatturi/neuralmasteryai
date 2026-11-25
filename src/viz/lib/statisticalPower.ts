import { twoProportionPower } from './humanEval';

export type AlphaLevel = 0.1 | 0.05 | 0.01;

export interface PowerPreset {
  id: string;
  label: string;
  baseline: number;
  effectSize: number;
  n: number;
}

export const POWER_PRESETS: readonly PowerPreset[] = [
  { id: 'underpowered-20', label: '20-example trap (+5 pts)', baseline: 0.5, effectSize: 0.05, n: 20 },
  { id: 'medium-10', label: '10-pt gain at n = 390', baseline: 0.5, effectSize: 0.1, n: 390 },
  { id: 'full-5', label: '5-pt gain at 80% power', baseline: 0.5, effectSize: 0.05, n: 1566 },
];

export interface BellPoint {
  x: number;
  h0: number;
  h1: number;
}

export interface PowerCurvePoint {
  n: number;
  power: number;
}

export interface PowerAnalysis {
  baseline: number;
  target: number;
  effectSize: number;
  n: number;
  alpha: AlphaLevel;
  pBar: number;
  se: number;
  zAlpha: number;
  zEffect: number;
  cutoffDiff: number;
  power: number;
  missRate: number;
  requiredN80: number;
  chartMaxN: number;
  domainMin: number;
  domainMax: number;
  bellCurve: BellPoint[];
  powerCurve: PowerCurvePoint[];
  playbackNs: number[];
  explain: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

function normalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / (sd || 1e-9);
  return Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * (sd || 1e-9));
}

export function zCriticalForAlpha(alpha: AlphaLevel): number {
  if (alpha === 0.1) return 1.644854;
  if (alpha === 0.01) return 2.575829;
  return 1.959964;
}

export function computePowerAtN(p1: number, p2: number, n: number, alpha: AlphaLevel = 0.05): number {
  if (alpha === 0.05) {
    return twoProportionPower(p1, p2, n);
  }
  const pBar = (p1 + p2) / 2;
  const se = Math.sqrt((2 * pBar * (1 - pBar)) / n);
  const zAlpha = zCriticalForAlpha(alpha);
  const zEffect = Math.abs(p2 - p1) / (se || 1e-9);
  return normalCdf(zEffect - zAlpha);
}

export function requiredSampleSize80(p1: number, effectSize: number, alpha: AlphaLevel = 0.05): number {
  const p2 = Math.min(0.99, p1 + effectSize);
  const pBar = (p1 + p2) / 2;
  const zAlpha = zCriticalForAlpha(alpha);
  const zBeta80 = 0.841621; // Phi^-1(0.80)
  const delta = Math.max(1e-4, Math.abs(p2 - p1));
  return Math.ceil((2 * pBar * (1 - pBar) * (zAlpha + zBeta80) ** 2) / (delta * delta));
}

export function analyzeStatisticalPower({
  baseline = 0.5,
  effectSize = 0.05,
  n = 20,
  alpha = 0.05,
}: {
  baseline?: number;
  effectSize?: number;
  n?: number;
  alpha?: AlphaLevel;
} = {}): PowerAnalysis {
  const safeBase = clamp(Number.isFinite(baseline) ? baseline : 0.5, 0.1, 0.8);
  const safeEffect = clamp(Number.isFinite(effectSize) ? effectSize : 0.05, 0.01, 0.25);
  const safeN = Math.max(5, Math.min(3000, Math.round(Number.isFinite(n) ? n : 20)));
  const target = Math.min(0.99, safeBase + safeEffect);
  const actualDelta = target - safeBase;

  const pBar = (safeBase + target) / 2;
  const se = Math.sqrt((2 * pBar * (1 - pBar)) / safeN);
  const zAlpha = zCriticalForAlpha(alpha);
  const zEffect = actualDelta / (se || 1e-9);
  const cutoffDiff = zAlpha * se;
  const power = computePowerAtN(safeBase, target, safeN, alpha);
  const missRate = 1 - power;
  const requiredN80 = requiredSampleSize80(safeBase, actualDelta, alpha);

  const chartMaxN = Math.max(500, Math.min(3000, Math.ceil((Math.max(safeN, requiredN80) * 1.15) / 100) * 100));

  const domainMin = Math.min(-0.18, -2.8 * se);
  const domainMax = Math.max(actualDelta + 2.8 * se, cutoffDiff + 1.8 * se, 0.22);
  const bellCurve: BellPoint[] = Array.from({ length: 81 }, (_, i) => {
    const x = domainMin + (i / 80) * (domainMax - domainMin);
    return {
      x,
      h0: normalPdf(x, 0, se),
      h1: normalPdf(x, actualDelta, se),
    };
  });

  const powerCurve: PowerCurvePoint[] = Array.from({ length: 61 }, (_, i) => {
    const nn = Math.round(5 + (i / 60) * (chartMaxN - 5));
    return {
      n: nn,
      power: computePowerAtN(safeBase, target, nn, alpha),
    };
  });

  const nGoal = Math.min(3000, Math.max(100, requiredN80));
  const playbackNs = Array.from(
    new Set([
      20,
      Math.max(40, Math.round(nGoal * 0.15)),
      Math.max(80, Math.round(nGoal * 0.4)),
      Math.max(120, Math.round(nGoal * 0.7)),
      nGoal,
    ]),
  ).sort((a, b) => a - b);

  let explain = '';
  if (power < 0.2) {
    explain = `With n = ${safeN} per side, noise is huge (SE = ±${(se * 100).toFixed(1)} pts), so you need a +${(cutoffDiff * 100).toFixed(1)} pt gap to beat luck. Power is only ${(power * 100).toFixed(1)}% — this study misses a real +${(actualDelta * 100).toFixed(1)} pt gain ${(missRate * 100).toFixed(0)}% of the time.`;
  } else if (power < 0.8) {
    explain = `At n = ${safeN} per side (SE = ±${(se * 100).toFixed(1)} pts), the two bell curves still overlap: power reaches ${(power * 100).toFixed(1)}%, short of the 80% reliability goal (need n ≈ ${requiredN80.toLocaleString('en-US')}).`;
  } else {
    explain = `At n = ${safeN} per side, noise narrows to SE = ±${(se * 100).toFixed(1)} pts and separates the bells: power reaches ${(power * 100).toFixed(1)}%, clearing the 80% reliability bar!`;
  }

  return {
    baseline: safeBase,
    target,
    effectSize: actualDelta,
    n: safeN,
    alpha,
    pBar,
    se,
    zAlpha,
    zEffect,
    cutoffDiff,
    power,
    missRate,
    requiredN80,
    chartMaxN,
    domainMin,
    domainMax,
    bellCurve,
    powerCurve,
    playbackNs,
    explain,
  };
}
