import { describe, expect, it } from 'vitest';
import { analyzeRoofline, HARDWARE_PRESETS } from './roofline';

describe('roofline pure performance bounds', () => {
  it('hand-checks NVIDIA A100 decode (B=1, FP16) vs batched (B=64) vs prefill (B=256)', () => {
    const a100 = HARDWARE_PRESETS.find((h) => h.id === 'a100')!;

    const decode = analyzeRoofline({
      peakComputeTflops: a100.peakComputeTflops,
      memoryBandwidthGBs: a100.memoryBandwidthGBs,
      batchSize: 1,
      precision: 'fp16',
    });
    // I = 2*1/2 = 1.0 FLOP/byte; knee = 312 / 2.039 = 153.016...
    // Attainable = 1.0 * 2.039 = 2.039 TFLOP/s (~0.6535% of peak)
    expect(decode.intensity).toBe(1);
    expect(decode.kneeIntensity).toBeCloseTo(312 / 2.039, 4);
    expect(decode.attainableTflops).toBeCloseTo(2.039, 4);
    expect(decode.isMemoryBound).toBe(true);
    expect(decode.computeUtilPct).toBeCloseTo((2.039 / 312) * 100, 3);
    expect(decode.bandwidthUtilPct).toBeCloseTo(100, 4);
    // Doubling compute gives 1.0x speedup because memory bus is full; doubling bandwidth gives 2.0x!
    expect(decode.doubleComputeSpeedup).toBeCloseTo(1, 6);
    expect(decode.doubleBandwidthSpeedup).toBeCloseTo(2, 6);

    const batched = analyzeRoofline({
      peakComputeTflops: a100.peakComputeTflops,
      memoryBandwidthGBs: a100.memoryBandwidthGBs,
      batchSize: 64,
      precision: 'fp16',
    });
    expect(batched.intensity).toBe(64);
    expect(batched.attainableTflops).toBeCloseTo(64 * 2.039, 4);
    expect(batched.isMemoryBound).toBe(true);

    const prefill = analyzeRoofline({
      peakComputeTflops: a100.peakComputeTflops,
      memoryBandwidthGBs: a100.memoryBandwidthGBs,
      batchSize: 256,
      precision: 'fp16',
    });
    expect(prefill.intensity).toBe(256);
    expect(prefill.attainableTflops).toBe(312);
    expect(prefill.isMemoryBound).toBe(false);
    expect(prefill.computeUtilPct).toBeCloseTo(100, 4);
  });

  it('hand-checks NVIDIA H100 knee (~590.7 FLOP/B) and INT4 precision lift at B=1', () => {
    const h100 = HARDWARE_PRESETS.find((h) => h.id === 'h100')!;
    const fp16 = analyzeRoofline({
      peakComputeTflops: h100.peakComputeTflops,
      memoryBandwidthGBs: h100.memoryBandwidthGBs,
      batchSize: 1,
      precision: 'fp16',
    });
    expect(fp16.kneeIntensity).toBeCloseTo(1979 / 3.35, 3);
    expect(fp16.intensity).toBe(1);

    const int4 = analyzeRoofline({
      peakComputeTflops: h100.peakComputeTflops,
      memoryBandwidthGBs: h100.memoryBandwidthGBs,
      batchSize: 1,
      precision: 'int4',
    });
    // INT4 = 0.5 bytes/weight -> I = 2*1/0.5 = 4 FLOPs/byte (4x higher perf!)
    expect(int4.intensity).toBe(4);
    expect(int4.attainableTflops).toBeCloseTo(4 * 3.35, 4);
  });
});
