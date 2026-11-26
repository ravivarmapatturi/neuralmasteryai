import { describe, expect, it } from 'vitest';
import { buildTree, clusterSse, gini, kmeansTrace, knnTrace, treePredictionTrace, type LabeledPoint } from './decisionBoundary';

describe('decisionBoundary', () => {
  const points: LabeledPoint[] = [
    { x: 0, y: 0, label: 0 },
    { x: 0, y: 2, label: 0 },
    { x: 4, y: 0, label: 1 },
    { x: 4, y: 2, label: 1 },
  ];

  it('counts the three nearest votes by hand', () => {
    const trace = knnTrace(points, 3, 0.5, 0.5);
    expect(trace.map((step) => step.point.label)).toEqual([0, 0, 1]);
    expect(trace.at(-1)?.votes).toEqual({ 0: 2, 1: 1 });
    expect(trace.at(-1)?.predictedLabel).toBe(0);
  });

  it('computes Gini impurity and follows an axis-aligned tree split', () => {
    expect(gini([0, 0, 1, 1])).toBe(0.5);
    const tree = buildTree(points, 2);
    const trace = treePredictionTrace(tree, 3.5, 1);
    expect(trace[0]).toMatchObject({ axis: 'x', threshold: 2, branch: 'right' });
    expect(trace.at(-1)?.label).toBe(1);
  });

  it('returns a safe empty-data leaf while the learner edits the dataset', () => {
    expect(buildTree([], 3)).toEqual({ leaf: true, label: 0 });
  });

  it('moves centroids to the exact means and lowers squared distance', () => {
    const trace = kmeansTrace(points, 2, 3, 2);
    expect(trace.length).toBe(4);
    expect(trace.at(-1)?.centroids).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 0, y: 1 }),
      expect.objectContaining({ x: 4, y: 1 }),
    ]));
    expect(trace.at(-1)!.sse).toBe(4);
    expect(clusterSse(points, trace.at(-1)!.assignments, trace.at(-1)!.centroids)).toBe(4);
  });
});
