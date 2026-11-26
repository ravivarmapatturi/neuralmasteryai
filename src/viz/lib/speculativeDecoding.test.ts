import { describe, expect, it } from 'vitest';
import {
  analyzeSpeculativeDecoding,
  computeExpectedSpeedup,
  expectedTokensGeometric,
} from './speculativeDecoding';

describe('speculativeDecoding pure math', () => {
  it('matches hand-checked Learn page worked example (K=4, alpha=0.75, T_draft=3ms, T_target=30ms)', () => {
    const tokens = expectedTokensGeometric(0.75, 4);
    // 1 + 0.75 + 0.5625 + 0.421875 + 0.31640625 = 3.05078125
    expect(tokens).toBeCloseTo(3.05078125, 6);

    const res = computeExpectedSpeedup(0.75, 4, 3, 30);
    expect(res.stepLatencyMs).toBe(42);
    expect(res.baselineMs).toBeCloseTo(91.5234375, 5);
    expect(res.speedup).toBeCloseTo(2.179129, 4);
  });

  it('drops below 1.0x speedup when acceptance rate is too low for the draft horizon (K=5, alpha=0.20)', () => {
    const res = computeExpectedSpeedup(0.2, 5, 3, 30);
    // 1 + 0.2 + 0.04 + 0.008 + 0.0016 + 0.00032 = 1.24992; 1.24992*30 / 45 = 0.83328
    expect(res.expectedTokens).toBeCloseTo(1.24992, 6);
    expect(res.stepLatencyMs).toBe(45);
    expect(res.speedup).toBeCloseTo(0.83328, 4);
    expect(res.speedup).toBeLessThan(1);
  });

  it('produces K draft steps followed by 1 parallel verify step and halts acceptance at first rejection', () => {
    const high = analyzeSpeculativeDecoding({
      scenarioId: 'code',
      customDraftText: 'def forward ( self , x',
      draftHorizon: 4,
      acceptanceAlpha: 1.0,
      draftLatencyMs: 3,
      targetLatencyMs: 30,
      checkRoll: 0.5,
    });
    expect(high.frames).toHaveLength(5);
    expect(high.frames[3].elapsedMs).toBe(12);
    expect(high.frames[4].phase).toBe('verify');
    expect(high.frames[4].elapsedMs).toBe(42);
    expect(high.acceptedCount).toBe(4);
    expect(high.emittedTokens).toBe(5);

    const low = analyzeSpeculativeDecoding({
      scenarioId: 'reasoning',
      customDraftText: 'However , the gradient vanishes fast',
      draftHorizon: 4,
      acceptanceAlpha: 0.2,
      draftLatencyMs: 3,
      targetLatencyMs: 30,
      checkRoll: 0.85,
    });
    expect(low.rejectedIndex).not.toBeNull();
    expect(low.emittedTokens).toBe(low.acceptedCount + 1);
    const rejected = low.tokens.filter((t) => t.status === 'rejected');
    expect(rejected).toHaveLength(1);
    for (let i = (low.rejectedIndex ?? 0) + 1; i < low.tokens.length; i++) {
      expect(low.tokens[i].status).toBe('discarded');
    }
  });
});
