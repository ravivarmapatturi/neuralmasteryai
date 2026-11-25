export interface ThresholdMetrics {
  threshold: number;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  trueNegatives: number;
  missedCaseCost: number;
  falseAlarmCost: number;
  totalCost: number;
}

export interface ThresholdCurve {
  points: ThresholdMetrics[];
  best: ThresholdMetrics;
}

export const DEFAULT_POSITIVE_SCORES = [0.9, 0.8, 0.65, 0.4] as const;
export const DEFAULT_NEGATIVE_SCORES = [0.7, 0.55, 0.3, 0.1] as const;

export function parseScoreList(input: string, fallback: readonly number[], maxItems = 12): number[] {
  const values = input
    .split(/[\s,;]+/u)
    .map(Number)
    .filter(Number.isFinite)
    .map((value) => Math.max(0, Math.min(1, value)))
    .slice(0, maxItems);
  return values.length > 0 ? values : [...fallback];
}

export function evaluateThreshold(
  positiveScores: readonly number[],
  negativeScores: readonly number[],
  threshold: number,
  missedCaseCost: number,
  falseAlarmCost: number,
): ThresholdMetrics {
  const t = Number.isFinite(threshold) ? threshold : 0.5;
  const missCost = Math.max(0, Number.isFinite(missedCaseCost) ? missedCaseCost : 0);
  const alarmCost = Math.max(0, Number.isFinite(falseAlarmCost) ? falseAlarmCost : 0);
  const truePositives = positiveScores.filter((score) => score >= t).length;
  const falseNegatives = positiveScores.length - truePositives;
  const falsePositives = negativeScores.filter((score) => score >= t).length;
  const trueNegatives = negativeScores.length - falsePositives;

  return {
    threshold: t,
    truePositives,
    falseNegatives,
    falsePositives,
    trueNegatives,
    missedCaseCost: falseNegatives * missCost,
    falseAlarmCost: falsePositives * alarmCost,
    totalCost: falseNegatives * missCost + falsePositives * alarmCost,
  };
}

export function buildThresholdCurve(
  positiveScores: readonly number[],
  negativeScores: readonly number[],
  missedCaseCost: number,
  falseAlarmCost: number,
): ThresholdCurve {
  const thresholds = Array.from(new Set([
    0,
    ...positiveScores,
    ...negativeScores,
    1.01,
  ])).sort((a, b) => a - b);
  const points = thresholds.map((threshold) => evaluateThreshold(
    positiveScores,
    negativeScores,
    threshold,
    missedCaseCost,
    falseAlarmCost,
  ));
  const best = points.reduce((winner, point) => (
    point.totalCost < winner.totalCost
    || (point.totalCost === winner.totalCost && point.threshold > winner.threshold)
      ? point
      : winner
  ));
  return { points, best };
}

export function explainThresholdStep(metrics: ThresholdMetrics, positiveCount: number, negativeCount: number): string {
  return `At threshold ${metrics.threshold.toFixed(2)}, ${metrics.truePositives}/${positiveCount} real positives are caught and ${metrics.falsePositives}/${negativeCount} real negatives raise false alarms, so total cost is ${metrics.missedCaseCost.toFixed(0)} + ${metrics.falseAlarmCost.toFixed(0)} = ${metrics.totalCost.toFixed(0)}.`;
}
