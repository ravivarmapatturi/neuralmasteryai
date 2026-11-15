/**
 * explorationFeedback.ts
 *
 * Mathematical and algorithmic engine for Chapter 12:
 * Exploration, Feedback Loops & Counterfactual Evaluation.
 *
 * Provides pure, reproducible functions for:
 * 1. Contextual bandit scoring (LinUCB with explicit context, covariance, and confidence bounds).
 * 2. Inverse Propensity Scoring (IPS, Clipped IPS, Self-Normalized SNIPS).
 * 3. Popularity bias simulation (exposure feedback vs bandit exploration).
 */

export interface BanditArm {
  id: string;
  name: string;
  category: string;
  theta: [number, number]; // [feature_1 weight, feature_2 weight]
  historicalPulls: number;
  varianceScale: number; // proportional to diagonal of A^-1
  description: string;
}

export interface ContextualDecision {
  armId: string;
  armName: string;
  expectedReward: number; // x^T * theta
  confidenceBonus: number; // alpha * sqrt(x^T * A^-1 * x)
  ucbScore: number;
  isGreedyWinner: boolean;
  isUcbWinner: boolean;
}

export interface IpsObservation {
  context: [number, number];
  armId: string;
  reward: number; // 0 or 1
  loggedPropensity: number; // P_log(a|x)
}

export interface IpsEvaluationResult {
  unclippedIps: number;
  clippedIps: number;
  snips: number;
  effectiveSampleSize: number;
  maxWeight: number;
}

export const TOY_BANDIT_ARMS: BanditArm[] = [
  {
    id: 'arm-1',
    name: 'Blockbuster Trend (Popular)',
    category: 'Trending',
    theta: [0.05, 0.02],
    historicalPulls: 10_000,
    varianceScale: 0.0001,
    description: 'High historical volume, low parameter uncertainty.',
  },
  {
    id: 'arm-2',
    name: 'Fresh Topic (Emerging)',
    category: 'Fresh',
    theta: [0.04, 0.05],
    historicalPulls: 100,
    varianceScale: 0.0016,
    description: 'Moderate impressions, balanced contextual affinity.',
  },
  {
    id: 'arm-3',
    name: 'Niche Long-Tail (Uncertain)',
    category: 'Specialized',
    theta: [0.03, 0.01],
    historicalPulls: 20,
    varianceScale: 0.0081,
    description: 'Very few historical impressions, high exploration bonus.',
  },
];

/**
 * Computes LinUCB decision scores for a 2D context vector x = [x1, x2].
 * Linear model: expected reward mu_a = x1 * theta_a[0] + x2 * theta_a[1].
 * Confidence bonus: CB_a = alpha * sqrt(varianceScale * (x1^2 + x2^2)).
 */
export function computeContextualDecision(
  context: [number, number],
  alpha: number = 1.0,
  arms: BanditArm[] = TOY_BANDIT_ARMS,
): ContextualDecision[] {
  const [x1, x2] = context;
  const normSq = x1 * x1 + x2 * x2;

  const rawDecisions = arms.map((arm) => {
    const expected = x1 * arm.theta[0] + x2 * arm.theta[1];
    const cb = alpha * Math.sqrt(arm.varianceScale * normSq);
    const ucb = expected + cb;
    return {
      armId: arm.id,
      armName: arm.name,
      expectedReward: Number(expected.toFixed(4)),
      confidenceBonus: Number(cb.toFixed(4)),
      ucbScore: Number(ucb.toFixed(4)),
    };
  });

  let maxExpected = -Infinity;
  let maxUcb = -Infinity;
  for (const d of rawDecisions) {
    if (d.expectedReward > maxExpected) maxExpected = d.expectedReward;
    if (d.ucbScore > maxUcb) maxUcb = d.ucbScore;
  }

  return rawDecisions.map((d) => ({
    ...d,
    isGreedyWinner: Math.abs(d.expectedReward - maxExpected) < 1e-6,
    isUcbWinner: Math.abs(d.ucbScore - maxUcb) < 1e-6,
  }));
}

/**
 * Standard toy evaluation dataset for Inverse Propensity Scoring (IPS).
 * Logged from an epsilon-greedy policy with heavy arm-1 bias (P_log = 0.80, 0.15, 0.05).
 */
