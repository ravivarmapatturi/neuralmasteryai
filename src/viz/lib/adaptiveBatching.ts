// Pure math and discrete-event queue simulation for Adaptive / Dynamic Batching.
// Grounded in Crankshaw et al. (Clipper, NSDI 2017) and the batcher() model in
// src/content/docs/mlops/model-serving.mdx (fixed GPU overhead t0 + per-item cost t1).

export interface BatchingConfig {
  arrivalRate: number; // requests per second (lambda)
  maxBatch: number; // maximum items in one GPU batch (B_max)
  maxWaitMs: number; // maximum queue wait for oldest item in batch (W_max)
  fixedOverheadMs: number; // fixed GPU call cost t0 (ms)
  perItemMs: number; // marginal GPU cost per item t1 (ms)
  requestCount?: number; // number of simulated arrivals
}

export type BatchFireReason = 'batch-full' | 'backlog-full' | 'timeout' | 'immediate';

export interface SimulatedBatch {
  id: number;
  requestIndices: number[];
  size: number;
  firstArrivalMs: number;
  dispatchMs: number;
  finishMs: number;
  gpuMs: number;
  perRequestGpuMs: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  reason: BatchFireReason;
  explain: string;
}

export interface BatchCurvePoint {
  batchSize: number;
  perRequestGpuMs: number;
  totalBatchMs: number;
  capacityRps: number;
  speedup: number;
}

export interface BatchingSimulationResult {
  config: Required<BatchingConfig>;
  arrivalsMs: number[];
  batches: SimulatedBatch[];
  unbatchedPerRequestMs: number;
  unbatchedCapacityRps: number;
  maxBatchCapacityRps: number;
  avgBatchSize: number;
  avgPerRequestGpuMs: number;
  meanLatencyMs: number;
  p95LatencyMs: number;
  unbatchedMeanLatencyMs: number;
  batchedTotalTimeMs: number;
  unbatchedTotalTimeMs: number;
  overloaded: boolean;
  utilization: number;
  curve: BatchCurvePoint[];
}

export function gpuPerRequestCostMs(batchSize: number, fixedOverheadMs: number, perItemMs: number): number {
  const b = Math.max(1, batchSize);
  return (fixedOverheadMs + b * perItemMs) / b;
}

export function maxThroughputRps(batchSize: number, fixedOverheadMs: number, perItemMs: number): number {
  const b = Math.max(1, batchSize);
  const totalSec = (fixedOverheadMs + b * perItemMs) / 1000;
  return totalSec > 0 ? b / totalSec : 0;
}

/** Deterministic, slightly bursty arrival timestamps with exact average rate `arrivalRate`. */
export function buildArrivalStreamMs(arrivalRate: number, count: number): number[] {
  const meanGapMs = 1000 / Math.max(1, arrivalRate);
  // Cycle of weights whose mean is exactly 1.00, creating realistic micro-bursts and quiet gaps.
  const jitter = [0.45, 0.55, 1.4, 0.7, 1.6, 0.5, 1.3, 1.5];
  const arrivals: number[] = [0];
  let t = 0;
  for (let i = 1; i < count; i++) {
    t += meanGapMs * jitter[(i - 1) % jitter.length];
    arrivals.push(Number(t.toFixed(3)));
  }
  return arrivals;
}

function runSingleServerBatched(arrivalsMs: number[], cfg: Required<BatchingConfig>): {
  batches: SimulatedBatch[];
  latenciesMs: number[];
  totalTimeMs: number;
} {
  const batches: SimulatedBatch[] = [];
  const latenciesMs: number[] = [];
  let idx = 0;
  let gpuFreeAt = 0;
  let batchNum = 1;

  while (idx < arrivalsMs.length) {
    const firstArrival = arrivalsMs[idx];
    const batchOpenAt = Math.max(gpuFreeAt, firstArrival);
    const deadline = batchOpenAt + cfg.maxWaitMs;

    const indices: number[] = [idx];
    let cursor = idx + 1;
    while (
      cursor < arrivalsMs.length &&
      indices.length < cfg.maxBatch &&
      arrivalsMs[cursor] <= deadline + 1e-9
    ) {
      indices.push(cursor);
      cursor += 1;
    }

    const lastArrival = arrivalsMs[indices[indices.length - 1]];
    let dispatchMs = deadline;
    let reason: BatchFireReason = cfg.maxWaitMs === 0 ? 'immediate' : 'timeout';

    if (indices.length >= cfg.maxBatch) {
      if (lastArrival <= batchOpenAt + 1e-9) {
        dispatchMs = batchOpenAt;
        reason = 'backlog-full';
      } else {
        dispatchMs = lastArrival;
        reason = 'batch-full';
      }
    } else if (cursor >= arrivalsMs.length && cfg.maxWaitMs > 0) {
      // Last tail batch waits only up to deadline as in a real server.
      dispatchMs = deadline;
      reason = 'timeout';
    }

    const size = indices.length;
    const gpuMs = cfg.fixedOverheadMs + size * cfg.perItemMs;
    const finishMs = dispatchMs + gpuMs;
    const perRequestGpuMs = gpuMs / size;

    let latSum = 0;
    let latMax = 0;
    for (const reqIdx of indices) {
      const lat = finishMs - arrivalsMs[reqIdx];
      latenciesMs.push(lat);
      latSum += lat;
      if (lat > latMax) latMax = lat;
    }
    const avgLatencyMs = latSum / size;

    const savedSetupMs = (size - 1) * cfg.fixedOverheadMs;
    let explain = '';
    if (cfg.maxBatch === 1) {
      explain = `No batching (B_max = 1): request #${indices[0] + 1} ran alone, paying the full ${cfg.fixedOverheadMs.toFixed(0)} ms setup + ${cfg.perItemMs.toFixed(1)} ms work = ${gpuMs.toFixed(1)} ms.`;
    } else if (reason === 'backlog-full') {
      explain = `Batch #${batchNum} filled immediately to ${size} queued requests at ${dispatchMs.toFixed(1)} ms (zero extra timer wait), saving ${savedSetupMs.toFixed(0)} ms of repeated GPU setup.`;
    } else if (reason === 'batch-full') {
      explain = `Batch #${batchNum} hit B_max = ${cfg.maxBatch} early after ${(dispatchMs - batchOpenAt).toFixed(1)} ms wait, sharing one ${cfg.fixedOverheadMs.toFixed(0)} ms setup (${perRequestGpuMs.toFixed(1)} ms/req).`;
    } else if (reason === 'immediate') {
      explain = `Batch #${batchNum} fired at once with W_max = 0 ms carrying ${size} request${size === 1 ? '' : 's'} already in the queue.`;
    } else {
      explain = `Batch #${batchNum} waited the full ${cfg.maxWaitMs} ms timer and dispatched ${size} request${size === 1 ? '' : 's'} (${perRequestGpuMs.toFixed(1)} ms GPU time each, avg latency ${avgLatencyMs.toFixed(1)} ms).`;
    }

    batches.push({
      id: batchNum,
      requestIndices: indices,
      size,
      firstArrivalMs: firstArrival,
      dispatchMs,
      finishMs,
      gpuMs,
      perRequestGpuMs,
      avgLatencyMs,
      maxLatencyMs: latMax,
      reason,
      explain,
    });

    gpuFreeAt = finishMs;
    idx = cursor;
    batchNum += 1;
  }

  return { batches, latenciesMs, totalTimeMs: gpuFreeAt };
}

