/**
 * Learning to Rank Objective Calculations:
 * Pointwise (MSE), Pairwise (RankNet), LambdaRank (Metric-scaled gradients),
 * and LambdaMART (Boosted decision trees on virtual gradients).
 */

export interface LtrDoc {
  id: string;
  title: string;
  label: number; // graded relevance, e.g. 3, 2, 0
  score: number; // predicted model score
  featureQueryMatch: number; // e.g. lexical overlap
  featureDocQuality: number; // e.g. PageRank / domain quality
}

export function computePointwiseMse(
  scores: number[],
  labels: number[]
): { errors: number[]; mse: number } {
  const errors = scores.map((s, idx) => Math.pow(s - labels[idx], 2));
  const mse = errors.reduce((acc, e) => acc + e, 0) / (errors.length || 1);
  return { errors, mse };
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface RankNetPair {
  i: number;
  j: number;
  diff: number;
  prob: number;
  loss: number;
  lambda: number; // gradient w.r.t s_i: -(1 - P_ij)
}

export function computeRankNet(
  scores: number[],
  labels: number[]
): { pairs: RankNetPair[]; lambdas: number[] } {
  const n = scores.length;
  const lambdas = new Array(n).fill(0);
  const pairs: RankNetPair[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (labels[i] > labels[j]) {
        // Doc i is more relevant than Doc j
        const diff = scores[i] - scores[j];
        const prob = sigmoid(diff);
        const loss = Math.log(1 + Math.exp(-diff));
        const lambda = -(1 - prob); // pushes s_i up (negative gradient of loss)

        pairs.push({ i, j, diff, prob, loss, lambda });
        lambdas[i] += lambda;
        lambdas[j] -= lambda;
      }
    }
  }

  return { pairs, lambdas };
}

export function computeDcg(labels: number[]): number {
  return labels.reduce((acc, label, idx) => {
    const gain = Math.pow(2, label) - 1;
    const discount = Math.log2(idx + 2); // idx 0 -> log2(2) = 1
    return acc + gain / discount;
  }, 0);
}

export function computeIdcg(labels: number[]): number {
  const sorted = [...labels].sort((a, b) => b - a);
  return computeDcg(sorted);
}

export interface LambdaRankPair extends RankNetPair {
  deltaNdcg: number;
  scaledLambda: number;
}

export function computeLambdaRank(
  scores: number[],
  labels: number[]
): {
  ranking: number[];
  currentDcg: number;
  idcg: number;
  currentNdcg: number;
  pairs: LambdaRankPair[];
  lambdas: number[];
} {
  const n = scores.length;
  // Get current ranking order (indices sorted descending by score)
  const ranking = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => scores[b] - scores[a]
  );

  const rankedLabels = ranking.map((idx) => labels[idx]);
  const currentDcg = computeDcg(rankedLabels);
  const idcg = computeIdcg(labels);
  const currentNdcg = idcg > 0 ? currentDcg / idcg : 1;

  const lambdas = new Array(n).fill(0);
  const pairs: LambdaRankPair[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (labels[i] > labels[j]) {
        const diff = scores[i] - scores[j];
        const prob = sigmoid(diff);
        const loss = Math.log(1 + Math.exp(-diff));
        const baseLambda = -(1 - prob);

        // Find positions of i and j in current ranking
        const posI = ranking.indexOf(i);
        const posJ = ranking.indexOf(j);

        // Compute swapped ranking DCG
        const swappedRanking = [...ranking];
        swappedRanking[posI] = j;
        swappedRanking[posJ] = i;
        const swappedLabels = swappedRanking.map((idx) => labels[idx]);
        const swappedDcg = computeDcg(swappedLabels);
        const swappedNdcg = idcg > 0 ? swappedDcg / idcg : 1;
        const deltaNdcg = Math.abs(swappedNdcg - currentNdcg);

        const scaledLambda = baseLambda * deltaNdcg;
        pairs.push({
          i,
          j,
          diff,
          prob,
          loss,
          lambda: baseLambda,
          deltaNdcg,
          scaledLambda,
        });

        lambdas[i] += scaledLambda;
        lambdas[j] -= scaledLambda;
      }
    }
  }

  return {
    ranking,
    currentDcg,
    idcg,
    currentNdcg,
    pairs,
    lambdas,
  };
}

export interface DecisionStump {
  splitFeature: 'featureQueryMatch' | 'featureDocQuality';
  threshold: number;
  leftValue: number;
  rightValue: number;
}

export function fitLambdaMartStump(
  docs: LtrDoc[],
  lambdas: number[]
): DecisionStump {
  // Simple stump on featureQueryMatch
  const threshold = 0.5;
  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;

  docs.forEach((doc, idx) => {
    const lam = lambdas[idx];
    if (doc.featureQueryMatch <= threshold) {
      leftSum += lam;
      leftCount++;
    } else {
      rightSum += lam;
      rightCount++;
    }
  });

  return {
    splitFeature: 'featureQueryMatch',
    threshold,
    leftValue: leftCount > 0 ? leftSum / leftCount : 0,
    rightValue: rightCount > 0 ? rightSum / rightCount : 0,
  };
}
