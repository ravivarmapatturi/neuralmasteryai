import { describe, expect, it } from 'vitest';
import {
  calculateSimilarity,
  rankEmbeddings,
  type EmbeddingDocument,
} from './embeddingSimilaritySearch';

const DOCUMENTS: EmbeddingDocument[] = [
  { id: 'parallel-long', label: 'parallel long', vector: [2, 0] },
  { id: 'nearby', label: 'nearby', vector: [0.8, 0.1] },
  { id: 'orthogonal', label: 'orthogonal', vector: [0, 1] },
];

describe('embedding similarity search math', () => {
  it('computes cosine from the real dot product and vector magnitudes', () => {
    const result = calculateSimilarity([3, 4], [6, 8], 'cosine');
    expect(result.dot).toBe(50);
    expect(result.queryMagnitude).toBe(5);
    expect(result.documentMagnitude).toBe(10);
    expect(result.score).toBeCloseTo(1, 12);
  });

  it('computes the hand-checked 3-4-5 Euclidean distance', () => {
    const result = calculateSimilarity([1, 1], [4, 5], 'euclidean');
    expect(result.squaredDifferences).toEqual([9, 16]);
    expect(result.score).toBe(5);
  });

  it('computes dot product without normalizing away vector length', () => {
    expect(calculateSimilarity([1, 0], [2, 0], 'dot').score).toBe(2);
    expect(calculateSimilarity([1, 0], [0.8, 0.1], 'dot').score).toBe(0.8);
  });

  it('ranks higher cosine and dot scores first, but lower L2 distances first', () => {
    expect(rankEmbeddings([1, 0], DOCUMENTS, 'cosine')[0].id).toBe('parallel-long');
    expect(rankEmbeddings([1, 0], DOCUMENTS, 'dot')[0].id).toBe('parallel-long');
    expect(rankEmbeddings([1, 0], DOCUMENTS, 'euclidean')[0].id).toBe('nearby');
  });

  it('returns a finite cosine score for a zero vector', () => {
    expect(calculateSimilarity([0, 0], [1, 2], 'cosine').score).toBe(0);
  });
});