export function simulateAdaptiveBatching(input: BatchingConfig): BatchingSimulationResult {
  const cfg: Required<BatchingConfig> = {
    arrivalRate: Math.max(5, Math.min(600, Math.round(input.arrivalRate))),
    maxBatch: Math.max(1, Math.min(32, Math.round(input.maxBatch))),
    maxWaitMs: Math.max(0, Math.min(40, Number(input.maxWaitMs.toFixed(1)))),
    fixedOverheadMs: Math.max(2, Math.min(50, Number(input.fixedOverheadMs.toFixed(1)))),
    perItemMs: Math.max(0.2, Math.min(10, Number(input.perItemMs.toFixed(1)))),
    requestCount: Math.max(8, Math.min(40, Math.round(input.requestCount ?? 20))),
  };

  const arrivalsMs = buildArrivalStreamMs(cfg.arrivalRate, cfg.requestCount);
  const batched = runSingleServerBatched(arrivalsMs, cfg);
  const unbatched = runSingleServerBatched(arrivalsMs, { ...cfg, maxBatch: 1, maxWaitMs: 0 });

  const sortedLat = batched.latenciesMs.slice().sort((a, b) => a - b);
  const p95Idx = Math.min(sortedLat.length - 1, Math.floor(sortedLat.length * 0.95));
  const meanLatencyMs = batched.latenciesMs.reduce((s, v) => s + v, 0) / Math.max(1, batched.latenciesMs.length);
  const unbatchedMeanLatencyMs = unbatched.latenciesMs.reduce((s, v) => s + v, 0) / Math.max(1, unbatched.latenciesMs.length);

  const avgBatchSize = batched.batches.reduce((s, b) => s + b.size, 0) / Math.max(1, batched.batches.length);
  const avgPerRequestGpuMs = gpuPerRequestCostMs(avgBatchSize, cfg.fixedOverheadMs, cfg.perItemMs);
  const unbatchedPerRequestMs = gpuPerRequestCostMs(1, cfg.fixedOverheadMs, cfg.perItemMs);
  const unbatchedCapacityRps = maxThroughputRps(1, cfg.fixedOverheadMs, cfg.perItemMs);
  const maxBatchCapacityRps = maxThroughputRps(cfg.maxBatch, cfg.fixedOverheadMs, cfg.perItemMs);
  const utilization = maxBatchCapacityRps > 0 ? cfg.arrivalRate / maxBatchCapacityRps : 1;

  const curve: BatchCurvePoint[] = Array.from({ length: 32 }, (_, i) => {
    const b = i + 1;
    const perReq = gpuPerRequestCostMs(b, cfg.fixedOverheadMs, cfg.perItemMs);
    return {
      batchSize: b,
      perRequestGpuMs: perReq,
      totalBatchMs: cfg.fixedOverheadMs + b * cfg.perItemMs,
      capacityRps: maxThroughputRps(b, cfg.fixedOverheadMs, cfg.perItemMs),
      speedup: unbatchedPerRequestMs / perReq,
    };
  });

  return {
    config: cfg,
    arrivalsMs,
    batches: batched.batches,
    unbatchedPerRequestMs,
    unbatchedCapacityRps,
    maxBatchCapacityRps,
    avgBatchSize,
    avgPerRequestGpuMs,
    meanLatencyMs,
    p95LatencyMs: sortedLat[p95Idx] ?? meanLatencyMs,
    unbatchedMeanLatencyMs,
    batchedTotalTimeMs: batched.totalTimeMs,
    unbatchedTotalTimeMs: unbatched.totalTimeMs,
    overloaded: utilization >= 1,
    utilization,
    curve,
  };
}
