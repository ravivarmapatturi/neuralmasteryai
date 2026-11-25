import { describe, expect, it } from 'vitest';
import { buildAgentTrace, calculateModelDuration, calculateTokenCost } from './agentTrace';

describe('agent trace calculations', () => {
  it('computes token cost by hand from per-million prices', () => {
    // (100 input × $2 + 20 output × $4) / 1,000,000 = $0.00028.
    expect(calculateTokenCost(100, 20, 2, 4)).toBeCloseTo(0.00028, 10);
  });

  it('turns output tokens and speed into model duration', () => {
    // 20 tokens / 10 tokens/s = 2,000 ms, plus 120 ms fixed overhead.
    expect(calculateModelDuration(20, 10)).toBe(2120);
  });

  it('keeps the waterfall totals equal to the sum of its visible spans', () => {
    const trace = buildAgentTrace({
      task: 'Fix the login bug',
      planInputTokens: 100,
      planOutputTokens: 20,
      patchInputTokens: 200,
      patchOutputTokens: 30,
      tokensPerSecond: 10,
      toolLatencyMs: 100,
      verificationMs: 200,
      retries: 0,
      inputPricePerMillion: 2,
      outputPricePerMillion: 4,
    });

    // 2,120 plan + 100 search + 60 read + 3,120 patch + 200 verify.
    expect(trace.totalDurationMs).toBe(5600);
    expect(trace.totalTokens).toBe(350);
    expect(trace.totalCostUsd).toBeCloseTo(0.0008, 10);
    expect(trace.spans[0].durationMs).toBe(trace.totalDurationMs);
    expect(trace.spans.at(-1)?.endMs).toBe(trace.totalDurationMs);
  });
});
