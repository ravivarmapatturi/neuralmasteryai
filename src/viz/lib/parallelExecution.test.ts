import { describe, expect, it } from 'vitest';
import { compareExecutionModels, simulateParallelExecution } from './parallelExecution';

describe('parallel execution scheduler', () => {
  it('serializes CPU work across CPython threads', () => {
    const result = simulateParallelExecution({
      model: 'threads', taskCount: 4, workerCount: 4, cores: 4,
      cpuMs: 100, ioMs: 0, processStartupMs: 20,
    });
    expect(result.totalMs).toBe(400);
    expect(result.segments.map((segment) => segment.startMs)).toEqual([0, 100, 200, 300]);
  });

  it('runs four CPU tasks on four process cores after startup', () => {
    const result = simulateParallelExecution({
      model: 'processes', taskCount: 4, workerCount: 4, cores: 4,
      cpuMs: 100, ioMs: 0, processStartupMs: 20,
    });
    expect(result.totalMs).toBe(120);
  });

  it('overlaps thread waits while the GIL moves to the next task', () => {
    const result = compareExecutionModels({
      taskCount: 4, workerCount: 4, cores: 4,
      cpuMs: 10, ioMs: 90, processStartupMs: 40,
    });
    expect(result.threads.totalMs).toBe(130);
    expect(result.processes.totalMs).toBe(140);
  });
});
