export const GIB = 1024 ** 3;
export const KIB = 1024;

export interface ModelPreset {
  id: string;
  label: string;
  paramsB: number;
  layers: number;
  kvHeads: number;
  headDim: number;
}

export interface GpuSku {
  id: string;
  label: string;
  vramGiB: number;
  bandwidthGBs: number;
}

export const MODEL_PRESETS: ModelPreset[] = [
  { id: 'llama3-8b', label: 'Llama-3.1-8B-class (GQA 8 KV heads)', paramsB: 8.03, layers: 32, kvHeads: 8, headDim: 128 },
  { id: 'llama2-7b-mha', label: '7B MHA-class (32 KV heads)', paramsB: 7.0, layers: 32, kvHeads: 32, headDim: 128 },
  { id: 'llama3-70b', label: 'Llama-3.1-70B-class (GQA 8 KV heads)', paramsB: 70.6, layers: 80, kvHeads: 8, headDim: 128 },
  { id: 'qwen-32b', label: '32B GQA-class (64 layers, 8 KV heads)', paramsB: 32.5, layers: 64, kvHeads: 8, headDim: 128 },
];

export const GPU_SKUS: GpuSku[] = [
  { id: 'l4', label: 'NVIDIA L4 (24 GiB · 300 GB/s)', vramGiB: 24, bandwidthGBs: 300 },
  { id: 'a10g', label: 'NVIDIA A10G (24 GiB · 600 GB/s)', vramGiB: 24, bandwidthGBs: 600 },
  { id: 'a100-40', label: 'NVIDIA A100 40GB (40 GiB · 1,555 GB/s)', vramGiB: 40, bandwidthGBs: 1555 },
  { id: 'a100-80', label: 'NVIDIA A100 80GB (80 GiB · 2,039 GB/s)', vramGiB: 80, bandwidthGBs: 2039 },
  { id: 'h100', label: 'NVIDIA H100 SXM (80 GiB · 3,350 GB/s)', vramGiB: 80, bandwidthGBs: 3350 },
  { id: 'h200', label: 'NVIDIA H200 SXM (141 GiB · 4,800 GB/s)', vramGiB: 141, bandwidthGBs: 4800 },
];

export interface VramSizingInput {
  paramsB: number;
  weightBytes: number; // 2 (BF16), 1 (FP8/INT8), 0.5 (INT4)
  layers: number;
  kvHeads: number;
  headDim: number;
  kvBytes: number; // 2 (BF16), 1 (FP8/INT8)
  contextLength: number;
  batchSize: number;
  overheadGiB: number;
  gpuVramGiB: number;
  gpuBandwidthGBs: number;
  gpuCount: number;
}

export interface VramSizingResult {
  weightsGiB: number;
  kvBytesPerToken: number;
  kvKiBPerToken: number;
  kvPerSeqGiB: number;
  totalKvGiB: number;
  totalVramNeededGiB: number;
  poolVramGiB: number;
  fitsInPool: boolean;
  freeHeadroomGiB: number;
  minGpusNeeded: number;
  maxConcurrentSeqs: number;
  singleSeqDecodeCeilingTokS: number;
  batchedAggregateCeilingTokS: number;
  batchedPerSeqTokS: number;
}

/**
 * Computes exact GPU VRAM breakdown and memory-bandwidth decode ceilings:
 * - Weights (GiB) = paramsB * 1e9 * weightBytes / 1024^3
 * - KV per token (bytes) = 2 * layers * kvHeads * headDim * kvBytes
 * - Total KV (GiB) = kvBytesPerToken * contextLength * batchSize / 1024^3
 * - Bandwidth-bound ceiling (aggregate tok/s) = batchSize * (totalBW_bytes_s / (weightBytesTotal + totalKvBytes))
 */
export function computeServingVram(input: VramSizingInput): VramSizingResult {
  const weightBytesTotal = input.paramsB * 1e9 * input.weightBytes;
  const weightsGiB = weightBytesTotal / GIB;

  const kvBytesPerToken = 2 * input.layers * input.kvHeads * input.headDim * input.kvBytes;
  const kvKiBPerToken = kvBytesPerToken / KIB;
  const kvPerSeqBytes = kvBytesPerToken * input.contextLength;
  const kvPerSeqGiB = kvPerSeqBytes / GIB;
  const totalKvBytes = kvPerSeqBytes * input.batchSize;
  const totalKvGiB = totalKvBytes / GIB;

  const totalVramNeededGiB = weightsGiB + totalKvGiB + input.overheadGiB;
  const poolVramGiB = input.gpuVramGiB * input.gpuCount;
  const freeHeadroomGiB = poolVramGiB - totalVramNeededGiB;
  const fitsInPool = freeHeadroomGiB >= 0;

  const minGpusNeeded = Math.max(1, Math.ceil(totalVramNeededGiB / input.gpuVramGiB));

  const availableForKvGiB = Math.max(0, poolVramGiB - weightsGiB - input.overheadGiB);
  const maxConcurrentSeqs = kvPerSeqGiB > 0 ? Math.floor(availableForKvGiB / kvPerSeqGiB) : 0;

  // Single-sequence theoretical ceiling (1x GPU weight read, matching interview question formula)
  const singleGpuBwBytesPerS = input.gpuBandwidthGBs * 1e9;
  const singleSeqDecodeCeilingTokS =
    weightBytesTotal > 0 ? singleGpuBwBytesPerS / weightBytesTotal : 0;

  // Batched decode streams all weights + active KV cache across gpuCount GPUs per step
  const totalBwBytesPerS = singleGpuBwBytesPerS * input.gpuCount;
  const bytesReadPerStep = weightBytesTotal + totalKvBytes;
  const batchedPerSeqTokS = bytesReadPerStep > 0 ? totalBwBytesPerS / bytesReadPerStep : 0;
  const batchedAggregateCeilingTokS = batchedPerSeqTokS * input.batchSize;

  return {
    weightsGiB,
    kvBytesPerToken,
    kvKiBPerToken,
    kvPerSeqGiB,
    totalKvGiB,
    totalVramNeededGiB,
    poolVramGiB,
    fitsInPool,
    freeHeadroomGiB,
    minGpusNeeded,
    maxConcurrentSeqs,
    singleSeqDecodeCeilingTokS,
    batchedAggregateCeilingTokS,
    batchedPerSeqTokS,
  };
}
