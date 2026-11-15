import { describe, expect, it } from 'vitest';
import {
  computeDcg,
  computeIdcg,
  computeLambdaRank,
  computePointwiseMse,
  computeRankNet,
} from './learningToRank';

describe('learningToRank objective calculations', () => {
  // Worked example numbers:
  // D1: label 3, score 1.2
  // D2: label 2, score 2.1
  // D3: label 0, score 0.4
  const scores = [1.2, 2.1, 0.4];
  const labels = [3, 2, 0];

  it('computes pointwise MSE across candidate documents', () => {
    // (1.2 - 3)^2 = (-1.8)^2 = 3.24
    // (2.1 - 2)^2 = (0.1)^2 = 0.01
    // (0.4 - 0)^2 = (0.4)^2 = 0.16
    // MSE = (3.24 + 0.01 + 0.16) / 3 = 3.41 / 3 = 1.13667
    const { errors, mse } = computePointwiseMse(scores, labels);
    expect(errors[0]).toBeCloseTo(3.24, 4);
    expect(errors[1]).toBeCloseTo(0.01, 4);
    expect(errors[2]).toBeCloseTo(0.16, 4);
    expect(mse).toBeCloseTo(1.13667, 4);
  });

  it('computes RankNet pairwise probabilities and gradients on inverted pair (D1, D2)', () => {
    const { pairs } = computeRankNet(scores, labels);
    // Pair (D1, D2): i=0, j=1 since label[0]=3 > label[1]=2
    const pair12 = pairs.find((p) => p.i === 0 && p.j === 1)!;
    expect(pair12).toBeDefined();

    // diff = 1.2 - 2.1 = -0.9
    expect(pair12.diff).toBeCloseTo(-0.9, 4);
    // prob = 1 / (1 + exp(0.9)) = 0.28905
    expect(pair12.prob).toBeCloseTo(0.2891, 3);
    // lambda = -(1 - prob) = -0.7109
    expect(pair12.lambda).toBeCloseTo(-0.7109, 3);
  });

  it('computes exact IDCG, DCG, and NDCG for current vs ideal order', () => {
    // Ideal: [3, 2, 0]
    // DCG = (2^3-1)/log2(2) + (2^2-1)/log2(3) + (2^0-1)/log2(4)
    // = 7/1 + 3/1.58496 + 0 = 7.0 + 1.89279 = 8.89279
    const idcg = computeIdcg(labels);
    expect(idcg).toBeCloseTo(8.8928, 3);

    // Current order: D2 (score 2.1) -> D1 (score 1.2) -> D3 (score 0.4)
    // Labels in current order: [2, 3, 0]
    // DCG = (2^2-1)/log2(2) + (2^3-1)/log2(3) + 0 = 3 + 7/1.58496 = 3 + 4.41651 = 7.41651
    const currentDcg = computeDcg([2, 3, 0]);
    expect(currentDcg).toBeCloseTo(7.4165, 3);

    const ndcg = currentDcg / idcg;
    expect(ndcg).toBeCloseTo(0.834, 3);
  });

  it('computes LambdaRank metric-scaled lambda on pair (D1, D2)', () => {
    const { pairs, ranking } = computeLambdaRank(scores, labels);
    // Current ranking order should be [1, 0, 2] (D2, D1, D3)
    expect(ranking).toEqual([1, 0, 2]);

    const pair12 = pairs.find((p) => p.i === 0 && p.j === 1)!;
    expect(pair12).toBeDefined();

    // Delta NDCG = |8.8928 - 7.4165| / 8.8928 = 1.4763 / 8.8928 = 0.1660
    expect(pair12.deltaNdcg).toBeCloseTo(0.166, 3);

    // Scaled lambda = -0.7109 * 0.1660 = -0.1180
    expect(pair12.scaledLambda).toBeCloseTo(-0.118, 3);
  });
});
