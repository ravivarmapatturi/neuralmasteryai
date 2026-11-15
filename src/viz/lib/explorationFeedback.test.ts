import { describe, expect, it } from 'vitest';
import {
  computeContextualDecision,
  evaluateIps,
  simulateExposureFeedback,
  TOY_LOGGED_OBSERVATIONS,
} from './explorationFeedback';

describe('explorationFeedback', () => {
  describe('computeContextualDecision', () => {
    it('calculates reproducible expected rewards and UCB bounds for context [0.8, 0.4]', () => {
      // Context: x = [0.8, 0.4], alpha = 1.0
      // Arm 1: expected = 0.8*0.05 + 0.4*0.02 = 0.040 + 0.008 = 0.048
      // normSq = 0.64 + 0.16 = 0.80
      // Arm 1 CB = 1.0 * sqrt(0.0001 * 0.80) = sqrt(0.00008) ~ 0.0089
      // Arm 1 UCB = 0.048 + 0.0089 = 0.0569
      // Arm 2: expected = 0.8*0.04 + 0.4*0.05 = 0.032 + 0.020 = 0.052
      // Arm 2 CB = 1.0 * sqrt(0.0016 * 0.80) = sqrt(0.00128) ~ 0.0358
      // Arm 2 UCB = 0.052 + 0.0358 = 0.0878
      // Arm 3: expected = 0.8*0.03 + 0.4*0.01 = 0.024 + 0.004 = 0.028
      // Arm 3 CB = 1.0 * sqrt(0.0081 * 0.80) = sqrt(0.00648) ~ 0.0805
      // Arm 3 UCB = 0.028 + 0.0805 = 0.1085

      const decisions = computeContextualDecision([0.8, 0.4], 1.0);
      expect(decisions).toHaveLength(3);

      const d1 = decisions.find((d) => d.armId === 'arm-1')!;
      const d2 = decisions.find((d) => d.armId === 'arm-2')!;
      const d3 = decisions.find((d) => d.armId === 'arm-3')!;

      expect(d1.expectedReward).toBe(0.048);
      expect(d2.expectedReward).toBe(0.052);
      expect(d3.expectedReward).toBe(0.028);

      // Greedy winner is Arm 2 (0.052 is highest expected reward)
      expect(d2.isGreedyWinner).toBe(true);
      expect(d1.isGreedyWinner).toBe(false);
      expect(d3.isGreedyWinner).toBe(false);

      // UCB winner is Arm 3 because high variance / small sample size boosts its upper bound
      expect(d3.ucbScore).toBe(0.1085);
      expect(d3.isUcbWinner).toBe(true);
      expect(d2.isUcbWinner).toBe(false);
      expect(d1.isUcbWinner).toBe(false);
    });

    it('reverts to pure greedy exploitation when alpha is 0.0', () => {
      const decisions = computeContextualDecision([0.8, 0.4], 0.0);
      const d2 = decisions.find((d) => d.armId === 'arm-2')!;
      const d3 = decisions.find((d) => d.armId === 'arm-3')!;

      expect(d2.confidenceBonus).toBe(0);
      expect(d3.confidenceBonus).toBe(0);
      expect(d2.isUcbWinner).toBe(true);
      expect(d3.isUcbWinner).toBe(false);
    });
  });

  describe('evaluateIps', () => {
    it('evaluates target policy with unclipped, clipped, and SNIPS estimators', () => {
      // Evaluate arm-2 policy on toy logged observations:
      // Observations has 10 items.
      // arm-2 appears 3 times with loggedPropensity = 0.15 (weight = 1/0.15 = 6.6667).
      // Rewards for arm-2: 1, 0, 1 -> 2 clicks.
      // Unclipped sum = 6.6667 * 1 + 0 + 6.6667 * 1 = 13.3333
      // Unclipped IPS = 13.3333 / 10 = 1.3333
      // With clipThreshold = 5.0:
      // Clipped weight = min(6.6667, 5.0) = 5.0
      // Clipped sum = 5.0 * 1 + 0 + 5.0 * 1 = 10.0
      // Clipped IPS = 10.0 / 10 = 1.0000
      // Total weight sum = 6.6667 * 3 = 20.0
      // SNIPS = unclippedSum / weightSum = 13.3333 / 20.0 = 0.6667 (the empirical CTR on arm-2 rounds: 2/3)

      const result = evaluateIps(TOY_LOGGED_OBSERVATIONS, 'arm-2', 5.0);

      expect(result.unclippedIps).toBe(1.3333);
      expect(result.clippedIps).toBe(1.0);
      expect(result.snips).toBe(0.6667);
      expect(result.maxWeight).toBe(6.67);
      expect(result.effectiveSampleSize).toBeGreaterThan(0);
    });

    it('handles empty observations gracefully', () => {
      const result = evaluateIps([], 'arm-1');
      expect(result.unclippedIps).toBe(0);
      expect(result.clippedIps).toBe(0);
      expect(result.snips).toBe(0);
    });
  });

  describe('simulateExposureFeedback', () => {
    it('demonstrates popularity concentration under greedy vs diversification under bandit', () => {
      const sim = simulateExposureFeedback(20, 1.0);
      expect(sim).toHaveLength(20);

      const finalRound = sim[sim.length - 1];
      // Under greedy, arm 1 share rises towards 0.85
      expect(finalRound.greedyPopularityShare).toBeGreaterThan(0.7);
      // Under bandit, arm 1 share is controlled
      expect(finalRound.banditPopularityShare).toBeLessThan(finalRound.greedyPopularityShare);
    });
  });
});
