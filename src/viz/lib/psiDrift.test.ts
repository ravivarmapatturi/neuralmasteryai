import { describe, expect, it } from 'vitest';
import { buildShiftedCurrentWeights, computePsiBreakdown, DEFAULT_PSI_REFERENCE } from './psiDrift';

describe('psiDrift computation', () => {
  it('returns exact 0 PSI when current traffic matches reference baseline', () => {
    const res = computePsiBreakdown(DEFAULT_PSI_REFERENCE, DEFAULT_PSI_REFERENCE);
    expect(res.psi).toBeCloseTo(0, 12);
    expect(res.klCurToRef).toBeCloseTo(0, 12);
    expect(res.klRefToCur).toBeCloseTo(0, 12);
    expect(res.zone).toBe('stable');
  });

  it('computes hand-checked PSI and symmetric KL identity for a 15% tail shift', () => {
    // Shift 15% from bin 1 (25% -> 10%) to bin 4 (10% -> 25%)
    const current = buildShiftedCurrentWeights(DEFAULT_PSI_REFERENCE, 15, 1, 4);
    expect(current).toEqual([10, 10, 35, 20, 25]);

    const res = computePsiBreakdown(DEFAULT_PSI_REFERENCE, current);
    const expected = 2 * 0.15 * Math.log(2.5); // ~0.27488722

    expect(res.psi).toBeCloseTo(expected, 10);
    expect(res.psi).toBeCloseTo(res.klCurToRef + res.klRefToCur, 12);
    expect(res.zone).toBe('significant');
  });

  it('demonstrates rare tail shifts cost more PSI than moving the same 15% into a large 35% bucket', () => {
    const intoRare = buildShiftedCurrentWeights(DEFAULT_PSI_REFERENCE, 15, 1, 4); // 10% -> 25%
    const intoCommon = buildShiftedCurrentWeights(DEFAULT_PSI_REFERENCE, 15, 1, 2); // 35% -> 50%
    const psiRare = computePsiBreakdown(DEFAULT_PSI_REFERENCE, intoRare).psi;
    const psiCommon = computePsiBreakdown(DEFAULT_PSI_REFERENCE, intoCommon).psi;

    expect(psiRare).toBeGreaterThan(psiCommon * 1.4);
  });
});
