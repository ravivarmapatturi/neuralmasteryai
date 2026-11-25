// TF-IDF calculation library and toy corpus for information retrieval explanations.

export interface ToyDocument {
  id: string;
  text: string;
  tokens: string[];
}

export const TOY_TFIDF_DOCS: ToyDocument[] = [
  {
    id: 'D1',
    text: 'machine learning is powerful',
    tokens: ['machine', 'learning', 'is', 'powerful'],
  },
  {
    id: 'D2',
    text: 'deep learning is part of machine learning',
    tokens: ['deep', 'learning', 'is', 'part', 'of', 'machine', 'learning'],
  },
  {
    id: 'D3',
    text: 'machine learning improves search',
    tokens: ['machine', 'learning', 'improves', 'search'],
  },
  {
    id: 'D4',
    text: 'cooking food is fun',
    tokens: ['cooking', 'food', 'is', 'fun'],
  },
];

export interface TermBreakdown {
  term: string;
  count: number;
  docLength: number;
  tf: number;
  df: number;
  N: number;
  idf: number;
  tfidf: number;
  queryTf: number;
  queryTfidf: number;
  cosineContribution: number;
}

export interface DocumentScore {
  docId: string;
  text: string;
  docLength: number;
  score: number;
  breakdown: TermBreakdown[];
}

export interface QueryStats {
  term: string;
  df: number;
  N: number;
  idf: number;
}

export type TfidfVariant = 'classic' | 'cosine' | 'raw-count';
export type TfidfStage = 0 | 1 | 2 | 3;

export const TFIDF_STAGES: readonly { id: TfidfStage; label: string; shortLabel: string }[] = [
  { id: 0, label: '1. Count word hits', shortLabel: '1. Hits' },
  { id: 1, label: '2. Divide by length (TF)', shortLabel: '2. Share TF' },
  { id: 2, label: '3. Weight rare words (IDF)', shortLabel: '3. Rarity IDF' },
  { id: 3, label: '4. Total score & rank', shortLabel: '4. Total & rank' },
];

export interface ScoredDocument extends DocumentScore {
  rawCountTotal: number;
  classicScore: number;
  cosineScore: number;
  dotProduct: number;
  queryNorm: number;
  docNorm: number;
  activeScore: number;
}

export interface TfidfSearchResult {
  queryTerms: string[];
  queryStats: QueryStats[];
  results: ScoredDocument[];
  variant: TfidfVariant;
}

/** Tokenize free text into lowercase words (alphanumerics and apostrophes). */
export function tokenizeText(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).slice(0, 24);
}

/** Normalized term frequency: count(t, d) / |d| */
export function computeTf(term: string, docTokens: string[]): { count: number; tf: number } {
  const tLower = term.toLowerCase();
  const count = docTokens.filter((tok) => tok.toLowerCase() === tLower).length;
  const docLength = docTokens.length;
  const tf = docLength > 0 ? count / docLength : 0;
  return { count, tf };
}

/** Textbook natural-log IDF: ln(N / df(t)) */
export function computeIdf(df: number, N: number): number {
  if (N <= 0 || df <= 0) return 0;
  if (df > N) df = N;
  return Math.log(N / df);
}

/** Document frequency of a term across a list of tokenized documents */
export function computeDf(term: string, corpusTokens: string[][]): number {
  const tLower = term.toLowerCase();
  return corpusTokens.filter((doc) => doc.some((tok) => tok.toLowerCase() === tLower)).length;
}

/** Calculate full TF-IDF query stats and ranked documents across a corpus */
export function rankDocumentsTfidf(
  query: string[],
  docs: ToyDocument[] = TOY_TFIDF_DOCS,
): { queryStats: QueryStats[]; results: DocumentScore[] } {
  const search = runTfidfSearch(query.join(' '), docs, 'classic');
  return {
    queryStats: search.queryStats,
    results: search.results.map(({ docId, text, docLength, score, breakdown }) => ({
      docId,
      text,
      docLength,
      score,
      breakdown,
    })),
  };
}

