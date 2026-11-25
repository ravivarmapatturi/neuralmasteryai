import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NEGATIVE_SCORES,
  DEFAULT_POSITIVE_SCORES,
  buildThresholdCurve,
  evaluateThreshold,
  parseScoreList,
} from './costWeightedThreshold';

describe('cost-weighted threshold playground computation', () => {
  it('spot-checks the confusion counts and cost at threshold 0.50 by hand', () => {
    const result = evaluateThreshold(DEFAULT_POSITIVE_SCORES, DEFAULT_NEGATIVE_SCORES, 0.5, 5, 1);
    // Positives [0.9,0.8,0.65,0.4] => TP=3, FN=1.
    // Negatives [0.7,0.55,0.3,0.1] => FP=2, TN=2.
    // Cost = 1 missed*5 + 2 false alarms*1 = 7.
    expect(result).toMatchObject({
      truePositives: 3,
      falseNegatives: 1,
      falsePositives: 2,
      trueNegatives: 2,
      missedCaseCost: 5,
      falseAlarmCost: 2,
      totalCost: 7,
    });
  });

  it('moves the exact best threshold lower when misses become costly', () => {
    const equalCost = buildThresholdCurve(DEFAULT_POSITIVE_SCORES, DEFAULT_NEGATIVE_SCORES, 1, 1);
    const costlyMiss = buildThresholdCurve(DEFAULT_POSITIVE_SCORES, DEFAULT_NEGATIVE_SCORES, 5, 1);
    expect(equalCost.best.threshold).toBe(0.8);
    expect(equalCost.best.totalCost).toBe(2);
    expect(costlyMiss.best.threshold).toBe(0.4);
    expect(costlyMiss.best.totalCost).toBe(2);
  });

  it('parses, clamps, and falls back for editable score lists', () => {
    expect(parseScoreList('0.9, 1.4 -0.2 nope 0.3', [0.5])).toEqual([0.9, 1, 0, 0.3]);
    expect(parseScoreList('not scores', [0.5, 0.2])).toEqual([0.5, 0.2]);
  });
});
