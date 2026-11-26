// Pure functions for ranking and recommendation evaluation metrics.
// Used by RankingMetricsExplorer and referenced by ranking-evaluation-metrics.mdx.

/** Precision at cutoff k: fraction of top-k retrieved items that are relevant (binary rel >= 1). */
export function precisionAtK(binaryRel: number[], k: number): number {
  if (k <= 0) return 0;
  const cutoff = Math.min(k, binaryRel.length);
  let relevantCount = 0;
  for (let i = 0; i < cutoff; i++) {
    if (binaryRel[i] > 0) relevantCount++;
  }
  return relevantCount / k;
}

/** Recall at cutoff k: fraction of total known relevant items in the corpus retrieved in top-k. */
export function recallAtK(binaryRel: number[], k: number, totalRelevantInCorpus: number): number {
  if (totalRelevantInCorpus <= 0 || k <= 0) return 0;
  const cutoff = Math.min(k, binaryRel.length);
  let relevantCount = 0;
  for (let i = 0; i < cutoff; i++) {
    if (binaryRel[i] > 0) relevantCount++;
  }
  return relevantCount / totalRelevantInCorpus;
}

/** Hit Rate at cutoff k: 1 if at least one relevant item appears in top-k, 0 otherwise. */
export function hitRateAtK(binaryRel: number[], k: number): number {
  if (k <= 0) return 0;
  const cutoff = Math.min(k, binaryRel.length);
  for (let i = 0; i < cutoff; i++) {
    if (binaryRel[i] > 0) return 1;
  }
  return 0;
}

