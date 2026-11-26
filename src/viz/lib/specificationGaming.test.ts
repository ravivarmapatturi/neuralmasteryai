import { describe, expect, it } from 'vitest';
import { buildRewardCheckpoints, buildRewardTrace, firstProxyLead, strategyTotal } from './specificationGaming';

const finish = { name: 'Finish the race', interval: 20, reward: 10 };
const loop = { name: 'Loop over the bonus', interval: 3, reward: 1.8 };

describe('specification gaming reward trace', () => {
  it('matches the hand-checked totals at 20 and 80 steps', () => {
    expect(strategyTotal(20, finish)).toBe(10);
    expect(strategyTotal(20, loop)).toBeCloseTo(10.8, 12);
    expect(strategyTotal(80, finish)).toBe(40);
    expect(strategyTotal(80, loop)).toBeCloseTo(46.8, 12);
  });

  it('finds the first proxy lead and includes both endpoints in playback', () => {
    const trace = buildRewardTrace(40, finish, loop);
    expect(firstProxyLead(trace)).toBe(3);
    const checkpoints = buildRewardCheckpoints(40, 9);
    expect(checkpoints[0]).toBe(0);
    expect(checkpoints.at(-1)).toBe(40);
  });
});
