import { crossEntropy, entropy, klDivergence } from './probstat';

export type EntropyFormulaId = 'entropy' | 'cross-entropy' | 'forward-kl' | 'reverse-kl';

export interface EntropyOutcomeRow {
  label: string;
  p: number;
  q: number;
  selfSurpriseBits: number;
  modelSurpriseBits: number;
  entropyTerm: number;
  crossEntropyTerm: number;
  forwardKlTerm: number;
  reverseKlTerm: number;
}

export interface EntropyKlBreakdown {
  rows: EntropyOutcomeRow[];
  entropyP: number;
  crossEntropyPQ: number;
  klPQ: number;
  klQP: number;
  worstOutcomeLabel: string;
}

export interface EntropyScenarioPreset {
  id: string;
  label: string;
  outcomes: readonly [string, string, string];
  trueWeights: readonly [number, number, number];
  modelWeights: readonly [number, number, number];
}

export const ENTROPY_PRESETS: readonly EntropyScenarioPreset[] = [
  {
    id: 'next-word',
    label: 'Next word',
    outcomes: ['cat', 'dog', 'bird'],
    trueWeights: [70, 20, 10],
    modelWeights: [40, 40, 20],
  },
  {
    id: 'weather',
    label: 'Weather',
    outcomes: ['sunny', 'cloudy', 'rain'],
    trueWeights: [50, 35, 15],
    modelWeights: [50, 35, 15],
  },
  {
    id: 'uniform',
    label: 'Equal odds',
    outcomes: ['choice A', 'choice B', 'choice C'],
    trueWeights: [34, 33, 33],
    modelWeights: [34, 33, 33],
  },
  {
    id: 'blind-spot',
    label: 'Blind spot',
    outcomes: ['cat', 'dog', 'bird'],
    trueWeights: [70, 20, 10],
    modelWeights: [1, 49, 50],
  },
];

export interface EntropyPlaybackStep {
  title: string;
  modelWeights: readonly [number, number, number];
  formula: EntropyFormulaId;
  explain: string;
}

export const ENTROPY_PLAYBACK_STEPS: readonly EntropyPlaybackStep[] = [
  {
    title: 'Perfect match (Q = P)',
    modelWeights: [70, 20, 10],
    formula: 'cross-entropy',
    explain: 'When the model guess Q matches the true world P, extra penalty KL = 0.000 bits and training loss equals the unavoidable world surprise H(P).',
  },
  {
    title: 'Slightly cautious guess',
    modelWeights: [50, 30, 20],
    formula: 'forward-kl',
    explain: 'Shifting weight away from the common outcome raises surprise on "cat", adding a small positive KL penalty on top of H(P).',
  },
  {
    title: 'Flat equal guess (33/33/33)',
    modelWeights: [33, 33, 34],
    formula: 'cross-entropy',
    explain: 'Treating all three outcomes as equally likely ignores that "cat" happens 70% of the time, raising cross-entropy loss.',
  },
  {
    title: 'Blind spot on common outcome',
    modelWeights: [1, 49, 50],
    formula: 'forward-kl',
    explain: 'Giving "cat" only 1% when it happens 70% of the time makes -log₂(0.01) = 6.64 bits per cat, exploding KL divergence.',
  },
  {
    title: 'Compare reverse direction D_KL(Q ‖ P)',
    modelWeights: [1, 49, 50],
    formula: 'reverse-kl',
    explain: 'Swapping P and Q weights mistakes by Q instead of P, proving KL divergence is asymmetric: D_KL(P ‖ Q) differs from D_KL(Q ‖ P).',
  },
];

const PROB_FLOOR = 1e-4;

/** Convert any non-negative weights into valid probabilities summing to 1. */
export function normalizeWeights(weights: readonly number[]): number[] {
  const cleaned = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const sum = cleaned.reduce((acc, w) => acc + w, 0);
  if (sum <= 0) {
    return weights.map(() => 1 / Math.max(1, weights.length));
  }
  return cleaned.map((w) => w / sum);
}

/** Blend model weights smoothly between true P and current Q (alpha=0 => P, alpha=1 => Q). */
export function blendWeights(
  trueWeights: readonly number[],
  modelWeights: readonly number[],
  alpha: number,
): number[] {
  const t = Math.max(0, Math.min(1, alpha));
  const p = normalizeWeights(trueWeights);
  const q = normalizeWeights(modelWeights);
  return p.map((pi, idx) => Number((((1 - t) * pi + t * q[idx]) * 100).toFixed(1)));
}

/** Compute exact Shannon entropy, cross-entropy, forward KL, and reverse KL in bits. */
export function computeEntropyKlBreakdown(
  labels: readonly string[],
  trueWeights: readonly number[],
  modelWeights: readonly number[],
): EntropyKlBreakdown {
  const p = normalizeWeights(trueWeights);
  const qRaw = normalizeWeights(modelWeights);
  const pSafe = p.map((v) => Math.max(PROB_FLOOR, v));
  const qSafe = qRaw.map((v) => Math.max(PROB_FLOOR, v));
  const pNormSafe = normalizeWeights(pSafe);
  const qNormSafe = normalizeWeights(qSafe);

  const pForCalc = p.every((v) => v >= PROB_FLOOR) ? p : pNormSafe;
  const qForCalc = qRaw.every((v) => v >= PROB_FLOOR) ? qRaw : qNormSafe;

  const entropyP = entropy(pForCalc);
  const crossEntropyPQ = crossEntropy(pForCalc, qForCalc);
  const klPQ = Math.max(0, klDivergence(pForCalc, qForCalc));
  const klQP = Math.max(0, klDivergence(qForCalc, pForCalc));

  const rows: EntropyOutcomeRow[] = labels.map((label, i) => {
    const pi = pForCalc[i] ?? 0;
    const qi = qForCalc[i] ?? PROB_FLOOR;
    const selfSurpriseBits = pi > 0 ? -Math.log2(pi) : 0;
    const modelSurpriseBits = -Math.log2(qi);
    return {
      label,
      p: pi,
      q: qi,
      selfSurpriseBits,
      modelSurpriseBits,
      entropyTerm: pi * selfSurpriseBits,
      crossEntropyTerm: pi * modelSurpriseBits,
      forwardKlTerm: pi * Math.log2(pi / qi),
      reverseKlTerm: qi * Math.log2(qi / pi),
    };
  });

  let worst = rows[0];
  for (const row of rows) {
    if (row.crossEntropyTerm > worst.crossEntropyTerm) worst = row;
  }

  return {
    rows,
    entropyP,
    crossEntropyPQ,
    klPQ,
    klQP,
    worstOutcomeLabel: worst?.label ?? labels[0] ?? 'item',
  };
}
