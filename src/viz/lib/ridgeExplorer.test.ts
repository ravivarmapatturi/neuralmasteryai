import { describe, expect, it } from 'vitest';
import { analyzeRidge } from './ridgeExplorer';
import { generateData, mse, ridgeSolve } from './ridge';

describe('ridgeExplorer pure calculations', () => {
  it('matches ridge.ts exact closed-form weights, sum, and MSE on seed=5, corr=0.98, lambda=0 and 4', () => {
    const rows = generateData(40, 0.98, 1.5, 5);
    const expected0 = ridgeSolve(rows, 0);
    const expected4 = ridgeSolve(rows, 4);

    const res0 = analyzeRidge({ correlation: 0.98, noise: 1.5, seed: 5, lambda: 0 });
    expect(res0.currentWeights).toEqual(expected0.w);
    expect(res0.currentMse).toBeCloseTo(mse(rows, expected0.b, expected0.w), 12);
    expect(res0.twinSum).toBeCloseTo(expected0.w[0] + expected0.w[1], 12);
    // Hand-checked VIF = 1 / (1 - 0.98^2) = 1 / 0.0396 = 25.2525...
    expect(res0.vif).toBeCloseTo(1 / (1 - 0.98 * 0.98), 8);

    const res4 = analyzeRidge({ correlation: 0.98, noise: 1.5, seed: 5, lambda: 4 });
    expect(res4.currentWeights).toEqual(expected4.w);
    expect(res4.twinGap).toBeLessThan(res0.twinGap);
    expect(res4.l2Penalty).toBeCloseTo(
      expected4.w.reduce((s, v) => s + v * v, 0),
      12,
    );
    expect(res4.objectiveTotal).toBeCloseTo(res4.sse + 4 * res4.l2Penalty, 10);
  });

  it('shrinks weights smoothly without zeroing any feature out completely', () => {
    const res = analyzeRidge({ correlation: 0.9, noise: 1.5, seed: 5, lambda: 4 });
    expect(res.currentWeights.every((w) => w !== 0)).toBe(true);
    expect(res.l2Radius).toBeCloseTo(Math.hypot(res.currentWeights[0], res.currentWeights[1]), 12);
  });
});
