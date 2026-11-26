import { describe, expect, it } from 'vitest';
import { crossEntropyStats, runLogisticGradientDescent, sigmoid } from './logreg';

describe('logreg', () => {
  const points = [{ x: 0, label: 0 as const }, { x: 1, label: 1 as const }];

  it('maps logit zero to probability one half', () => {
    expect(sigmoid(0)).toBe(0.5);
  });

  it('computes the hand-checked cross-entropy gradient and first step', () => {
    const initial = crossEntropyStats(points, 0, 0);
    expect(initial.loss).toBeCloseTo(Math.log(2), 8);
    expect(initial.dw).toBe(-0.25);
    expect(initial.db).toBe(0);
    const trace = runLogisticGradientDescent('ce', points, { w: 0, b: 0 }, 1, 1);
    expect(trace[1]).toMatchObject({ w: 0.25, b: 0, dw: -0.25, db: 0 });
    expect(trace[1].loss).toBeLessThan(initial.loss);
  });
});
