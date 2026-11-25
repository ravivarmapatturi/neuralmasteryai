import { describe, expect, it } from 'vitest';
import {
  analyzeAnnTradeoff,
  annRecallPct,
  annSearchLatencyMs,
  beamSearchGraph,
  DEMO_VECTOR_GRAPH,
  exactScanLatencyMs,
  exactSearchGraph,
} from './annVsExact';

describe('annVsExact', () => {
  it('matches hand-checked 10M-vector exact scan and HNSW formulas', () => {
    expect(exactScanLatencyMs(10)).toBe(850);
    expect(exactScanLatencyMs(0.01)).toBeCloseTo(0.85, 5);

    // HNSW at ef=35 gives 100 * (1 - 1/e) ≈ 63.212%
    expect(annRecallPct(35, 'hnsw')).toBeCloseTo(100 * (1 - Math.exp(-1)), 5);

    const log2_10M = Math.log2(10_000_000);
    expect(annSearchLatencyMs(10, 40, 'hnsw')).toBeCloseTo(0.12 * log2_10M + 0.55 * 40, 5);
  });

  it('finds exact nearest neighbors with brute force and improves 2D graph recall as visited budget rises', () => {
    const query: [number, number] = [1.0, 0.9];
    const exact = exactSearchGraph(DEMO_VECTOR_GRAPH, query, 3);
    expect(exact).toHaveLength(3);

    const tinyBudget = beamSearchGraph(DEMO_VECTOR_GRAPH, query, 3, 3);
    const fullBudget = beamSearchGraph(DEMO_VECTOR_GRAPH, query, 32, 3);

    const exactSet = new Set(exact);
    const tinyHits = tinyBudget.topKIds.filter((id) => exactSet.has(id)).length;
    const fullHits = fullBudget.topKIds.filter((id) => exactSet.has(id)).length;

    expect(fullHits).toBe(3);
    expect(fullHits).toBeGreaterThanOrEqual(tinyHits);
  });

  it('flags when dataset is tiny (10k) so exact scan beats HNSW overhead', () => {
    const tiny = analyzeAnnTradeoff({ datasetMillions: 0.01, ef: 40, indexKind: 'hnsw' });
    expect(tiny.exactWinsAtScale).toBe(true);
    expect(tiny.exactLatencyMs).toBeLessThan(tiny.annLatencyMs);

    const big = analyzeAnnTradeoff({ datasetMillions: 10, ef: 60, indexKind: 'hnsw' });
    expect(big.exactWinsAtScale).toBe(false);
    expect(big.speedup).toBeGreaterThan(10);
  });
});
