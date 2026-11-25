// Pure greedy list scheduling + Amdahl's Law math for Parallel Sub-Agent Speedup.

export interface ScheduledTaskBlock {
  taskIndex: number;
  label: string;
  durationSec: number;
  slot: number;
  startSec: number;
  endSec: number;
  isLongest: boolean;
}

export interface ParallelScheduleResult {
  slots: number;
  serialOverheadSec: number;
  durations: number[];
  blocks: ScheduledTaskBlock[];
  sequentialWorkSec: number;
  sequentialTotalSec: number;
  parallelWorkMakespanSec: number;
  parallelTotalSec: number;
  longestTaskSec: number;
  theoreticalFloorSec: number;
  speedup: number;
  maxPossibleSpeedup: number;
  efficiencyPct: number;
  stragglerLimited: boolean;
  explain: string;
}

export interface SpeedupCurvePoint {
  slots: number;
  parallelTotalSec: number;
  speedup: number;
  idealLinear: number;
  ceilingSpeedup: number;
}

export interface AgentWorkloadPreset {
  id: string;
  label: string;
  durationsText: string;
  serialOverheadSec: number;
}

export const AGENT_WORKLOAD_PRESETS: readonly AgentWorkloadPreset[] = [
  { id: 'mixed', label: 'Mixed sub-tasks', durationsText: '4, 7, 3, 11, 5, 8, 6, 4', serialOverheadSec: 2 },
  { id: 'straggler', label: 'One 20s straggler', durationsText: '2, 2, 20, 2, 2, 2, 2, 2', serialOverheadSec: 2 },
  { id: 'balanced', label: 'Balanced (6s each)', durationsText: '6, 6, 6, 6, 6, 6, 6, 6', serialOverheadSec: 2 },
];

/** Parse free user input like "4, 7, 3, 11" into clamped positive durations (seconds). */
export function parseTaskDurations(raw: string): number[] {
  const nums = raw
    .split(/[\s,;]+/)
    .map((s) => Number(s.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
    .slice(0, 12)
    .map((v) => Math.max(0.5, Math.min(60, Number(v.toFixed(1)))));

  return nums.length >= 2 ? nums : [4, 7, 3, 11, 5, 8, 6, 4];
}

/** Exact greedy list-scheduling simulation across k concurrent sub-agent slots. */
export function scheduleParallelTasks(
  durationsInput: readonly number[],
  slotsInput: number,
  serialOverheadInput = 2,
): ParallelScheduleResult {
  const durations = durationsInput.length > 0 ? durationsInput.slice() : [4, 7, 3, 11];
  const slots = Math.max(1, Math.min(8, Math.round(slotsInput)));
  const serialOverheadSec = Math.max(0, Math.min(15, Number(serialOverheadInput.toFixed(1))));

  const longestTaskSec = Math.max(...durations);
  const slotFreeAt = Array(slots).fill(0);
  const blocks: ScheduledTaskBlock[] = [];

  for (let i = 0; i < durations.length; i++) {
    const d = durations[i];
    let bestSlot = 0;
    for (let s = 1; s < slots; s++) {
      if (slotFreeAt[s] < slotFreeAt[bestSlot]) bestSlot = s;
    }
    const startSec = slotFreeAt[bestSlot];
    const endSec = startSec + d;
    slotFreeAt[bestSlot] = endSec;
    blocks.push({
      taskIndex: i,
      label: `T${i + 1}`,
      durationSec: d,
      slot: bestSlot,
      startSec,
      endSec,
      isLongest: d === longestTaskSec,
    });
  }

  const parallelWorkMakespanSec = Math.max(...slotFreeAt);
  const sequentialWorkSec = durations.reduce((sum, d) => sum + d, 0);
  const sequentialTotalSec = serialOverheadSec + sequentialWorkSec;
  const parallelTotalSec = serialOverheadSec + parallelWorkMakespanSec;
  const theoreticalFloorSec = serialOverheadSec + longestTaskSec;
  const speedup = parallelTotalSec > 0 ? sequentialTotalSec / parallelTotalSec : 1;
  const maxPossibleSpeedup = theoreticalFloorSec > 0 ? sequentialTotalSec / theoreticalFloorSec : 1;
  const efficiencyPct = (speedup / slots) * 100;
  const stragglerLimited = parallelWorkMakespanSec <= longestTaskSec + 1e-6;

  let explain = '';
  if (slots === 1) {
    explain = `With 1 worker slot, all ${durations.length} sub-tasks run back-to-back (${sequentialWorkSec.toFixed(1)}s) plus ${serialOverheadSec.toFixed(1)}s coordinator work = ${sequentialTotalSec.toFixed(1)}s (1.00×).`;
  } else if (stragglerLimited) {
    explain = `With ${slots} slots, parallel time hits the hard floor (${longestTaskSec.toFixed(1)}s longest task + ${serialOverheadSec.toFixed(1)}s serial = ${parallelTotalSec.toFixed(1)}s). Adding more workers cannot go any faster.`;
  } else {
    explain = `With ${slots} concurrent slots, greedy packing cuts sub-task wall time from ${sequentialWorkSec.toFixed(1)}s to ${parallelWorkMakespanSec.toFixed(1)}s (+ ${serialOverheadSec.toFixed(1)}s serial = ${parallelTotalSec.toFixed(1)}s, ${speedup.toFixed(2)}× speedup).`;
  }

  return {
    slots,
    serialOverheadSec,
    durations,
    blocks,
    sequentialWorkSec,
    sequentialTotalSec,
    parallelWorkMakespanSec,
    parallelTotalSec,
    longestTaskSec,
    theoreticalFloorSec,
    speedup,
    maxPossibleSpeedup,
    efficiencyPct,
    stragglerLimited,
    explain,
  };
}

export function buildSpeedupCurve(
  durations: readonly number[],
  serialOverheadSec: number,
  maxSlots = 8,
): SpeedupCurvePoint[] {
  return Array.from({ length: maxSlots }, (_, i) => {
    const k = i + 1;
    const res = scheduleParallelTasks(durations, k, serialOverheadSec);
    return {
      slots: k,
      parallelTotalSec: res.parallelTotalSec,
      speedup: res.speedup,
      idealLinear: k,
      ceilingSpeedup: res.maxPossibleSpeedup,
    };
  });
}
