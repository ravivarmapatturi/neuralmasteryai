// Pure 1D heat-equation neural-operator calculation.
// Reuses the canonical 40-point grid and Gaussian convolution from ./aiforscience
// when nx === 40 and diffusivity === 0.3, and extends cleanly to arbitrary grid
// resolution nx and diffusivity D to show discretization invariance and Fourier mode decay.

import { SPATIAL_GRID, diffuse as baseDiffuse, initialCondition as baseInitial } from './aiforscience';

export type InitialShapeKind = 'double-bump' | 'single-bump' | 'square';

export interface SpatialPoint {
  x: number;
  u0: number;
  ut: number;
}

export interface FourierModeBar {
  k: number;
  initialAmp: number;
  evolvedAmp: number;
  retainedPct: number;
}

export interface NeuralOperatorStep {
  step: number;
  time: number;
  sigma: number;
  peakHeight: number;
  explain: string;
}

export interface NeuralOperatorAnalysis {
  kind: InitialShapeKind;
  time: number;
  diffusivity: number;
  gridCount: number;
  sigma: number;
  points: SpatialPoint[];
  initialPeak: number;
  evolvedPeak: number;
  initialCenterVal: number;
  evolvedCenterVal: number;
  modes: FourierModeBar[];
  highFreqRetainedPct: number;
  trace: NeuralOperatorStep[];
}

export const NEURAL_OP_TIMES = [0, 0.2, 0.8, 1.8, 3.2, 5.0] as const;

export const SHAPE_META: Record<InitialShapeKind, { label: string; shortDesc: string }> = {
  'double-bump': {
    label: 'Double bump',
    shortDesc: 'Two hot peaks at x = ±2 spread out and merge into a single broad bell.',
  },
  'single-bump': {
    label: 'Single bump',
    shortDesc: 'One smooth Gaussian pulse flattens and widens at σ = √(2Dt).',
  },
  square: {
    label: 'Square pulse',
    shortDesc: 'Sharp vertical cliff corners hold high frequencies that round immediately at t > 0.',
  },
};

export function makeSpatialGrid(gridCount: number): number[] {
  const n = Math.max(16, Math.min(80, Math.round(gridCount)));
  if (n === SPATIAL_GRID.length) return [...SPATIAL_GRID];
  return Array.from({ length: n }, (_, i) => (i / (n - 1)) * 10 - 5);
}

export function evaluateInitialShape(kind: InitialShapeKind, grid: readonly number[]): number[] {
  if (grid.length === SPATIAL_GRID.length && Math.abs(grid[0] - SPATIAL_GRID[0]) < 1e-9) {
    return baseInitial(kind);
  }
  if (kind === 'single-bump') return grid.map((x) => Math.exp(-(x * x) / 2));
  if (kind === 'double-bump') {
    return grid.map((x) => Math.exp(-((x - 2) ** 2) / 0.8) + Math.exp(-((x + 2) ** 2) / 0.8));
  }
  return grid.map((x) => (Math.abs(x) < 1.5 ? 1 : 0));
}

export function convolveHeatKernel(
  grid: readonly number[],
  initial: readonly number[],
  time: number,
  diffusivity: number,
): number[] {
  if (time <= 0 || diffusivity <= 0) return [...initial];
  if (grid.length === SPATIAL_GRID.length && Math.abs(diffusivity - 0.3) < 1e-9) {
    return baseDiffuse([...initial], time, 0.3);
  }
  const sigma = Math.sqrt(2 * diffusivity * time);
  return grid.map((x) => {
    let sum = 0;
    let weightSum = 0;
    for (let j = 0; j < initial.length; j++) {
      const w = Math.exp(-((x - grid[j]) ** 2) / (2 * sigma * sigma));
      sum += w * initial[j];
      weightSum += w;
    }
    return sum / (weightSum || 1);
  });
}

function computeCosineSpectrum(grid: readonly number[], values: readonly number[], maxK = 7): number[] {
  // Real discrete cosine projection over [-5, 5] (period L = 10), normalized per sample
  const L = 10;
  const n = grid.length;
  const amps: number[] = [];
  for (let k = 1; k <= maxK; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * k * (grid[i] + 5)) / L;
      re += values[i] * Math.cos(angle);
      im -= values[i] * Math.sin(angle);
    }
    amps.push((2 * Math.hypot(re, im)) / n);
  }
  return amps;
}

