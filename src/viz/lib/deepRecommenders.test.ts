import { describe, it, expect } from 'vitest';
import {
  ARCHITECTURE_PROFILES,
  TOY_CANDIDATE_DATA,
  computeTwoTowerScore,
  computeDlrmInteractions,
  computeSasrecAttentionStep,
} from './deepRecommenders';

describe('deepRecommenders engine', () => {
  it('has valid metadata profiles for all 4 key architectures', () => {
    const keys = ['twoTower', 'wideAndDeep', 'dlrm', 'sasrec'];
    for (const key of keys) {
      const profile = ARCHITECTURE_PROFILES[key];
      expect(profile).toBeDefined();
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.paper.length).toBeGreaterThan(0);
    }

    // Two-tower and SASRec can precompute item index for ANN
    expect(ARCHITECTURE_PROFILES.twoTower.canPrecomputeItemIndex).toBe(true);
    expect(ARCHITECTURE_PROFILES.sasrec.canPrecomputeItemIndex).toBe(true);
    // Wide & Deep and DLRM cannot precompute because of non-linear user-item crosses
    expect(ARCHITECTURE_PROFILES.wideAndDeep.canPrecomputeItemIndex).toBe(false);
    expect(ARCHITECTURE_PROFILES.dlrm.canPrecomputeItemIndex).toBe(false);
  });

  it('computes exact Two-Tower inner product', () => {
    // u = [0.6, 0.8, 0.1], v = [0.7, 0.5, 0.2]
    // dot = 0.6*0.7 + 0.8*0.5 + 0.1*0.2 = 0.42 + 0.40 + 0.02 = 0.84
    const score = computeTwoTowerScore(
      TOY_CANDIDATE_DATA.userVector,
      TOY_CANDIDATE_DATA.itemVector
    );
    expect(score).toBeCloseTo(0.84, 4);
  });

  it('computes DLRM pairwise dot products with correct combinatorics', () => {
    const bottomDense = [0.5, 0.5, 0.5];
    const embeddings = [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0],
    ];
    // Total vectors = 1 + 3 = 4 vectors
    // Number of unique pairs = 4 * 3 / 2 = 6 pairs
    const { pairwiseProducts, interactionDimension } = computeDlrmInteractions(
      bottomDense,
      embeddings
    );
    expect(interactionDimension).toBe(6);
    expect(pairwiseProducts.length).toBe(6);
    // Dense ⊙ Emb_1 = 0.5*1 + 0.5*0 + 0.5*0 = 0.5
    expect(pairwiseProducts[0].dot).toBeCloseTo(0.5, 4);
  });

  it('computes SASRec causal attention step', () => {
    const history = [
      [0.5, 0.5, 0.0], // step 0 (e.g. item 1)
      [0.0, 0.8, 0.6], // step 1 (e.g. item 3)
    ];
    const { attentionWeights, contextVector } = computeSasrecAttentionStep(history, 1);
    expect(attentionWeights.length).toBe(2);
    // Weights sum to 1
    const sumW = attentionWeights.reduce((s, w) => s + w, 0);
    expect(sumW).toBeCloseTo(1.0, 4);
    // Context vector has dimension 3
    expect(contextVector.length).toBe(3);
  });
});
