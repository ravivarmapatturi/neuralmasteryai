// Pure pairwise LLM-as-a-judge position-bias calculation.
// Reuses the canonical helper and baseline qualities from ./llmEval so all
// evaluation playgrounds stay numerically consistent.

import {
  RESPONSE_A_QUALITY,
  RESPONSE_B_QUALITY,
  judgeScoreWithPositionBias,
} from './llmEval';

export type JudgeOrderMode = 'AB' | 'BA' | 'swapped';
export type JudgeVerdict = 'A' | 'B' | 'Tie';

export interface OrderPassResult {
  order: 'AB' | 'BA';
  slot1: 'A' | 'B';
  slot2: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  winner: JudgeVerdict;
  correct: boolean;
}

export interface PositionBiasTraceStep {
  step: number;
  mode: JudgeOrderMode;
  label: string;
  explain: string;
}

export interface PositionBiasAnalysis {
  qualityA: number;
  qualityB: number;
  bias: number;
  trueGap: number;
  trueWinner: JudgeVerdict;
  passAB: OrderPassResult;
  passBA: OrderPassResult;
  avgScoreA: number;
  avgScoreB: number;
  swappedGap: number;
  consistentVerdict: JudgeVerdict;
  verdictFlips: boolean;
  trace: PositionBiasTraceStep[];
}

export const POSITION_BIAS_PRESETS = [
  { id: 'near-tie', label: 'Near tie (7.2 vs 7.0)', qA: RESPONSE_A_QUALITY, qB: RESPONSE_B_QUALITY, bias: 0.5 },
  { id: 'clear-gap', label: 'Clear gap (8.5 vs 6.5)', qA: 8.5, qB: 6.5, bias: 0.5 },
  { id: 'strong-bias', label: 'Strong bias (7.8 vs 7.0, +1.2)', qA: 7.8, qB: 7.0, bias: 1.2 },
] as const;

function pickWinner(scoreA: number, scoreB: number): JudgeVerdict {
  if (Math.abs(scoreA - scoreB) < 1e-6) return 'Tie';
  return scoreA > scoreB ? 'A' : 'B';
}

export function analyzePositionBias({
  qualityA = RESPONSE_A_QUALITY,
  qualityB = RESPONSE_B_QUALITY,
  bias = 0.5,
}: {
  qualityA?: number;
  qualityB?: number;
  bias?: number;
} = {}): PositionBiasAnalysis {
  const qA = Math.max(0, Math.min(10, Number(qualityA.toFixed(2))));
  const qB = Math.max(0, Math.min(10, Number(qualityB.toFixed(2))));
  const b = Math.max(0, Math.min(2.5, Number(bias.toFixed(2))));

  const trueGap = Number((qA - qB).toFixed(4));
  const trueWinner = pickWinner(qA, qB);

  const abA = Number(judgeScoreWithPositionBias(qA, true, b).toFixed(4));
  const abB = Number(judgeScoreWithPositionBias(qB, false, b).toFixed(4));
  const abWinner = pickWinner(abA, abB);

  const baA = Number(judgeScoreWithPositionBias(qA, false, b).toFixed(4));
  const baB = Number(judgeScoreWithPositionBias(qB, true, b).toFixed(4));
  const baWinner = pickWinner(baA, baB);

  const passAB: OrderPassResult = {
    order: 'AB',
    slot1: 'A',
    slot2: 'B',
    scoreA: abA,
    scoreB: abB,
    winner: abWinner,
    correct: abWinner === trueWinner,
  };

  const passBA: OrderPassResult = {
    order: 'BA',
    slot1: 'B',
    slot2: 'A',
    scoreA: baA,
    scoreB: baB,
    winner: baWinner,
    correct: baWinner === trueWinner,
  };

  const avgScoreA = Number(((abA + baA) / 2).toFixed(4));
  const avgScoreB = Number(((abB + baB) / 2).toFixed(4));
  const swappedGap = Number((avgScoreA - avgScoreB).toFixed(4));
  const verdictFlips = abWinner !== baWinner;
  const consistentVerdict: JudgeVerdict = verdictFlips ? 'Tie' : abWinner;

  const trace: PositionBiasTraceStep[] = [
    {
      step: 0,
      mode: 'AB',
      label: 'Pass 1: A first',
      explain: `Slot 1 holds A (${qA.toFixed(2)} + ${b.toFixed(2)} = ${abA.toFixed(2)}) vs Slot 2 B (${abB.toFixed(2)}). Verdict: ${abWinner === 'Tie' ? 'Tie' : `${abWinner} wins`}${abWinner === trueWinner ? ' (matches true quality).' : ' (wrong!).'}`,
    },
    {
      step: 1,
      mode: 'BA',
      label: 'Pass 2: B first',
      explain: verdictFlips
        ? `Same answers, swapped slots: now Slot 1 gives B the +${b.toFixed(2)} bonus (${baB.toFixed(2)} vs A's ${baA.toFixed(2)}). The judge flips to ${baWinner}!`
        : `Even with B in Slot 1 (${baB.toFixed(2)} vs A's ${baA.toFixed(2)}), the true gap (${Math.abs(trueGap).toFixed(2)}) beats the +${b.toFixed(2)} bias, so ${baWinner} still holds.`,
    },
    {
      step: 2,
      mode: 'swapped',
      label: 'Swap & calibrate',
      explain: verdictFlips
        ? `AB picked ${abWinner} while BA picked ${baWinner} — flipping exposes the +${b.toFixed(2)} slot bias (calibrated as Tie; swapped averages recover A=${avgScoreA.toFixed(2)} vs B=${avgScoreB.toFixed(2)}, exact gap ${swappedGap >= 0 ? '+' : ''}${swappedGap.toFixed(2)}).`
        : `Both AB and BA agree on ${consistentVerdict}. Averaging both orders leaves +${(b / 2).toFixed(2)} on each side, preserving the exact true gap (${swappedGap >= 0 ? '+' : ''}${swappedGap.toFixed(2)}).`,
    },
  ];

  return {
    qualityA: qA,
    qualityB: qB,
    bias: b,
    trueGap,
    trueWinner,
    passAB,
    passBA,
    avgScoreA,
    avgScoreB,
    swappedGap,
    consistentVerdict,
    verdictFlips,
    trace,
  };
}
