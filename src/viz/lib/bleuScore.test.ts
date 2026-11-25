import { describe, expect, it } from 'vitest';
import { calculateBleu, clippedNgramPrecision, tokenizeBleu } from './bleuScore';

describe('BLEU playground computation', () => {
  it('matches a hand-worked four-order BLEU example', () => {
    const result = calculateBleu({
      reference: 'the cat is on the mat',
      candidate: 'the cat is on mat',
      maxOrder: 4,
      lowercase: true,
    });

    // Candidate matches: p1=5/5, p2=3/4, p3=2/3, p4=1/2.
    // Their product is 1/4, so the fourth root is sqrt(1/2).
    // Candidate length 5 < reference length 6, so BP=e^(1-6/5)=e^-0.2.
    expect(result.rows.map((row) => [row.clippedMatches, row.totalCandidateNgrams])).toEqual([
      [5, 5], [3, 4], [2, 3], [1, 2],
    ]);
    expect(result.geometricMean).toBeCloseTo(Math.sqrt(0.5), 12);
    expect(result.brevityPenalty).toBeCloseTo(Math.exp(-0.2), 12);
    expect(result.score).toBeCloseTo(Math.sqrt(0.5) * Math.exp(-0.2), 12);
  });

  it('clips duplicate candidate matches to the reference count', () => {
    const row = clippedNgramPrecision(['the', 'the', 'the'], ['the', 'cat'], 1);
    expect(row.clippedMatches).toBe(1);
    expect(row.totalCandidateNgrams).toBe(3);
    expect(row.precision).toBeCloseTo(1 / 3, 12);
  });

  it('handles exact matches, case choice, and empty candidates', () => {
    expect(calculateBleu({ reference: 'A cat.', candidate: 'a cat', maxOrder: 2, lowercase: true }).score).toBe(1);
    expect(calculateBleu({ reference: 'A cat', candidate: 'a cat', maxOrder: 2, lowercase: false }).score).toBe(0);
    expect(calculateBleu({ reference: 'a cat', candidate: '', maxOrder: 4, lowercase: true }).score).toBe(0);
    expect(tokenizeBleu("Don't stop!", true)).toEqual(["don't", 'stop']);
  });
});
