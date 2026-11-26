import { describe, expect, it } from 'vitest';
import {
  WORKED_PAGERANK_GRAPH,
  PAGERANK_GRAPH_PRESETS,
  analyzePageRankStep,
  formatPrScore,
  getInNeighbors,
  getOutDegrees,
  powerIterationStep,
  runPageRank,
} from './pageRank';

describe('pageRank calculations', () => {
  it('correctly calculates degrees and in-neighbors for worked graph', () => {
    const outDeg = getOutDegrees(WORKED_PAGERANK_GRAPH);
    expect(outDeg).toEqual({ A: 2, B: 1, C: 1, D: 1 });

    const inNeigh = getInNeighbors(WORKED_PAGERANK_GRAPH);
    expect(inNeigh.A).toEqual(['C']);
    expect(inNeigh.B).toEqual(['A']);
    expect(inNeigh.C.sort()).toEqual(['A', 'B', 'D'].sort());
    expect(inNeigh.D).toEqual([]);
  });

  it('computes exact Step 1 values for the worked graph with d=0.85', () => {
    const p0 = { A: 0.25, B: 0.25, C: 0.25, D: 0.25 };
    const p1 = powerIterationStep(p0, WORKED_PAGERANK_GRAPH, 0.85);

    // baseTeleport = (1 - 0.85)/4 = 0.0375
    // PR(A) = 0.0375 + 0.85 * (0.25 / 1) = 0.2500
    // PR(B) = 0.0375 + 0.85 * (0.25 / 2) = 0.14375 -> 0.1438
    // PR(C) = 0.0375 + 0.85 * (0.25/2 + 0.25/1 + 0.25/1) = 0.56875 -> 0.5688
    // PR(D) = 0.0375 + 0 = 0.0375
    expect(p1.A).toBeCloseTo(0.25, 4);
    expect(p1.B).toBeCloseTo(0.14375, 4);
    expect(p1.C).toBeCloseTo(0.56875, 4);
    expect(p1.D).toBeCloseTo(0.0375, 4);
    expect(formatPrScore(p1.B)).toBe('0.1438');
    expect(formatPrScore(p1.C)).toBe('0.5688');

    const sum1 = p1.A + p1.B + p1.C + p1.D;
    expect(sum1).toBeCloseTo(1.0, 5);
  });

  it('converges to steady-state probability vector matching analytical solution', () => {
    const { converged } = runPageRank(WORKED_PAGERANK_GRAPH, 0.85);

    expect(converged.A).toBeCloseTo(0.3725, 4);
    expect(converged.B).toBeCloseTo(0.1958, 4);
    expect(converged.C).toBeCloseTo(0.3941, 4);
    expect(converged.D).toBeCloseTo(0.0375, 4);

    const total = converged.A + converged.B + converged.C + converged.D;
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('drains node D to 0 when d=1.0 without teleportation', () => {
    const { converged } = runPageRank(WORKED_PAGERANK_GRAPH, 1.0, 50);
    expect(converged.D).toBeCloseTo(0.0, 4);
  });

  it('analyzes step contributions and rescues Page D (> 0.15) when adding edge C -> D', () => {
    const step1 = analyzePageRankStep({
      graph: WORKED_PAGERANK_GRAPH,
      damping: 0.85,
      stepSlot: 1,
      focusNode: 'C',
    });
    expect(step1.focusContributions).toHaveLength(3);
    expect(formatPrScore(step1.scores.C)).toBe('0.5688');

    const rescued = analyzePageRankStep({
      graph: { nodes: ['A', 'B', 'C', 'D'], edges: [...PAGERANK_GRAPH_PRESETS[1].edges] },
      damping: 0.85,
      stepSlot: 5,
      focusNode: 'D',
    });
    expect(rescued.scores.D).toBeGreaterThan(0.15);
    expect(rescued.totalMass).toBeCloseTo(1.0, 5);
  });
});
