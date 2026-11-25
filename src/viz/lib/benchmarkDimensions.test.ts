import { describe, expect, it } from 'vitest';
import { analyzeBenchmarkDimensions, parseRelevantRanks } from './benchmarkDimensions';

describe('benchmarkDimensions pure calculations', () => {
  it('computes exact served-LLM TTFT, TPOT, VRAM, and throughput', () => {
    const res = analyzeBenchmarkDimensions({
      system: 'served',
      servedModelId: 'balanced-70b',
      promptTokens: 1200,
      outputTokens: 100,
      concurrency: 1,
      retrievalPipeline: 'bi-encoder',
      topK: 5,
      rerankCandidates: 20,
      relevantRanks: [1, 3, 7],
    });

    // balanced-70b: baseTtft=50, prefill=6 tok/ms => 50 + 1200/6 = 250 ms
    expect(res.ttftMs).toBeCloseTo(250, 6);
    // tpot = 22 ms at concurrency=1, e2e = 250 + 100*22 = 2450 ms
    expect(res.tpotMs).toBeCloseTo(22, 6);
    expect(res.e2eMs).toBeCloseTo(2450, 6);
    // throughput = 100 / 2.45 = 40.8163 tok/s
    expect(res.throughputTokPerSec).toBeCloseTo(100 / 2.45, 5);
    // kvCacheGib = 1 * 1300 * 327680 / 1024^3
    const expectedKv = (1300 * 327680) / 1024 ** 3;
    expect(res.kvCacheGib).toBeCloseTo(expectedKv, 6);
    expect(res.totalVramGib).toBeCloseTo(70 + expectedKv, 6);
  });

  it('computes exact Recall@k, Precision@k, MRR, and NDCG@k from relevant ranks', () => {
    const ranks = parseRelevantRanks('1, 3, 7');
    expect(ranks).toEqual([1, 3, 7]);

    const res = analyzeBenchmarkDimensions({
      system: 'retrieval',
      servedModelId: 'balanced-70b',
      promptTokens: 1000,
      outputTokens: 128,
      concurrency: 4,
      retrievalPipeline: 'hybrid-rerank',
      topK: 5,
      rerankCandidates: 20,
      relevantRanks: ranks,
    });

    // Hits in top 5: {1, 3} out of 3 total relevant
    expect(res.hitsInTopK).toBe(2);
    expect(res.recallAtK).toBeCloseTo(2 / 3, 6);
    expect(res.precisionAtK).toBeCloseTo(2 / 5, 6);
    expect(res.mrr).toBeCloseTo(1, 6);

    const dcg = 1 / Math.log2(2) + 1 / Math.log2(4); // 1.0 + 0.5 = 1.5
    const idcg = 1 / Math.log2(2) + 1 / Math.log2(3) + 1 / Math.log2(4); // 1 + 0.63093 + 0.5
    expect(res.ndcgAtK).toBeCloseTo(dcg / idcg, 6);
    // Latency: 8 + 12 + 20 * 1.4 = 48 ms
    expect(res.retrievalLatencyMs).toBeCloseTo(48, 6);
  });
});
