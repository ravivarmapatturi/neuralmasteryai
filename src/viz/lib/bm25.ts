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
