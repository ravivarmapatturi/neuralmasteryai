export type QueuePolicy = 'fifo' | 'shortest-first';
export type BatchingMode = 'static' | 'continuous';

export interface BatchRequest {
  id: number;
  length: number;
  arrival: number;
}

export interface BatchTimelineCell {
  tick: number;
  slot: number;
  requestId: number | null;
  remainingBeforeStep: number | null;
}

export interface RequestCompletion extends BatchRequest {
  completion: number;
  latency: number;
}

export interface BatchingSimulation {
  mode: BatchingMode;
  capacity: number;
  timeline: BatchTimelineCell[][];
  completions: RequestCompletion[];
  makespan: number;
  averageLatency: number;
  busySlotTicks: number;
  utilization: number;
  throughput: number;
}

export interface BatchingComparison {
  requests: BatchRequest[];
  staticBatching: BatchingSimulation;
  continuousBatching: BatchingSimulation;
}

export function parseRequestLengths(input: string, fallback: readonly number[], maxItems = 6): number[] {
  const values = input
    .split(/[\s,;]+/u)
    .map(Number)
    .filter(Number.isFinite)
    .map((value) => Math.max(1, Math.min(12, Math.round(value))))
    .slice(0, maxItems);
  return values.length > 0 ? values : [...fallback];
}

function pickWaiting(waiting: number[], requests: readonly BatchRequest[], policy: QueuePolicy): number {
  if (policy === 'fifo') return waiting[0];
  return [...waiting].sort((a, b) => (
    requests[a].length - requests[b].length || requests[a].id - requests[b].id
  ))[0];
}

export function simulateBatching(
  lengths: readonly number[],
  capacityInput: number,
  arrivalGapInput: number,
  policy: QueuePolicy,
  mode: BatchingMode,
): BatchingSimulation {
  const safeLengths = lengths.length > 0 ? lengths.map((length) => Math.max(1, Math.min(12, Math.round(length)))) : [1];
  const capacity = Math.max(1, Math.min(4, Math.round(capacityInput)));
  const arrivalGap = Math.max(0, Math.min(6, Math.round(arrivalGapInput)));
  const requests = safeLengths.map((length, id) => ({ id, length, arrival: id * arrivalGap }));
  const slots: ({ requestId: number; remaining: number } | null)[] = Array.from({ length: capacity }, () => null);
  const timeline: BatchTimelineCell[][] = Array.from({ length: capacity }, () => []);
  const completionById = new Map<number, number>();
  const admitted = new Set<number>();
  let tick = 0;

  while (completionById.size < requests.length && tick < 500) {
    const activeCount = slots.filter(Boolean).length;
    const canAdmit = mode === 'continuous' || activeCount === 0;
    if (canAdmit) {
      const waiting = requests
        .filter((request) => request.arrival <= tick && !admitted.has(request.id))
        .map((request) => request.id);
      while (waiting.length > 0) {
        const freeSlot = slots.findIndex((slot) => slot === null);
        if (freeSlot < 0) break;
        const requestId = pickWaiting(waiting, requests, policy);
        const waitingIndex = waiting.indexOf(requestId);
        waiting.splice(waitingIndex, 1);
        admitted.add(requestId);
        slots[freeSlot] = { requestId, remaining: requests[requestId].length };
      }
    }

    for (let slot = 0; slot < capacity; slot += 1) {
      const active = slots[slot];
      timeline[slot].push({
        tick,
        slot,
        requestId: active?.requestId ?? null,
        remainingBeforeStep: active?.remaining ?? null,
      });
    }

    for (let slot = 0; slot < capacity; slot += 1) {
      const active = slots[slot];
      if (!active) continue;
      active.remaining -= 1;
      if (active.remaining === 0) {
        completionById.set(active.requestId, tick + 1);
        slots[slot] = null;
      }
    }
    tick += 1;
  }

  const completions = requests.map((request) => {
    const completion = completionById.get(request.id) ?? tick;
    return { ...request, completion, latency: completion - request.arrival };
  });
  const makespan = Math.max(1, ...completions.map((request) => request.completion));
  const busySlotTicks = timeline.reduce((total, row) => (
    total + row.filter((cell) => cell.requestId !== null).length
  ), 0);
  const averageLatency = completions.reduce((sum, request) => sum + request.latency, 0) / completions.length;

  return {
    mode,
    capacity,
    timeline,
    completions,
    makespan,
    averageLatency,
    busySlotTicks,
    utilization: busySlotTicks / (capacity * makespan),
    throughput: completions.length / makespan,
  };
}

export function compareBatching(
  lengths: readonly number[],
  capacity: number,
  arrivalGap: number,
  policy: QueuePolicy,
): BatchingComparison {
  const safeGap = Math.max(0, Math.min(6, Math.round(arrivalGap)));
  const requests = (lengths.length > 0 ? lengths : [1]).map((length, id) => ({
    id,
    length: Math.max(1, Math.min(12, Math.round(length))),
    arrival: id * safeGap,
  }));
  return {
    requests,
    staticBatching: simulateBatching(lengths, capacity, safeGap, policy, 'static'),
    continuousBatching: simulateBatching(lengths, capacity, safeGap, policy, 'continuous'),
  };
}

export function explainBatchingStep(
  simulation: BatchingSimulation,
  tick: number,
): string {
  const safeTick = Math.max(0, Math.min(simulation.makespan - 1, tick));
  const active = simulation.timeline.map((row) => row[safeTick]).filter((cell) => cell?.requestId !== null);
  const labels = active.map((cell) => `R${(cell?.requestId ?? 0) + 1}`).join(', ');
  const idle = simulation.capacity - active.length;
  return `Time ${safeTick + 1}: ${labels || 'no request'} generates one token; ${idle} of ${simulation.capacity} slots ${idle === 1 ? 'is' : 'are'} idle in the ${simulation.mode} scheduler.`;
}
