import { describe, expect, it } from 'vitest';
import { computeRRFScore, rankByRRF } from './hybridSearch';

describe('hybridSearch / RRF calculation', () => {
  const workedDocs = [
    { id: 'D1', title: 'Doc 1', lexicalRank: 1, denseRank: 3 },
    { id: 'D2', title: 'Doc 2', lexicalRank: 2, denseRank: 1 },
    { id: 'D3', title: 'Doc 3', lexicalRank: 4, denseRank: 2 },
    { id: 'D4', title: 'Doc 4', lexicalRank: 3, denseRank: 4 },
  ];

  it('computes exact RRF scores for worked example with k=60', () => {
    // D1: 1/(60+1) + 1/(60+3) = 1/61 + 1/63 = 0.0163934 + 0.0158730 = 0.0322665
    const scoreD1 = computeRRFScore([{ rank: 1 }, { rank: 3 }], 60);
    expect(scoreD1).toBeCloseTo(0.032266, 5);

    // D2: 1/(60+2) + 1/(60+1) = 1/62 + 1/61 = 0.0161290 + 0.0163934 = 0.0325225
    const scoreD2 = computeRRFScore([{ rank: 2 }, { rank: 1 }], 60);
    expect(scoreD2).toBeCloseTo(0.032522, 5);

    const ranked = rankByRRF(workedDocs, 60, 1.0, 1.0);
    expect(ranked[0].id).toBe('D2');
    expect(ranked[1].id).toBe('D1');
    expect(ranked[2].id).toBe('D3');
    expect(ranked[3].id).toBe('D4');
  });

  it('flips top document when weighting heavily favors lexical channel', () => {
    // When weightLex = 2.0 and weightDense = 0.5:
    // D1: 2/61 + 0.5/63 = 0.0327868 + 0.0079365 = 0.040723
    // D2: 2/62 + 0.5/61 = 0.0322580 + 0.0081967 = 0.040455
    const ranked = rankByRRF(workedDocs, 60, 2.0, 0.5);
    expect(ranked[0].id).toBe('D1');
    expect(ranked[1].id).toBe('D2');
    expect(ranked[0].totalScore).toBeCloseTo(0.040723, 5);
    expect(ranked[1].totalScore).toBeCloseTo(0.040455, 5);
  });

  it('handles small k values where rank 1 dominates', () => {
    const scoreK1 = computeRRFScore([{ rank: 1 }], 1);
    expect(scoreK1).toBeCloseTo(0.5, 5);
  });
});
