import { describe, expect, it } from 'vitest';
import { analyzeDeploymentStages, detectionProbability } from './stagedDeployment';

describe('staged deployment', () => {
  it('matches hand-checked Bernoulli detection odds', () => {
    const p = 1 / 2000;
    expect(detectionProbability(p, 50)).toBeCloseTo(1 - 0.9995 ** 50, 12);
    expect(detectionProbability(p, 2000)).toBeCloseTo(0.6322, 4);
  });

  it('accumulates audience and expected issues across stages', () => {
    const stages = analyzeDeploymentStages(0.001, [
      { name: 'Internal', interactions: 100 },
      { name: 'Pilot', interactions: 900 },
    ]);
    expect(stages[1].cumulativeInteractions).toBe(1000);
    expect(stages[1].expectedIssuesCumulative).toBeCloseTo(1, 12);
    expect(stages[1].cumulativeProbability).toBeCloseTo(1 - 0.999 ** 1000, 12);
  });
});
