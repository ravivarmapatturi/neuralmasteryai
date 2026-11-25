import { describe, expect, it } from 'vitest';
import { buildPipelineSchedule } from './pipelineBubble';

describe('pipeline bubble playground computation', () => {
  it('matches the hand-counted diagonal schedule for four stages and four micro-batches', () => {
    const schedule = buildPipelineSchedule({
      stageCount: 4,
      microBatchCount: 4,
      slowStageIndex: 0,
      slowStageTicks: 1,
    });

    // Uniform pipeline: makespan = micro-batches + stages - 1 = 7.
    // Busy cells = 4*4 = 16; all stage-time cells = 4*7 = 28; idle = 12.
    expect(schedule.makespan).toBe(7);
    expect(schedule.busyStageTicks).toBe(16);
    expect(schedule.idleStageTicks).toBe(12);
    expect(schedule.utilization).toBeCloseTo(16 / 28, 12);
    expect(schedule.bubbleFraction).toBeCloseTo(12 / 28, 12);
    expect(schedule.throughput).toBeCloseTo(4 / 7, 12);
  });

  it('propagates a slow middle stage through the real dependency schedule', () => {
    const schedule = buildPipelineSchedule({
      stageCount: 3,
      microBatchCount: 2,
      slowStageIndex: 1,
      slowStageTicks: 2,
    });
    expect(schedule.stageDurations).toEqual([1, 2, 1]);
    expect(schedule.makespan).toBe(6);
    expect(schedule.busyStageTicks).toBe(8);
    expect(schedule.tasks.find((task) => task.stageIndex === 2 && task.microBatchIndex === 1)).toMatchObject({ start: 5, end: 6 });
  });

  it('clamps unsafe counts to the supported teaching grid', () => {
    const schedule = buildPipelineSchedule({ stageCount: 99, microBatchCount: 0, slowStageIndex: 40, slowStageTicks: 20 });
    expect(schedule.stageDurations).toHaveLength(8);
    expect(schedule.tasks).toHaveLength(8);
    expect(Math.max(...schedule.stageDurations)).toBe(4);
  });
});
