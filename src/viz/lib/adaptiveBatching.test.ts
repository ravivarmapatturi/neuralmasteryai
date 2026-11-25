import { describe, expect, it } from 'vitest';
import {
  gpuPerRequestCostMs,
  maxThroughputRps,
  simulateAdaptiveBatching,
} from './adaptiveBatching';

describe('adaptiveBatching pure math and discrete-event simulation', () => {
  it('computes hand-checked GPU cost per request and throughput capacity matching model-serving.mdx', () => {
    // From mlops/model-serving.mdx: 20 ms fixed cost + 1 ms per item
    expect(gpuPerRequestCostMs(1, 20, 1)).toBeCloseTo(21, 10);
    expect(gpuPerRequestCostMs(16, 20, 1)).toBeCloseTo(36 / 16, 10); // 2.25 ms

    // Unbatched capacity: 1000 / 21 ≈ 47.62 req/s; Batch 16 capacity: 16000 / 36 ≈ 444.44 req/s
    expect(maxThroughputRps(1, 20, 1)).toBeCloseTo(1000 / 21, 6);
    expect(maxThroughputRps(16, 20, 1)).toBeCloseTo(16000 / 36, 6);
  });

  it('penalizes light traffic when maxWaitMs is large because lonely requests wait for the timeout', () => {
    // At 20 req/s (avg 50 ms between arrivals), a 20 ms timeout forces requests to idle before running alone
    const noWait = simulateAdaptiveBatching({
      arrivalRate: 20,
      maxBatch: 16,
      maxWaitMs: 0,
      fixedOverheadMs: 20,
      perItemMs: 1,
      requestCount: 16,
    });
    const longWait = simulateAdaptiveBatching({
      arrivalRate: 20,
      maxBatch: 16,
      maxWaitMs: 20,
      fixedOverheadMs: 20,
      perItemMs: 1,
      requestCount: 16,
    });

    expect(longWait.avgBatchSize).toBeLessThan(1.25);
    expect(longWait.meanLatencyMs).toBeGreaterThan(noWait.meanLatencyMs + 15);
  });

  it('slashes latency and avoids queue blowup under heavy load (240 req/s) when batching is enabled', () => {
    const unbatched = simulateAdaptiveBatching({
      arrivalRate: 240,
      maxBatch: 1,
      maxWaitMs: 0,
      fixedOverheadMs: 20,
      perItemMs: 1,
      requestCount: 20,
    });
    const batched = simulateAdaptiveBatching({
      arrivalRate: 240,
      maxBatch: 16,
      maxWaitMs: 6,
      fixedOverheadMs: 20,
      perItemMs: 1,
      requestCount: 20,
    });

    expect(unbatched.overloaded).toBe(true);
    expect(batched.overloaded).toBe(false);
    expect(batched.avgBatchSize).toBeGreaterThan(3);
    expect(batched.meanLatencyMs).toBeLessThan(unbatched.meanLatencyMs);
    expect(batched.batchedTotalTimeMs).toBeLessThan(unbatched.batchedTotalTimeMs);
  });
});
