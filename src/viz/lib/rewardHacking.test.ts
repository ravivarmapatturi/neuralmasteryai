import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_LENGTHS,
  REFERENCE_PROBS,
  explainRewardStep,
  formatRewardFormula,
  proxyAtLength,
  qualityAtLength,
  simulateRewardHacking,
  solveOptimalPolicy,
} from './rewardHacking';
import { proxyReward, trueQuality } from './alignment';

describe('rewardHacking pure computation', () => {
  it('matches ./alignment exact formulas when idealLength = 150', () => {
    for (const len of CANDIDATE_LENGTHS) {
      expect(qualityAtLength(len, 150)).toBeCloseTo(trueQuality(len), 10);
      // 1.5 bias per 100w corresponds to alignment beta = 1.0
      expect(proxyAtLength(len, 1.5, 150)).toBeCloseTo(proxyReward(len, 1.0), 10);
    }
  });

  it('produces valid normalized probability distributions with KL=0 at reference', () => {
    const probs = solveOptimalPolicy([1, 2, 3, 2, 1, 0, 0], Infinity);
    expect(probs).toEqual([...REFERENCE_PROBS]);
    const tilted = solveOptimalPolicy([4, 9, 10, 8, 5, 3, 2], 0.5);
    expect(tilted.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(tilted[2]).toBeGreaterThan(REFERENCE_PROBS[2]);
  });

  it('demonstrates Goodhart collapse with bias & weak KL, and prevents it with zero bias or strong KL', () => {
    // 1. High length bias (1.6) + weak KL tether (0.25) -> Goodhart collapse!
    const hackedSim = simulateRewardHacking({ lengthBias: 1.6, klFloor: 0.25, idealLength: 150 });
    const start = hackedSim.trace[0];
    const end = hackedSim.trace[hackedSim.trace.length - 1];
    expect(start.klDivergence).toBeCloseTo(0, 8);
    expect(end.expectedProxyReward).toBeGreaterThan(start.expectedProxyReward);
    expect(end.expectedLength).toBeGreaterThan(600);
    expect(end.expectedTrueQuality).toBeLessThan(2.0);
    expect(hackedSim.hacked).toBe(true);

    // 2. Strong KL tether (2.0) prevents collapse even with length bias 1.6
    const tetheredSim = simulateRewardHacking({ lengthBias: 1.6, klFloor: 2.0, idealLength: 150 });
    const tetheredEnd = tetheredSim.trace[tetheredSim.trace.length - 1];
    expect(tetheredEnd.expectedTrueQuality).toBeGreaterThan(8.0);
    expect(tetheredSim.hacked).toBe(false);

    // 3. Unbiased reward model (lengthBias = 0) never collapses even at klFloor = 0.25
    const unbiasedSim = simulateRewardHacking({ lengthBias: 0, klFloor: 0.25, idealLength: 150 });
    const unbiasedEnd = unbiasedSim.trace[unbiasedSim.trace.length - 1];
    expect(unbiasedEnd.expectedTrueQuality).toBeGreaterThan(9.5);
    expect(unbiasedSim.hacked).toBe(false);
  });

  it('emits plain-English captions and substituted formulas', () => {
    const params = { lengthBias: 1.6, klFloor: 0.25, idealLength: 150 };
    const sim = simulateRewardHacking(params);
    expect(explainRewardStep(sim.trace[0], params)).toContain('KL = 0.00');
    expect(explainRewardStep(sim.trace[10], params, sim.trace[9])).toContain('Goodhart collapse');
    const f = formatRewardFormula(sim.trace[10], params);
    expect(f.general).toContain('R_proxy');
    expect(f.worked).toContain('Step 10');
  });
});
