import { describe, expect, it } from 'vitest';
import { buildDiscountSteps, calculateDiscountedReturn, discountHalfLife } from './returnDiscounting';

describe('return discounting', () => {
  it('matches a hand-checked immediate plus delayed reward', () => {
    const result = calculateDiscountedReturn([
      { step: 0, reward: 2 },
      { step: 4, reward: 8 },
    ], 0.5);
    // G_0 = 2 + 0.5^4 * 8 = 2 + 0.5 = 2.5.
    expect(result.total).toBeCloseTo(2.5, 12);
    expect(result.terms[1].discount).toBeCloseTo(0.0625, 12);
    expect(result.terms[1].contribution).toBeCloseTo(0.5, 12);
  });

  it('computes the exact half-life and timeline endpoints', () => {
    expect(discountHalfLife(0.5)).toBeCloseTo(1, 12);
    expect(discountHalfLife(1)).toBe(Infinity);
    expect(buildDiscountSteps(4)).toEqual([0, 1, 2, 3, 4]);
  });
});
