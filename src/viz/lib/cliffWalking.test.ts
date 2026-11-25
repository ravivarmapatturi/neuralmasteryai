import { describe, expect, it } from 'vitest';
import {
  CLIFF_GOAL_POS,
  CLIFF_START_POS,
  computeTdStep,
  isCliffCell,
  simulateCliffTraining,
  stepCliffEnv,
} from './cliffWalking';

describe('cliffWalking pure math and simulation', () => {
  it('enforces exact 4x12 grid rules including -100 cliff reset and -1 goal reward', () => {
    expect(isCliffCell(3, 0)).toBe(false);
    expect(isCliffCell(3, 1)).toBe(true);
    expect(isCliffCell(3, 10)).toBe(true);
    expect(isCliffCell(3, 11)).toBe(false);

    // Stepping right from Start (3, 0) enters the cliff (3, 1) -> -100 and resets to Start
    const fell = stepCliffEnv(CLIFF_START_POS[0], CLIFF_START_POS[1], 1);
    expect(fell).toEqual({ r: 3, c: 0, reward: -100, done: false, fell: true });

    // Stepping down into goal (3, 11) from (2, 11) finishes with -1
    const goal = stepCliffEnv(2, 11, 2);
    expect(goal).toEqual({ r: CLIFF_GOAL_POS[0], c: CLIFF_GOAL_POS[1], reward: -1, done: true, fell: false });
  });

  it('computes hand-checked Q-learning vs. SARSA TD updates on identical next-state values', () => {
    // At square s just above the cliff, suppose next state s' has values [Up:-4, Right:-3, Down:-100, Left:-5]
    // Suppose agent actually explored Down (-100) next.
    const nextRow = [-4, -3, -100, -5];
    const qUpdate = computeTdStep('qlearning', -5, -1, 1.0, nextRow, 2, 0.5);
    const sUpdate = computeTdStep('sarsa', -5, -1, 1.0, nextRow, 2, 0.5);

    // Q-learning uses max(nextRow) = -3 -> target = -1 + (-3) = -4 -> qAfter = -5 + 0.5*(-4 - (-5)) = -4.5
    expect(qUpdate.nextValueUsed).toBe(-3);
    expect(qUpdate.tdTarget).toBe(-4);
    expect(qUpdate.qAfter).toBeCloseTo(-4.5, 10);

    // SARSA uses actualNextAction Down = -100 -> target = -1 + (-100) = -101 -> qAfter = -5 + 0.5*(-101 - (-5)) = -53
    expect(sUpdate.nextValueUsed).toBe(-100);
    expect(sUpdate.tdTarget).toBe(-101);
    expect(sUpdate.qAfter).toBeCloseTo(-53, 10);
  });

  it('learns the 13-step optimal cliff edge path for Q-learning and a longer safer path for SARSA at eps=0.1', () => {
    const sim = simulateCliffTraining({ episodes: 300, alpha: 0.5, epsilon: 0.1, seed: 11 });
    const final = sim.checkpoints[sim.checkpoints.length - 1];

    expect(final.qReachedGoal).toBe(true);
    expect(final.sReachedGoal).toBe(true);
    expect(final.qGreedyReward).toBe(-13);
    expect(final.qPath.length - 1).toBe(13);
    // SARSA takes a safer path strictly longer than 13 steps and achieves better online training return
    expect(final.sPath.length - 1).toBeGreaterThan(final.qPath.length - 1);
    expect(final.sTrainAvg).toBeGreaterThan(final.qTrainAvg);
    expect(final.sFallsTotal).toBeLessThan(final.qFallsTotal);
  });

  it('collapses SARSA down onto the 13-step optimal path when exploration epsilon = 0', () => {
    const sim = simulateCliffTraining({ episodes: 300, alpha: 0.5, epsilon: 0.0, seed: 11 });
    const final = sim.checkpoints[sim.checkpoints.length - 1];
    expect(final.qReachedGoal).toBe(true);
    expect(final.sReachedGoal).toBe(true);
    expect(final.qGreedyReward).toBe(-13);
    expect(final.sGreedyReward).toBe(-13);
    expect(final.sPath).toEqual(final.qPath);
  });
});
