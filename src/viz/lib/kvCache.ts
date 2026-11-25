export type Vector2 = readonly [number, number];

export interface TokenProjection {
  token: string;
  embedding: Vector2;
  query: Vector2;
  key: Vector2;
  value: Vector2;
}
export interface KvAttentionStep {
  generatedIndex: number;
  token: string;
  query: Vector2;
  cache: TokenProjection[];
  scores: number[];
  weights: number[];
  output: Vector2;
  promptTokenCount: number;
}

export interface KvModelConfig {
  modelWidth: number;
  layers: number;
  kvHeads: number;
  headDim: number;
  sequenceLength: number;
  bytesPerValue: number;
}

export interface KvCostComparison {
  tokenCount: number;
  flopsPerKvPair: bigint;
  withCache: { pairsThisStep: bigint; pairsTotal: bigint; flopsThisStep: bigint; flopsTotal: bigint };
  withoutCache: { pairsThisStep: bigint; pairsTotal: bigint; flopsThisStep: bigint; flopsTotal: bigint };
  cacheBytes: bigint;
}

const KNOWN_EMBEDDINGS: Record<string, Vector2> = {
  the: [1, 0],
  cat: [1, 1],
  sat: [0, 1],
  softly: [-0.5, 1],
  on: [0.5, -0.5],
  mat: [0.8, 0.2],
};

const QUERY_MATRIX: readonly [Vector2, Vector2] = [[1, 0.5], [-0.5, 1]];
const KEY_MATRIX: readonly [Vector2, Vector2] = [[0.75, -0.25], [0.5, 1]];
const VALUE_MATRIX: readonly [Vector2, Vector2] = [[1, 0], [0.25, 0.75]];

function multiply(vector: Vector2, matrix: readonly [Vector2, Vector2]): Vector2 {
  return [
    vector[0] * matrix[0][0] + vector[1] * matrix[1][0],
    vector[0] * matrix[0][1] + vector[1] * matrix[1][1],
  ];
}

function fallbackEmbedding(token: string): Vector2 {
  let hash = 2166136261;
  for (const char of token) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  const x = ((unsigned & 0xffff) / 0x7fff) - 1;
  const y = (((unsigned >>> 16) & 0xffff) / 0x7fff) - 1;
  return [Number(x.toFixed(3)), Number(y.toFixed(3))];
}

export function tokenizeKvText(text: string, limit = 3): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, limit);
}

export function projectToken(token: string): TokenProjection {
  const normalized = token.toLowerCase();
  const embedding = KNOWN_EMBEDDINGS[normalized] ?? fallbackEmbedding(normalized);
  return {
    token: normalized,
    embedding,
    query: multiply(embedding, QUERY_MATRIX),
    key: multiply(embedding, KEY_MATRIX),
    value: multiply(embedding, VALUE_MATRIX),
  };
}

export function stableSoftmax(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

export function buildKvTrace(promptText: string, generatedText: string): KvAttentionStep[] {
  const promptTokens = tokenizeKvText(promptText);
  const generatedTokens = tokenizeKvText(generatedText);
  const promptCache = promptTokens.map(projectToken);

  return generatedTokens.map((token, generatedIndex) => {
    const generatedSoFar = generatedTokens.slice(0, generatedIndex + 1).map(projectToken);
    const cache = [...promptCache, ...generatedSoFar];
    const current = generatedSoFar[generatedSoFar.length - 1];
    const scores = cache.map(({ key }) => (
      (current.query[0] * key[0] + current.query[1] * key[1]) / Math.sqrt(2)
    ));
    const weights = stableSoftmax(scores);
    const output: Vector2 = [
      weights.reduce((sum, weight, index) => sum + weight * cache[index].value[0], 0),
      weights.reduce((sum, weight, index) => sum + weight * cache[index].value[1], 0),
    ];

    return {
      generatedIndex,
      token,
      query: current.query,
      cache,
      scores,
      weights,
      output,
      promptTokenCount: promptTokens.length,
    };
  });
}

function positiveInteger(value: number): bigint {
  return BigInt(Math.max(1, Math.round(Number.isFinite(value) ? value : 1)));
}

export function calculateKvCosts(config: KvModelConfig, tokenCount: number): KvCostComparison {
  const n = positiveInteger(tokenCount);
  const modelWidth = positiveInteger(config.modelWidth);
  const layers = positiveInteger(config.layers);
  const kvHeads = positiveInteger(config.kvHeads);
  const headDim = positiveInteger(config.headDim);
  const sequenceLength = positiveInteger(config.sequenceLength);
  const bytesPerValue = positiveInteger(config.bytesPerValue);

  // K and V each use a dense projection. A multiply-add counts as two FLOPs:
  // 2 projections × 2 FLOPs × d_model × (kv_heads × head_dim) × layers.
  const flopsPerKvPair = 4n * modelWidth * kvHeads * headDim * layers;
  const triangular = (n * (n + 1n)) / 2n;
  const cacheBytes = 2n * layers * kvHeads * headDim * sequenceLength * bytesPerValue;

  return {
    tokenCount: Number(n),
    flopsPerKvPair,
    withCache: {
      pairsThisStep: 1n,
      pairsTotal: n,
      flopsThisStep: flopsPerKvPair,
      flopsTotal: n * flopsPerKvPair,
    },
    withoutCache: {
      pairsThisStep: n,
      pairsTotal: triangular,
      flopsThisStep: n * flopsPerKvPair,
      flopsTotal: triangular * flopsPerKvPair,
    },
    cacheBytes,
  };
}
