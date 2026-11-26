import { classifierScore, classify, gradient } from './aisecurity';

export type AttackMethod = 'l2' | 'fgsm' | 'random';

export interface PerturbationResult {
  start: [number, number];
  perturbed: [number, number];
  randomBaseline: [number, number];
  delta: [number, number];
  rSquared: number;
  boundaryRadius: number;
  epsilon: number;
  l2Distance: number;
  lInfDistance: number;
  grad: [number, number];
  gradNorm: number;
  baseScore: number;
  perturbedScore: number;
  randomScore: number;
  baseClass: 0 | 1;
  perturbedClass: 0 | 1;
  randomClass: 0 | 1;
  baseProb1: number;
  perturbedProb1: number;
  flipped: boolean;
  randomFlipped: boolean;
  exactBoundaryDist: number;
  method: AttackMethod;
}

export interface PerturbationStep {
  epsilon: number;
  explain: string;
}

export const ADV_EPSILON_SWEEP = [0, 0.05, 0.10, 0.16, 0.25, 0.40] as const;

/** Classifier score with configurable circular boundary x^2 + y^2 - rSquared. */
export function scoreAt(x: number, y: number, rSquared = 1.6): number {
  if (Math.abs(rSquared - 1.6) < 1e-12) return classifierScore(x, y);
  return x * x + y * y - rSquared;
}

export function classAt(x: number, y: number, rSquared = 1.6): 0 | 1 {
  if (Math.abs(rSquared - 1.6) < 1e-12) return classify(x, y);
  return scoreAt(x, y, rSquared) > 0 ? 1 : 0;
}

/** Smooth probability readout derived from signed margin s(x): sigmoid(4 * s). */
export function class1Probability(score: number): number {
  const z = Math.max(-20, Math.min(20, 4 * score));
  return 1 / (1 + Math.exp(-z));
}

function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** Deterministic unit direction rotated 82 degrees from the gradient descent direction,
 * illustrating why unaligned random noise wastes most of its budget moving along the boundary. */
function unalignedUnitDirection(gx: number, gy: number): [number, number] {
  const norm = Math.hypot(gx, gy) || 1;
  const dx = -gx / norm;
  const dy = -gy / norm;
  const angle = (82 * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [dx * c - dy * s, dx * s + dy * c];
}

export function evaluatePerturbation({
  start,
  epsilon,
  method,
  rSquared = 1.6,
}: {
  start: [number, number];
  epsilon: number;
  method: AttackMethod;
  rSquared?: number;
}): PerturbationResult {
  const x = Math.max(-2.1, Math.min(2.1, start[0]));
  const y = Math.max(-2.1, Math.min(2.1, start[1]));
  const eps = Math.max(0, Math.min(0.75, epsilon));
  const safeRSq = Math.max(0.4, Math.min(3.2, rSquared));
  const boundaryRadius = Math.sqrt(safeRSq);

  const [gx, gy] = gradient(x, y);
  const gradNorm = Math.hypot(gx, gy) || 1;
  const baseScore = scoreAt(x, y, safeRSq);
  const baseClass = classAt(x, y, safeRSq);

  // Step toward the decision boundary s = 0 (against grad if in Class 1, along grad if in Class 0)
  const towardSign = baseClass === 1 ? -1 : 1;
  const [rx, ry] = unalignedUnitDirection(gx, gy);
  const randomBaseline: [number, number] = [x + rx * eps, y + ry * eps];

  let perturbed: [number, number];
  if (method === 'l2') {
    perturbed = [
      x + (towardSign * gx / gradNorm) * eps,
      y + (towardSign * gy / gradNorm) * eps,
    ];
  } else if (method === 'fgsm') {
    perturbed = [
      x + towardSign * sign(gx) * eps,
      y + towardSign * sign(gy) * eps,
    ];
  } else {
    perturbed = randomBaseline;
  }

  const delta: [number, number] = [perturbed[0] - x, perturbed[1] - y];
  const l2Distance = Math.hypot(delta[0], delta[1]);
  const lInfDistance = Math.max(Math.abs(delta[0]), Math.abs(delta[1]));
  const perturbedScore = scoreAt(perturbed[0], perturbed[1], safeRSq);
  const randomScore = scoreAt(randomBaseline[0], randomBaseline[1], safeRSq);
  const perturbedClass = classAt(perturbed[0], perturbed[1], safeRSq);
  const randomClass = classAt(randomBaseline[0], randomBaseline[1], safeRSq);
  const exactBoundaryDist = Math.abs(Math.hypot(x, y) - boundaryRadius);

  return {
    start: [x, y],
    perturbed,
    randomBaseline,
    delta,
    rSquared: safeRSq,
    boundaryRadius,
    epsilon: eps,
    l2Distance,
    lInfDistance,
    grad: [gx, gy],
    gradNorm,
    baseScore,
    perturbedScore,
    randomScore,
    baseClass,
    perturbedClass,
    randomClass,
    baseProb1: class1Probability(baseScore),
    perturbedProb1: class1Probability(perturbedScore),
    flipped: perturbedClass !== baseClass,
    randomFlipped: randomClass !== baseClass,
    exactBoundaryDist,
    method,
  };
}

export function explainPerturbation(res: PerturbationResult): string {
  if (res.epsilon === 0) {
    return `ε = 0.00: no nudge applied yet. Original input (${res.start[0].toFixed(2)}, ${res.start[1].toFixed(2)}) scores ${res.baseScore.toFixed(3)} (Class ${res.baseClass}), sitting ${res.exactBoundaryDist.toFixed(3)} units from the boundary.`;
  }
  const methodName =
    res.method === 'l2'
      ? 'L2 gradient step'
      : res.method === 'fgsm'
        ? 'FGSM sign nudge'
        : 'Random nudge';
  if (res.flipped) {
    return `${methodName} (ε = ${res.epsilon.toFixed(2)}) pushed the score from ${res.baseScore.toFixed(3)} to ${res.perturbedScore.toFixed(3)}, crossing the boundary and flipping Class ${res.baseClass} → Class ${res.perturbedClass}!`;
  }
  return `${methodName} (ε = ${res.epsilon.toFixed(2)}) moved the score from ${res.baseScore.toFixed(3)} to ${res.perturbedScore.toFixed(3)} — still Class ${res.baseClass} (needs ${res.exactBoundaryDist.toFixed(3)} L2 distance to cross).`;
}
