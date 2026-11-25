import { describe, expect, it } from 'vitest';
import { buildKvTrace, calculateKvCosts, projectToken, stableSoftmax } from './kvCache';

describe('KV cache computation', () => {
  it('projects a known token through the real Q, K, and V matrices', () => {
    const cat = projectToken('cat');
    expect(cat.embedding).toEqual([1, 1]);
    expect(cat.query).toEqual([0.5, 1.5]);
    expect(cat.key).toEqual([1.25, 0.75]);
    expect(cat.value).toEqual([1.25, 0.75]);
  });

  it('uses a stable softmax whose weights sum to one', () => {
    const weights = stableSoftmax([1000, 1001, 1002]);
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
    expect(weights[2]).toBeGreaterThan(weights[1]);
    expect(weights[1]).toBeGreaterThan(weights[0]);
  });

  it('appends one K/V row per generated token and reuses every earlier row', () => {
    const trace = buildKvTrace('the cat', 'sat softly');
    expect(trace).toHaveLength(2);
    expect(trace[0].cache.map((row) => row.token)).toEqual(['the', 'cat', 'sat']);
    expect(trace[1].cache.map((row) => row.token)).toEqual(['the', 'cat', 'sat', 'softly']);
    expect(trace[1].cache.slice(0, 3)).toEqual(trace[0].cache);
    expect(trace[1].weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
  });

  it('computes the output as the attention-weighted sum of cached values', () => {
    const step = buildKvTrace('the cat', 'sat')[0];
    const expectedX = step.weights.reduce((sum, weight, index) => sum + weight * step.cache[index].value[0], 0);
    const expectedY = step.weights.reduce((sum, weight, index) => sum + weight * step.cache[index].value[1], 0);
    expect(step.output[0]).toBeCloseTo(expectedX, 12);
    expect(step.output[1]).toBeCloseTo(expectedY, 12);
  });

  it('matches n versus n(n+1)/2 K/V work and the exact memory formula', () => {
    const costs = calculateKvCosts({
      modelWidth: 2,
      layers: 1,
      kvHeads: 1,
      headDim: 2,
      sequenceLength: 10,
      bytesPerValue: 2,
    }, 4);

    expect(costs.flopsPerKvPair).toBe(16n);
    expect(costs.withCache.pairsThisStep).toBe(1n);
    expect(costs.withCache.pairsTotal).toBe(4n);
    expect(costs.withCache.flopsTotal).toBe(64n);
    expect(costs.withoutCache.pairsThisStep).toBe(4n);
    expect(costs.withoutCache.pairsTotal).toBe(10n);
    expect(costs.withoutCache.flopsTotal).toBe(160n);
    expect(costs.cacheBytes).toBe(80n);
  });
});
