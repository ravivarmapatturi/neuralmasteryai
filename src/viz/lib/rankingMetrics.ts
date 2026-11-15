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

/** Intra-List Diversity proxy: fraction of unique categories among the top-k items. */
export function intraListDiversity(categories: string[]): number {
  if (categories.length === 0) return 0;
  const unique = new Set(categories);
  return unique.size / categories.length;
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
