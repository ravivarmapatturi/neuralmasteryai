import { describe, expect, it } from 'vitest';
import { confidenceAfterAttempts, simulateAgentControlFlow } from './agentControlFlow';

describe('agentControlFlow pure graph simulation', () => {
  it('hand-checks default confidence c_k = 1 - 0.55^k clearing tau=0.75 on attempt 3 with Human review', () => {
    expect(confidenceAfterAttempts(0, 0.55)).toBeCloseTo(0, 6);
    expect(confidenceAfterAttempts(1, 0.55)).toBeCloseTo(0.45, 6);
    expect(confidenceAfterAttempts(2, 0.55)).toBeCloseTo(0.6975, 6);
    expect(confidenceAfterAttempts(3, 0.55)).toBeCloseTo(0.833625, 6);

    const sim = simulateAgentControlFlow({
      goal: 'Verify billing discrepancy',
      threshold: 0.75,
      decayFactor: 0.55,
      maxAttempts: 4,
      requireApproval: true,
    });

    expect(sim.attemptsTaken).toBe(3);
    expect(sim.loopCount).toBe(2);
    expect(sim.clearedThreshold).toBe(true);
    expect(sim.cappedOut).toBe(false);
    expect(sim.finalConfidence).toBeCloseTo(0.833625, 6);
    expect(sim.steps.map((s) => s.node)).toEqual([
      'START',
      'PLAN',
      'ACT',
      'CHECK',
      'ACT',
      'CHECK',
      'ACT',
      'CHECK',
      'HUMAN',
      'END',
    ]);
  });

  it('skips HUMAN when requireApproval=false and stops safely at maxAttempts cap when threshold is unreachable', () => {
    const capped = simulateAgentControlFlow({
      goal: 'Retry flaky API',
      threshold: 0.85,
      decayFactor: 0.6,
      maxAttempts: 2,
      requireApproval: false,
    });
    // c1 = 0.40, c2 = 0.64 < 0.85 -> hits maxAttempts=2 guard
    expect(capped.attemptsTaken).toBe(2);
    expect(capped.loopCount).toBe(1);
    expect(capped.clearedThreshold).toBe(false);
    expect(capped.cappedOut).toBe(true);
    expect(capped.finalConfidence).toBeCloseTo(0.64, 6);
    expect(capped.steps.at(-1)?.node).toBe('END');
    expect(capped.steps.at(-1)?.budgetCapped).toBe(true);
    expect(capped.steps.some((s) => s.node === 'HUMAN')).toBe(false);
  });
});
