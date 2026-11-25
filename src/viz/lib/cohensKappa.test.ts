import { describe, expect, it } from 'vitest';
import { analyzeCohensKappa } from './cohensKappa';

describe('cohensKappa pure calculations', () => {
  it('hand-checks the classic 85 / 7 / 7 / 1 skewed agreement trap', () => {
    const res = analyzeCohensKappa({
      bothGood: 85,
      r1GoodR2Bad: 7,
      r1BadR2Good: 7,
      bothBad: 1,
    });

    expect(res.total).toBe(100);
    expect(res.agreeCount).toBe(86);
    // p_o = 86 / 100 = 0.86
    expect(res.observedAgreement).toBeCloseTo(0.86, 6);
    // p1_G = 92/100 = 0.92, p2_G = 92/100 = 0.92
    // p_e = 0.92*0.92 + 0.08*0.08 = 0.8464 + 0.0064 = 0.8528
    expect(res.expectedAgreement).toBeCloseTo(0.8528, 6);
    // kappa = (0.86 - 0.8528) / (1 - 0.8528) = 0.0072 / 0.1472 = 0.04891304...
    expect(res.kappa).toBeCloseTo(0.0072 / 0.1472, 6);
    expect(res.band).toBe('slight');
  });

  it('hand-checks balanced substantial agreement (45 / 5 / 5 / 45 -> kappa = 0.800) and negative kappa', () => {
    const balanced = analyzeCohensKappa({
      bothGood: 45,
      r1GoodR2Bad: 5,
      r1BadR2Good: 5,
      bothBad: 45,
    });
    expect(balanced.observedAgreement).toBeCloseTo(0.9, 6);
    expect(balanced.expectedAgreement).toBeCloseTo(0.5, 6);
    expect(balanced.kappa).toBeCloseTo(0.8, 6);
    expect(balanced.band).toBe('near-perfect');

    const opposite = analyzeCohensKappa({
      bothGood: 10,
      r1GoodR2Bad: 40,
      r1BadR2Good: 40,
      bothBad: 10,
    });
    // p_o = 0.20, p_e = 0.50 -> kappa = -0.30 / 0.50 = -0.60
    expect(opposite.kappa).toBeCloseTo(-0.6, 6);
    expect(opposite.band).toBe('poor');
  });

  it('handles zero total ratings safely without NaN', () => {
    const empty = analyzeCohensKappa({
      bothGood: 0,
      r1GoodR2Bad: 0,
      r1BadR2Good: 0,
      bothBad: 0,
    });
    expect(empty.total).toBe(0);
    expect(empty.kappa).toBe(0);
    expect(Number.isFinite(empty.observedAgreement)).toBe(true);
  });
});
