import { describe, expect, it } from 'vitest';
import {
  TOY_CLUSTER_POINTS,
  INITIAL_CENTROIDS,
  computeLoss,
  cosineAlpha,
  eMeansStep,
  lloydStep,
} from './kmeansEMeansMath';

describe('k-means and e-means mathematical invariants', () => {
  it('e-means update exactly equals Lloyd update when alpha = 1 and batch is full dataset', () => {
    const points = TOY_CLUSTER_POINTS;
    const initial = INITIAL_CENTROIDS;

    // Lloyd step
    const lloydResult = lloydStep(points, initial);

    // e-means step with alpha = 1, batch = all points
    // When alpha = 1, prior running sums and counts have weight 0
    const dummySums = Array.from({ length: initial.length }, () => ({ x: 0, y: 0 }));
    const dummyCounts = new Array<number>(initial.length).fill(0);

    const eMeansResult = eMeansStep(
      points,
      points,
      initial,
      dummySums,
      dummyCounts,
      1.0 // alpha = 1
    );

    // Centroids must be identical
    expect(eMeansResult.centroids.length).toBe(lloydResult.centroids.length);
    for (let i = 0; i < lloydResult.centroids.length; i++) {
      expect(eMeansResult.centroids[i].x).toBeCloseTo(lloydResult.centroids[i].x, 6);
      expect(eMeansResult.centroids[i].y).toBeCloseTo(lloydResult.centroids[i].y, 6);
    }

    // Loss must be identical
    expect(eMeansResult.loss).toBeCloseTo(lloydResult.loss, 6);
  });

  it('lloyd full-batch iterations reduce clustering loss on toy data', () => {
    let centroids = INITIAL_CENTROIDS;
    const initialLoss = computeLoss(TOY_CLUSTER_POINTS, centroids);
    let prevLoss = initialLoss;

    for (let step = 0; step < 5; step++) {
      const res = lloydStep(TOY_CLUSTER_POINTS, centroids);
      expect(res.loss).toBeLessThanOrEqual(prevLoss + 1e-6);
      prevLoss = res.loss;
      centroids = res.centroids;
    }

    // Final loss must be substantially lower than initial
    expect(prevLoss).toBeLessThan(initialLoss * 0.2);
  });

  it('e-means mini-batch updates decrease loss toward convergence', () => {
    const points = TOY_CLUSTER_POINTS;
    let centroids = INITIAL_CENTROIDS;
    const initialLoss = computeLoss(points, centroids);

    let runningSums = centroids.map((c) => ({ x: c.x * 4, y: c.y * 4 }));
    let runningCounts = new Array<number>(centroids.length).fill(4);

    const batchSize = 6;
    const totalSteps = 16;

    for (let step = 0; step < totalSteps; step++) {
      const alpha = cosineAlpha(step, totalSteps, 0.4);
      // Deterministic cyclic batch
      const start = (step * batchSize) % points.length;
      const batch = points.slice(start, start + batchSize);
      if (batch.length < batchSize) {
        batch.push(...points.slice(0, batchSize - batch.length));
      }

      const res = eMeansStep(batch, points, centroids, runningSums, runningCounts, alpha);
      centroids = res.centroids;
      runningSums = res.runningSums;
      runningCounts = res.runningCounts;
    }

    const finalLoss = computeLoss(points, centroids);
    expect(finalLoss).toBeLessThan(initialLoss * 0.3);
  });

  it('cosineAlpha decays smoothly from alpha0 down to 0.1 * alpha0', () => {
    const alpha0 = 0.5;
    const steps = 10;
    const first = cosineAlpha(0, steps, alpha0);
    const last = cosineAlpha(steps - 1, steps, alpha0);
    const mid = cosineAlpha(Math.floor(steps / 2), steps, alpha0);

    expect(first).toBeCloseTo(0.5, 5);
    expect(last).toBeCloseTo(0.05, 5);
    expect(mid).toBeLessThan(first);
    expect(mid).toBeGreaterThan(last);
  });
});
