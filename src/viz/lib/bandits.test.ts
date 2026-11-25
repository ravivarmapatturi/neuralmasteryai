import { describe, expect, it } from 'vitest';
import {
  N_ARMS,
  OPTIMAL_PROB,
  simulateBanditComparison,
  simulateBandits,
  TRUE_PROBS,
} from './bandits';

describe('bandits', () => {
  it('preserves default 3-arm constants and exact cumulative regret per step', () => {
    expect(N_ARMS).toBe(3);
    expect(TRUE_PROBS).toEqual([0.3, 0.5, 0.7]);
    expect(OPTIMAL_PROB).toBe(0.7);

    const trace = simulateBandits(100, 42, 0.1);
    expect(trace.epsilonGreedy).toHaveLength(100);
    expect(trace.ucb1).toHaveLength(100);
    expect(trace.thompson).toHaveLength(100);

    // UCB1 always pulls arms 0, 1, 2 once each in rounds 0, 1, 2:
    // cumulative regret after 3 pulls = (0.7 - 0.3) + (0.7 - 0.5) + (0.7 - 0.7) = 0.6
    expect(trace.ucb1[0]).toBeCloseTo(0.4, 6);
    expect(trace.ucb1[1]).toBeCloseTo(0.6, 6);
    expect(trace.ucb1[2]).toBeCloseTo(0.6, 6);
  });

  it('shows UCB1 overtaking epsilon-greedy at long horizon and Thompson leading throughout', () => {
    const sim = simulateBanditComparison({ pulls: 4500, seed: 42, epsilon: 0.1 });
    const early = sim.snapshotsAt(200);
    const late = sim.snapshotsAt(4500);

    expect(early.ucbAheadOfEps).toBe(false);
    expect(late.ucbAheadOfEps).toBe(true);
    expect(late.thompson.regret).toBeLessThan(late.ucb1.regret);
    expect(late.thompson.regret).toBeLessThan(late.epsilonGreedy.regret);
  });

  it('reduces total regret when the top two arms are nearly tied (0.54 vs 0.55) because each mistake costs 0.01', () => {
    const clear = simulateBanditComparison({ pulls: 3000, seed: 7, trueProbs: [0.3, 0.5, 0.7] });
    const nearTie = simulateBanditComparison({ pulls: 3000, seed: 7, trueProbs: [0.3, 0.54, 0.55] });

    const clearLate = clear.snapshotsAt(3000);
    const tieLate = nearTie.snapshotsAt(3000);

    expect(tieLate.epsilonGreedy.regret).toBeLessThan(clearLate.epsilonGreedy.regret);
  });
});
