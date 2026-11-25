// Pure-TypeScript KL-regularized RLHF reward-hacking engine.
// Reuses trueQuality and proxyReward from ./alignment when idealLength = 150,
// and computes closed-form optimal policies pi*(y) proportional to pi_ref(y) * exp(R(y)/beta)
// across training pressure steps to demonstrate Goodhart's Law collapse and KL tethering.

import { proxyReward, trueQuality } from './alignment';

export const CANDIDATE_LENGTHS: readonly number[] = [40, 120, 160, 260, 420, 650, 900];
export const REFERENCE_PROBS: readonly number[] = [0.16, 0.34, 0.28, 0.13, 0.05, 0.03, 0.01];
export const TOTAL_OPT_STEPS = 10;

export interface RewardHackingParams {
  /** Extra reward points the flawed reward model grants per 100 words (0.0 .. 2.2). */
  lengthBias: number;
  /** Final KL regularization temperature floor beta (0.15 .. 5.0). Lower = pushes proxy harder. */
  klFloor: number;
  /** True-quality peak word length (default 150 words, matching ./alignment). */
  idealLength: number;
}

export interface RlhfStepRecord {
  step: number;
  effectiveBeta: number;
  klDivergence: number;
  expectedLength: number;
  expectedTrueQuality: number;
  expectedProxyReward: number;
  policyProbs: number[];
  hackingGap: number;
}

export interface RewardHackingSimulation {
  trace: RlhfStepRecord[];
  curveLengths: number[];
  trueCurve: number[];
  proxyCurve: number[];
  truePeakQuality: number;
  hacked: boolean;
}

/** True response quality (0..10) peaking at `idealLength`. Calls ./alignment directly when idealLength === 150. */
export function qualityAtLength(length: number, idealLength = 150): number {
  if (Math.abs(idealLength - 150) < 1e-9) {
    return trueQuality(length);
  }
  return 10 * Math.exp(-((length - idealLength) ** 2) / (2 * 80 ** 2));
}

/** Proxy reward learned with verbosity bias (`lengthBias` points per 100 words). */
export function proxyAtLength(length: number, lengthBias: number, idealLength = 150): number {
  if (Math.abs(idealLength - 150) < 1e-9) {
    // ./alignment adds beta * (length / 400) * 6 = (1.5 * beta) * (length / 100)
    return proxyReward(length, lengthBias / 1.5);
  }
  return qualityAtLength(length, idealLength) + lengthBias * (length / 100);
}

/** Closed-form KL-regularized RLHF policy: pi*(y) proportional to pi_ref(y) * exp(r(y) / beta). */
export function solveOptimalPolicy(rewards: readonly number[], beta: number): number[] {
  if (!Number.isFinite(beta) || beta > 1e6) {
    return [...REFERENCE_PROBS];
  }
  const safeBeta = Math.max(0.05, beta);
  const maxScaled = Math.max(...rewards.map((r) => r / safeBeta));
  const raw = REFERENCE_PROBS.map((p, i) => p * Math.exp(rewards[i] / safeBeta - maxScaled));
  const z = raw.reduce((sum, v) => sum + v, 0);
  return z > 0 ? raw.map((v) => v / z) : [...REFERENCE_PROBS];
}

/** Run the full 11-step (t = 0..10) RL optimization sweep from reference policy down to `klFloor`. */
export function simulateRewardHacking(params: RewardHackingParams): RewardHackingSimulation {
  const lengthBias = Math.max(0, Math.min(2.5, params.lengthBias));
  const klFloor = Math.max(0.15, Math.min(6.0, params.klFloor));
  const idealLength = Math.max(60, Math.min(300, params.idealLength));

  const trueVals = CANDIDATE_LENGTHS.map((L) => qualityAtLength(L, idealLength));
  const proxyVals = CANDIDATE_LENGTHS.map((L) => proxyAtLength(L, lengthBias, idealLength));

  const trace: RlhfStepRecord[] = [];
  for (let step = 0; step <= TOTAL_OPT_STEPS; step++) {
    const frac = step / TOTAL_OPT_STEPS;
    const effectiveBeta = step === 0 ? Infinity : 12 * Math.pow(klFloor / 12, frac);
    const policyProbs = solveOptimalPolicy(proxyVals, effectiveBeta);

    const expectedLength = policyProbs.reduce((s, p, i) => s + p * CANDIDATE_LENGTHS[i], 0);
    const expectedTrueQuality = policyProbs.reduce((s, p, i) => s + p * trueVals[i], 0);
    const expectedProxyReward = policyProbs.reduce((s, p, i) => s + p * proxyVals[i], 0);
    const klDivergence = policyProbs.reduce(
      (s, p, i) => s + (p > 1e-12 ? p * Math.log(p / REFERENCE_PROBS[i]) : 0),
      0,
    );

    trace.push({
      step,
      effectiveBeta,
      klDivergence,
      expectedLength,
      expectedTrueQuality,
      expectedProxyReward,
      policyProbs,
      hackingGap: expectedProxyReward - expectedTrueQuality,
    });
  }

  const curveLengths = Array.from({ length: 44 }, (_, i) => 40 + i * 20);
  const trueCurve = curveLengths.map((L) => qualityAtLength(L, idealLength));
  const proxyCurve = curveLengths.map((L) => proxyAtLength(L, lengthBias, idealLength));
  const truePeakQuality = Math.max(...trace.map((r) => r.expectedTrueQuality));
  const last = trace[trace.length - 1];
  const hacked = truePeakQuality - last.expectedTrueQuality > 1.0;

  return { trace, curveLengths, trueCurve, proxyCurve, truePeakQuality, hacked };
}