/** Run classic TF*IDF, Cosine TF-IDF over full corpus vocabulary, or Raw Count scoring. */
export function runTfidfSearch(
  queryText: string,
  docs: ToyDocument[] = TOY_TFIDF_DOCS,
  variant: TfidfVariant = 'classic',
): TfidfSearchResult {
  const rawTerms = tokenizeText(queryText);
  // Deduplicate repeated query terms cleanly while preserving order
  const queryTerms: string[] = [];
  for (const term of rawTerms) {
    if (!queryTerms.includes(term)) queryTerms.push(term);
  }

  const N = docs.length;
  const corpusTokens = docs.map((d) => d.tokens);
  const vocab = Array.from(new Set([...queryTerms, ...corpusTokens.flat().map((t) => t.toLowerCase())]));

  const vocabIdf = new Map<string, number>();
  for (const term of vocab) {
    vocabIdf.set(term, computeIdf(computeDf(term, corpusTokens), N));
  }

  const queryStats: QueryStats[] = queryTerms.map((term) => {
    const df = computeDf(term, corpusTokens);
    const idf = computeIdf(df, N);
    return { term, df, N, idf };
  });

  // Query TF-IDF vector (over full corpus vocabulary) for Cosine mode
  const qVec = vocab.map((term) => {
    const { tf } = computeTf(term, rawTerms);
    return tf * (vocabIdf.get(term) ?? 0);
  });
  const queryNorm = Math.hypot(...qVec);

  const scored: ScoredDocument[] = docs.map((doc) => {
    let classicScore = 0;
    let rawCountTotal = 0;

    const dVec = vocab.map((term) => {
      const { tf } = computeTf(term, doc.tokens);
      return tf * (vocabIdf.get(term) ?? 0);
    });
    const docNorm = Math.hypot(...dVec);
    const dotProduct = qVec.reduce((sum, qv, idx) => sum + qv * dVec[idx], 0);
    const cosineScore = queryNorm > 0 && docNorm > 0 ? dotProduct / (queryNorm * docNorm) : 0;

    const breakdown: TermBreakdown[] = [];
    for (const qs of queryStats) {
      const { count, tf } = computeTf(qs.term, doc.tokens);
      const tfidf = tf * qs.idf;
      const { tf: queryTf } = computeTf(qs.term, rawTerms);
      const queryTfidf = queryTf * qs.idf;
      const cosineContribution =
        queryNorm > 0 && docNorm > 0 ? (queryTfidf * tfidf) / (queryNorm * docNorm) : 0;
      classicScore += tfidf;
      rawCountTotal += count;
      breakdown.push({
        term: qs.term,
        count,
        docLength: doc.tokens.length,
        tf,
        df: qs.df,
        N,
        idf: qs.idf,
        tfidf,
        queryTf,
        queryTfidf,
        cosineContribution,
      });
    }

    const activeScore =
      variant === 'raw-count' ? rawCountTotal : variant === 'cosine' ? cosineScore : classicScore;

    return {
      docId: doc.id,
      text: doc.text,
      docLength: doc.tokens.length,
      score: classicScore,
      breakdown,
      rawCountTotal,
      classicScore,
      cosineScore,
      dotProduct,
      queryNorm,
      docNorm,
      activeScore,
    };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.activeScore - a.activeScore) > 1e-6) {
      return b.activeScore - a.activeScore;
    }
    return a.docId.localeCompare(b.docId);
  });

  return { queryTerms, queryStats, results: scored, variant };
}

