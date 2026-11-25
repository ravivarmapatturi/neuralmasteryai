import { describe, expect, it } from 'vitest';
import { blendWeights, computeEntropyKlBreakdown, normalizeWeights } from './entropyKl';

describe('entropyKl computation', () => {
  it('normalizes arbitrary weights and falls back safely on all-zero weights', () => {
    expect(normalizeWeights([70, 20, 10])).toEqual([0.7, 0.2, 0.1]);
    const uniform = normalizeWeights([0, 0]);
    expect(uniform[0]).toBeCloseTo(0.5, 12);
    expect(uniform[1]).toBeCloseTo(0.5, 12);
  });

  it('matches hand-checked 1-bit entropy when P = Q = [0.5, 0.5]', () => {
    const res = computeEntropyKlBreakdown(['heads', 'tails'], [50, 50], [50, 50]);
    expect(res.entropyP).toBeCloseTo(1, 12);
    expect(res.crossEntropyPQ).toBeCloseTo(1, 12);
    expect(res.klPQ).toBeCloseTo(0, 12);
    expect(res.klQP).toBeCloseTo(0, 12);
  });

  it('computes hand-checked asymmetric KL and cross-entropy for [0.5, 0.5] vs [0.25, 0.75]', () => {
    const res = computeEntropyKlBreakdown(['A', 'B'], [50, 50], [25, 75]);
    const expectedCrossEntropy = 2 - 0.5 * Math.log2(3); // ~1.20751875
    const expectedForwardKl = expectedCrossEntropy - 1; // ~0.20751875
    const expectedReverseKl = 0.75 * Math.log2(3) - 1; // ~0.18872188

    expect(res.entropyP).toBeCloseTo(1, 12);
    expect(res.crossEntropyPQ).toBeCloseTo(expectedCrossEntropy, 10);
    expect(res.klPQ).toBeCloseTo(expectedForwardKl, 10);
    expect(res.klQP).toBeCloseTo(expectedReverseKl, 10);
    expect(res.klPQ).not.toBeCloseTo(res.klQP, 3);
  });

  it('spikes cross-entropy above 4.9 bits when Q assigns 1% to a 70% event', () => {
    const res = computeEntropyKlBreakdown(['cat', 'dog', 'bird'], [70, 20, 10], [1, 49, 50]);
    const expectedCE = -(0.7 * Math.log2(0.01) + 0.2 * Math.log2(0.49) + 0.1 * Math.log2(0.5));
    expect(res.crossEntropyPQ).toBeCloseTo(expectedCE, 8);
    expect(res.crossEntropyPQ).toBeGreaterThan(4.9);
    expect(res.klPQ).toBeCloseTo(res.crossEntropyPQ - res.entropyP, 10);
    expect(res.worstOutcomeLabel).toBe('cat');
  });

  it('blends smoothly between true distribution P and model guess Q', () => {
    expect(blendWeights([70, 20, 10], [10, 40, 50], 0)).toEqual([70, 20, 10]);
    expect(blendWeights([70, 20, 10], [10, 40, 50], 0.5)).toEqual([40, 30, 30]);
    expect(blendWeights([70, 20, 10], [10, 40, 50], 1)).toEqual([10, 40, 50]);
  });
});
