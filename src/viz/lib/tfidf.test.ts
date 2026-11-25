import { describe, expect, it } from 'vitest';
import {
  TOY_TFIDF_DOCS,
  computeDf,
  computeIdf,
  computeTf,
  explainTfidfStep,
  formatTfidfFormula,
  rankDocumentsTfidf,
  runTfidfSearch,
  tokenizeText,
} from './tfidf';

describe('TF-IDF calculation helpers', () => {
  it('computes exact term frequencies for D1 and D2', () => {
    // D1: "machine learning is powerful" (4 tokens)
    const d1Tokens = TOY_TFIDF_DOCS[0].tokens;
    expect(d1Tokens.length).toBe(4);
    expect(computeTf('machine', d1Tokens)).toEqual({ count: 1, tf: 0.25 });
    expect(computeTf('learning', d1Tokens)).toEqual({ count: 1, tf: 0.25 });

    // D2: "deep learning is part of machine learning" (7 tokens)
    const d2Tokens = TOY_TFIDF_DOCS[1].tokens;
    expect(d2Tokens.length).toBe(7);
    expect(computeTf('machine', d2Tokens).count).toBe(1);
    expect(computeTf('machine', d2Tokens).tf).toBeCloseTo(1 / 7, 6);
    expect(computeTf('learning', d2Tokens).count).toBe(2);
    expect(computeTf('learning', d2Tokens).tf).toBeCloseTo(2 / 7, 6);
  });

  it('computes textbook natural-log IDF', () => {
    // N=4, df=3 -> ln(4/3) approx 0.287682
    expect(computeIdf(3, 4)).toBeCloseTo(Math.log(4 / 3), 6);
    // N=4, df=1 -> ln(4/1) approx 1.386294
    expect(computeIdf(1, 4)).toBeCloseTo(Math.log(4), 6);
    // Edge cases: df=0 -> 0
    expect(computeIdf(0, 4)).toBe(0);
  });

  it('computes document frequencies across toy corpus', () => {
    const corpusTokens = TOY_TFIDF_DOCS.map((d) => d.tokens);
    expect(computeDf('machine', corpusTokens)).toBe(3);
    expect(computeDf('learning', corpusTokens)).toBe(3);
    expect(computeDf('deep', corpusTokens)).toBe(1);
    expect(computeDf('cooking', corpusTokens)).toBe(1);
    expect(computeDf('quantum', corpusTokens)).toBe(0);
  });
});

describe('Owner draft toy search engine: query "machine learning"', () => {
  it('reproduces exact specified numbers: D1 = D3 = 0.1438 and D2 = 0.1233', () => {
    const { queryStats, results } = rankDocumentsTfidf(['machine', 'learning']);

    // IDF values
    expect(queryStats).toHaveLength(2);
    expect(queryStats[0].term).toBe('machine');
    expect(queryStats[0].df).toBe(3);
    expect(queryStats[0].idf).toBeCloseTo(Math.log(4 / 3), 6);

    expect(queryStats[1].term).toBe('learning');
    expect(queryStats[1].df).toBe(3);
    expect(queryStats[1].idf).toBeCloseTo(Math.log(4 / 3), 6);

    // Document scores
    const d1 = results.find((r) => r.docId === 'D1')!;
    const d2 = results.find((r) => r.docId === 'D2')!;
    const d3 = results.find((r) => r.docId === 'D3')!;
    const d4 = results.find((r) => r.docId === 'D4')!;

    // Specified result: D1 = D3 = 0.1438 and D2 = 0.1233
    expect(d1.score).toBeCloseTo(0.1438, 4);
    expect(d3.score).toBeCloseTo(0.1438, 4);
    expect(d2.score).toBeCloseTo(0.1233, 4);
    expect(d4.score).toBe(0.0);

    // Mathematical identity of the D1-D3 tie:
    // Both D1 and D3 have length 4 and contain 1 'machine' and 1 'learning'.
    // Their summed term contributions are identical: 0.25*ln(4/3) + 0.25*ln(4/3) = 0.5*ln(4/3)
    expect(d1.score).toBeCloseTo(d3.score, 10);
  });

  it('ranks D1 and D3 tied at top, then D2, then D4', () => {
    const { results } = rankDocumentsTfidf(['machine', 'learning']);
    expect(results[0].score).toBeCloseTo(0.1438, 4);
    expect(results[1].score).toBeCloseTo(0.1438, 4);
    expect(results[2].score).toBeCloseTo(0.1233, 4);
    expect(results[3].score).toBe(0.0);

    const topDocIds = [results[0].docId, results[1].docId];
    expect(topDocIds).toContain('D1');
    expect(topDocIds).toContain('D3');
    expect(results[2].docId).toBe('D2');
    expect(results[3].docId).toBe('D4');
  });

  it('correctly handles query "deep learning"', () => {
    const { results } = rankDocumentsTfidf(['deep', 'learning']);
    // D2 contains 'deep' (1/7, df=1) and 'learning' (2/7, df=3)
    // Score = (1/7)*ln(4) + (2/7)*ln(4/3) approx 0.2802
    const d2 = results.find((r) => r.docId === 'D2')!;
    expect(d2.score).toBeCloseTo((1 / 7) * Math.log(4) + (2 / 7) * Math.log(4 / 3), 6);
    expect(results[0].docId).toBe('D2');
  });

  it('correctly handles query "cooking food"', () => {
    const { results } = rankDocumentsTfidf(['cooking', 'food']);
    const d4 = results.find((r) => r.docId === 'D4')!;
    // D4: 'cooking' (1/4, df=1), 'food' (1/4, df=1) -> (0.5)*ln(4) = ln(2) approx 0.6931
    expect(d4.score).toBeCloseTo(Math.log(2), 6);
    expect(results[0].docId).toBe('D4');
    expect(results[1].score).toBe(0);
    expect(results[2].score).toBe(0);
    expect(results[3].score).toBe(0);
  });
});

