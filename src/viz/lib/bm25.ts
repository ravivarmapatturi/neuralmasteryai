// BM25 scoring helper functions: term-frequency saturation, length normalization,
// Robertson-style smoothed IDF, and full document scoring.

/** Standard default term-frequency saturation constant. */
export const BM25_DEFAULT_K1 = 1.5;

/** Standard default document-length normalization constant. */
export const BM25_DEFAULT_B = 0.75;

/** (k1+1)*tf / (k1+tf) -- climbs toward a ceiling of k1+1 as tf grows, the
 * correction that stops a document from scoring proportionally higher just
 * for repeating a term many times. */
export function bm25TermFrequencySaturation(tf: number, k1: number = BM25_DEFAULT_K1): number {
  if (tf <= 0) return 0;
  return ((k1 + 1) * tf) / (k1 + tf);
}

/** Robertson & Zaragoza (2009) / Lucene smoothed IDF:
 * IDF(q) = ln(1 + (N - df + 0.5) / (df + 0.5))
 * Guarantees non-negative IDF even for common terms appearing in > N/2 documents. */
export function bm25Idf(df: number, N: number, smoothed: boolean = true): number {
  if (N <= 0 || df <= 0) return 0;
  if (df > N) df = N;
  if (smoothed) {
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  }
  const ratio = (N - df + 0.5) / (df + 0.5);
  return ratio > 0 ? Math.log(ratio) : 0;
}

/** Document length normalization component:
 * B = 1 - b + b * (|D| / avgdl)
 * When |D| == avgdl, B == 1 regardless of b.
 * When |D| < avgdl, B < 1 (reducing denominator -> boosting concise docs).
 * When |D| > avgdl, B > 1 (increasing denominator -> penalizing verbose docs). */
export function bm25LengthNorm(
  docLength: number,
  avgDocLength: number,
  b: number = BM25_DEFAULT_B,
): number {
  if (avgDocLength <= 0) return 1;
  return 1 - b + b * (docLength / avgDocLength);
}

/** One-term BM25 calculation breakdown for interactive visualizers and test fixtures. */
export interface Bm25OneTermResult {
  idf: number;
  tfFactor: number;
  score: number;
}

export function bm25OneTermBreakdown(
  tf: number,
  docLength: number,
  avgDocLength: number,
  df: number,
  N: number,
  k1: number = BM25_DEFAULT_K1,
  b: number = BM25_DEFAULT_B,
): Bm25OneTermResult {
  const idf = bm25Idf(df, N);
  if (tf <= 0) {
    return { idf, tfFactor: 0, score: 0 };
  }
  const lenNorm = bm25LengthNorm(docLength, avgDocLength, b);
  const denom = tf + k1 * lenNorm;
  const tfFactor = denom > 0 ? (tf * (k1 + 1)) / denom : 0;
  return {
    idf,
    tfFactor,
    score: idf * tfFactor,
  };
}

/** Full Robertson / Okapi BM25 score for a single term in a document:
 * score(t, D) = IDF(t) * [tf * (k1 + 1)] / [tf + k1 * (1 - b + b * (|D| / avgdl))] */
export function bm25TermScore(
  tf: number,
  docLength: number,
  avgDocLength: number,
  df: number,
  N: number,
  k1: number = BM25_DEFAULT_K1,
  b: number = BM25_DEFAULT_B,
): number {
  if (tf <= 0) return 0;
  const idf = bm25Idf(df, N);
  const lenNorm = bm25LengthNorm(docLength, avgDocLength, b);
  const denom = tf + k1 * lenNorm;
  if (denom <= 0) return 0;
  const satWithLen = (tf * (k1 + 1)) / denom;
  return idf * satWithLen;
}

/** Total BM25 score for a multi-term query across a document in a corpus. */
export function bm25Score(
  queryTerms: string[],
  docTokens: string[],
  corpusTokens: string[][],
  k1: number = BM25_DEFAULT_K1,
  b: number = BM25_DEFAULT_B,
): number {
  const N = corpusTokens.length;
  if (N === 0) return 0;
  const totalLength = corpusTokens.reduce((sum, d) => sum + d.length, 0);
  const avgdl = totalLength / N;

  const docLength = docTokens.length;
  let totalScore = 0;

  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    const tf = docTokens.filter((t) => t.toLowerCase() === termLower).length;
    if (tf === 0) continue;
    const df = corpusTokens.filter((d) => d.some((t) => t.toLowerCase() === termLower)).length;
    totalScore += bm25TermScore(tf, docLength, avgdl, df, N, k1, b);
  }

  return totalScore;
}

