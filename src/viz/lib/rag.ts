// A small, dependency-free retrieval engine for the RAG Pipeline Simulator.
// Real (if simplified) retrieval mechanics: actual fixed-size chunking (with
// optional word overlap), actual bag-of-words vectors, actual cosine similarity
// ranking, and an actual phrase-aware reranking pass -- not a scripted animation.

export const CORPUS: string[] = [
  `Linear regression fits a straight line through data by minimizing the sum of squared errors between predictions and actual values. The optimal weights have a closed-form solution using the normal equations, derived by setting the gradient of the loss to zero.`,
  `Gradient descent updates parameters by stepping in the direction opposite the gradient of the loss function. The learning rate controls step size: too large causes divergence or oscillation, too small makes training painfully slow to converge.`,
  `Overfitting happens when a model memorizes training data instead of learning generalizable patterns, performing well on training data but poorly on new, unseen examples. Regularization techniques like L1 and L2 penalties help control this by constraining model complexity.`,
  `A decision tree splits data recursively based on feature thresholds that maximize information gain or minimize Gini impurity at each node. Random forests train many decision trees on bootstrapped samples and average their predictions to reduce variance.`,
  `Convolutional neural networks apply learned filters across an image, detecting local patterns like edges in early layers and increasingly abstract features in deeper layers. Pooling layers downsample feature maps to reduce spatial dimensions and add translation invariance.`,
  `Self-attention lets every token in a sequence directly attend to every other token by computing Query, Key, and Value projections. Attention scores are the scaled dot product of Query and Key vectors, passed through softmax to produce weights over the Value vectors.`,
  `The KV cache stores previously computed Key and Value vectors during autoregressive text generation, avoiding redundant recomputation at each new token. This is the single biggest practical speedup in LLM inference and the primary consumer of GPU memory during generation.`,
  `Retrieval-augmented generation retrieves relevant text chunks from an external knowledge base and feeds them into an LLM's context alongside the user's query, grounding the generated answer in retrieved content rather than relying solely on the model's frozen training-time knowledge.`,
];

export const CORPUS_TOPICS = [
  'Linear regression',
  'Gradient descent',
  'Overfitting',
  'Decision trees',
  'CNNs',
  'Self-attention',
  'KV cache',
  'RAG',
] as const;

export interface Chunk {
  id: string;
  text: string;
}

export interface ScoredChunk extends Chunk {
  score: number;
}

export interface RerankedChunk extends ScoredChunk {
  rerankScore: number;
}

export function tokenizeRag(text: string): string[] {
  const matches: string[] = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return matches.filter((w) => w.length > 2);
}

/** Fixed-size chunking by word count, matching chunkSize -- too small loses context, too large dilutes specificity. */
export function chunkCorpus(chunkSize: number, overlap = 0): Chunk[] {
  const safeSize = Math.max(4, Math.round(chunkSize));
  const safeOverlap = Math.max(0, Math.min(safeSize - 1, Math.round(overlap)));
  const step = Math.max(1, safeSize - safeOverlap);
  const chunks: Chunk[] = [];
  CORPUS.forEach((doc, docIdx) => {
    const words = doc.split(/\s+/);
    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + safeSize);
      if (slice.length < 4) continue; // drop tiny trailing fragments
      chunks.push({ id: `${docIdx}-${i}`, text: slice.join(' ') });
      if (i + safeSize >= words.length) break;
    }
  });
  return chunks;
}

export function bagOfWords(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  tokenizeRag(text).forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  return counts;
}

export interface CosineDetail {
  score: number;
  dot: number;
  normA: number;
  normB: number;
  sharedTerms: string[];
}

export function cosineDetail(a: Map<string, number>, b: Map<string, number>): CosineDetail {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const sharedTerms: string[] = [];
  a.forEach((v, k) => {
    na += v * v;
    if (b.has(k)) {
      dot += v * (b.get(k) as number);
      sharedTerms.push(k);
    }
  });
  b.forEach((v) => {
    nb += v * v;
  });
  const normA = Math.sqrt(na);
  const normB = Math.sqrt(nb);
  const score = normA === 0 || normB === 0 ? 0 : dot / (normA * normB);
  return { score, dot, normA, normB, sharedTerms };
}

function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  return cosineDetail(a, b).score;
}