describe('live TF-IDF playground extensions (free text, variants, step captions)', () => {
  it('tokenizes free-text input and drops universal words (df=N) automatically via IDF=0', () => {
    expect(tokenizeText('Machine, IS learning!')).toEqual(['machine', 'is', 'learning']);
    const docsWithIsEverywhere = [
      ...TOY_TFIDF_DOCS.slice(0, 2),
      { id: 'D3', text: 'machine learning is search', tokens: ['machine', 'learning', 'is', 'search'] },
      TOY_TFIDF_DOCS[3],
    ];
    const res = runTfidfSearch('machine is', docsWithIsEverywhere, 'classic');
    const isStat = res.queryStats.find((s) => s.term === 'is')!;
    expect(isStat.df).toBe(4);
    expect(isStat.idf).toBe(0);
    // D1 and D3 still tie at 0.25 * ln(4/3) since "is" adds 0
    const d1 = res.results.find((r) => r.docId === 'D1')!;
    expect(d1.activeScore).toBeCloseTo(0.25 * Math.log(4 / 3), 6);
  });

  it('computes length-invariant cosine similarity and exposes raw-count inflation', () => {
    const repeatedDocs = [
      ...TOY_TFIDF_DOCS,
      {
        id: 'D5',
        text: 'machine learning machine learning machine learning',
        tokens: ['machine', 'learning', 'machine', 'learning', 'machine', 'learning'],
      },
    ];
    const classicD1 = runTfidfSearch('machine learning', TOY_TFIDF_DOCS, 'classic').results.find((r) => r.docId === 'D1')!;
    const cosineOrig = runTfidfSearch('machine learning', TOY_TFIDF_DOCS, 'cosine').results.find((r) => r.docId === 'D1')!;
    const cosineRep = runTfidfSearch('machine learning', repeatedDocs, 'cosine').results.find((r) => r.docId === 'D5')!;
    // Repeating "machine learning" keeps the same unit direction as the query -> cosine score is 1.0
    expect(cosineRep.cosineScore).toBeCloseTo(1, 6);
    expect(cosineOrig.cosineScore).toBeGreaterThan(0);

    // Raw count mode gives D5 score=6 whereas classic TF*IDF scores D1/D3 equally by proportion
    const raw = runTfidfSearch('machine learning', repeatedDocs, 'raw-count').results[0];
    expect(raw.docId).toBe('D5');
    expect(raw.rawCountTotal).toBe(6);

    // Step explanations and formulas include live numbers
    const caption = explainTfidfStep(3, classicD1, [ { term: 'machine', df: 3, N: 4, idf: Math.log(4 / 3) } ], 'classic', 4);
    expect(caption).toContain('0.1438');
    const formula = formatTfidfFormula(2, classicD1, [ { term: 'machine', df: 3, N: 4, idf: Math.log(4 / 3) } ], 'classic');
    expect(formula.general).toContain('ln(N / df');
    expect(formula.worked).toContain('0.2877');
  });
});