export function analyzeNeuralOperator({
  kind = 'double-bump',
  time = 1.8,
  diffusivity = 0.3,
  gridCount = 40,
}: {
  kind?: InitialShapeKind;
  time?: number;
  diffusivity?: number;
  gridCount?: number;
} = {}): NeuralOperatorAnalysis {
  const clampedT = Math.max(0, Math.min(6, Number(time.toFixed(2))));
  const clampedD = Math.max(0.05, Math.min(1.0, Number(diffusivity.toFixed(2))));
  const n = Math.max(16, Math.min(80, Math.round(gridCount)));
  const grid = makeSpatialGrid(n);
  const u0 = evaluateInitialShape(kind, grid);
  const ut = convolveHeatKernel(grid, u0, clampedT, clampedD);
  const sigma = Math.sqrt(2 * clampedD * clampedT);

  const points: SpatialPoint[] = grid.map((x, i) => ({ x, u0: u0[i], ut: ut[i] }));
  const initialPeak = Math.max(...u0);
  const evolvedPeak = Math.max(...ut);
  const midIdx = Math.floor(n / 2);
  const initialCenterVal = u0[midIdx] ?? 0;
  const evolvedCenterVal = ut[midIdx] ?? 0;

  const initSpec = computeCosineSpectrum(grid, u0, 7);
  const evolSpec = computeCosineSpectrum(grid, ut, 7);
  const modes: FourierModeBar[] = initSpec.map((amp0, idx) => {
    const ampT = evolSpec[idx] ?? 0;
    return {
      k: idx + 1,
      initialAmp: amp0,
      evolvedAmp: ampT,
      retainedPct: amp0 > 1e-6 ? Math.min(100, (ampT / amp0) * 100) : 0,
    };
  });

  const highInit = modes.slice(2).reduce((acc, m) => acc + m.initialAmp, 0);
  const highEvol = modes.slice(2).reduce((acc, m) => acc + m.evolvedAmp, 0);
  const highFreqRetainedPct = highInit > 1e-6 ? Math.min(100, (highEvol / highInit) * 100) : 0;

  const trace: NeuralOperatorStep[] = NEURAL_OP_TIMES.map((tVal, step) => {
    const uStep = convolveHeatKernel(grid, u0, tVal, clampedD);
    const sig = Math.sqrt(2 * clampedD * tVal);
    const pk = Math.max(...uStep);
    let explain = '';
    if (tVal === 0) {
      explain = `At t = 0, the operator passes the raw ${SHAPE_META[kind].label.toLowerCase()} input unchanged (peak = ${pk.toFixed(2)}, σ = 0.00).`;
    } else if (tVal <= 0.3) {
      explain =
        kind === 'square'
          ? `At tiny t = ${tVal.toFixed(1)} (σ = ${sig.toFixed(2)}), sharp step corners vanish immediately because high-frequency modes decay fastest.`
          : `At early t = ${tVal.toFixed(1)}, kernel width σ = ${sig.toFixed(2)} slightly smooths the ${SHAPE_META[kind].label.toLowerCase()} (peak ${pk.toFixed(2)}).`;
    } else if (kind === 'double-bump' && tVal >= 1.5 && tVal <= 2.5) {
      explain = `At t = ${tVal.toFixed(1)} (σ = ${sig.toFixed(2)}), the two separate peaks blur wide enough to merge toward one broad center hill.`;
    } else {
      explain = `At t = ${tVal.toFixed(1)} (σ = ${sig.toFixed(2)}), heat spreads across ${n} grid points without retraining; peak cools to ${pk.toFixed(2)}.`;
    }
    return { step, time: tVal, sigma: sig, peakHeight: pk, explain };
  });

  return {
    kind,
    time: clampedT,
    diffusivity: clampedD,
    gridCount: n,
    sigma,
    points,
    initialPeak,
    evolvedPeak,
    initialCenterVal,
    evolvedCenterVal,
    modes,
    highFreqRetainedPct,
    trace,
  };
}
