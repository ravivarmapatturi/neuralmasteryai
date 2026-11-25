import { describe, expect, it } from 'vitest';
import { SCORE_FACTORS, scoreAlgorithms, scoreThroughFactor } from './algorithmSelection';

describe('algorithm selector scoring', () => {
  it('matches a hand-scored small linear regression problem', () => {
    const scores = scoreAlgorithms({
      problem: 'regression',
      rows: 1_000,
      features: 20,
      pattern: 'simple',
      explanationNeed: 'high',
      computeBudget: 'tight',
    });
    const linear = scores.find((score) => score.id === 'linear')!;

    // 40 start + 12 small-data + 25 linear + 20 readable + 15 cheap + 0 feature pressure.
    expect(linear.total).toBe(112);
    expect(scores[0].id).toBe('linear');
  });

  it('accumulates exactly one displayed factor per playback step', () => {
    const score = scoreAlgorithms({
      problem: 'projection',
      rows: 100_000,
      features: 500,
      pattern: 'simple',
      explanationNeed: 'high',
      computeBudget: 'balanced',
    })[0];
    expect(score.contributions).toHaveLength(SCORE_FACTORS.length);
    expect(scoreThroughFactor(score, 0)).toBe(score.contributions[0].points);
    expect(scoreThroughFactor(score, SCORE_FACTORS.length - 1)).toBe(score.total);
  });

  it('lets a nonlinear generous-budget problem favor a nonlinear method', () => {
    const scores = scoreAlgorithms({
      problem: 'classification',
      rows: 100_000,
      features: 400,
      pattern: 'complex',
      explanationNeed: 'low',
      computeBudget: 'generous',
    });
    expect(['boost-clf', 'neural']).toContain(scores[0].id);
  });
});
