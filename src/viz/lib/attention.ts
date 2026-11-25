// Real, dependency-free scaled dot-product attention engine for the
// Attention Step-Through playground and LiveComputation preview.
// Tokenization splits on words and punctuation (not subword BPE) to stay
// lightweight and zero-dependency; every vector projection, dot product,
// scaling step, causal mask, softmax normalization, cosine similarity, and
// weighted Value blend is exact linear algebra.

export const EMBED_DIMS = ['Creature', 'Action', 'Place', 'Link'] as const;

export interface AttentionHead {
  name?: string;
  description?: string;
  Wq: number[][];
  Wk: number[][];
  Wv: number[][];
}

export interface AttentionOptions {
  useScale?: boolean;
  causalMask?: boolean;
  temperature?: number;
}

export interface AttentionResult {
  embeddings: number[][];
  Q: number[][];
  K: number[][];
  V: number[][];
  rawScores: number[][];
  scores: number[][];
  weights: number[][];
  output: number[][];
  cosineQK: number[][];
  cosineEmbed: number[][];
  entropy: number[];
  scaleFactor: number;
  temperature: number;
  causalMask: boolean;
}

const DIM = 4;

// Hand-grounded 4D concept vectors [Creature, Action, Place, Link] so common
// beginner words carry genuine semantic proximity (e.g. cosine("cat", "kitten") ≈ 0.94),
// while any other typed word falls back deterministically via hashString + mulberry32.
const SEMANTIC_LEXICON: Record<string, [number, number, number, number]> = {
  cat: [0.92, 0.08, 0.12, 0.08],
  cats: [0.91, 0.10, 0.12, 0.12],
  kitten: [0.82, 0.22, 0.18, 0.36],
  dog: [0.88, 0.14, 0.16, 0.08],
  puppy: [0.80, 0.24, 0.20, 0.32],
  mouse: [0.81, 0.12, 0.28, 0.06],
  bird: [0.83, 0.22, 0.14, 0.06],
  fish: [0.78, 0.14, 0.34, 0.06],
  pet: [0.84, 0.16, 0.22, 0.22],
  it: [0.58, 0.12, 0.28, 0.72],
  she: [0.72, 0.14, 0.10, 0.66],
  he: [0.72, 0.14, 0.10, 0.66],
  they: [0.68, 0.16, 0.14, 0.68],
  sat: [0.14, 0.92, 0.16, 0.08],
  chased: [0.24, 0.92, 0.10, 0.12],
  saw: [0.20, 0.89, 0.14, 0.12],
  watched: [0.24, 0.87, 0.16, 0.16],
  slept: [0.18, 0.88, 0.24, 0.06],
  ran: [0.20, 0.91, 0.14, 0.06],
  ate: [0.22, 0.88, 0.28, 0.08],
  likes: [0.22, 0.84, 0.12, 0.24],
  is: [0.14, 0.62, 0.16, 0.74],
  mat: [0.08, 0.12, 0.92, 0.12],
  rug: [0.09, 0.11, 0.91, 0.14],
  bed: [0.14, 0.20, 0.89, 0.10],
  chair: [0.06, 0.14, 0.90, 0.12],
  park: [0.18, 0.22, 0.88, 0.10],
  house: [0.12, 0.10, 0.92, 0.12],
  food: [0.22, 0.18, 0.86, 0.08],
  the: [0.10, 0.08, 0.16, 0.92],
  a: [0.12, 0.08, 0.18, 0.90],
  an: [0.12, 0.08, 0.18, 0.90],
  on: [0.06, 0.24, 0.42, 0.82],
  by: [0.12, 0.18, 0.36, 0.84],
  near: [0.14, 0.20, 0.44, 0.80],
  in: [0.08, 0.16, 0.46, 0.82],
  and: [0.12, 0.16, 0.16, 0.90],
  to: [0.10, 0.28, 0.28, 0.86],
};

