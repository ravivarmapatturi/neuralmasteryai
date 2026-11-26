export interface SuperpositionAnalysis {
  vectors: number[][];
  gram: number[][];
  interferenceByFeature: number[];
  meanAbsCosine: number;
  input: number[];
  hidden: number[];
  reconstructed: number[];
  mse: number;
  activeIndices: number[];
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}

/** Deterministic unit feature directions. In 2D these are the regular polygons used in toy-superposition diagrams. */
export function featureDirections(featureCount: number, dimensions: number): number[][] {
  const n = Math.max(1, Math.round(featureCount));
  const d = Math.max(1, Math.round(dimensions));
  if (d >= n) {
    return Array.from({ length: n }, (_, i) => Array.from({ length: d }, (_v, j) => (i === j ? 1 : 0)));
  }
  return Array.from({ length: n }, (_, i) => {
    const theta = (2 * Math.PI * i) / n;
    const raw = Array.from({ length: d }, (_, j) => {
      const harmonic = Math.floor(j / 2) + 1;
      return j % 2 === 0 ? Math.cos(harmonic * theta) : Math.sin(harmonic * theta);
    });
    const norm = Math.hypot(...raw) || 1;
    return raw.map((value) => value / norm);
  });
}

export function analyzeSuperposition(
  featureCount: number,
  dimensions: number,
  activeCount: number,
  threshold: number,
  offset = 0,
): SuperpositionAnalysis {
  const vectors = featureDirections(featureCount, dimensions);
  const n = vectors.length;
  const gram = vectors.map((a) => vectors.map((b) => dot(a, b)));
  const interferenceByFeature = gram.map((row, i) => row.reduce(
    (sum, value, j) => sum + (i === j ? 0 : value ** 2),
    0,
  ));
  let absolute = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        absolute += Math.abs(gram[i][j]);
        pairs++;
      }
    }
  }
  const count = Math.max(1, Math.min(n, Math.round(activeCount)));
  const activeIndices = Array.from({ length: count }, (_, i) => (Math.round(offset) + i + n) % n);
  const input = Array.from({ length: n }, (_, i) => (activeIndices.includes(i) ? 1 : 0));
  const hidden = Array.from({ length: vectors[0]?.length ?? 0 }, (_, dim) => (
    vectors.reduce((sum, vector, i) => sum + vector[dim] * input[i], 0)
  ));
  const reconstructed = vectors.map((vector) => Math.max(0, dot(vector, hidden) - Math.max(0, threshold)));
  const mse = input.reduce((sum, value, i) => sum + (reconstructed[i] - value) ** 2, 0) / n;
  return {
    vectors,
    gram,
    interferenceByFeature,
    meanAbsCosine: pairs ? absolute / pairs : 0,
    input,
    hidden,
    reconstructed,
    mse,
    activeIndices,
  };
}

export function explainFeatureStep(
  featureIndex: number,
  analysis: SuperpositionAnalysis,
): string {
  const row = analysis.gram[featureIndex];
  let strongest = featureIndex === 0 ? 1 : 0;
  for (let i = 0; i < row.length; i++) {
    if (i !== featureIndex && Math.abs(row[i]) > Math.abs(row[strongest] ?? 0)) strongest = i;
  }
  return `Feature ${featureIndex + 1}: its strongest collision is feature ${strongest + 1} with cosine ${Math.abs(row[strongest] ?? 0).toFixed(3)}; total squared interference I_${featureIndex + 1} = ${analysis.interferenceByFeature[featureIndex].toFixed(3)}.`;
}
