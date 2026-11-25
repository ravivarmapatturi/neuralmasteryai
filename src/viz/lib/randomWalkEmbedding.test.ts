import { describe, expect, it } from 'vitest';
import {
  computeStepTransition,
  simulateRandomWalkEmbedding,
  WALK_ADJ,
} from './randomWalkEmbedding';

describe('randomWalkEmbedding pure node2vec math', () => {
  it('computes hand-checked 2nd-order weights 1/p, 1, 1/q and exact probabilities at node 1 from node 0', () => {
    // Node 1 neighbors are [0, 2, 3]. Coming from prev=0:
    // - 0 is backtrack (d=0 -> 1/p)
    // - 2 is adjacent to 0 (d=1 -> 1)
    // - 3 is NOT adjacent to 0 (d=2 -> 1/q)
    const exploratory = computeStepTransition(WALK_ADJ, 0, 1, 1, 0.25);
    expect(exploratory.map((t) => t.distanceFromPrev)).toEqual([0, 1, 2]);
    expect(exploratory.map((t) => t.weight)).toEqual([1, 1, 4]);
    expect(exploratory[0].probability).toBeCloseTo(1 / 6, 10);
    expect(exploratory[1].probability).toBeCloseTo(1 / 6, 10);
    expect(exploratory[2].probability).toBeCloseTo(4 / 6, 10);

    const local = computeStepTransition(WALK_ADJ, 0, 1, 1, 2);
    expect(local.map((t) => t.weight)).toEqual([1, 1, 0.5]);
    expect(local[0].probability).toBeCloseTo(0.4, 10);
    expect(local[1].probability).toBeCloseTo(0.4, 10);
    expect(local[2].probability).toBeCloseTo(0.2, 10);
  });

  it('produces uniform DeepWalk weights when p=1 and q=1', () => {
    const tr = computeStepTransition(WALK_ADJ, 0, 1, 1, 1);
    for (const item of tr) {
      expect(item.weight).toBe(1);
      expect(item.probability).toBeCloseTo(1 / 3, 10);
    }
  });

  it('visits the outward chain {4,5} significantly more often under low q than high q across walks', () => {
    const localSim = simulateRandomWalkEmbedding({ start: 1, length: 8, p: 1, q: 4, seed: 42 });
    const exploreSim = simulateRandomWalkEmbedding({ start: 1, length: 8, p: 1, q: 0.25, seed: 42 });

    expect(exploreSim.walk.length).toBe(9);
    expect(exploreSim.avgChainShareMulti).toBeGreaterThan(localSim.avgChainShareMulti);
  });
});