/** Reciprocal Rank (RR): 1 / rank of the first relevant item (1-indexed). Returns 0 if none found. */
export function reciprocalRank(binaryRel: number[]): number {
  for (let i = 0; i < binaryRel.length; i++) {
    if (binaryRel[i] > 0) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/** Average Precision at cutoff k (AP@k):
 * Sum of (Precision@i * rel_i) for i=1..k divided by totalRelevantInCorpus.
 * Across multiple queries, the mean of AP is MAP (Mean Average Precision). */
export function averagePrecisionAtK(
  binaryRel: number[],
  k: number,
  totalRelevantInCorpus: number,
): number {
  if (totalRelevantInCorpus <= 0 || k <= 0) return 0;
  const cutoff = Math.min(k, binaryRel.length);
  let relevantCount = 0;
  let precisionSum = 0;

  for (let i = 0; i < cutoff; i++) {
    if (binaryRel[i] > 0) {
      relevantCount++;
      precisionSum += relevantCount / (i + 1);
    }
  }

  return precisionSum / totalRelevantInCorpus;
}

/** Discounted Cumulative Gain at cutoff k (DCG@k):
 * - Exponential gain (default, Burges et al. 2005): sum_{i=1..k} (2^g_i - 1) / log2(i + 1)
 * - Linear gain (Järvelin & Kekäläinen 2002): sum_{i=1..k} g_i / log2(i + 1) */
export function dcgAtK(
  grades: number[],
  k: number,
  gainType: 'exponential' | 'linear' = 'exponential',
): number {
  if (k <= 0) return 0;
  const cutoff = Math.min(k, grades.length);
  let totalDcg = 0;

  for (let i = 0; i < cutoff; i++) {
    const g = grades[i];
    const gain = gainType === 'exponential' ? Math.pow(2, g) - 1 : g;
    const discount = Math.log2(i + 2); // i=0 (rank 1) -> log2(2) = 1
    totalDcg += gain / discount;
  }

  return totalDcg;
}

/** Ideal DCG at cutoff k (IDCG@k): DCG of the same grades sorted descending. */
export function idcgAtK(
  grades: number[],
  k: number,
  gainType: 'exponential' | 'linear' = 'exponential',
): number {
  const sorted = [...grades].sort((a, b) => b - a);
  return dcgAtK(sorted, k, gainType);
}

/** Normalized Discounted Cumulative Gain at cutoff k (NDCG@k): DCG@k / IDCG@k in [0, 1]. */
export function ndcgAtK(
  grades: number[],
  k: number,
  gainType: 'exponential' | 'linear' = 'exponential',
): number {
  const idcg = idcgAtK(grades, k, gainType);
  if (idcg <= 0) return 0;
  const dcg = dcgAtK(grades, k, gainType);
  return dcg / idcg;
}

/** Catalog Coverage proxy: fraction of unique catalog items recommended across all users/queries. */
export function catalogCoverage(recommendedIds: string[], totalCatalogCount: number): number {
  if (totalCatalogCount <= 0) return 0;
  const uniqueRecommended = new Set(recommendedIds);
  return Math.min(1, uniqueRecommended.size / totalCatalogCount);
}

/** Category Diversity proxy: fraction of unique categories among the top-k items. */
export function categoryDiversityProxy(categories: string[]): number {
  if (categories.length === 0) return 0;
  const unique = new Set(categories);
  return unique.size / categories.length;
}

/** Backward-compatible alias for categoryDiversityProxy. */
export const intraListDiversity = categoryDiversityProxy;

export type RankingMetric = 'precision' | 'recall' | 'mrr' | 'ap' | 'ndcg';
export type GainType = 'exponential' | 'linear';

export interface RankingEvaluation {
  precision: number;
  recall: number;
  hitRate: number;
  mrr: number;
  ap: number;
  dcg: number;
  idcg: number;
  ndcg: number;
  relevantInTopK: number;
  firstRelevantRank: number | null;
  dcgContributions: number[];
}

/** One consistent snapshot used by the explorer, so the list, sticky-note
 * arithmetic, and headline value always come from the same inputs. */
export function evaluateRanking(
  grades: readonly number[],
  k: number,
  totalRelevantInCorpus: number,
  gainType: GainType = 'exponential',
): RankingEvaluation {
  const safeK = Math.max(0, Math.min(Math.round(k), grades.length));
  const binary = grades.map((grade) => (grade > 0 ? 1 : 0));
  const dcgContributions = grades.slice(0, safeK).map((grade, index) => {
    const gain = gainType === 'exponential' ? 2 ** grade - 1 : grade;
    return gain / Math.log2(index + 2);
  });
  const firstRelevant = binary.findIndex((value) => value > 0);
  return {
    precision: precisionAtK(binary, safeK),
    recall: recallAtK(binary, safeK, totalRelevantInCorpus),
    hitRate: hitRateAtK(binary, safeK),
    mrr: reciprocalRank(binary),
    ap: averagePrecisionAtK(binary, safeK, totalRelevantInCorpus),
    dcg: dcgAtK([...grades], safeK, gainType),
    idcg: idcgAtK([...grades], safeK, gainType),
    ndcg: ndcgAtK([...grades], safeK, gainType),
    relevantInTopK: binary.slice(0, safeK).reduce((sum, value) => sum + value, 0),
    firstRelevantRank: firstRelevant < 0 ? null : firstRelevant + 1,
    dcgContributions,
  };
}

/** Unvisited-Category Ratio proxy: fraction of recommended items from categories
 * not present in the user's historical profile.
 *
 * NOTE: This is an unvisited-category exploration ratio, NOT true serendipity.
 * True serendipity requires both novelty/unexpectedness AND demonstrated relevance
 * or positive user engagement; an unvisited category containing irrelevant items
 * is not serendipitous. */
export function unvisitedCategoryRatio(
  recommendedCategories: string[],
  userHistoricalCategories: Set<string> | string[],
): number {
  if (recommendedCategories.length === 0) return 0;
  const histSet =
    userHistoricalCategories instanceof Set
      ? userHistoricalCategories
      : new Set(userHistoricalCategories);
  let unvisitedCount = 0;
  for (const cat of recommendedCategories) {
    if (!histSet.has(cat)) unvisitedCount++;
  }
  return unvisitedCount / recommendedCategories.length;
}

/** Novelty proxy: mean negative log probability (-log2(p(i))) based on historical item popularity.
 * Higher value = less popular / more novel items recommended. */
export function noveltyProxy(
  itemPopularityCounts: Record<string, number>,
  recommendedIds: string[],
  totalInteractions: number,
): number {
  if (recommendedIds.length === 0 || totalInteractions <= 0) return 0;
  let totalSelfInfo = 0;
  for (const id of recommendedIds) {
    const count = itemPopularityCounts[id] ?? 1;
    const p = Math.max(count / totalInteractions, 1e-6);
    totalSelfInfo += -Math.log2(p);
  }
  return totalSelfInfo / recommendedIds.length;
}
