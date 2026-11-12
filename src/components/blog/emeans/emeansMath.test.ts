import { describe, expect, it } from 'vitest';
import { batchWeights, cosineStep, emaStep, reviveSplit } from './emeansMath';

describe('e-means explainer maths', () => {
  it('matches the worked example in the post', () => {
    const one = emaStep([0, 0], 2, [[1, 1], [2, 0]], 0.2);
    expect(one.c[0]).toBeCloseTo(0.3);
    expect(one.c[1]).toBeCloseTo(0.1);
    const two = emaStep([20, 20], 2, [[9, 11], [10, 8]], 0.2);
    expect(two.c[0]).toBeCloseTo(9.9);
  });
  it('leaves a centroid in place when the batch brings it no points', () => {
    const r = emaStep([4, 2], 2, [], 0.5);
    expect(r.c).toEqual([2, 1]);
  });
  it('is one Lloyd round when alpha is 1', () => {
    const r = emaStep([100, 100], 50, [[1, 1], [3, 5]], 1);
    expect(r.c).toEqual([2, 3]);
  });
  it('fades old batches and sums to one', () => {
    const w = batchWeights(10, 0.3);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(w[0]).toBeLessThan(w[9]);
  });
  it('runs the cosine step from alpha0 down to a tenth of it', () => {
    expect(cosineStep(0, 100, 0.4)).toBeCloseTo(0.4);
    expect(cosineStep(100, 100, 0.4)).toBeCloseTo(0.04);
  });
  it('splits a donor into two centroids that end up apart', () => {
    const pts = Array.from({ length: 20 }, (_, i) => [i % 2 ? 4 : 1, 1 + (i % 5) * 0.1] as [number, number]);
    const { settled } = reviveSplit(pts, 0.05, 4);
    expect(Math.abs(settled[0][0] - settled[1][0])).toBeGreaterThan(2);
  });
});