/** One-line plain-English explanation of what just happened at `stage` and why. */
export function explainTfidfStep(
  stage: TfidfStage,
  doc: ScoredDocument | undefined,
  queryStats: QueryStats[],
  variant: TfidfVariant,
  totalDocs: number,
): string {
  if (!doc || queryStats.length === 0) {
    return 'Type at least one search word above to score the four documents live.';
  }

  const termsSummary = doc.breakdown
    .slice(0, 3)
    .map((b) => `"${b.term}" (${b.count}×)`)
    .join(', ');

  if (stage === 0) {
    return `${doc.docId} has ${doc.docLength} words and contains ${termsSummary} — ${doc.rawCountTotal} raw match${doc.rawCountTotal === 1 ? '' : 'es'} total.`;
  }

  if (stage === 1) {
    if (variant === 'raw-count') {
      return `Raw count skips dividing by length (${doc.docLength} words), so long or repetitive pages win easily.`;
    }
    const first = doc.breakdown[0];
    return `Dividing by ${doc.docId}'s length (${doc.docLength} words) keeps long pages fair: TF("${first.term}") = ${first.count}/${doc.docLength} = ${first.tf.toFixed(4)}.`;
  }

  if (stage === 2) {
    if (variant === 'raw-count') {
      return `Raw count ignores rarity, so a filler word like "is" (in every document) scores as much as a rare word.`;
    }
    const rarest = [...queryStats].sort((a, b) => b.idf - a.idf)[0];
    const common = [...queryStats].sort((a, b) => a.idf - b.idf)[0];
    if (common.df === totalDocs) {
      return `"${common.term}" appears in all ${totalDocs}/${totalDocs} docs, so its rarity weight IDF = ln(1) = 0.0000 and adds zero.`;
    }
    if (rarest.df === 0) {
      return `"${rarest.term}" is not in any document (df = 0), so its rarity contribution is 0.`;
    }
    return `"${rarest.term}" appears in ${rarest.df} of ${totalDocs} docs, so IDF = ln(${totalDocs}/${rarest.df}) = ${rarest.idf.toFixed(4)} (${rarest.df === 1 ? 'rare word gets highest weight' : 'shared word gets moderate weight'}).`;
  }

  if (variant === 'cosine') {
    return `Cosine compares arrow direction rather than length: ${doc.docId} scores ${doc.cosineScore.toFixed(4)} (dot ${doc.dotProduct.toFixed(4)} ÷ (‖q‖·‖d‖)).`;
  }
  if (variant === 'raw-count') {
    return `Under raw counts, ${doc.docId} scores ${doc.rawCountTotal} — repeating words pushes it up even without adding new meaning.`;
  }
  const parts = doc.breakdown
    .slice(0, 3)
    .map((b) => `${b.tf.toFixed(2)}×${b.idf.toFixed(2)}`)
    .join(' + ');
  return `Multiplying TF × IDF for ${doc.docId} (${parts}) sums to ${doc.classicScore.toFixed(4)}.`;
}

/** General formula and the same formula filled in with current live numbers. */
export function formatTfidfFormula(
  stage: TfidfStage,
  doc: ScoredDocument | undefined,
  queryStats: QueryStats[],
  variant: TfidfVariant,
): { general: string; worked: string } {
  if (!doc || queryStats.length === 0) {
    return {
      general: 'Score(q, d) = Σ TF(t, d) × IDF(t)',
      worked: 'Type a search query above to fill in live numbers.',
    };
  }
  const first = doc.breakdown[0];
  if (stage === 0 || variant === 'raw-count') {
    const sumStr = doc.breakdown.map((b) => `${b.count}`).join(' + ');
    return {
      general: 'RawCount(q, d) = Σ count(t, d)',
      worked: `${doc.docId}: ${sumStr} = ${doc.rawCountTotal}`,
    };
  }
  if (stage === 1) {
    return {
      general: 'TF(t, d) = count(t, d) / |d|',
      worked: `${doc.docId} ("${first.term}"): ${first.count} / ${first.docLength} = ${first.tf.toFixed(4)}`,
    };
  }
  if (stage === 2) {
    const t = queryStats[0];
    return {
      general: 'IDF(t) = ln(N / df(t))',
      worked: `"${t.term}": ln(${t.N} / ${t.df}) = ${t.idf.toFixed(4)}`,
    };
  }
  if (variant === 'cosine') {
    return {
      general: 'cos(q, d) = (q · d) / (‖q‖ · ‖d‖)',
      worked: `${doc.docId}: ${doc.dotProduct.toFixed(4)} / (${doc.queryNorm.toFixed(4)} × ${doc.docNorm.toFixed(4)}) = ${doc.cosineScore.toFixed(4)}`,
    };
  }
  const terms = doc.breakdown.map((b) => `(${b.tf.toFixed(4)}×${b.idf.toFixed(4)})`).join(' + ');
  return {
    general: 'Score(q, d) = Σ TF(t, d) × IDF(t)',
    worked: `${doc.docId}: ${terms} = ${doc.classicScore.toFixed(4)}`,
  };
}
