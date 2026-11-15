import { describe, expect, it } from 'vitest';
import {
  BM25_DEFAULT_B,
  BM25_DEFAULT_K1,
  bm25Idf,
  bm25LengthNorm,
  bm25OneTermBreakdown,
  bm25Score,
  bm25TermFrequencySaturation,
  bm25TermScore,
} from './bm25';

describe('bm25TermFrequencySaturation', () => {
  it('is 0 at tf=0', () => {
    expect(bm25TermFrequencySaturation(0, BM25_DEFAULT_K1)).toBe(0);
  });

  it('matches the diagram default at tf=5, k1=1.5: (2.5*5)/(6.5)', () => {
    expect(bm25TermFrequencySaturation(5, 1.5)).toBeCloseTo(12.5 / 6.5, 10);
  });

  it('approaches but never reaches the ceiling of k1+1 as tf grows large', () => {
    const k1 = 1.5;
    const atLargeTf = bm25TermFrequencySaturation(10_000, k1);
    expect(atLargeTf).toBeLessThan(k1 + 1);
    expect(atLargeTf).toBeGreaterThan(k1 + 1 - 0.01);
  });

  it('is strictly increasing in tf (more occurrences never lowers the score)', () => {
    const k1 = 1.5;
    const values = Array.from({ length: 16 }, (_, tf) => bm25TermFrequencySaturation(tf, k1));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('saturates: the marginal gain from tf=1->2 is larger than from tf=9->10', () => {
    const k1 = 1.5;
    const earlyGain = bm25TermFrequencySaturation(2, k1) - bm25TermFrequencySaturation(1, k1);
    const lateGain = bm25TermFrequencySaturation(10, k1) - bm25TermFrequencySaturation(9, k1);
    expect(earlyGain).toBeGreaterThan(lateGain);
  });

  it('uses BM25_DEFAULT_K1 (1.5) when k1 is omitted', () => {
    expect(bm25TermFrequencySaturation(5)).toBeCloseTo(bm25TermFrequencySaturation(5, BM25_DEFAULT_K1), 10);
  });
});

describe('bm25Idf', () => {
  it('computes smoothed IDF correctly for N=4, df=2', () => {
    // ln(1 + (4 - 2 + 0.5) / (2 + 0.5)) = ln(1 + 2.5 / 2.5) = ln(2) approx 0.6931
    const idf = bm25Idf(2, 4);
    expect(idf).toBeCloseTo(Math.log(2), 6);
  });

  it('computes smoothed IDF correctly for N=4, df=3', () => {
    // ln(1 + (4 - 3 + 0.5) / (3 + 0.5)) = ln(1 + 1.5 / 3.5) = ln(1 + 3/7) = ln(10/7) approx 0.3567
    const idf = bm25Idf(3, 4);
    expect(idf).toBeCloseTo(Math.log(10 / 7), 6);
  });

  it('remains strictly positive when df == N', () => {
    // ln(1 + 0.5 / (N + 0.5)) > 0
    expect(bm25Idf(4, 4)).toBeGreaterThan(0);
  });
});

describe('bm25LengthNorm', () => {
  it('uses default B constant when b is omitted', () => {
    expect(bm25LengthNorm(4, 4)).toBeCloseTo(1.0, 6);
    expect(bm25LengthNorm(3, 4, BM25_DEFAULT_B)).toBeCloseTo(0.8125, 6);
  });

  it('is exactly 1.0 when docLength equals avgDocLength, regardless of b', () => {
    expect(bm25LengthNorm(4, 4, 0.75)).toBeCloseTo(1.0, 6);
    expect(bm25LengthNorm(4, 4, 0.2)).toBeCloseTo(1.0, 6);
    expect(bm25LengthNorm(4, 4, 1.0)).toBeCloseTo(1.0, 6);
  });

  it('is less than 1.0 for short documents (|D| < avgdl) when b > 0', () => {
    // docLength 3, avgdl 4, b=0.75 -> 1 - 0.75 + 0.75*(3/4) = 0.25 + 0.5625 = 0.8125
    expect(bm25LengthNorm(3, 4, 0.75)).toBeCloseTo(0.8125, 6);
  });

  it('is greater than 1.0 for long documents (|D| > avgdl) when b > 0', () => {
    // docLength 5, avgdl 4, b=0.75 -> 1 - 0.75 + 0.75*(5/4) = 0.25 + 0.9375 = 1.1875
    expect(bm25LengthNorm(5, 4, 0.75)).toBeCloseTo(1.1875, 6);
  });

  it('ignores document length when b = 0', () => {
    expect(bm25LengthNorm(10, 4, 0)).toBe(1.0);
    expect(bm25LengthNorm(1, 4, 0)).toBe(1.0);
  });
});

describe('bm25TermScore', () => {
  it('computes term score for tf=1 in D1', () => {
    // tf=1, docLength=3, avgdl=4, df=3, N=4, k1=1.2, b=0.75 -> approx 0.3973
    const score = bm25TermScore(1, 3, 4, 3, 4, 1.2, 0.75);
    expect(score).toBeCloseTo(0.3973, 4);
  });

  it('returns 0 when tf is 0', () => {
    expect(bm25TermScore(0, 3, 4, 3, 4)).toBe(0);
  });
});

describe('BM25 calculator fixture per brief requirement 5', () => {
  // N=1000, df=100, avgdl=100, tf=3, docLength=100, k1=1.2, b=0.75
  // Robertson/Lucene smoothed IDF variant: ln(1 + (N - df + 0.5) / (df + 0.5))
  const N = 1000;
  const df = 100;
  const avgdl = 100;
  const tf = 3;
  const docLength = 100;
  const k1 = 1.2;
  const b = 0.75;

  it('matches exact fixture values: IDF 2.299, TF factor 1.571, score 3.612', () => {
    const res = bm25OneTermBreakdown(tf, docLength, avgdl, df, N, k1, b);

    // Exact Robertson/Lucene smoothed IDF: ln(1 + 900.5 / 100.5) = ln(9.960199) approx 2.298602
    expect(res.idf).toBeCloseTo(2.2986, 4);
    expect(Math.round(res.idf * 1000) / 1000).toBe(2.299);

    // TF factor: (3 * 2.2) / (3 + 1.2 * 1.0) = 6.6 / 4.2 approx 1.571428
    expect(res.tfFactor).toBeCloseTo(1.5714, 4);
    expect(Math.round(res.tfFactor * 1000) / 1000).toBe(1.571);

    // Total score: 2.298602 * 1.571428 approx 3.612089
    expect(res.score).toBeCloseTo(3.6121, 3);
    expect(Math.round(res.score * 1000) / 1000).toBe(3.612);
  });

  it('demonstrates diminishing returns when tf increases 10x from 3 to 30', () => {
    const at3 = bm25OneTermBreakdown(3, docLength, avgdl, df, N, k1, b);
    const at30 = bm25OneTermBreakdown(30, docLength, avgdl, df, N, k1, b);

    // TF increased 10x, but score only increases from ~3.61 to ~4.85 (< 1.35x), not 10x
    expect(at30.score).toBeGreaterThan(at3.score);
    expect(at30.score).toBeLessThan(at3.score * 1.5);
  });

  it('penalizes verbose documents when doc length increases from 100 to 500 (b=0.75)', () => {
    const normalDoc = bm25OneTermBreakdown(tf, 100, avgdl, df, N, k1, b);
    const longDoc = bm25OneTermBreakdown(tf, 500, avgdl, df, N, k1, b);

    expect(longDoc.score).toBeLessThan(normalDoc.score);
  });

  it('disables document length penalty when b=0', () => {
    const normalDoc = bm25OneTermBreakdown(tf, 100, avgdl, df, N, k1, 0.0);
    const longDoc = bm25OneTermBreakdown(tf, 500, avgdl, df, N, k1, 0.0);

    expect(longDoc.score).toBeCloseTo(normalDoc.score, 6);
  });
});

describe('bm25Score on worked 4-document toy corpus', () => {
  const corpus = [
    ['search', 'ranking', 'engine'], // D1: len 3
    ['search', 'ranking', 'ranking', 'neural', 'ranking'], // D2: len 5
    ['neural', 'search', 'recommendation', 'system'], // D3: len 4
    ['recommendation', 'deep', 'learning', 'model'], // D4: len 4
  ];
  const query = ['search', 'ranking'];

  it('computes exact scores for toy corpus with k1=1.2, b=0.75', () => {
    const k1 = 1.2;
    const b = 0.75;

    const s1 = bm25Score(query, corpus[0], corpus, k1, b);
    const s2 = bm25Score(query, corpus[1], corpus, k1, b);
    const s3 = bm25Score(query, corpus[2], corpus, k1, b);
    const s4 = bm25Score(query, corpus[3], corpus, k1, b);

    // D1 score = 1.1694
    expect(s1).toBeCloseTo(1.1694, 4);
    // D2 score = 1.3574
    expect(s2).toBeCloseTo(1.3574, 4);
    // D3 score = 0.3567 (only matches "search")
    expect(s3).toBeCloseTo(0.3567, 4);
    // D4 score = 0.0000 (no query matches)
    expect(s4).toBe(0.0);
  });

  it('computes exact scores for toy corpus with k1=1.5, b=0.75', () => {
    const k1 = 1.5;
    const b = 0.75;

    const s1 = bm25Score(query, corpus[0], corpus, k1, b);
    const s2 = bm25Score(query, corpus[1], corpus, k1, b);
    const s3 = bm25Score(query, corpus[2], corpus, k1, b);
    const s4 = bm25Score(query, corpus[3], corpus, k1, b);

    expect(s1).toBeCloseTo(1.1829, 4);
    expect(s2).toBeCloseTo(1.4079, 4);
    expect(s3).toBeCloseTo(0.3567, 4);
    expect(s4).toBe(0.0);
  });
});
