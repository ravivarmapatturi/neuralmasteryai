import { describe, it, expect } from 'vitest';
import {
  TOY_FOUNDATIONS_MATRIX,
  getUserMean,
  userCosineSimilarity,
  userPearsonCorrelation,
  itemCosineSimilarity,
  predictUserCollaborative,
  toImplicitConfidence,
} from './recommendationFoundations';

describe('recommendationFoundations engine', () => {
  it('computes correct mean for observed ratings', () => {
    // Alice: [5, 4, 1, null] -> (5+4+1)/3 = 3.3333...
    const meanAlice = getUserMean(TOY_FOUNDATIONS_MATRIX.ratings[0]);
    expect(meanAlice).toBeCloseTo(3.3333, 3);

    // Diana: [null, 1, 4, 5] -> (1+4+5)/3 = 3.3333...
    const meanDiana = getUserMean(TOY_FOUNDATIONS_MATRIX.ratings[3]);
    expect(meanDiana).toBeCloseTo(3.3333, 3);
  });

  it('computes user cosine similarity on co-rated items', () => {
    // Alice [5, 4, 1, null] and Bob [4, 5, null, 2]
    // Co-rated items are item 0 and item 1:
    // dot = 5*4 + 4*5 = 40
    // normAlice = 5^2 + 4^2 = 41
    // normBob = 4^2 + 5^2 = 41
    // cosine = 40 / 41 = 0.9756
    const { similarity, coRatedCount } = userCosineSimilarity(
      TOY_FOUNDATIONS_MATRIX.ratings[0],
      TOY_FOUNDATIONS_MATRIX.ratings[1]
    );
    expect(coRatedCount).toBe(2);
    expect(similarity).toBeCloseTo(40 / 41, 4);
  });

  it('computes Pearson correlation on co-rated items', () => {
    // Alice and Charlie co-rated items 0, 1, 2
    // Alice: [5, 4, 1], Charlie: [1, 2, 5]
    // They are inversely correlated
    const { correlation, coRatedCount } = userPearsonCorrelation(
      TOY_FOUNDATIONS_MATRIX.ratings[0],
      TOY_FOUNDATIONS_MATRIX.ratings[2]
    );
    expect(coRatedCount).toBe(3);
    expect(correlation).toBeLessThan(-0.9);
  });

  it('computes item cosine similarity across mutual raters', () => {
    // Item 0 (Matrix Algebra) and Item 1 (Vector Search)
    // Co-rated by Alice (5, 4), Bob (4, 5), Charlie (1, 2)
    // dot = 5*4 + 4*5 + 1*2 = 20 + 20 + 2 = 42
    // norm0 = 25 + 16 + 1 = 42
    // norm1 = 16 + 25 + 4 = 45
    // cosine = 42 / sqrt(42 * 45) = 42 / sqrt(1890) = 42 / 43.474 = 0.96609
    const { similarity, coRatedCount } = itemCosineSimilarity(
      TOY_FOUNDATIONS_MATRIX.ratings,
      0,
      1
    );
    expect(coRatedCount).toBe(3);
    expect(similarity).toBeCloseTo(42 / Math.sqrt(42 * 45), 4);
  });

  it('predicts unobserved rating using collaborative filtering', () => {
    // Alice (user 0) predicting item 3 (Graph RAG)
    // Neighbors who rated item 3: Bob (user 1, rating 2), Charlie (user 2, rating 4)
    const { predicted, neighborWeights } = predictUserCollaborative(
      TOY_FOUNDATIONS_MATRIX.ratings,
      0,
      3
    );
    expect(neighborWeights.length).toBeGreaterThan(0);
    expect(predicted).toBeGreaterThan(1);
    expect(predicted).toBeLessThan(5);
  });

  it('constructs Hu-Koren-Volinsky implicit confidence matrix', () => {
    const { preferences, confidences } = toImplicitConfidence(
      TOY_FOUNDATIONS_MATRIX.ratings,
      2
    );
    // Alice item 0 is 5 -> p=1, c=1 + 2*5 = 11
    expect(preferences[0][0]).toBe(1);
    expect(confidences[0][0]).toBe(11);
    // Alice item 3 is null -> p=0, c=1
    expect(preferences[0][3]).toBe(0);
    expect(confidences[0][3]).toBe(1);
  });
});
