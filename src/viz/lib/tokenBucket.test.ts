import { describe, expect, it } from 'vitest';
import { simulateTokenBucket } from './tokenBucket';

describe('tokenBucket simulation', () => {
  it('matches the lesson worked example: C=5, r=2/s, 7 burst, wait 0.5s, 1 next', () => {
    const sim = simulateTokenBucket({
      capacity: 5,
      refillRate: 2,
      burstCount: 7,
      waitSeconds: 0.5,
      followUpCount: 1,
    });

    expect(sim.stages[0].tokensAfter).toBe(5);
    // 7 arrivals at t=0 -> 5 accepted, 2 rejected, 0 tokens left
    expect(sim.stages[1].totalAccepted).toBe(5);
    expect(sim.stages[1].totalRejected).toBe(2);
    expect(sim.stages[1].tokensAfter).toBe(0);

    // Wait 0.5s at 2/s -> 1 token refilled
    expect(sim.stages[2].refilledTokens).toBeCloseTo(1, 6);
    expect(sim.stages[2].tokensAfter).toBeCloseTo(1, 6);

    // Next request at t=0.5s -> accepted 6, rejected 2, tokens 0
    expect(sim.stages[3].totalAccepted).toBe(6);
    expect(sim.stages[3].totalRejected).toBe(2);
    expect(sim.stages[3].tokensAfter).toBeCloseTo(0, 6);
  });

  it('rejects follow-up when fractional refill is below 1 whole token (r=1/s, wait=0.5s)', () => {
    const sim = simulateTokenBucket({
      capacity: 5,
      refillRate: 1,
      burstCount: 7,
      waitSeconds: 0.5,
      followUpCount: 1,
    });

    expect(sim.stages[2].tokensAfter).toBeCloseTo(0.5, 6);
    expect(sim.stages[3].acceptedHere).toBe(0);
    expect(sim.stages[3].rejectedHere).toBe(1);
    expect(sim.stages[3].tokensAfter).toBeCloseTo(0.5, 6);
  });

  it('caps refill at capacity C during long idle periods', () => {
    const sim = simulateTokenBucket({
      capacity: 4,
      refillRate: 3,
      burstCount: 2,
      waitSeconds: 3,
      followUpCount: 2,
    });
    // Remaining after burst = 2; 3s * 3/s = +9 -> capped at 4
    expect(sim.stages[2].tokensAfter).toBe(4);
    expect(sim.stages[3].tokensAfter).toBe(2);
    expect(sim.maxBurstInWindow).toBe(4 + 9);
  });
});
