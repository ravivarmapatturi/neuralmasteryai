import { describe, expect, it } from 'vitest';
import { analyzePositionBias } from './judgePositionBias';
import { RESPONSE_A_QUALITY, RESPONSE_B_QUALITY } from './llmEval';

describe('judgePositionBias calculation', () => {
  it('flips verdict between AB and BA on default 7.2 vs 7.0 with +0.50 bias', () => {
    const res = analyzePositionBias({
      qualityA: RESPONSE_A_QUALITY,
      qualityB: RESPONSE_B_QUALITY,
      bias: 0.5,
    });

    expect(res.trueWinner).toBe('A');
    expect(res.passAB.scoreA).toBeCloseTo(7.7, 4);
    expect(res.passAB.scoreB).toBeCloseTo(7.0, 4);
    expect(res.passAB.winner).toBe('A');

    expect(res.passBA.scoreA).toBeCloseTo(7.2, 4);
    expect(res.passBA.scoreB).toBeCloseTo(7.5, 4);
    expect(res.passBA.winner).toBe('B');

    expect(res.verdictFlips).toBe(true);
    expect(res.consistentVerdict).toBe('Tie');
    // Averaging AB and BA cancels +0.25 from both sides -> recovers exact 0.20 gap
    expect(res.avgScoreA).toBeCloseTo(7.45, 4);
    expect(res.avgScoreB).toBeCloseTo(7.25, 4);
    expect(res.swappedGap).toBeCloseTo(0.2, 4);
  });

  it('keeps verdict consistent when true quality gap exceeds bias', () => {
    const res = analyzePositionBias({
      qualityA: 8.5,
      qualityB: 6.5,
      bias: 0.5,
    });

    expect(res.passAB.winner).toBe('A');
    expect(res.passBA.winner).toBe('A');
    expect(res.verdictFlips).toBe(false);
    expect(res.consistentVerdict).toBe('A');
    expect(res.swappedGap).toBeCloseTo(2.0, 4);
  });

  it('handles zero bias without flips', () => {
    const res = analyzePositionBias({ qualityA: 7.2, qualityB: 7.0, bias: 0 });
    expect(res.verdictFlips).toBe(false);
    expect(res.passAB.scoreA).toBeCloseTo(7.2, 4);
    expect(res.passBA.scoreB).toBeCloseTo(7.0, 4);
    expect(res.consistentVerdict).toBe('A');
  });
});
