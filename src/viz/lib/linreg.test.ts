import { describe, expect, it } from 'vitest';
import { computeStats, runLinearGradientDescent } from './linreg';

describe('linreg', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }];

  it('computes MSE and gradients by hand at w=0, b=0', () => {
    expect(computeStats(points, 0, 0)).toEqual({ mse: 5, dw: -3, db: -4 });
  });

  it('takes the exact first gradient step', () => {
    const trace = runLinearGradientDescent(points, { w: 0, b: 0 }, 0.1, 1);
    expect(trace[1]).toMatchObject({ step: 1, b: 0.4, dw: -3, db: -4 });
    expect(trace[1].w).toBeCloseTo(0.3, 12);
    expect(trace[1].mse).toBeCloseTo(2.825, 10);
  });
});
