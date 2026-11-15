import { describe, expect, it } from 'vitest';
import {
  averagePrecisionAtK,
  catalogCoverage,
  dcgAtK,
  hitRateAtK,
  idcgAtK,
  intraListDiversity,
  ndcgAtK,
  noveltyProxy,
  precisionAtK,
  recallAtK,
  reciprocalRank,
} from './rankingMetrics';

describe('rankingMetrics', () => {
  // Toy dataset with 5 items:
  // Items A, B, C are relevant (grades 3, 2, 1). Total relevant = 3.
  // Items D, E are non-relevant (grades 0, 0).
  const totalRelevant = 3;

  describe('set metrics vs rank-aware metrics invariance', () => {
    // Ranking 1: [A, D, B, C, E] -> grades [3, 0, 2, 1, 0] -> binary [1, 0, 1, 1, 0]
    const r1Grades = [3, 0, 2, 1, 0];
    const r1Bin = [1, 0, 1, 1, 0];

    // Ranking 2: [D, A, B, C, E] -> grades [0, 3, 2, 1, 0] -> binary [0, 1, 1, 1, 0]
    const r2Grades = [0, 3, 2, 1, 0];
    const r2Bin = [0, 1, 1, 1, 0];

    it('Precision@3 is identical (2/3 = 0.6667) for both rankings', () => {
      expect(precisionAtK(r1Bin, 3)).toBeCloseTo(2 / 3, 4);
      expect(precisionAtK(r2Bin, 3)).toBeCloseTo(2 / 3, 4);
    });

    it('Recall@3 is identical (2/3 = 0.6667) for both rankings', () => {
      expect(recallAtK(r1Bin, 3, totalRelevant)).toBeCloseTo(2 / 3, 4);
      expect(recallAtK(r2Bin, 3, totalRelevant)).toBeCloseTo(2 / 3, 4);
    });

    it('Hit Rate@3 is identical (1.0) for both rankings', () => {
      expect(hitRateAtK(r1Bin, 3)).toBe(1.0);
      expect(hitRateAtK(r2Bin, 3)).toBe(1.0);
    });

    it('Reciprocal Rank drops from 1.0 (rank 1) to 0.5 (rank 2)', () => {
      expect(reciprocalRank(r1Bin)).toBe(1.0);
      expect(reciprocalRank(r2Bin)).toBe(0.5);
    });

    it('Average Precision (AP@3) drops when the first relevant result is demoted', () => {
      // R1: rank 1 has prec 1/1 = 1; rank 2 non-rel; rank 3 has prec 2/3.
      // AP@3 = (1 + 2/3) / 3 = (5/3)/3 = 5/9 approx 0.5556
      expect(averagePrecisionAtK(r1Bin, 3, totalRelevant)).toBeCloseTo(5 / 9, 4);

      // R2: rank 1 non-rel; rank 2 has prec 1/2; rank 3 has prec 2/3.
      // AP@3 = (1/2 + 2/3) / 3 = (7/6)/3 = 7/18 approx 0.3889
      expect(averagePrecisionAtK(r2Bin, 3, totalRelevant)).toBeCloseTo(7 / 18, 4);
    });

    it('DCG@3 and NDCG@3 drop when highest relevance item is delayed', () => {
      // R1 exponential DCG@3: (2^3 - 1)/log2(2) + 0 + (2^2 - 1)/log2(4) = 7/1 + 3/2 = 8.5
      expect(dcgAtK(r1Grades, 3, 'exponential')).toBeCloseTo(8.5, 4);

      // Ideal top 3: grades [3, 2, 1] -> IDCG@3 = 7/1 + 3/1.58496 + 1/2 = 7 + 1.89279 + 0.5 = 9.39279
      const idealDcg = idcgAtK(r1Grades, 3, 'exponential');
      expect(idealDcg).toBeCloseTo(9.3928, 4);

      // NDCG@3 for R1 = 8.5 / 9.39279 approx 0.9049
      expect(ndcgAtK(r1Grades, 3, 'exponential')).toBeCloseTo(0.9049, 4);

      // R2 exponential DCG@3: 0 + (2^3 - 1)/log2(3) + (2^2 - 1)/log2(4) = 7/1.58496 + 3/2 = 4.4165 + 1.5 = 5.9165
      expect(dcgAtK(r2Grades, 3, 'exponential')).toBeCloseTo(5.9165, 4);

      // NDCG@3 for R2 = 5.9165 / 9.39279 approx 0.6299
      expect(ndcgAtK(r2Grades, 3, 'exponential')).toBeCloseTo(0.6299, 4);
    });

    it('DCG@3 and NDCG@3 with linear gain convention', () => {
      // R1 linear DCG@3: 3/1 + 0 + 2/2 = 4.0
      expect(dcgAtK(r1Grades, 3, 'linear')).toBeCloseTo(4.0, 4);
      // Ideal top 3 linear: 3/1 + 2/1.58496 + 1/2 = 3 + 1.26186 + 0.5 = 4.76186
      // NDCG@3 = 4.0 / 4.76186 approx 0.8400
      expect(ndcgAtK(r1Grades, 3, 'linear')).toBeCloseTo(0.84, 4);

      // R2 linear DCG@3: 0 + 3/1.58496 + 2/2 = 1.89279 + 1.0 = 2.8928
      expect(dcgAtK(r2Grades, 3, 'linear')).toBeCloseTo(2.8928, 4);
      // NDCG@3 = 2.8928 / 4.76186 approx 0.6075
      expect(ndcgAtK(r2Grades, 3, 'linear')).toBeCloseTo(0.6075, 4);
    });
  });

  describe('edge cases', () => {
    it('handles empty list or k=0 gracefully', () => {
      expect(precisionAtK([], 3)).toBe(0);
      expect(recallAtK([], 3, 3)).toBe(0);
      expect(hitRateAtK([], 3)).toBe(0);
      expect(reciprocalRank([])).toBe(0);
      expect(averagePrecisionAtK([], 3, 3)).toBe(0);
      expect(dcgAtK([], 3)).toBe(0);
      expect(ndcgAtK([], 3)).toBe(0);
    });

    it('handles list smaller than k', () => {
      // 2 items returned, k=5
      const bin = [1, 0];
      expect(precisionAtK(bin, 5)).toBe(0.2); // 1 / 5
      expect(recallAtK(bin, 5, 2)).toBe(0.5); // 1 / 2
    });

    it('handles zero total relevant in corpus', () => {
      expect(recallAtK([1, 1], 2, 0)).toBe(0);
      expect(averagePrecisionAtK([1, 1], 2, 0)).toBe(0);
    });
  });

  describe('operational recommendation metrics', () => {
    it('computes catalog coverage correctly', () => {
      const recommended = ['item_1', 'item_2', 'item_1', 'item_3'];
      expect(catalogCoverage(recommended, 10)).toBe(0.3); // 3 unique / 10
    });

    it('computes intra-list diversity correctly', () => {
      const categories = ['audio', 'audio', 'books', 'electronics'];
      // 3 unique categories / 4 items = 0.75
      expect(intraListDiversity(categories)).toBe(0.75);
    });

    it('computes novelty proxy higher for rare items', () => {
      const counts = { common: 1000, rare: 10 };
      const totalInteractions = 1010;
      const noveltyCommon = noveltyProxy(counts, ['common'], totalInteractions);
      const noveltyRare = noveltyProxy(counts, ['rare'], totalInteractions);
      expect(noveltyRare).toBeGreaterThan(noveltyCommon);
    });
  });
});
