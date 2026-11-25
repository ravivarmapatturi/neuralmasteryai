import { describe, expect, it } from 'vitest';
import { analyzeRollout } from './rolloutStrategies';

describe('rolloutStrategies pure calculations', () => {
  it('guarantees zero user harm and zero CTR signal in Shadow mode even with a buggy model', () => {
    const res = analyzeRollout({
      strategy: 'shadow',
      totalRequests: 1000,
      canaryPct: 10,
      modelHealth: 'buggy',
      stickyHashing: true,
    });

    expect(res.oldServedCount).toBe(1000);
    expect(res.newServedCount).toBe(0);
    expect(res.newMirroredCount).toBe(1000);
    expect(res.usersHarmedByBug).toBe(0);
    // 1000 * 0.085 = 85 errors caught in logs
    expect(res.loggedErrorsFound).toBe(85);
    expect(res.ctrLiftMeasurable).toBe(false);
    expect(res.standardErrorCtr).toBe(0);
  });

  it('caps blast radius in 5% Canary at 10x smaller than 50/50 A/B when buggy', () => {
    const canary = analyzeRollout({
      strategy: 'canary',
      totalRequests: 1000,
      canaryPct: 5,
      modelHealth: 'buggy',
      stickyHashing: true,
    });
    const ab = analyzeRollout({
      strategy: 'ab',
      totalRequests: 1000,
      canaryPct: 5,
      modelHealth: 'buggy',
      stickyHashing: true,
    });

    // Canary: 50 requests * (0.085 - 0.005) = 4 extra harmed users
    expect(canary.newServedCount).toBe(50);
    expect(canary.usersHarmedByBug).toBe(4);
    // A/B: 500 requests * 0.08 = 40 extra harmed users
    expect(ab.newServedCount).toBe(500);
    expect(ab.usersHarmedByBug).toBe(40);
  });

  it('computes exact binomial standard error and z-score for healthy sticky A/B split', () => {
    const res = analyzeRollout({
      strategy: 'ab',
      totalRequests: 2000,
      canaryPct: 10,
      modelHealth: 'healthy',
      stickyHashing: true,
    });

    const expectedSe = Math.sqrt((0.1 * 0.9) / 1000 + (0.13 * 0.87) / 1000);
    expect(res.standardErrorCtr).toBeCloseTo(expectedSe, 6);
    expect(res.observedCtrLift).toBeCloseTo(0.03, 6);
    expect(res.zScore).toBeCloseTo(0.03 / expectedSe, 6);
  });
});
