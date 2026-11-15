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
  const N = docs.length;
  const corpusTokens = docs.map((d) => d.tokens);

  const queryStats: QueryStats[] = query.map((term) => {
    const df = computeDf(term, corpusTokens);
    const idf = computeIdf(df, N);
    return { term, df, N, idf };
  });

  const idfMap = new Map<string, { df: number; idf: number }>();
  for (const qs of queryStats) {
    idfMap.set(qs.term.toLowerCase(), { df: qs.df, idf: qs.idf });
  }

  const results: DocumentScore[] = docs.map((doc) => {
    let score = 0;
    const breakdown: TermBreakdown[] = [];

    for (const term of query) {
      const { count, tf } = computeTf(term, doc.tokens);
      const stat = idfMap.get(term.toLowerCase()) ?? { df: 0, idf: 0 };
      const tfidf = tf * stat.idf;
      score += tfidf;
      breakdown.push({
        term,
        count,
        docLength: doc.tokens.length,
        tf,
        df: stat.df,
        N,
        idf: stat.idf,
        tfidf,
      });
    }

    return {
      docId: doc.id,
      text: doc.text,
      docLength: doc.tokens.length,
      score,
      breakdown,
    };
  });

  // Sort descending by score; if tied, sort by docId ascending for deterministic order
  results.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 1e-6) {
      return b.score - a.score;
    }
    return a.docId.localeCompare(b.docId);
  });

  return { queryStats, results };
}