export function tokenize(text: string): string[] {
  const matches: string[] = text.match(/[\w']+|[.,!?;]/g) ?? [];
  return matches.slice(0, 12);
}

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 4D token embedding: same word -> same vector. */
export function embed(token: string): number[] {
  const lower = token.toLowerCase();
  const known = SEMANTIC_LEXICON[lower];
  if (known) return [...known];
  const rand = mulberry32(hashString(lower));
  // Ensure non-zero vector even for arbitrary typed words
  const vec = Array.from({ length: DIM }, () => Number((rand() * 1.6 - 0.65).toFixed(4)));
  const norm = Math.hypot(...vec);
  if (norm < 0.2) vec[0] = 0.75;
  return vec;
}

const PRESET_HEADS: Record<number, AttentionHead> = {
  // Head 1: Meaning similarity — Q and K keep the same semantic axes so similar concepts match.
  1: {
    name: 'Head 1: Meaning match',
    description: 'Matches words that live in the same semantic neighborhood (e.g. cat ↔ kitten).',
    Wq: [
      [1.9, 0.1, 0.0, 0.0],
      [0.1, 1.9, 0.0, 0.0],
      [0.0, 0.0, 1.9, 0.1],
      [0.0, 0.0, 0.1, 1.8],
    ],
    Wk: [
      [1.9, 0.1, 0.0, 0.0],
      [0.1, 1.9, 0.0, 0.0],
      [0.0, 0.0, 1.9, 0.1],
      [0.0, 0.0, 0.1, 1.8],
    ],
    Wv: [
      [0.95, 0.10, 0.00, -0.10],
      [0.05, 0.90, 0.15, 0.00],
      [0.00, 0.10, 0.95, 0.10],
      [-0.10, 0.00, 0.15, 0.90],
    ],
  },
  // Head 2: Who ↔ Action — maps Creature queries onto Action keys and Action queries onto Creature keys.
  2: {
    name: 'Head 2: Who ↔ Action',
    description: 'Connects subjects to their verbs (e.g. cat ↔ sat or chased).',
    Wq: [
      [0.15, 1.95, 0.10, 0.00],
      [1.95, 0.15, 0.15, 0.00],
      [0.10, 0.25, 1.25, 0.20],
      [0.25, 0.20, 0.20, 1.00],
    ],
    Wk: [
      [1.60, 0.10, 0.00, 0.00],
      [0.10, 1.60, 0.00, 0.00],
      [0.00, 0.00, 1.40, 0.10],
      [0.00, 0.00, 0.10, 1.30],
    ],
    Wv: [
      [0.60, 0.70, 0.00, -0.15],
      [0.70, 0.60, 0.15, 0.00],
      [0.00, 0.20, 0.85, 0.20],
      [-0.10, 0.10, 0.25, 0.85],
    ],
  },
  // Head 3: Where / Context — projects queries into the Place axis so subjects/verbs attend to locations.
  3: {
    name: 'Head 3: Where / Context',
    description: 'Pulls context from places and objects (e.g. cat/sat ↔ mat).',
    Wq: [
      [0.10, 0.10, 0.15, 0.00],
      [0.10, 0.10, 0.15, 0.00],
      [2.10, 2.10, 1.50, 0.15],
      [0.05, 0.05, 0.10, 0.25],
    ],
    Wk: [
      [1.30, 0.05, 0.05, 0.00],
      [0.05, 1.30, 0.05, 0.00],
      [0.05, 0.05, 1.95, 0.05],
      [0.00, 0.00, 0.05, 1.00],
    ],
    Wv: [
      [0.45, 0.15, 0.75, 0.10],
      [0.15, 0.50, 0.75, 0.15],
      [0.20, 0.20, 0.90, 0.25],
      [0.10, 0.15, 0.40, 0.85],
    ],
  },
};

function randMatrix(rows: number, cols: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rand() * 2 - 1) * 0.8));
}