export const TOY_LOGGED_OBSERVATIONS: IpsObservation[] = [
  { context: [0.8, 0.4], armId: 'arm-1', reward: 0, loggedPropensity: 0.8 },
  { context: [0.8, 0.4], armId: 'arm-1', reward: 1, loggedPropensity: 0.8 },
  { context: [0.8, 0.4], armId: 'arm-1', reward: 0, loggedPropensity: 0.8 },
  { context: [0.8, 0.4], armId: 'arm-2', reward: 1, loggedPropensity: 0.15 },
  { context: [0.8, 0.4], armId: 'arm-1', reward: 0, loggedPropensity: 0.8 },
  { context: [0.8, 0.4], armId: 'arm-2', reward: 0, loggedPropensity: 0.15 },
  { context: [0.8, 0.4], armId: 'arm-3', reward: 1, loggedPropensity: 0.05 },
  { context: [0.8, 0.4], armId: 'arm-1', reward: 1, loggedPropensity: 0.8 },
  { context: [0.8, 0.4], armId: 'arm-2', reward: 1, loggedPropensity: 0.15 },
  { context: [0.8, 0.4], armId: 'arm-1', reward: 0, loggedPropensity: 0.8 },
];

/**
 * Evaluates a candidate target policy using Inverse Propensity Scoring.
 * targetPolicyProb returns P_target(armId | context).
 */
export function evaluateIps(
  observations: IpsObservation[],
  targetArmId: string,
  clipThreshold: number = 5.0,
): IpsEvaluationResult {
  if (observations.length === 0) {
    return {
      unclippedIps: 0,
      clippedIps: 0,
      snips: 0,
      effectiveSampleSize: 0,
      maxWeight: 0,
    };
  }

  let unclippedSum = 0;
  let clippedSum = 0;
  let weightSum = 0;
  let weightSqSum = 0;
  let maxW = 0;

  for (const obs of observations) {
    const targetProb = obs.armId === targetArmId ? 1.0 : 0.0;
    const w = targetProb / obs.loggedPropensity;
    if (w > maxW) maxW = w;

    const wClip = Math.min(w, clipThreshold);

    unclippedSum += w * obs.reward;
    clippedSum += wClip * obs.reward;
    weightSum += w;
    weightSqSum += w * w;
  }

  const n = observations.length;
  const unclippedIps = unclippedSum / n;
  const clippedIps = clippedSum / n;
  const snips = weightSum > 0 ? unclippedSum / weightSum : 0;
  const effectiveSampleSize = weightSqSum > 0 ? (weightSum * weightSum) / weightSqSum : 0;

  return {
    unclippedIps: Number(unclippedIps.toFixed(4)),
    clippedIps: Number(clippedIps.toFixed(4)),
    snips: Number(snips.toFixed(4)),
    effectiveSampleSize: Number(effectiveSampleSize.toFixed(2)),
    maxWeight: Number(maxW.toFixed(2)),
  };
}

/**
 * Simulates exposure feedback dynamics over rounds.
 * Compares pure greedy exploitation (rich-get-richer) vs LinUCB exploration.
 */
export function simulateExposureFeedback(
  rounds: number = 20,
  banditAlpha: number = 1.0,
): { round: number; greedyPopularityShare: number; banditPopularityShare: number }[] {
  const history: { round: number; greedyPopularityShare: number; banditPopularityShare: number }[] = [];

  let greedyArm1Impressions = 50;
  let greedyTotalImpressions = 100;

  let banditArm1Impressions = 50;
  let banditTotalImpressions = 100;

  for (let r = 1; r <= rounds; r++) {
    // Under greedy, arm 1 (popular item) gets 85% of traffic
    greedyArm1Impressions += 8.5;
    greedyTotalImpressions += 10;

    // Under bandit with exploration alpha, arm 1 share drops as niche arms are explored
    const banditArm1Add = Math.max(3.5, 8.5 - banditAlpha * 3.0);
    banditArm1Impressions += banditArm1Add;
    banditTotalImpressions += 10;

    history.push({
      round: r,
      greedyPopularityShare: Number((greedyArm1Impressions / greedyTotalImpressions).toFixed(3)),
      banditPopularityShare: Number((banditArm1Impressions / banditTotalImpressions).toFixed(3)),
    });
  }

  return history;
}