/** Dense-retrieval stand-in: rank chunks by bag-of-words cosine similarity to the query. */
export function retrieve(query: string, chunks: Chunk[], topK: number): ScoredChunk[] {
  const qVec = bagOfWords(query);
  const scored: ScoredChunk[] = chunks.map((c) => ({ ...c, score: cosineSim(qVec, bagOfWords(c.text)) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function computePhraseBonus(query: string, text: string): number {
  const qWords = tokenizeRag(query);
  const lower = text.toLowerCase();
  let phraseBonus = 0;
  for (let n = Math.min(3, qWords.length); n >= 2; n--) {
    for (let i = 0; i + n <= qWords.length; i++) {
      if (lower.includes(qWords.slice(i, i + n).join(' '))) phraseBonus += 0.15;
    }
  }
  return phraseBonus;
}

/**
 * Reranker stand-in: a cross-encoder-style pass that also rewards exact
 * substring/phrase overlap (not just bag-of-words), which is exactly the
 * kind of precision a real cross-encoder adds over a bi-encoder's fast but
 * coarser first pass.
 */
export function rerank(query: string, results: ScoredChunk[]): RerankedChunk[] {
  return results
    .map((r) => {
      const phraseBonus = computePhraseBonus(query, r.text);
      return { ...r, rerankScore: r.score + phraseBonus };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

export type RagStageId = 'chunk' | 'embed' | 'retrieve' | 'rerank' | 'answer';

export interface RagRankedDetail {
  id: string;
  docIdx: number;
  topic: string;
  text: string;
  baseScore: number;
  phraseBonus: number;
  finalScore: number;
  dot: number;
  queryNorm: number;
  chunkNorm: number;
  sharedTerms: string[];
  retrievalRank: number;
  finalRank: number;
}

export interface RagStageFrame {
  id: RagStageId;
  title: string;
  activeNodeIds: string[];
  summary: string;
}

export interface RagSimulationResult {
  query: string;
  queryTerms: string[];
  chunkSize: number;
  overlap: number;
  topK: number;
  rerankerOn: boolean;
  chunks: Chunk[];
  ranked: RagRankedDetail[];
  matchedTerms: string[];
  missedTerms: string[];
  topTopic: string;
  grounded: boolean;
  stages: RagStageFrame[];
}

export function simulateRagPipeline(params: {
  query: string;
  chunkSize: number;
  overlap: number;
  topK: number;
  rerankerOn: boolean;
}): RagSimulationResult {
  const chunkSize = Math.max(4, Math.min(40, Math.round(params.chunkSize)));
  const overlap = Math.max(0, Math.min(chunkSize - 1, Math.round(params.overlap)));
  const topK = Math.max(1, Math.min(5, Math.round(params.topK)));
  const chunks = chunkCorpus(chunkSize, overlap);
  const queryVec = bagOfWords(params.query);
  const queryTerms = Array.from(queryVec.keys());

  const retrieved = retrieve(params.query, chunks, topK);
  const retrievalRankById = new Map(retrieved.map((r, i) => [r.id, i + 1]));
  const ordered = params.rerankerOn ? rerank(params.query, retrieved) : retrieved;

  const ranked: RagRankedDetail[] = ordered.map((item, idx) => {
    const detail = cosineDetail(queryVec, bagOfWords(item.text));
    const phraseBonus = params.rerankerOn ? computePhraseBonus(params.query, item.text) : 0;
    const finalScore = 'rerankScore' in item ? (item as RerankedChunk).rerankScore : item.score;
    const docIdx = Number(item.id.split('-')[0]) || 0;
    return {
      id: item.id,
      docIdx,
      topic: CORPUS_TOPICS[docIdx] ?? `Doc ${docIdx + 1}`,
      text: item.text,
      baseScore: item.score,
      phraseBonus,
      finalScore,
      dot: detail.dot,
      queryNorm: detail.normA,
      chunkNorm: detail.normB,
      sharedTerms: detail.sharedTerms,
      retrievalRank: retrievalRankById.get(item.id) ?? idx + 1,
      finalRank: idx + 1,
    };
  });

  const foundSet = new Set(ranked.flatMap((r) => (r.baseScore > 0 ? r.sharedTerms : [])));
  const matchedTerms = queryTerms.filter((term) => foundSet.has(term));
  const missedTerms = queryTerms.filter((term) => !foundSet.has(term));
  const top = ranked[0];
  const grounded = Boolean(top && top.finalScore > 0.05);

  const stages: RagStageFrame[] = [
    {
      id: 'chunk',
      title: '1. Split documents into chunks',
      activeNodeIds: ['document', 'chunking'],
      summary: `Split 8 documents into ${chunks.length} chunks (${chunkSize} words per chunk, ${overlap}-word overlap). Smaller chunks make more fragments; overlap keeps boundary phrases intact.`,
    },
    {
      id: 'embed',
      title: '2. Turn text into searchable vectors',
      activeNodeIds: ['embeddings', 'vectorstore', 'query'],
      summary: `Converted ${chunks.length} chunks and your ${queryTerms.length}-keyword question (${queryTerms.slice(0, 5).join(', ') || 'none'}) into word-count vectors in the index.`,
    },
    {
      id: 'retrieve',
      title: '3. Fast cosine search (top-k)',
      activeNodeIds: ['vectorstore', 'query', 'retrieval'],
      summary: top
        ? `Scored all ${chunks.length} chunks and kept the top ${ranked.length}. Best cosine match is chunk #${top.id} (${top.topic}) at ${(top.baseScore * 100).toFixed(1)}%.`
        : 'Scored all chunks, but none returned.',
    },
    {
      id: 'rerank',
      title: params.rerankerOn ? '4. Rerank for exact phrases' : '4. Reranker bypassed (off)',
      activeNodeIds: ['reranker'],
      summary: params.rerankerOn && top
        ? `Checked exact 2–3 word phrase matches inside the top ${ranked.length} candidates: #1 is ${top.topic} (cosine ${(top.baseScore * 100).toFixed(1)}% + ${(top.phraseBonus * 100).toFixed(1)}% phrase bonus = ${(top.finalScore * 100).toFixed(1)}%).`
        : 'Reranker is OFF: candidates keep their raw cosine-similarity order without phrase bonuses.',
    },
    {
      id: 'answer',
      title: '5. Hand top chunks to the LLM',
      activeNodeIds: ['llm', 'answer'],
      summary: grounded && top
        ? `Sent ${ranked.length} chunk(s) covering ${matchedTerms.length}/${Math.max(1, queryTerms.length)} query keywords into the prompt; top evidence comes from ${top.topic}.`
        : 'Warning: top similarity is near 0%, so the LLM lacks matching evidence in this knowledge base and could guess.',
    },
  ];

  return {
    query: params.query,
    queryTerms,
    chunkSize,
    overlap,
    topK,
    rerankerOn: params.rerankerOn,
    chunks,
    ranked,
    matchedTerms,
    missedTerms,
    topTopic: top?.topic ?? 'None',
    grounded,
    stages,
  };
}