/** One attention head's fixed projection weights. Seeds 1..3 return interpretable demo heads. */
export function makeHead(seed: number): AttentionHead {
  const preset = PRESET_HEADS[seed];
  if (preset) {
    return {
      name: preset.name,
      description: preset.description,
      Wq: preset.Wq.map((r) => [...r]),
      Wk: preset.Wk.map((r) => [...r]),
      Wv: preset.Wv.map((r) => [...r]),
    };
  }
  return {
    name: `Head ${seed}`,
    Wq: randMatrix(DIM, DIM, seed * 3 + 1),
    Wk: randMatrix(DIM, DIM, seed * 3 + 2),
    Wv: randMatrix(DIM, DIM, seed * 3 + 3),
  };
}

export function matVec(W: number[][], v: number[]): number[] {
  return W.map((row) => row.reduce((s, w, i) => s + w * v[i], 0));
}

export function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  if (na < 1e-9 || nb < 1e-9) return 0;
  return dot(a, b) / (na * nb);
}

export function softmax(xs: number[]): number[] {
  const finite = xs.filter(Number.isFinite);
  if (finite.length === 0) return xs.map(() => 0);
  const m = Math.max(...finite);
  const exps = xs.map((x) => (Number.isFinite(x) ? Math.exp(x - m) : 0));
  const sum = exps.reduce((a, b) => a + b, 0);
  if (sum <= 0) return xs.map(() => 0);
  return exps.map((e) => e / sum);
}

export function shannonEntropyBits(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 1e-12) h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Runs one attention head over a token sequence.
 * Computes embeddings, Q/K/V projections, raw and scaled (and optionally masked)
 * QK^T scores, temperature-adjusted softmax weights, cosine similarities, and
 * weighted-sum output vectors.
 */
export function runAttention(
  tokens: string[],
  head: AttentionHead,
  options: AttentionOptions = {},
): AttentionResult {
  const useScale = options.useScale ?? true;
  const causalMask = options.causalMask ?? false;
  const temperature = Math.max(0.1, options.temperature ?? 1.0);

  const embeddings = tokens.map(embed);
  const Q = embeddings.map((e) => matVec(head.Wq, e));
  const K = embeddings.map((e) => matVec(head.Wk, e));
  const V = embeddings.map((e) => matVec(head.Wv, e));
  const scaleFactor = useScale ? Math.sqrt(DIM) : 1;

  const rawScores = Q.map((q) => K.map((k) => dot(q, k)));
  const scores = rawScores.map((row, i) =>
    row.map((s, j) => (causalMask && j > i ? -Infinity : s / scaleFactor)),
  );
  const weights = scores.map((row) => softmax(row.map((s) => (Number.isFinite(s) ? s / temperature : -Infinity))));
  const output = weights.map((w) =>
    V[0].map((_, d) => w.reduce((s, wij, j) => s + wij * V[j][d], 0)),
  );
  const cosineQK = Q.map((q) => K.map((k) => cosineSimilarity(q, k)));
  const cosineEmbed = embeddings.map((ea) => embeddings.map((eb) => cosineSimilarity(ea, eb)));
  const entropy = weights.map(shannonEntropyBits);

  return {
    embeddings,
    Q,
    K,
    V,
    rawScores,
    scores,
    weights,
    output,
    cosineQK,
    cosineEmbed,
    entropy,
    scaleFactor,
    temperature,
    causalMask,
  };
}

export type AttentionStage = 0 | 1 | 2 | 3;

export const ATTENTION_STAGES: { id: AttentionStage; label: string; shortLabel: string }[] = [
  { id: 0, label: '1. Query & Key match', shortLabel: '1. Q·K cosine' },
  { id: 1, label: '2. Dot score & ÷√dₖ', shortLabel: '2. Scale ÷√dₖ' },
  { id: 2, label: '3. Softmax weights', shortLabel: '3. Softmax %' },
  { id: 3, label: '4. Blend Value vectors', shortLabel: '4. Mix Values' },
];

