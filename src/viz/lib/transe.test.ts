import { describe, expect, it } from 'vitest';
import {
  addVec2,
  buildTransETrainingTrace,
  distanceVec2,
  marginRankingLoss,
  scoreTransECandidates,
  TRANSE_SCENARIOS,
} from './transe';

describe('transe pure vector arithmetic and margin ranking loss', () => {
  it('computes hand-checked h + r vector sum, L2/L1 distances, and hinge margin loss', () => {
    const h: readonly [number, number] = [0.4, 0.5];
    const r: readonly [number, number] = [1.3, 0.35];
    const predicted = addVec2(h, r);
    expect(predicted[0]).toBeCloseTo(1.7, 10);
    expect(predicted[1]).toBeCloseTo(0.85, 10);

    // Candidate at [2.0, 1.25]: dx = -0.3, dy = -0.4 -> L2 = 0.5, L1 = 0.7
    const tPos: readonly [number, number] = [2.0, 1.25];
    expect(distanceVec2(predicted, tPos, 'l2')).toBeCloseTo(0.5, 10);
    expect(distanceVec2(predicted, tPos, 'l1')).toBeCloseTo(0.7, 10);

    // With wrong candidate at dNeg = 0.8 and margin gamma = 0.6: L = max(0, 0.6 + 0.5 - 0.8) = 0.3
    expect(marginRankingLoss(0.5, 0.8, 0.6)).toBeCloseTo(0.3, 10);
    // Once dNeg >= 0.5 + 0.6 = 1.1: L = 0
    expect(marginRankingLoss(0.5, 1.2, 0.6)).toBe(0);
  });

  it('trains Curie born_in Warsaw from wrong rank at step 0 to rank #1 and zero margin loss', () => {
    const scenario = TRANSE_SCENARIOS[0];
    const frames = buildTransETrainingTrace(
      scenario,
      scenario.subjectVec,
      scenario.relationVec,
      'l2',
      0.5,
      6,
    );
    const predicted = addVec2(scenario.subjectVec, scenario.relationVec);

    const startRanked = scoreTransECandidates(predicted, frames[0].candidates, 'l2');
    const endRanked = scoreTransECandidates(predicted, frames[frames.length - 1].candidates, 'l2');

    // Initially Paris is closer than Warsaw; after training Warsaw wins #1
    expect(startRanked[0].id).toBe('paris');
    expect(endRanked[0].id).toBe('warsaw');
    expect(endRanked[0].distance).toBeLessThan(startRanked.find((c) => c.id === 'warsaw')!.distance);
  });

  it('collapses both true tails toward each other in the 1-to-many scenario', () => {
    const oneToMany = TRANSE_SCENARIOS[2];
    const frames = buildTransETrainingTrace(
      oneToMany,
      oneToMany.subjectVec,
      oneToMany.relationVec,
      'l2',
      0.5,
      6,
    );

    const p0 = frames[0].candidates.find((c) => c.id === 'physics')!.vec;
    const c0 = frames[0].candidates.find((c) => c.id === 'chemistry')!.vec;
    const pEnd = frames[frames.length - 1].candidates.find((c) => c.id === 'physics')!.vec;
    const cEnd = frames[frames.length - 1].candidates.find((c) => c.id === 'chemistry')!.vec;

    const gapStart = distanceVec2(p0, c0, 'l2');
    const gapEnd = distanceVec2(pEnd, cEnd, 'l2');
    expect(gapEnd).toBeLessThan(gapStart * 0.25);
  });
});
