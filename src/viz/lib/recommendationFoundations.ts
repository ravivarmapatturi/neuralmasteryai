/**
 * recommendationFoundations.ts
 *
 * Pedagogical mathematical engine for Collaborative Filtering and
 * candidate generation heuristics. Uses a hand-checkable 4x4 user-item
 * matrix with exact, reproducible calculations.
 */

export interface UserItemMatrix {
  users: string[];
  items: string[];
  ratings: (number | null)[][];
}

export const TOY_FOUNDATIONS_MATRIX: UserItemMatrix = {
  users: ['Alice', 'Bob', 'Charlie', 'Diana'],
  items: ['Matrix Algebra', 'Vector Search', 'Two-Tower Nets', 'Graph RAG'],
  ratings: [
    [5, 4, 1, null], // Alice: likes fundamentals, dislikes deep nets, unobserved Graph RAG
    [4, 5, null, 2], // Bob: likes fundamentals, unobserved Two-Tower Nets, rated Graph RAG 2
    [1, 2, 5, 4],    // Charlie: likes deep nets and graph systems, dislikes fundamentals
    [null, 1, 4, 5], // Diana: unobserved Matrix Algebra, likes deep nets and graph systems
  ],
};

/** Compute user mean rating across observed items only. */
export function getUserMean(ratings: (number | null)[]): number {
  const observed = ratings.filter((r): r is number => r !== null);
  if (observed.length === 0) return 0;
  return observed.reduce((sum, v) => sum + v, 0) / observed.length;
}

/** Compute user-user cosine similarity on co-rated items. */
export function userCosineSimilarity(
  ratingsA: (number | null)[],
  ratingsB: (number | null)[]
): { similarity: number; coRatedCount: number } {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  let coRatedCount = 0;

  for (let i = 0; i < ratingsA.length; i++) {
    const a = ratingsA[i];
    const b = ratingsB[i];
    if (a !== null && b !== null) {
      dot += a * b;
      normA += a * a;
      normB += b * b;
      coRatedCount++;
    }
  }

  if (coRatedCount === 0 || normA === 0 || normB === 0) {
    return { similarity: 0, coRatedCount: 0 };
  }

  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return { similarity, coRatedCount };
}

/** Compute user-user Pearson correlation coefficient on co-rated items. */
export function userPearsonCorrelation(
  ratingsA: (number | null)[],
  ratingsB: (number | null)[]
): { correlation: number; coRatedCount: number } {
  const meanA = getUserMean(ratingsA);
  const meanB = getUserMean(ratingsB);

  let num = 0;
  let denA = 0;
  let denB = 0;
  let coRatedCount = 0;

  for (let i = 0; i < ratingsA.length; i++) {
    const a = ratingsA[i];
    const b = ratingsB[i];
    if (a !== null && b !== null) {
      const diffA = a - meanA;
      const diffB = b - meanB;
      num += diffA * diffB;
      denA += diffA * diffA;
      denB += diffB * diffB;
      coRatedCount++;
    }
  }

  if (coRatedCount === 0 || denA === 0 || denB === 0) {
    return { correlation: 0, coRatedCount };
  }

  return { correlation: num / (Math.sqrt(denA) * Math.sqrt(denB)), coRatedCount };
}

/** Item-item cosine similarity on users who rated both items. */
export function itemCosineSimilarity(
  matrix: (number | null)[][],
  itemI: number,
  itemJ: number
): { similarity: number; coRatedCount: number } {
  let dot = 0;
  let normI = 0;
  let normJ = 0;
  let coRatedCount = 0;

  for (let u = 0; u < matrix.length; u++) {
    const rI = matrix[u][itemI];
    const rJ = matrix[u][itemJ];
    if (rI !== null && rJ !== null) {
      dot += rI * rJ;
      normI += rI * rI;
      normJ += rJ * rJ;
      coRatedCount++;
    }
  }

  if (coRatedCount === 0 || normI === 0 || normJ === 0) {
    return { similarity: 0, coRatedCount: 0 };
  }

  return { similarity: dot / (Math.sqrt(normI) * Math.sqrt(normJ)), coRatedCount };
}

/**
 * Predict an unobserved entry r_hat(u, i) using user-based collaborative filtering:
 * r_hat(u, i) = mean(u) + sum_{v != u, r_vi != null} sim(u, v)*(r_vi - mean(v)) / sum |sim(u, v)|
 */
export function predictUserCollaborative(
  matrix: (number | null)[][],
  targetUser: number,
  targetItem: number
): { predicted: number; neighborWeights: { user: number; sim: number; rating: number }[] } {
  const userRatings = matrix[targetUser];
  const userMean = getUserMean(userRatings);
  const neighborWeights: { user: number; sim: number; rating: number }[] = [];

  let weightedSum = 0;
  let simSum = 0;

  for (let v = 0; v < matrix.length; v++) {
    if (v === targetUser) continue;
    const neighborRating = matrix[v][targetItem];
    if (neighborRating === null) continue;

    const { similarity } = userCosineSimilarity(userRatings, matrix[v]);
    if (similarity > 0) {
      const neighborMean = getUserMean(matrix[v]);
      weightedSum += similarity * (neighborRating - neighborMean);
      simSum += similarity;
      neighborWeights.push({ user: v, sim: similarity, rating: neighborRating });
    }
  }

  const predicted = simSum > 0 ? userMean + weightedSum / simSum : userMean;
  return { predicted, neighborWeights };
}

/**
 * Convert explicit matrix to Hu-Koren-Volinsky implicit confidence matrix:
 * p_ui = 1 if r_ui > 0 else 0
 * c_ui = 1 + alpha * r_ui (with alpha=1 default)
 */
export function toImplicitConfidence(
  ratings: (number | null)[][],
  alpha: number = 1
): { preferences: number[][]; confidences: number[][] } {
  const preferences: number[][] = [];
  const confidences: number[][] = [];

  for (let u = 0; u < ratings.length; u++) {
    const pRow: number[] = [];
    const cRow: number[] = [];
    for (let i = 0; i < ratings[u].length; i++) {
      const r = ratings[u][i];
      if (r !== null && r > 0) {
        pRow.push(1);
        cRow.push(1 + alpha * r);
      } else {
        pRow.push(0);
        cRow.push(1); // unobserved confidence is baseline 1
      }
    }
    preferences.push(pRow);
    confidences.push(cRow);
  }

  return { preferences, confidences };
}
