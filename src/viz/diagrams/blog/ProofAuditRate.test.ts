import { describe, expect, it } from 'vitest';
import { chanceCaught, gpuCost } from './ProofAuditRate';

describe('proof audit maths matches the post', () => {
  it('reproduces the numbers printed by the post\'s Python snippet', () => {
    expect(chanceCaught(0.01, 0.01, 1, 1000)).toBeCloseTo(0.095, 3);
    expect(chanceCaught(0.01, 0.01, 1, 10000)).toBeCloseTo(0.632, 3);
    expect(chanceCaught(0.01, 0.01, 1, 100000)).toBeCloseTo(1, 3);
    expect(chanceCaught(0.01, 0.01, 0.5, 10000)).toBeCloseTo(0.393, 3);
    expect(chanceCaught(0.001, 0.01, 1, 100000)).toBeCloseTo(0.632, 3);
  });
  it('prices audits at the measured overhead', () => {
    expect(gpuCost(0.01, 72)).toBeCloseTo(1.72, 5);
    expect(gpuCost(0.01, 94)).toBeCloseTo(1.94, 5);
    expect(gpuCost(0.001, 72)).toBeCloseTo(1.072, 5);
    expect(gpuCost(1, 72)).toBe(73);
  });
  it('never catches anything when nothing is audited or swapped', () => {
    expect(chanceCaught(0, 0.01, 1, 10000)).toBe(0);
    expect(chanceCaught(0.01, 0, 1, 10000)).toBe(0);
  });
});
