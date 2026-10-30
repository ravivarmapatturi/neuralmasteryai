import { useState, useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

type HardwareKey = 'h100' | 'a100' | 'rtx4090' | 'm3max' | 'cortex_m4';

interface HardwareSpec {
  name: string;
  category: string;
  peakComputeTflops: number; // FP16 / FP8 Tensor TFLOPs
  memoryBandwidthGBs: number; // GB/s
  kneeIntensity: number; // FLOPs / byte
  description: string;
}

const HARDWARE_SPECS: Record<HardwareKey, HardwareSpec> = {
  h100: {
    name: 'NVIDIA H100 SXM5',
    category: 'Datacenter GPU (Transformer Engine)',
    peakComputeTflops: 1979, // FP8 Tensor Core with Sparsity (or ~989 dense)
    memoryBandwidthGBs: 3350, // HBM3
    kneeIntensity: 1979 / 3.35, // ~590 FLOPs/byte
    description: 'Premier datacenter accelerator. High compute-to-bandwidth ratio requires extreme arithmetic intensity (large batches / long prefill) to saturate compute.',
  },
  a100: {
    name: 'NVIDIA A100 80GB SXM',
    category: 'Datacenter GPU',
    peakComputeTflops: 312, // FP16 Tensor Core
    memoryBandwidthGBs: 2039, // HBM2e
    kneeIntensity: 312 / 2.039, // ~153 FLOPs/byte
    description: 'Workhorse cloud inference GPU. Knee at ~153 FLOPs/byte balances prefill compute with high HBM2e bandwidth for decode steps.',
  },
  rtx4090: {
    name: 'NVIDIA RTX 4090',
    category: 'Workstation / Consumer GPU',
    peakComputeTflops: 165, // FP16 Tensor Core (dense)
    memoryBandwidthGBs: 1008, // GDDR6X
    kneeIntensity: 165 / 1.008, // ~163 FLOPs/byte
    description: 'Local developer & edge workstation GPU. Powerful FP16 compute capped by 1 TB/s GDDR6X bandwidth during single-stream token generation.',
  },
  m3max: {
    name: 'Apple M3 Max (16-core)',
    category: 'Edge Workstation SoC',
    peakComputeTflops: 38, // FP16
    memoryBandwidthGBs: 400, // Unified LPDDR5
    kneeIntensity: 38 / 0.4, // ~95 FLOPs/byte
    description: 'Unified memory architecture allows running 70B+ parameter models directly in RAM without PCIe transfers, with 400 GB/s bandwidth.',
  },
  cortex_m4: {
    name: 'ARM Cortex-M4 MCU',
    category: 'TinyML / Microcontroller (80MHz)',
    peakComputeTflops: 0.00008, // ~80 MFLOPS (FP32)
    memoryBandwidthGBs: 0.16, // SRAM bus (~160 MB/s)
    kneeIntensity: 0.00008 / 0.00016, // ~0.5 FLOPs/byte
    description: 'Ultra-low-power edge microcontroller (milliwatt budget). Low compute and ultra-tight SRAM requires INT8 quantization and zero dynamic memory allocation.',
  },
};

const HARDWARE_OPTIONS: { value: HardwareKey; label: string }[] = [
  { value: 'h100', label: '1. NVIDIA H100' },
  { value: 'a100', label: '2. NVIDIA A100' },
  { value: 'rtx4090', label: '3. RTX 4090' },
  { value: 'm3max', label: '4. Apple M3 Max' },
  { value: 'cortex_m4', label: '5. ARM Cortex-M4 (TinyML)' },
];

export default function RooflineModelVisualizer() {
  const t = useVizTokens();
  const [selectedHw, setSelectedHw] = useState<HardwareKey>('h100');
  const [intensity, setIntensity] = useState<number>(32); // FLOPs/byte

  const hw = HARDWARE_SPECS[selectedHw];

  // Attainable Performance = min(Peak Compute, Intensity * Bandwidth)
  const attainablePerfTflops = useMemo(() => {
    const memoryBoundPerf = (intensity * hw.memoryBandwidthGBs) / 1000;
    return Math.min(hw.peakComputeTflops, memoryBoundPerf);
  }, [intensity, hw]);

  const isMemoryBound = (intensity * hw.memoryBandwidthGBs) / 1000 < hw.peakComputeTflops;

  // Preset Workloads
  const setWorkload = (type: 'decode' | 'prefill' | 'gemm') => {
    if (type === 'decode') setIntensity(1.5); // Batch size 1 autoregressive decode
    if (type === 'prefill') setIntensity(140); // Large prompt prefill (compute bound)
    if (type === 'gemm') setIntensity(450); // Large GEMM weight multiplication
  };

  const knee = hw.kneeIntensity;

  // SVG Coordinate Mapping
  const svgW = 540;
  const svgH = 240;
  const padL = 60;
  const padR = 30;
  const padT = 30;
  const padB = 40;

  // Log scale helpers: Intensity range 0.1 to 1000
  const minLogI = -1; // 10^-1 = 0.1
  const maxLogI = 3.2; // 10^3.2 ~ 1580
  const getX = (val: number) => {
    const logVal = Math.log10(Math.max(0.1, val));
    const ratio = (logVal - minLogI) / (maxLogI - minLogI);
    return padL + ratio * (svgW - padL - padR);
  };

  // Log scale helpers for Y: 0.01% to 100% of peak compute
  const getY = (tflops: number) => {
    const ratio = Math.max(0.01, tflops / hw.peakComputeTflops);
    // Linear or log ratio
    const normalizedY = Math.pow(ratio, 0.4); // soft perceptual compression
    return svgH - padB - normalizedY * (svgH - padT - padB);
  };

  const kneeX = getX(knee);
  const kneeY = getY(hw.peakComputeTflops);
  const startX = getX(0.1);
  const startY = getY((0.1 * hw.memoryBandwidthGBs) / 1000);
  const endX = getX(1500);

  const currentX = getX(intensity);
  const currentY = getY(attainablePerfTflops);

  return (
    <VisualizationContainer footer="The Roofline Model determines whether your AI workload is Memory-Bandwidth-Bound or Compute-Bound. In LLM serving: Prompt Prefill has high arithmetic intensity (Compute-Bound), while Autoregressive Token Generation reads gigabytes of weights to produce 1 token (Memory-Bandwidth-Bound).">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPrimary }}>
            Systems & Hardware Roofline Analysis
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            The Roofline Model & Arithmetic Intensity
          </div>
        </div>
        <PillSelect<HardwareKey>
          label="Target Hardware"
          value={selectedHw}
          onChange={setSelectedHw}
          options={HARDWARE_OPTIONS}
        />
      </div>

      {/* Preset Workload Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button
          onClick={() => setWorkload('decode')}
          style={{
            background: intensity < 5 ? t.accentDanger : t.surfaceAlt,
            color: intensity < 5 ? '#fff' : t.textPrimary,
            border: `1px solid ${t.border}`,
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ⚡ LLM Token Generation (Decode, I ≈ 1.5)
        </button>
        <button
          onClick={() => setWorkload('prefill')}
          style={{
            background: intensity >= 100 && intensity <= 200 ? t.accentPrimary : t.surfaceAlt,
            color: intensity >= 100 && intensity <= 200 ? '#000' : t.textPrimary,
            border: `1px solid ${t.border}`,
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🚀 Prompt Processing (Prefill, I ≈ 140)
        </button>
        <button
          onClick={() => setWorkload('gemm')}
          style={{
            background: intensity > 300 ? t.accentTeal : t.surfaceAlt,
            color: intensity > 300 ? '#000' : t.textPrimary,
            border: `1px solid ${t.border}`,
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔥 Batched Dense GEMM (I ≈ 450)
        </button>
      </div>

      {/* Slider for Operational Intensity */}
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Operational Intensity: <strong style={{ color: t.accentPrimary }}>{intensity.toFixed(1)} FLOPs / Byte</strong>
          </label>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: isMemoryBound ? `${t.accentDanger}22` : `${t.accentPrimary}22`,
              color: isMemoryBound ? t.accentDanger : t.accentPrimary,
              border: `1px solid ${isMemoryBound ? t.accentDanger : t.accentPrimary}`,
            }}
          >
            {isMemoryBound ? 'MEMORY-BANDWIDTH BOUND' : 'COMPUTE BOUND'}
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="800"
          step="0.5"
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          <span>0.5 FLOPs/B (Memory Bound)</span>
          <span>Knee: {knee.toFixed(0)} FLOPs/B</span>
          <span>800 FLOPs/B (Compute Bound)</span>
        </div>
      </div>

      {/* Roofline Graph SVG */}
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, marginBottom: 16, overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', maxHeight: 260 }}>
          {/* Grid lines */}
          <line x1={padL} y1={padT} x2={padL} y2={svgH - padB} stroke={t.border} strokeWidth={1} />
          <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke={t.border} strokeWidth={1} />

          {/* Roofline Path: Slanted Memory Bound line + Flat Compute Bound line */}
          <path
            d={`M ${startX},${startY} L ${kneeX},${kneeY} L ${endX},${kneeY}`}
            fill="none"
            stroke={t.accentPurple}
            strokeWidth={3}
          />

          {/* Knee point marker */}
          <circle cx={kneeX} cy={kneeY} r={5} fill={t.accentPurple} />
          <text x={kneeX} y={kneeY - 10} textAnchor="middle" fontSize={10} fill={t.textSecondary} fontWeight={600}>
            Knee ({knee.toFixed(0)} FLOPs/B)
          </text>

          {/* Memory Bandwidth Slope Label */}
          <text
            x={(startX + kneeX) / 2 - 10}
            y={(startY + kneeY) / 2 - 12}
            transform={`rotate(-22 ${(startX + kneeX) / 2 - 10} ${(startY + kneeY) / 2 - 12})`}
            fontSize={10}
            fontWeight={600}
            fill={t.accentDanger}
          >
            Memory Slope ({hw.memoryBandwidthGBs.toLocaleString()} GB/s)
          </text>

          {/* Peak Compute Ceiling Label */}
          <text x={(kneeX + endX) / 2} y={kneeY - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill={t.accentPrimary}>
            Peak Compute ({hw.peakComputeTflops.toLocaleString()} TFLOPs)
          </text>

          {/* Active Operating Point */}
          <line x1={currentX} y1={svgH - padB} x2={currentX} y2={currentY} stroke={isMemoryBound ? t.accentDanger : t.accentPrimary} strokeDasharray="3,3" strokeWidth={1.5} />
          <circle cx={currentX} cy={currentY} r={7} fill={isMemoryBound ? t.accentDanger : t.accentPrimary} stroke="#fff" strokeWidth={2} />

          {/* Axis Labels */}
          <text x={svgW / 2} y={svgH - 10} textAnchor="middle" fontSize={11} fill={t.textMuted}>
            Operational Intensity (FLOPs / Byte, Log Scale)
          </text>
          <text x={18} y={svgH / 2} textAnchor="middle" transform={`rotate(-90 18 ${svgH / 2})`} fontSize={11} fill={t.textMuted}>
            Attainable Perf (TFLOPs/s)
          </text>
        </svg>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Attainable Perf</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isMemoryBound ? t.accentDanger : t.accentPrimary, marginTop: 4 }}>
            {attainablePerfTflops >= 1 ? attainablePerfTflops.toFixed(1) : attainablePerfTflops.toExponential(2)} TFLOPs
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {((attainablePerfTflops / hw.peakComputeTflops) * 100).toFixed(1)}% of Peak Capacity
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Limiting Bottleneck</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: isMemoryBound ? t.accentDanger : t.accentPrimary, marginTop: 4 }}>
            {isMemoryBound ? 'Memory Bandwidth' : 'ALU Compute Units'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {isMemoryBound ? `Saturated at ${hw.memoryBandwidthGBs} GB/s` : `Saturated at ${hw.peakComputeTflops} TFLOPs`}
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Optimization Move</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, marginTop: 4 }}>
            {isMemoryBound ? 'Quantize (INT8/FP8) or Batch Requests' : 'Kernel Tiling & FlashAttention'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {isMemoryBound ? 'Reduces bytes read per token' : 'Maximizes Tensor Core occupancy'}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
