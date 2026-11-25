import { describe, expect, it } from 'vitest';
import {
  explainScreeningStage,
  formatScreeningFormula,
  formatUsdCompact,
  generateLibraryWithHits,
  runScreeningFunnel,
} from './screeningFunnel';
import { funnelCounts, generateCandidateScores } from './aiforscience';

describe('screeningFunnel pure computation', () => {
  it('matches ./aiforscience exact passedMl and shortlist counts', () => {
    const lib = generateLibraryWithHits(200_000);
    const refScores = generateCandidateScores(200_000, 7);
    expect(lib.scores).toEqual(refScores);

    const res = runScreeningFunnel(
      { librarySize: 200_000, threshold: 0.7, shortlistBudget: 20, assayCostUsd: 2_500 },
      lib,
    );
    const expected = funnelCounts(refScores, 0.7, 20);
    expect(res.passedMl).toBe(expected.passedMl);
    expect(res.shortlist).toBe(expected.shortlist);
    expect(res.passedMl).toBe(17_110);
    expect(res.shortlist).toBe(20);
    expect(res.histogram).toHaveLength(10);

    // Hand-check consistency: histogram bins must sum strictly to total N, totalTrueHits, passedMl, and hitsPassingMl
    expect(res.histogram.reduce((s, b) => s + b.totalCount, 0)).toBe(200_000);
    expect(res.histogram.reduce((s, b) => s + b.hitCount, 0)).toBe(res.totalTrueHits);
    expect(res.histogram.reduce((s, b) => s + b.passedCount, 0)).toBe(res.passedMl);
    expect(res.histogram.reduce((s, b) => s + b.passedHitCount, 0)).toBe(res.hitsPassingMl);
    // At threshold=0.70, recall = hitsPassingMl / totalTrueHits * 100 and costSaved = 200,000*2500 - 20*2500 = $499,950,000
    expect(res.recallPct).toBeCloseTo((res.hitsPassingMl / res.totalTrueHits) * 100, 10);
    expect(res.costSavedUsd).toBe(499_950_000);
  });

  it('computes recall drop as threshold rises and huge enrichment over random testing', () => {
    const lib = generateLibraryWithHits(200_000);
    const lowThresh = runScreeningFunnel(
      { librarySize: 200_000, threshold: 0.3, shortlistBudget: 20, assayCostUsd: 2_500 },
      lib,
    );
    const highThresh = runScreeningFunnel(
      { librarySize: 200_000, threshold: 0.9, shortlistBudget: 20, assayCostUsd: 2_500 },
      lib,
    );

    expect(lowThresh.passedMl).toBeGreaterThan(highThresh.passedMl);
    expect(lowThresh.recallPct).toBeGreaterThan(highThresh.recallPct);
    expect(lowThresh.enrichmentFactor).toBeGreaterThan(15);
    expect(lowThresh.naiveCostUsd).toBe(500_000_000);
    expect(lowThresh.mlFunnelCostUsd).toBe(50_000);
    expect(lowThresh.costSavedUsd).toBe(499_950_000);
    expect(formatUsdCompact(500_000_000)).toBe('$500.0M');
  });

  it('caps shortlist when fewer than K candidates pass threshold on smaller libraries', () => {
    const res = runScreeningFunnel({
      librarySize: 1_000,
      threshold: 0.95,
      shortlistBudget: 30,
      assayCostUsd: 1_000,
    });
    expect(res.passedMl).toBeLessThan(30);
    expect(res.shortlist).toBe(res.passedMl);
    expect(explainScreeningStage(2, res)).toContain('unused');
    const f = formatScreeningFormula(3, res);
    expect(f.general).toContain('Enrichment');
    expect(f.worked).toContain('×');
  });
});
