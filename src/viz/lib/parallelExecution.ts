export type ExecutionModel = 'threads' | 'processes';

export interface ParallelExecutionConfig {
  model: ExecutionModel;
  taskCount: number;
  workerCount: number;
  cores: number;
  cpuMs: number;
  ioMs: number;
  processStartupMs: number;
}

export type WorkSegmentKind = 'startup' | 'cpu' | 'wait';

export interface WorkSegment {
  task: number;
  lane: number;
  kind: WorkSegmentKind;
  startMs: number;
  endMs: number;
}

export interface ParallelExecutionResult {
  model: ExecutionModel;
  laneCount: number;
  segments: WorkSegment[];
  totalMs: number;
  standaloneTaskMs: number;
}

function wholeAtLeast(value: number, minimum: number): number {
  return Math.max(minimum, Math.round(Number.isFinite(value) ? value : minimum));
}

function earliestIndex(values: readonly number[]): number {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[best]) best = index;
  }
  return best;
}

/**
 * Deterministic scheduling model for CPython-style threads and OS processes.
 * Thread CPU sections share one GIL, while their I/O waits may overlap.
 * Process CPU sections may occupy separate cores after per-process startup.
 */
export function simulateParallelExecution(input: ParallelExecutionConfig): ParallelExecutionResult {
  const taskCount = wholeAtLeast(input.taskCount, 1);
  const workerCount = Math.min(taskCount, wholeAtLeast(input.workerCount, 1));
  const cores = Math.min(workerCount, wholeAtLeast(input.cores, 1));
  const cpuMs = Math.max(0, Number.isFinite(input.cpuMs) ? input.cpuMs : 0);
  const ioMs = Math.max(0, Number.isFinite(input.ioMs) ? input.ioMs : 0);
  const processStartupMs = Math.max(0, Number.isFinite(input.processStartupMs) ? input.processStartupMs : 0);
  const laneReady = Array.from({ length: workerCount }, () => 0);
  const segments: WorkSegment[] = [];

  if (input.model === 'threads') {
    let gilReady = 0;
    for (let task = 0; task < taskCount; task += 1) {
      const lane = earliestIndex(laneReady);
      const cpuStart = Math.max(laneReady[lane], gilReady);
      const cpuEnd = cpuStart + cpuMs;
      if (cpuMs > 0) segments.push({ task, lane, kind: 'cpu', startMs: cpuStart, endMs: cpuEnd });
      gilReady = cpuEnd;
      const waitEnd = cpuEnd + ioMs;
      if (ioMs > 0) segments.push({ task, lane, kind: 'wait', startMs: cpuEnd, endMs: waitEnd });
      laneReady[lane] = waitEnd;
    }
  } else {
    const coreReady = Array.from({ length: cores }, () => processStartupMs);
    for (let lane = 0; lane < workerCount; lane += 1) {
      if (processStartupMs > 0) {
        segments.push({ task: -1, lane, kind: 'startup', startMs: 0, endMs: processStartupMs });
      }
      laneReady[lane] = processStartupMs;
    }
    for (let task = 0; task < taskCount; task += 1) {
      const lane = earliestIndex(laneReady);
      const core = earliestIndex(coreReady);
      const cpuStart = Math.max(laneReady[lane], coreReady[core]);
      const cpuEnd = cpuStart + cpuMs;
      if (cpuMs > 0) segments.push({ task, lane, kind: 'cpu', startMs: cpuStart, endMs: cpuEnd });
      coreReady[core] = cpuEnd;
      const waitEnd = cpuEnd + ioMs;
      if (ioMs > 0) segments.push({ task, lane, kind: 'wait', startMs: cpuEnd, endMs: waitEnd });
      laneReady[lane] = waitEnd;
    }
  }

  return {
    model: input.model,
    laneCount: workerCount,
    segments,
    totalMs: Math.max(...laneReady),
    standaloneTaskMs: cpuMs + ioMs,
  };
}

export function compareExecutionModels(
  input: Omit<ParallelExecutionConfig, 'model'>,
): Record<ExecutionModel, ParallelExecutionResult> {
  return {
    threads: simulateParallelExecution({ ...input, model: 'threads' }),
    processes: simulateParallelExecution({ ...input, model: 'processes' }),
  };
}