/** One-line plain-English explanation of what just happened at step `t` and why. */
export function explainRewardStep(
  rec: RlhfStepRecord,
  params: RewardHackingParams,
  prev?: RlhfStepRecord,
): string {
  if (rec.step === 0) {
    return `Step 0 (SFT start): Policy stays at the reference model (KL = 0.00), averaging ${rec.expectedLength.toFixed(0)} words and True Quality ${rec.expectedTrueQuality.toFixed(2)}/10.`;
  }
  const qDrop = prev ? rec.expectedTrueQuality < prev.expectedTrueQuality - 0.12 : false;
  if (qDrop) {
    return `Step ${rec.step} (Goodhart collapse!): Proxy climbed to ${rec.expectedProxyReward.toFixed(2)}, but pushing length to ${rec.expectedLength.toFixed(0)}w dropped True Quality to ${rec.expectedTrueQuality.toFixed(2)}/10.`;
  }
  if (rec.step === TOTAL_OPT_STEPS && rec.expectedTrueQuality < 4.0) {
    return `Step ${rec.step}: Reward hacking complete — weak KL (β=${params.klFloor.toFixed(2)}) let the policy chase +${params.lengthBias.toFixed(1)}/100w bias to ${rec.expectedLength.toFixed(0)}w (True Q = ${rec.expectedTrueQuality.toFixed(2)}).`;
  }
  if (params.lengthBias < 0.05) {
    return `Step ${rec.step}: With zero length bias, Proxy = True Quality — pushing KL to ${rec.klDivergence.toFixed(2)} raises True Quality cleanly to ${rec.expectedTrueQuality.toFixed(2)}/10.`;
  }
  if (rec.step === TOTAL_OPT_STEPS && params.klFloor >= 1.0) {
    return `Step ${rec.step}: KL penalty (β=${params.klFloor.toFixed(2)}) tethered the policy near ${rec.expectedLength.toFixed(0)}w (KL = ${rec.klDivergence.toFixed(2)}), preserving True Quality at ${rec.expectedTrueQuality.toFixed(2)}/10.`;
  }
  return `Step ${rec.step} (β=${rec.effectiveBeta.toFixed(2)}): Early optimization filters out bad answers — both Proxy (${rec.expectedProxyReward.toFixed(2)}) and True Quality (${rec.expectedTrueQuality.toFixed(2)}) rise.`;
}

/** General RLHF + proxy formulas filled with the current step's real numbers. */
export function formatRewardFormula(
  rec: RlhfStepRecord,
  params: RewardHackingParams,
): { general: string; worked: string } {
  const betaStr = Number.isFinite(rec.effectiveBeta) ? rec.effectiveBeta.toFixed(2) : '∞';
  const avgL = Math.round(rec.expectedLength);
  const bonusAtL = (params.lengthBias * (avgL / 100)).toFixed(2);
  return {
    general: 'R_proxy(L) = Q_true(L) + w_len·(L/100)   |   max E[R] − β·KL(π‖π_ref)',
    worked: `Step ${rec.step} (β=${betaStr}, KL=${rec.klDivergence.toFixed(2)}): E[L]=${avgL}w → +${bonusAtL} bias, Proxy=${rec.expectedProxyReward.toFixed(2)}, True Q=${rec.expectedTrueQuality.toFixed(2)}`,
  };
}
