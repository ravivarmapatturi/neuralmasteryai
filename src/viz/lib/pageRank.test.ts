import { describe, expect, it } from 'vitest';
import {
  WORKED_PAGERANK_GRAPH,
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
    // PR(B) = 0.0375 + 0.85 * (0.25 / 2) = 0.14375
    // PR(C) = 0.0375 + 0.85 * (0.25/2 + 0.25/1 + 0.25/1) = 0.0375 + 0.85 * 0.625 = 0.56875
    // PR(D) = 0.0375 + 0 = 0.0375
    expect(p1.A).toBeCloseTo(0.25, 4);
    expect(p1.B).toBeCloseTo(0.14375, 4);
    expect(p1.C).toBeCloseTo(0.56875, 4);
    expect(p1.D).toBeCloseTo(0.0375, 4);

    const sum1 = p1.A + p1.B + p1.C + p1.D;
    expect(sum1).toBeCloseTo(1.0, 5);
  });

  it('converges to steady-state probability vector matching analytical solution', () => {
    const { converged } = runPageRank(WORKED_PAGERANK_GRAPH, 0.85);

    // Analytical solution:
    // PR(A) = 0.3725
    // PR(B) = 0.1958
    // PR(C) = 0.3941
    // PR(D) = 0.0375
    expect(converged.A).toBeCloseTo(0.3725, 3);
    expect(converged.B).toBeCloseTo(0.1958, 3);
    expect(converged.C).toBeCloseTo(0.3941, 3);
    expect(converged.D).toBeCloseTo(0.0375, 4);

    const total = converged.A + converged.B + converged.C + converged.D;
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('drains node D to 0 when d=1.0 without teleportation', () => {
    const { converged } = runPageRank(WORKED_PAGERANK_GRAPH, 1.0, 50);
    // Node D has zero incoming links; with d=1.0 it receives zero mass and drains to 0
    expect(converged.D).toBeCloseTo(0.0, 4);
  });
});
