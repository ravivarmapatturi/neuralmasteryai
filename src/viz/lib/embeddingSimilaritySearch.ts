export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot';

export type Vector2 = readonly [number, number];

export interface EmbeddingDocument {
  id: string;
  label: string;
  vector: Vector2;
}
export interface SimilarityCalculation {
  metric: SimilarityMetric;
  score: number;
  dot: number;
  queryMagnitude: number;
  documentMagnitude: number;
  squaredDifferences: Vector2;
}

export interface RankedEmbedding extends EmbeddingDocument {
  calculation: SimilarityCalculation;
  rank: number;
}

export const DEFAULT_EMBEDDING_DOCUMENTS: readonly EmbeddingDocument[] = [
  { id: 'kitten', label: 'kitten', vector: [0.6, 0.78] },
  { id: 'tiger', label: 'tiger', vector: [1.7, 0.4] },
  { id: 'puppy', label: 'puppy', vector: [0.45, 0.85] },
  { id: 'car', label: 'car', vector: [-0.85, 0.15] },
  { id: 'database', label: 'database', vector: [0.1, -0.9] },
] as const;

export const METRIC_EXPLANATIONS: Record<SimilarityMetric, { formula: string; closerMeans: string }> = {
  cosine: {
    formula: 'cos(q,d) = (q·d)/(|q||d|)',
    closerMeans: 'Higher is closer; 1 means the same direction.',
  },
  euclidean: {
    formula: 'L2(q,d) = sqrt(Σ(qᵢ−dᵢ)²)',
    closerMeans: 'Lower is closer; 0 means the same point.',
  },
  dot: {
    formula: 'dot(q,d) = Σ qᵢdᵢ',
    closerMeans: 'Higher is closer; vector length also affects the score.',
  },
};

export function dotProduct(a: Vector2, b: Vector2): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function vectorMagnitude(vector: Vector2): number {
  return Math.hypot(vector[0], vector[1]);
}

export function calculateSimilarity(query: Vector2, document: Vector2, metric: SimilarityMetric): SimilarityCalculation {
  const dot = dotProduct(query, document);
  const queryMagnitude = vectorMagnitude(query);
  const documentMagnitude = vectorMagnitude(document);
  const squaredDifferences: Vector2 = [
    (query[0] - document[0]) ** 2,
    (query[1] - document[1]) ** 2,
  ];

  let score: number;
  if (metric === 'cosine') {
    const denominator = queryMagnitude * documentMagnitude;
    score = denominator === 0 ? 0 : dot / denominator;
  } else if (metric === 'euclidean') {
    score = Math.sqrt(squaredDifferences[0] + squaredDifferences[1]);
  } else {
    score = dot;
  }

  return { metric, score, dot, queryMagnitude, documentMagnitude, squaredDifferences };
}

export function rankEmbeddings(
  query: Vector2,
  documents: readonly EmbeddingDocument[],
  metric: SimilarityMetric,
): RankedEmbedding[] {
  const direction = metric === 'euclidean' ? 1 : -1;
  return documents
    .map((document) => ({ ...document, calculation: calculateSimilarity(query, document.vector, metric) }))
    .sort((a, b) => {
      const byScore = direction * (a.calculation.score - b.calculation.score);
      return byScore === 0 ? a.id.localeCompare(b.id) : byScore;
    })
    .map((document, index) => ({ ...document, rank: index + 1 }));
}
