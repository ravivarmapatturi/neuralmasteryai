import {
  dataLoss,
  networkPrediction,
  physicsLoss,
  physicsResidual,
  trueOdeSolution,
} from './aiforscience';

export type PinnObjective = 'physicsInformed' | 'dataOnly';

export interface PinnPreset {
  id: string;
  label: string;
  a: number;
  b: number;
  mode: PinnObjective;
}

export const COLLOCATION_POINTS = [0.3, 0.8, 1.3, 1.8, 2.3, 2.8] as const;
export const DEFAULT_DATA_X = 0.1;

export const PINN_PRESETS: readonly PinnPreset[] = [
  { id: 'drifted', label: 'Drifted fit (a=1.0, b=0.8)', a: 1.0, b: 0.8, mode: 'physicsInformed' },
  { id: 'wrong-decay', label: 'Too steep (a=1.8, b=0.0)', a: 1.8, b: 0.0, mode: 'physicsInformed' },
  { id: 'exact-law', label: 'Exact physics (a=1.0, b=0.0)', a: 1.0, b: 0.0, mode: 'physicsInformed' },
];

export interface PinnCurveSample {
  x: number;
  yTrue: number;
  yPred: number;
}

export interface PinnPointCheck {
  kind: 'data' | 'physics';
  x: number;
  yTrue: number;
  yPred: number;
  residual: number;
  absResidual: number;
  squaredError: number;
}

export interface PinnTrainingStep {
  step: number;
  a: number;
  b: number;
  dLoss: number;
  pLoss: number;
  totalLoss: number;
  farErrorAt2: number;
  explain: string;
}

