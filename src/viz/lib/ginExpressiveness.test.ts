import { describe, expect, it } from 'vitest';
import {
  aggregateNode,
  compareGraphs,
  explainGinStep,
  ginMlp,
  parseNeighborList,
} from './ginExpressiveness';

describe('ginExpressiveness calculation library', () => {
  it('parses free neighbor lists and falls back cleanly on invalid input', () => {
    expect(parseNeighborList('1, 2.5, 3')).toEqual([1, 2.5, 3]);
    expect(parseNeighborList('bad input')).toEqual([1, 1]);
    expect(parseNeighborList('1 2 3 4 5 6 7 8 9 10', 8)).toHaveLength(8);
  });

  it('spot-checks exact hand-computed GIN MLP and 2-vs-4 mean collision', () => {
    // Hand check for z = 2.5: 0.8*(0.75*2.5 + 0.5) + 0.6*(0.45*2.5 - 0.3) + 0.1
    // = 0.8*2.375 + 0.6*0.825 + 0.1 = 1.9 + 0.495 + 0.1 = 2.495
    expect(ginMlp(2.5)).toBeCloseTo(2.495, 6);
    // Hand check for z = 4.5: 0.8*3.875 + 0.6*1.725 + 0.1 = 3.1 + 1.035 + 0.1 = 4.235
    expect(ginMlp(4.5)).toBeCloseTo(4.235, 6);

    const meanCmp = compareGraphs({
      neighborsA: [1, 1],
      neighborsB: [1, 1, 1, 1],
      centerA: 0.5,
      centerB: 0.5,
      epsilon: 0,
      kind: 'mean',
    });
    expect(meanCmp.graphA.output).toBeCloseTo(1.0);
    expect(meanCmp.graphB.output).toBeCloseTo(1.0);
    expect(meanCmp.isBlindCollision).toBe(true);

    const sumCmp = compareGraphs({
      neighborsA: [1, 1],
      neighborsB: [1, 1, 1, 1],
      centerA: 0.5,
      centerB: 0.5,
      epsilon: 0,
      kind: 'sum',
    });
    expect(sumCmp.graphA.output).toBe(2);
    expect(sumCmp.graphB.output).toBe(4);
    expect(sumCmp.isBlindCollision).toBe(false);
    expect(sumCmp.outputGap).toBe(2);

    const ginCmp = compareGraphs({
      neighborsA: [1, 1],
      neighborsB: [1, 1, 1, 1],
      centerA: 0.5,
      centerB: 0.5,
      epsilon: 0,
      kind: 'gin',
    });
    expect(ginCmp.graphA.preActivation).toBeCloseTo(2.5);
    expect(ginCmp.graphB.preActivation).toBeCloseTo(4.5);
    expect(ginCmp.graphA.output).toBeCloseTo(2.495);
    expect(ginCmp.graphB.output).toBeCloseTo(4.235);
    expect(ginCmp.isBlindCollision).toBe(false);
  });

  it('shows max pooling blind collision on duplicate maximums', () => {
    const maxCmp = compareGraphs({
      neighborsA: [1, 5],
      neighborsB: [1, 5, 5],
      centerA: 0.5,
      centerB: 0.5,
      epsilon: 0,
      kind: 'max',
    });
    expect(maxCmp.graphA.output).toBe(5);
    expect(maxCmp.graphB.output).toBe(5);
    expect(maxCmp.isBlindCollision).toBe(true);
  });

  it('uses (1+epsilon) * h_v in GIN to distinguish center features when neighbor sums tie', () => {
    const aggA = aggregateNode([1, 1], 2.0, 0.5, 'gin');
    const aggB = aggregateNode([1, 1], 0.5, 0.5, 'gin');
    expect(aggA.preActivation).toBeCloseTo(1.5 * 2.0 + 2);
    expect(aggB.preActivation).toBeCloseTo(1.5 * 0.5 + 2);
    expect(aggA.output).toBeGreaterThan(aggB.output);

    const cmp = compareGraphs({
      neighborsA: [1, 1],
      neighborsB: [1, 1],
      centerA: 2.0,
      centerB: 0.5,
      epsilon: 0.5,
      kind: 'gin',
    });
    expect(cmp.isBlindCollision).toBe(false);
    expect(explainGinStep(cmp, 3)).toContain('Distinguished');
  });
});