export const BM25_PROBE_TFS = [1, 3, 10, 20, 30] as const;

export interface Bm25Checkpoint {
  tf: number;
  tfFactor: number;
  score: number;
  avgLenScore: number;
  unboundedScore: number;
  marginalGainPerWord: number | null;
}

export interface Bm25CurvePoint {
  tf: number;
  activeTfFactor: number;
  avgLenTfFactor: number;
  activeScore: number;
  avgLenScore: number;
  linearScore: number;
}

export interface Bm25ExplorerParams {
  tf: number;
  docLength: number;
  avgDocLength: number;
  df: number;
  N: number;
  k1: number;
  b: number;
}

export interface Bm25ExplorerAnalysis {
  idf: number;
  lengthFactorB: number;
  tfFactor: number;
  score: number;
  avgLenScore: number;
  unboundedScore: number;
  tfCeiling: number;
  scoreCeiling: number;
  checkpoints: Bm25Checkpoint[];
  curve: Bm25CurvePoint[];
}

export function analyzeBm25Explorer(params: Bm25ExplorerParams): Bm25ExplorerAnalysis {
  const { tf, docLength, avgDocLength, df, N, k1, b } = params;
  const idf = bm25Idf(df, N);
  const lengthFactorB = bm25LengthNorm(docLength, avgDocLength, b);
  const current = bm25OneTermBreakdown(tf, docLength, avgDocLength, df, N, k1, b);
  const avgCurrent = bm25OneTermBreakdown(tf, avgDocLength, avgDocLength, df, N, k1, b);

  const tfCeiling = k1 + 1;
  const scoreCeiling = idf * tfCeiling;

  const checkpoints: Bm25Checkpoint[] = [];
  for (let i = 0; i < BM25_PROBE_TFS.length; i += 1) {
    const probeTf = BM25_PROBE_TFS[i];
    const res = bm25OneTermBreakdown(probeTf, docLength, avgDocLength, df, N, k1, b);
    const avgRes = bm25OneTermBreakdown(probeTf, avgDocLength, avgDocLength, df, N, k1, b);
    const prev = checkpoints[i - 1];
    const marginalGainPerWord = prev
      ? (res.score - prev.score) / (probeTf - prev.tf)
      : null;
    checkpoints.push({
      tf: probeTf,
      tfFactor: res.tfFactor,
      score: res.score,
      avgLenScore: avgRes.score,
      unboundedScore: probeTf * idf,
      marginalGainPerWord,
    });
  }

  const curve: Bm25CurvePoint[] = [];
  for (let x = 0; x <= 32; x += 0.5) {
    const activeRes = bm25OneTermBreakdown(x, docLength, avgDocLength, df, N, k1, b);
    const avgRes = bm25OneTermBreakdown(x, avgDocLength, avgDocLength, df, N, k1, b);
    curve.push({
      tf: x,
      activeTfFactor: activeRes.tfFactor,
      avgLenTfFactor: avgRes.tfFactor,
      activeScore: activeRes.score,
      avgLenScore: avgRes.score,
      linearScore: x * idf,
    });
  }

  return {
    idf,
    lengthFactorB,
    tfFactor: current.tfFactor,
    score: current.score,
    avgLenScore: avgCurrent.score,
    unboundedScore: tf * idf,
    tfCeiling,
    scoreCeiling,
    checkpoints,
    curve,
  };
}

export function explainBm25Checkpoint(
  checkpointIndex: number,
  analysis: Bm25ExplorerAnalysis,
  params: Bm25ExplorerParams,
): string {
  const cp = analysis.checkpoints[checkpointIndex] ?? analysis.checkpoints[0];
  const prev = checkpointIndex > 0 ? analysis.checkpoints[checkpointIndex - 1] : null;
  const pctCeiling = analysis.scoreCeiling > 0 ? (cp.score / analysis.scoreCeiling) * 100 : 0;

  if (!prev) {
    return `At tf = ${cp.tf}: the first mention gives score ${cp.score.toFixed(3)} (vs ${cp.unboundedScore.toFixed(3)} uncapped). When length equals average (${params.avgDocLength}w), BM25 matches raw TF on the very first hit.`;
  }
  const perHit = cp.marginalGainPerWord ?? 0;
  return `Stepping tf from ${prev.tf} to ${cp.tf} adds ${perHit >= 0 ? '+' : ''}${perHit.toFixed(3)} score per extra mention, reaching ${cp.score.toFixed(3)} (${pctCeiling.toFixed(0)}% of the ${analysis.scoreCeiling.toFixed(3)} cap) while uncapped TF shoots to ${cp.unboundedScore.toFixed(1)}.`;
}
