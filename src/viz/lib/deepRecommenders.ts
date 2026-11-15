/**
 * deepRecommenders.ts
 *
 * Mathematical engine comparing deep recommendation architectures:
 * 1. Two-Tower Retrieval (YouTube DNN / ScaNN ANN)
 * 2. Wide & Deep (Cheng et al. 2016)
 * 3. DLRM (Naumov et al. 2019)
 * 4. SASRec Sequential Self-Attention (Kang & McAuley 2018)
 *
 * Uses a unified toy candidate scoring example with reproducible values.
 */

export interface DeepArchitectureProfile {
  name: string;
  paper: string;
  primaryRole: 'Retrieval (Funnel Top)' | 'Scoring / Ranking (Funnel Bottom)';
  canPrecomputeItemIndex: boolean;
  canUseANN: boolean;
  crossFeatureCapacity: 'Linear Dot-Product Only' | 'Explicit Sparse Crosses + Deep MLP' | 'All-Pairs Dot Products + Top MLP' | 'Causal Multi-Head Self-Attention';
  servingLatencyEstimate: string;
  complexityPerCandidate: string;
  scoringMechanism: string;
}

export const ARCHITECTURE_PROFILES: Record<string, DeepArchitectureProfile> = {
  twoTower: {
    name: 'Two-Tower Retrieval',
    paper: 'Covington et al. (2016), Yi et al. (2019)',
    primaryRole: 'Retrieval (Funnel Top)',
    canPrecomputeItemIndex: true,
    canUseANN: true,
    crossFeatureCapacity: 'Linear Dot-Product Only',
    servingLatencyEstimate: '5 - 15 ms (ANN lookup over millions)',
    complexityPerCandidate: 'O(d) dot product per candidate in ANN',
    scoringMechanism: 's(u, v) = ⟨f_user(x_user), g_item(x_item)⟩',
  },
  wideAndDeep: {
    name: 'Wide & Deep',
    paper: 'Cheng et al. Google (2016)',
    primaryRole: 'Scoring / Ranking (Funnel Bottom)',
    canPrecomputeItemIndex: false,
    canUseANN: false,
    crossFeatureCapacity: 'Explicit Sparse Crosses + Deep MLP',
    servingLatencyEstimate: '20 - 40 ms (on 100-500 candidates)',
    complexityPerCandidate: 'O(Wide Crosses + Deep Layers)',
    scoringMechanism: 'P(y=1) = σ(w^T [x, ϕ(x)] + w_deep^T a^(L) + b)',
  },
  dlrm: {
    name: 'DLRM (Deep Learning Recommendation Model)',
    paper: 'Naumov et al. Meta (2019)',
    primaryRole: 'Scoring / Ranking (Funnel Bottom)',
    canPrecomputeItemIndex: false,
    canUseANN: false,
    crossFeatureCapacity: 'All-Pairs Dot Products + Top MLP',
    servingLatencyEstimate: '25 - 50 ms (on 100-500 candidates)',
    complexityPerCandidate: 'O(k(k-1)/2 dot products + Top MLP)',
    scoringMechanism: 'Concat(Bottom_MLP(dense), Pairwise_Dot_Products(E)) → Top_MLP',
  },
  sasrec: {
    name: 'SASRec (Self-Attentive Sequential)',
    paper: 'Kang & McAuley (2018)',
    primaryRole: 'Retrieval (Funnel Top)',
    canPrecomputeItemIndex: true,
    canUseANN: true,
    crossFeatureCapacity: 'Causal Multi-Head Self-Attention',
    servingLatencyEstimate: '10 - 25 ms (Transformer user state + ANN)',
    complexityPerCandidate: 'O(L^2 d + L d^2) user state + O(d) candidate dot',
    scoringMechanism: 's(S, i) = ⟨SASRec(S_1:t), e_item⟩',
  },
};

/** Toy shared candidate example vectors (dimension d=3) */
export const TOY_CANDIDATE_DATA = {
  userVector: [0.6, 0.8, 0.1], // Alice user tower embedding
  itemVector: [0.7, 0.5, 0.2], // Item 2 embedding
  denseFeatures: [0.83, 0.5],  // normalized hour (20:00 = 0.83), item duration (15m = 0.5)
  categoryEmbedding: [0.5, 0.8, 0.3], // "Deep Learning" category vector
};

/** Compute Two-Tower inner product */
export function computeTwoTowerScore(u: number[], v: number[]): number {
  return u.reduce((sum, val, idx) => sum + val * (v[idx] ?? 0), 0);
}

/** Compute DLRM explicit pairwise dot-product interactions */
export function computeDlrmInteractions(
  bottomDenseVector: number[],
  sparseEmbeddings: number[][]
): {
  pairwiseProducts: { pair: string; dot: number }[];
  interactionDimension: number;
} {
  const allVectors = [bottomDenseVector, ...sparseEmbeddings];
  const numVectors = allVectors.length;
  const pairwiseProducts: { pair: string; dot: number }[] = [];

  for (let i = 0; i < numVectors; i++) {
    for (let j = i + 1; j < numVectors; j++) {
      const dot = allVectors[i].reduce((s, val, idx) => s + val * allVectors[j][idx], 0);
      const nameI = i === 0 ? 'DenseBottom' : `Emb_${i}`;
      const nameJ = `Emb_${j}`;
      pairwiseProducts.push({ pair: `${nameI} ⊙ ${nameJ}`, dot });
    }
  }

  return {
    pairwiseProducts,
    interactionDimension: (numVectors * (numVectors - 1)) / 2,
  };
}

/** Compute simplified 1-head self-attention score for SASRec on history sequence */
export function computeSasrecAttentionStep(
  historyEmbeddings: number[][],
  queryPos: number = 1
): {
  attentionWeights: number[];
  contextVector: number[];
} {
  const d = historyEmbeddings[0].length;
  const sqrtD = Math.sqrt(d);
  const targetQ = historyEmbeddings[queryPos];

  // Dot product attention with causal mask (can only attend to <= queryPos)
  const rawScores: number[] = [];
  for (let t = 0; t <= queryPos; t++) {
    const k = historyEmbeddings[t];
    const dot = targetQ.reduce((s, val, i) => s + val * k[i], 0);
    rawScores.push(dot / sqrtD);
  }

  // Softmax
  const maxScore = Math.max(...rawScores);
  const expScores = rawScores.map((s) => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((s, v) => s + v, 0);
  const attentionWeights = expScores.map((v) => v / sumExp);

  // Context vector weighted sum
  const contextVector = new Array(d).fill(0);
  for (let t = 0; t <= queryPos; t++) {
    const w = attentionWeights[t];
    const v = historyEmbeddings[t];
    for (let i = 0; i < d; i++) {
      contextVector[i] += w * v[i];
    }
  }

  return { attentionWeights, contextVector };
}
