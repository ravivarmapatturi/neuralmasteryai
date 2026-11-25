export interface PipelineTask {
  stageIndex: number;
  microBatchIndex: number;
  start: number;
  end: number;
  duration: number;
}

export interface PipelineCell {
  tick: number;
  stageIndex: number;
  microBatchIndex: number | null;
}

export interface PipelineSchedule {
  stageDurations: number[];
  tasks: PipelineTask[];
  cells: PipelineCell[][];
  makespan: number;
  busyStageTicks: number;
  idleStageTicks: number;
  utilization: number;
  bubbleFraction: number;
  throughput: number;
}

export interface PipelineInput {
  stageCount: number;
  microBatchCount: number;
  slowStageIndex: number;
  slowStageTicks: number;
}

function safeInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)));
}

/** Build the standard diagonal pipeline-parallel schedule. Each task starts
 * after both its previous stage and the previous micro-batch on this stage. */
export function buildPipelineSchedule(input: PipelineInput): PipelineSchedule {
  const stageCount = safeInteger(input.stageCount, 2, 8);
  const microBatchCount = safeInteger(input.microBatchCount, 1, 16);
  const slowStageIndex = safeInteger(input.slowStageIndex, 0, stageCount - 1);
  const slowStageTicks = safeInteger(input.slowStageTicks, 1, 4);
  const stageDurations = Array.from({ length: stageCount }, (_, stage) => (
    stage === slowStageIndex ? slowStageTicks : 1
  ));
  const tasks: PipelineTask[] = [];
  const endAt = Array.from({ length: stageCount }, () => Array<number>(microBatchCount).fill(0));

  for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
    for (let microBatchIndex = 0; microBatchIndex < microBatchCount; microBatchIndex += 1) {
      const previousMicroBatchEnd = microBatchIndex > 0 ? endAt[stageIndex][microBatchIndex - 1] : 0;
      const previousStageEnd = stageIndex > 0 ? endAt[stageIndex - 1][microBatchIndex] : 0;
      const start = Math.max(previousMicroBatchEnd, previousStageEnd);
      const duration = stageDurations[stageIndex];
      const end = start + duration;
      endAt[stageIndex][microBatchIndex] = end;
      tasks.push({ stageIndex, microBatchIndex, start, end, duration });
    }
  }

  const makespan = Math.max(1, ...tasks.map((task) => task.end));
  const cells = Array.from({ length: stageCount }, (_, stageIndex) => (
    Array.from({ length: makespan }, (_, tick) => {
      const task = tasks.find((candidate) => (
        candidate.stageIndex === stageIndex && tick >= candidate.start && tick < candidate.end
      ));
      return { tick, stageIndex, microBatchIndex: task?.microBatchIndex ?? null };
    })
  ));
  const busyStageTicks = tasks.reduce((sum, task) => sum + task.duration, 0);
  const totalStageTicks = stageCount * makespan;
  const idleStageTicks = totalStageTicks - busyStageTicks;
  const utilization = busyStageTicks / totalStageTicks;

  return {
    stageDurations,
    tasks,
    cells,
    makespan,
    busyStageTicks,
    idleStageTicks,
    utilization,
    bubbleFraction: 1 - utilization,
    throughput: microBatchCount / makespan,
  };
}

export function explainPipelineStep(schedule: PipelineSchedule, tick: number): string {
  const safeTick = Math.max(0, Math.min(schedule.makespan - 1, tick));
  const busy = schedule.cells.reduce((count, row) => count + (row[safeTick]?.microBatchIndex === null ? 0 : 1), 0);
  const idle = schedule.cells.length - busy;
  if (safeTick === 0) return `Time 1: Only stage 1 has work; the other ${idle} stages form the opening pipeline bubble.`;
  if (safeTick === schedule.makespan - 1) return `Time ${safeTick + 1}: The final micro-batch leaves the last stage; ${schedule.idleStageTicks} of ${schedule.cells.length * schedule.makespan} stage slots were idle overall.`;
  return `Time ${safeTick + 1}: ${busy} stages compute while ${idle} wait; waiting slots are the pipeline bubble that lowers utilization.`;
}
