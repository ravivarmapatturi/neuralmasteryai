import { describe, expect, it } from 'vitest';
import { analyzeStatisticalPower, requiredSampleSize80 } from './statisticalPower';
import { twoProportionPower } from './humanEval';

describe('statisticalPower pure calculations', () => {
  it('hand-checks the 50% vs 55% (+5 pts) underpowered n=20 case against humanEval.ts', () => {
    const res = analyzeStatisticalPower({ baseline: 0.5, effectSize: 0.05, n: 20, alpha: 0.05 });
    // pBar = 0.525 -> SE = sqrt(2 * 0.525 * 0.475 / 20) = sqrt(0.0249375) = 0.157916...
    const expectedSe = Math.sqrt((2 * 0.525 * 0.475) / 20);
    expect(res.se).toBeCloseTo(expectedSe, 10);
    expect(res.power).toBeCloseTo(twoProportionPower(0.5, 0.55, 20), 12);
    expect(res.power).toBeLessThan(0.1);
    expect(res.requiredN80).toBe(1566);
    expect(twoProportionPower(0.5, 0.55, res.requiredN80)).toBeGreaterThanOrEqual(0.8);
    expect(twoProportionPower(0.5, 0.55, res.requiredN80 - 1)).toBeLessThan(0.8);
  });

  it('shows inverse-square scaling: doubling effect size cuts required n by ~4x', () => {
    const n5 = requiredSampleSize80(0.5, 0.05, 0.05);
    const n10 = requiredSampleSize80(0.5, 0.1, 0.05);
    expect(n5 / n10).toBeGreaterThan(3.8);
    expect(n5 / n10).toBeLessThan(4.2);

    const res10 = analyzeStatisticalPower({ baseline: 0.5, effectSize: 0.1, n: n10, alpha: 0.05 });
    expect(res10.power).toBeGreaterThanOrEqual(0.8);
  });
});