export interface PinnAnalysis {
  mode: PinnObjective;
  a: number;
  b: number;
  dataX: number;
  physicsWeight: number;
  dLoss: number;
  pLoss: number;
  weightedPhysicsLoss: number;
  totalLoss: number;
  yTrueAtData: number;
  yPredAtData: number;
  dataErrorAtData: number;
  farErrorAt2: number;
  samples: PinnCurveSample[];
  checks: PinnPointCheck[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function evaluatePinn({
  mode,
  a,
  b,
  dataX = DEFAULT_DATA_X,
  physicsWeight = 1.0,
}: {
  mode: PinnObjective;
  a: number;
  b: number;
  dataX?: number;
  physicsWeight?: number;
}): PinnAnalysis {
  const safeA = clamp(Number.isFinite(a) ? a : 1.0, 0.2, 2.5);
  const safeB = clamp(Number.isFinite(b) ? b : 0.0, -1.0, 1.0);
  const safeDataX = clamp(Number.isFinite(dataX) ? dataX : DEFAULT_DATA_X, 0.1, 2.5);
  const safeWeight = clamp(Number.isFinite(physicsWeight) ? physicsWeight : 1.0, 0.1, 3.0);

  const dLoss = dataLoss(safeA, safeB, [safeDataX]);
  const pLoss = physicsLoss(safeA, safeB, [...COLLOCATION_POINTS]);
  const weightedPhysicsLoss = safeWeight * pLoss;
  const totalLoss = mode === 'physicsInformed' ? dLoss + weightedPhysicsLoss : dLoss;

  const yTrueAtData = trueOdeSolution(safeDataX);
  const yPredAtData = networkPrediction(safeDataX, safeA, safeB);
  const dataErrorAtData = yPredAtData - yTrueAtData;
  const farErrorAt2 = Math.abs(networkPrediction(2.0, safeA, safeB) - trueOdeSolution(2.0));

  const samples: PinnCurveSample[] = Array.from({ length: 61 }, (_, i) => {
    const x = (i / 60) * 3;
    return {
      x,
      yTrue: trueOdeSolution(x),
      yPred: networkPrediction(x, safeA, safeB),
    };
  });

  const dataCheck: PinnPointCheck = {
    kind: 'data',
    x: safeDataX,
    yTrue: yTrueAtData,
    yPred: yPredAtData,
    residual: dataErrorAtData,
    absResidual: Math.abs(dataErrorAtData),
    squaredError: dLoss,
  };

  const physicsChecks: PinnPointCheck[] = COLLOCATION_POINTS.map((xc) => {
    const r = physicsResidual(safeA, safeB, xc);
    return {
      kind: 'physics',
      x: xc,
      yTrue: trueOdeSolution(xc),
      yPred: networkPrediction(xc, safeA, safeB),
      residual: r,
      absResidual: Math.abs(r),
      squaredError: r * r,
    };
  });

  return {
    mode,
    a: safeA,
    b: safeB,
    dataX: safeDataX,
    physicsWeight: safeWeight,
    dLoss,
    pLoss,
    weightedPhysicsLoss,
    totalLoss,
    yTrueAtData,
    yPredAtData,
    dataErrorAtData,
    farErrorAt2,
    samples,
    checks: [dataCheck, ...physicsChecks],
  };
}

function objectiveValue(
  a: number,
  b: number,
  mode: PinnObjective,
  dataX: number,
  physicsWeight: number,
): number {
  const d = dataLoss(a, b, [dataX]);
  if (mode === 'dataOnly') return d;
  return d + physicsWeight * physicsLoss(a, b, [...COLLOCATION_POINTS]);
}

/**
 * Generates an 8-step real gradient-descent training trace from (startA, startB)
 * under the chosen objective (Data-only vs Data + physics).
 */
export function buildPinnTrainingTrace({
  mode,
  startA,
  startB,
  dataX = DEFAULT_DATA_X,
  physicsWeight = 1.0,
  totalSteps = 8,
}: {
  mode: PinnObjective;
  startA: number;
  startB: number;
  dataX?: number;
  physicsWeight?: number;
  totalSteps?: number;
}): PinnTrainingStep[] {
  let a = clamp(startA, 0.2, 2.5);
  let b = clamp(startB, -1.0, 1.0);
  const safeDataX = clamp(dataX, 0.1, 2.5);
  const safeWeight = clamp(physicsWeight, 0.1, 3.0);

  const trace: PinnTrainingStep[] = [];
  const h = 1e-4;
  const lr = 0.6;

  for (let step = 0; step < totalSteps; step++) {
    const dLoss = dataLoss(a, b, [safeDataX]);
    const pLoss = physicsLoss(a, b, [...COLLOCATION_POINTS]);
    const totalLoss = mode === 'physicsInformed' ? dLoss + safeWeight * pLoss : dLoss;
    const farErrorAt2 = Math.abs(networkPrediction(2.0, a, b) - trueOdeSolution(2.0));

    let explain = '';
    if (step === 0) {
      explain =
        mode === 'dataOnly'
          ? `Start at a=${a.toFixed(2)}, b=${b.toFixed(2)}: Data loss only sees the single labeled dot at x=${safeDataX.toFixed(1)} (data loss=${dLoss.toFixed(4)}) and ignores the physics error at x=2.0 (off by ${farErrorAt2.toFixed(2)}).`
          : `Start at a=${a.toFixed(2)}, b=${b.toFixed(2)}: Physics checks the law dy/dx + y = 0 at 6 unlabeled points, exposing physics loss=${pLoss.toFixed(4)} even where no data label exists.`;
    } else if (mode === 'dataOnly') {
      explain = `Step ${step}: Data-only gradient descent matches the single dot at x=${safeDataX.toFixed(1)} (data loss=${dLoss.toFixed(4)}), but far away at x=2.0 the prediction is still off by ${farErrorAt2.toFixed(2)}.`;
    } else {
      explain = `Step ${step}: Physics residuals at all 6 unlabeled points pull (a, b) to (${a.toFixed(2)}, ${b.toFixed(2)}), cutting total loss to ${totalLoss.toFixed(4)} and error at x=2.0 to ${farErrorAt2.toFixed(2)}.`;
    }

    trace.push({
      step,
      a: round2(a),
      b: round2(b),
      dLoss,
      pLoss,
      totalLoss,
      farErrorAt2,
      explain,
    });

    for (let k = 0; k < 5; k++) {
      const ga =
        (objectiveValue(a + h, b, mode, safeDataX, safeWeight) -
          objectiveValue(a - h, b, mode, safeDataX, safeWeight)) /
        (2 * h);
      const gb =
        (objectiveValue(a, b + h, mode, safeDataX, safeWeight) -
          objectiveValue(a, b - h, mode, safeDataX, safeWeight)) /
        (2 * h);
      a = clamp(a - lr * ga, 0.2, 2.5);
      b = clamp(b - lr * gb, -1.0, 1.0);
    }
  }

  return trace;
}
