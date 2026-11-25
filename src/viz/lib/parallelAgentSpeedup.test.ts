import { describe, expect, it } from 'vitest';
import {
  buildSpeedupCurve,
  parseTaskDurations,
  scheduleParallelTasks,
} from './parallelAgentSpeedup';

describe('parallelAgentSpeedup greedy list scheduler and Amdahl bounds', () => {
  it('computes hand-checked greedy bin-packing makespan and speedup on [4, 7, 3, 11, 5, 8, 6, 4]', () => {
    const durations = [4, 7, 3, 11, 5, 8, 6, 4];

    // Sum = 48s. With 2s serial overhead: sequential = 50s.
    const k1 = scheduleParallelTasks(durations, 1, 2);
    expect(k1.sequentialWorkSec).toBe(48);
    expect(k1.sequentialTotalSec).toBe(50);
    expect(k1.parallelTotalSec).toBe(50);
    expect(k1.speedup).toBeCloseTo(1, 10);

    // 2 slots: [4+3+11+6 = 24, 7+5+8+4 = 24] -> parallel work 24s, total 26s, speedup 50/26
    const k2 = scheduleParallelTasks(durations, 2, 2);
    expect(k2.parallelWorkMakespanSec).toBe(24);
    expect(k2.parallelTotalSec).toBe(26);
    expect(k2.speedup).toBeCloseTo(50 / 26, 8);

    // 4 slots: [4+8=12, 7+6=13, 3+5+4=12, 11] -> parallel work 13s, total 15s, speedup 50/15
    const k4 = scheduleParallelTasks(durations, 4, 2);
    expect(k4.parallelWorkMakespanSec).toBe(13);
    expect(k4.parallelTotalSec).toBe(15);
    expect(k4.speedup).toBeCloseTo(50 / 15, 8);

    // 8 slots: hits longest task floor 11s + 2s serial = 13s
    const k8 = scheduleParallelTasks(durations, 8, 2);
    expect(k8.parallelWorkMakespanSec).toBe(11);
    expect(k8.theoreticalFloorSec).toBe(13);
    expect(k8.stragglerLimited).toBe(true);
    expect(k8.speedup).toBeCloseTo(50 / 13, 8);
  });

  it('hits the straggler ceiling early when one 20s task dominates seven 2s tasks', () => {
    const durations = [2, 2, 20, 2, 2, 2, 2, 2]; // sum = 34s, max = 20s
    const k4 = scheduleParallelTasks(durations, 4, 2);
    const k8 = scheduleParallelTasks(durations, 8, 2);

    // By k=4, all other 2s tasks finish alongside the 20s task, so doubling slots to 8 gives zero gain
    expect(k4.parallelTotalSec).toBe(22);
    expect(k8.parallelTotalSec).toBe(22);
    expect(k4.speedup).toBeCloseTo(36 / 22, 8);
    expect(k8.speedup).toBeCloseTo(k4.speedup, 8);
  });

  it('parses custom task strings safely and builds monotonic curve up to ceiling', () => {
    expect(parseTaskDurations('10, 5; 2.5')).toEqual([10, 5, 2.5]);
    expect(parseTaskDurations('bad')).toEqual([4, 7, 3, 11, 5, 8, 6, 4]);
    const curve = buildSpeedupCurve([4, 7, 3, 11, 5, 8, 6, 4], 2, 8);
    expect(curve).toHaveLength(8);
    expect(curve[7].speedup).toBeLessThanOrEqual(curve[7].ceilingSpeedup + 1e-9);
  });
});