/**
 * Produces one plain-English sentence telling the beginner what just happened
 * at the current stage and why, grounded in the real numbers for `focusRow`.
 */
export function explainAttentionStep(
  tokens: string[],
  result: AttentionResult,
  focusRow: number,
  stage: AttentionStage,
): string {
  if (tokens.length === 0) return 'Type at least one word above to compute attention live.';
  const i = Math.max(0, Math.min(tokens.length - 1, focusRow));
  const qTok = tokens[i];
  const validIndices = tokens
    .map((_, j) => j)
    .filter((j) => !(result.causalMask && j > i));

  // Best non-self match if available, otherwise self
  const otherIndices = validIndices.filter((j) => j !== i);
  const cosineCandidates = otherIndices.length > 0 ? otherIndices : validIndices;
  let bestCosJ = cosineCandidates[0] ?? i;
  for (const j of cosineCandidates) {
    if (result.cosineQK[i][j] > result.cosineQK[i][bestCosJ]) bestCosJ = j;
  }

  let topJ = validIndices[0] ?? i;
  for (const j of validIndices) {
    if (result.weights[i][j] > result.weights[i][topJ]) topJ = j;
  }
  const secondChoices = validIndices.filter((j) => j !== topJ);
  let secondJ = secondChoices[0] ?? topJ;
  for (const j of secondChoices) {
    if (result.weights[i][j] > result.weights[i][secondJ]) secondJ = j;
  }

  if (stage === 0) {
    const cos = result.cosineQK[i][bestCosJ];
    if (tokens.length === 1 || bestCosJ === i) {
      return `Query '${qTok}' projects to Q = [${result.Q[i].map((v) => v.toFixed(1)).join(', ')}] and matches itself (cosine ${cos.toFixed(2)}).`;
    }
    const relation = cos >= 0.75 ? 'their vectors point the same way' : cos >= 0.35 ? 'their features partially align' : 'their features barely overlap';
    return `The query '${qTok}' is closest to '${tokens[bestCosJ]}' because ${relation}: cosine ${cos.toFixed(2)}.`;
  }

  if (stage === 1) {
    const raw = result.rawScores[i][topJ];
    const scaled = result.scores[i][topJ];
    if (result.scaleFactor > 1) {
      return `Dot product Q·Kᵀ for '${qTok}'→'${tokens[topJ]}' is ${raw.toFixed(2)}, then ÷√4 = ${scaled.toFixed(2)} so one big score does not hog 100%.`;
    }
    return `Scaling ÷√4 is OFF: raw score ${raw.toFixed(2)} goes straight into softmax, making peaks sharper and gradients tiny elsewhere.`;
  }

  if (stage === 2) {
    const w1 = Math.round(result.weights[i][topJ] * 100);
    const maskedCount = result.causalMask ? tokens.length - 1 - i : 0;
    if (validIndices.length <= 1) {
      return `Causal mask blocks all future words after '${qTok}', so '${qTok}' keeps 100% on itself (0% ahead).`;
    }
    const w2 = Math.round(result.weights[i][secondJ] * 100);
    const maskNote = maskedCount > 0 ? ` (${maskedCount} future word${maskedCount > 1 ? 's' : ''} masked to 0%)` : '';
    return `Softmax turns scores into weights summing to 100%: '${qTok}' gives ${w1}% to '${tokens[topJ]}' and ${w2}% to '${tokens[secondJ]}'${maskNote}.`;
  }

  const w1 = Math.round(result.weights[i][topJ] * 100);
  const out = result.output[i].map((v) => v.toFixed(2)).join(', ');
  return `Output for '${qTok}' mixes every Value vector by its weight (${w1}%·V('${tokens[topJ]}') + …) → [${out}].`;
}
