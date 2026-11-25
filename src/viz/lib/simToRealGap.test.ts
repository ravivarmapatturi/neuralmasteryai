import { describe, expect, it } from 'vitest';
import { computeSimToRealState } from './simToRealGap';

describe('simToRealGap computation', () => {
  it('computes hand-checked optimal gains w_sim = 1/f_sim and w_DR = E[f]/E[f^2]', () => {
    const exactMatch = computeSimToRealState({
      simFriction: 1.0,
      randLow: 0.8,
      randHigh: 1.4,
      realFriction: 1.0,
    });

    // mean(0.8..1.4) = 1.1, var = 0.36/12 = 0.03, E[f^2] = 1.21 + 0.03 = 1.24
    const expectedDrGain = 1.1 / 1.24;
    expect(exactMatch.wSimOnly).toBe(1.0);
    expect(exactMatch.wRandomized).toBeCloseTo(expectedDrGain, 12);
    expect(exactMatch.errSimOnly).toBeCloseTo(0, 12);
    expect(exactMatch.errRandomized).toBeCloseTo(Math.abs(expectedDrGain - 1), 12);
    expect(exactMatch.winner).toBe('sim-only');
  });

  it('shows domain randomization beating sim-only inside [0.8, 1.4] away from 1.0', () => {
    const sticky = computeSimToRealState({
      simFriction: 1.0,
      randLow: 0.8,
      randHigh: 1.4,
      realFriction: 1.35,
    });

    const expectedDrGain = 1.1 / 1.24;
    expect(sticky.inRange).toBe(true);
    expect(sticky.errSimOnly).toBeCloseTo(0.35, 12);
    expect(sticky.errRandomized).toBeCloseTo(Math.abs(expectedDrGain * 1.35 - 1), 12);
    expect(sticky.errRandomized).toBeLessThan(sticky.errSimOnly);
    expect(sticky.winner).toBe('randomized');
  });

  it('flags out-of-range real friction cleanly', () => {
    const icy = computeSimToRealState({
      simFriction: 1.0,
      randLow: 0.8,
      randHigh: 1.4,
      realFriction: 0.55,
    });
    expect(icy.inRange).toBe(false);
    expect(icy.errSimOnly).toBeCloseTo(0.45, 12);
  });
});
