export type HardwareId = 'h100' | 'a100' | 'rtx4090' | 'm3max' | 'cortex_m4';
export type PrecisionId = 'fp16' | 'fp8' | 'int4';

export interface HardwarePreset {
  id: HardwareId;
  label: string;
  peakComputeTflops: number;
  memoryBandwidthGBs: number;
  note: string;
}

export const HARDWARE_PRESETS: readonly HardwarePreset[] = [
  {
    id: 'h100',
    label: 'NVIDIA H100',
    peakComputeTflops: 1979,
    memoryBandwidthGBs: 3350,
    note: 'FP8 Tensor Core peak with HBM3 memory',
  },
  {
    id: 'a100',
    label: 'NVIDIA A100',
    peakComputeTflops: 312,
    memoryBandwidthGBs: 2039,
    note: 'FP16 Tensor Core peak with HBM2e memory',
  },
  {
    id: 'rtx4090',
    label: 'RTX 4090',
    peakComputeTflops: 165,
    memoryBandwidthGBs: 1008,
    note: 'Workstation FP16 dense peak with GDDR6X',
  },
  {
    id: 'm3max',
    label: 'Apple M3 Max',
    peakComputeTflops: 38,
    memoryBandwidthGBs: 400,
    note: 'Unified LPDDR5 laptop SoC',
  },
  {
    id: 'cortex_m4',
    label: 'Cortex-M4',
    peakComputeTflops: 0.00008,
    memoryBandwidthGBs: 0.16,
    note: 'TinyML 80 MHz microcontroller',
  },
];

export const PRECISION_OPTIONS: { id: PrecisionId; label: string; bytesPerWeight: number }[] = [
  { id: 'fp16', label: 'FP16 (2 B)', bytesPerWeight: 2 },
  { id: 'fp8', label: 'FP8 / INT8 (1 B)', bytesPerWeight: 1 },
  { id: 'int4', label: 'INT4 (0.5 B)', bytesPerWeight: 0.5 },
];

export const BATCH_SWEEP_STEPS = [1, 16, 64, 160, 320] as const;

export interface RooflineConfig {
  peakComputeTflops: number;
  memoryBandwidthGBs: number;
  batchSize: number;
  precision: PrecisionId;
}

export interface RooflineAnalysis {
  peakComputeTflops: number;
  memoryBandwidthGBs: number;
  bandwidthTBs: number;
  batchSize: number;
  precision: PrecisionId;
  bytesPerWeight: number;
  intensity: number;
  kneeIntensity: number;
  memoryCeilingTflops: number;
  attainableTflops: number;
  isMemoryBound: boolean;
  computeUtilPct: number;
  bandwidthUtilPct: number;
  doubleComputeSpeedup: number;
  doubleBandwidthSpeedup: number;
  curveSamples: { intensity: number; perfTflops: number }[];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function bytesForPrecision(precision: PrecisionId): number {
  return PRECISION_OPTIONS.find((p) => p.id === precision)?.bytesPerWeight ?? 2;
}

export function computeArithmeticIntensity(batchSize: number, bytesPerWeight: number): number {
  return (2 * Math.max(1, batchSize)) / Math.max(0.25, bytesPerWeight);
}

export function analyzeRoofline(input: RooflineConfig): RooflineAnalysis {
  const peakComputeTflops = clamp(Number.isFinite(input.peakComputeTflops) ? input.peakComputeTflops : 312, 0.00001, 20000);
  const memoryBandwidthGBs = clamp(Number.isFinite(input.memoryBandwidthGBs) ? input.memoryBandwidthGBs : 2039, 0.01, 50000);
  const bandwidthTBs = memoryBandwidthGBs / 1000;
  const batchSize = Math.max(1, Math.min(1024, Math.round(Number.isFinite(input.batchSize) ? input.batchSize : 1)));
  const bytesPerWeight = bytesForPrecision(input.precision);

  const intensity = computeArithmeticIntensity(batchSize, bytesPerWeight);
  const kneeIntensity = peakComputeTflops / bandwidthTBs;
  const memoryCeilingTflops = intensity * bandwidthTBs;
  const attainableTflops = Math.min(peakComputeTflops, memoryCeilingTflops);
  const isMemoryBound = memoryCeilingTflops < peakComputeTflops;

  const computeUtilPct = (attainableTflops / peakComputeTflops) * 100;
  const bandwidthUtilPct = Math.min(100, (attainableTflops / Math.max(1e-12, memoryCeilingTflops)) * 100);

  const doubleComputePerf = Math.min(peakComputeTflops * 2, memoryCeilingTflops);
  const doubleMemoryPerf = Math.min(peakComputeTflops, memoryCeilingTflops * 2);
  const doubleComputeSpeedup = doubleComputePerf / Math.max(1e-12, attainableTflops);
  const doubleBandwidthSpeedup = doubleMemoryPerf / Math.max(1e-12, attainableTflops);

  const intensityGrid = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
  const curveSamples = intensityGrid.map((i) => ({
    intensity: i,
    perfTflops: Math.min(peakComputeTflops, i * bandwidthTBs),
  }));

  return {
    peakComputeTflops,
    memoryBandwidthGBs,
    bandwidthTBs,
    batchSize,
    precision: input.precision,
    bytesPerWeight,
    intensity,
    kneeIntensity,
    memoryCeilingTflops,
    attainableTflops,
    isMemoryBound,
    computeUtilPct,
    bandwidthUtilPct,
    doubleComputeSpeedup,
    doubleBandwidthSpeedup,
    curveSamples,
  };
}

export function formatPerf(tflops: number): string {
  if (tflops >= 10) return `${tflops.toFixed(1)} TFLOP/s`;
  if (tflops >= 0.1) return `${tflops.toFixed(2)} TFLOP/s`;
  return `${(tflops * 1000).toFixed(2)} GFLOP/s`;
}
