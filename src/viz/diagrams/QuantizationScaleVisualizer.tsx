import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

type Precision = 'fp32' | 'fp16' | 'fp8' | 'int8' | 'int4';

interface PrecisionSpec {
  name: string;
  bits: number;
  format: string;
  memoryMultiplier: string;
  hardwareSupport: string;
  description: string;
}

const PRECISIONS: Record<Precision, PrecisionSpec> = {
  fp32: {
    name: 'FP32 (Single Precision)',
    bits: 32,
    format: '1 sign, 8 exponent, 23 mantissa',
    memoryMultiplier: '1.0x (Baseline: 4 bytes / param)',
    hardwareSupport: 'Universal CPU, GPU, TPU',
    description: 'Gold standard for numerical stability during training. Prohibitively heavy for inference (a 70B parameter model requires 280 GB VRAM).',
  },
  fp16: {
    name: 'FP16 / BF16 (Half Precision)',
    bits: 16,
    format: '1 sign, 5 (or 8) exponent, 10 (or 7) mantissa',
    memoryMultiplier: '0.5x (2 bytes / param)',
    hardwareSupport: 'NVIDIA Tensor Cores, Apple Neural Engine, ARM Neon',
    description: 'Standard baseline for modern LLM inference. 70B parameter model requires 140 GB VRAM (needs two 80GB A100/H100 GPUs).',
  },
  fp8: {
    name: 'FP8 (E4M3 / E5M2)',
    bits: 8,
    format: '1 sign, 4 exponent, 3 mantissa (E4M3)',
    memoryMultiplier: '0.25x (1 byte / param)',
    hardwareSupport: 'NVIDIA Hopper H100 / Ada Lovelace / Blackwell',
    description: 'Hardware floating point with 8 bits. E4M3 provides higher precision for weights and activations, while E5M2 handles wide dynamic ranges.',
  },
  int8: {
    name: 'INT8 (Uniform Affine Quantization)',
    bits: 8,
    format: '8-bit signed integer [-128, 127]',
    memoryMultiplier: '0.25x (1 byte / param)',
    hardwareSupport: 'TinyML MCUs, TensorRT, vLLM SmoothQuant',
    description: 'Fixed-point integer arithmetic: q = round(x / Scale) + ZeroPoint. 4x memory compression; runs on microcontrollers with no FPU.',
  },
  int4: {
    name: 'INT4 (AWQ / GPTQ)',
    bits: 4,
    format: '4-bit integer [0, 15] or [-8, 7]',
    memoryMultiplier: '0.125x (0.5 bytes / param)',
    hardwareSupport: 'vLLM, llama.cpp, ExLlamaV2, Apple Silicon',
    description: '8x memory compression! Activation-aware Weight Quantization (AWQ) protects salient outlier channels, letting 70B models run in 36 GB VRAM.',
  },
};

export default function QuantizationScaleVisualizer() {
  const t = useVizTokens();
  const [precision, setPrecision] = useState<Precision>('int8');
  const [inputValue, setInputValue] = useState<number>(3.85);

  const spec = PRECISIONS[precision];

  // Mathematical Quantization Simulation (Symmetric INT8 mapping on [-6.0, 6.0])
  const maxDynamicRange = 6.0;
  const int8Scale = maxDynamicRange / 127.0; // ~0.04724
  const quantizedInt8 = Math.max(-128, Math.min(127, Math.round(inputValue / int8Scale)));
  const reconstructedInt8 = (quantizedInt8 * int8Scale).toFixed(3);
  const int8Error = Math.abs(inputValue - parseFloat(reconstructedInt8)).toFixed(4);

  // INT4 Simulation on [-6.0, 6.0] -> 16 levels [-8, 7]
  const int4Scale = maxDynamicRange / 7.0; // ~0.857
  const quantizedInt4 = Math.max(-8, Math.min(7, Math.round(inputValue / int4Scale)));
  const reconstructedInt4 = (quantizedInt4 * int4Scale).toFixed(3);
  const int4Error = Math.abs(inputValue - parseFloat(reconstructedInt4)).toFixed(4);

  // Model VRAM footprints for a 70B parameter LLM:
  const get70bFootprint = (p: Precision) => {
    if (p === 'fp32') return '280 GB';
    if (p === 'fp16') return '140 GB';
    if (p === 'fp8') return '70 GB';
    if (p === 'int8') return '70 GB';
    return '35 GB';
  };

  const getHardwareRequirement = (p: Precision) => {
    if (p === 'fp32') return '4x 80GB A100s';
    if (p === 'fp16') return '2x 80GB A100s';
    if (p === 'fp8' || p === 'int8') return '1x 80GB H100 (Single GPU!)';
    return 'Single Mac Studio (48GB RAM) or RTX 4090';
  };

  return (
    <VisualizationContainer footer="Quantization transforms continuous floating point tensors into compact discrete representations. Converting FP16 to INT8 halves memory bandwidth pressure on GPUs, and running INT4 via AWQ enables 70B parameter models to run on single workstations and edge devices with less than 1% perplexity degradation.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPrimary }}>
            Numerical Precision & Compression
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Quantization Engine: FP32, FP16, FP8, INT8 & INT4
          </div>
        </div>
        <PillSelect<Precision>
          label="Target Precision"
          value={precision}
          onChange={setPrecision}
          options={[
            { value: 'fp32', label: '1. FP32 (Full)' },
            { value: 'fp16', label: '2. FP16 (Half)' },
            { value: 'fp8', label: '3. FP8 (Transformer)' },
            { value: 'int8', label: '4. INT8 (MCU & Serving)' },
            { value: 'int4', label: '5. INT4 (AWQ Extreme)' },
          ]}
        />
      </div>

      {/* Floating Point Test Slider */}
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Input Weight / Activation Value ($x$): <strong style={{ color: t.accentPrimary }}>{inputValue.toFixed(2)}</strong>
          </label>
          <span style={{ fontSize: 11, color: t.textMuted }}>Range: [-6.0, +6.0]</span>
        </div>
        <input
          type="range"
          min="-6.0"
          max="6.0"
          step="0.05"
          value={inputValue}
          onChange={(e) => setInputValue(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Quantization Arithmetic Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Left: Bit Structure */}
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.accentPurple, textTransform: 'uppercase', marginBottom: 6 }}>
            Hardware Bit Representation
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>
            {spec.name} ({spec.bits} bits / parameter)
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
            Format: <code style={{ color: t.accentTeal }}>{spec.format}</code>
          </div>
          <div style={{ fontSize: 12, color: t.textPrimary, lineHeight: 1.5 }}>
            {spec.description}
          </div>
        </div>

        {/* Right: Quantized Value & Error */}
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.accentPrimary, textTransform: 'uppercase', marginBottom: 6 }}>
            Discretization Math & Reconstruction
          </div>
          {precision === 'int8' ? (
            <div style={{ fontSize: 12, color: t.textPrimary, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>Quantization Formula: <code style={{ color: t.accentPrimary }}>q = round(x / Scale)</code></div>
              <div>Scale factor ($S$): <strong style={{ color: t.accentTeal }}>{int8Scale.toFixed(5)}</strong></div>
              <div>Quantized Integer ($q$): <strong style={{ color: t.accentPrimary }}>{quantizedInt8}</strong> (stored in 8 bits)</div>
              <div>Reconstructed Float (x&#770;): <strong style={{ color: t.textPrimary }}>{reconstructedInt8}</strong></div>
              <div>Reconstruction Error ($\epsilon$): <strong style={{ color: t.accentDanger }}>{int8Error}</strong></div>
            </div>
          ) : precision === 'int4' ? (
            <div style={{ fontSize: 12, color: t.textPrimary, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>Quantization Formula: <code style={{ color: t.accentPrimary }}>q = round(x / Scale_4bit)</code></div>
              <div>Scale factor ($S$): <strong style={{ color: t.accentTeal }}>{int4Scale.toFixed(4)}</strong></div>
              <div>Quantized Integer ($q$): <strong style={{ color: t.accentPrimary }}>{quantizedInt4}</strong> (stored in 4 bits)</div>
              <div>Reconstructed Float (x&#770;): <strong style={{ color: t.textPrimary }}>{reconstructedInt4}</strong></div>
              <div>Reconstruction Error ($\epsilon$): <strong style={{ color: t.accentDanger }}>{int4Error}</strong></div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: t.textPrimary, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>Native Floating Point Storage</div>
              <div>Hardware Floating Point Unit (FPU / Tensor Core)</div>
              <div>Exact representation with zero integer quantization noise.</div>
              <div>Bit efficiency: <strong style={{ color: t.accentWarn }}>{spec.bits} bits per scalar</strong></div>
            </div>
          )}
        </div>
      </div>

      {/* 70B LLM Production Deployment Impact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>70B Model VRAM Footprint</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.accentPrimary, marginTop: 2 }}>
            {get70bFootprint(precision)}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Weights only (excluding KV Cache)
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Hardware Infrastructure</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginTop: 4 }}>
            {getHardwareRequirement(precision)}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Minimum serving cluster requirement
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Memory Bandwidth Speedup</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.accentTeal, marginTop: 2 }}>
            {spec.bits <= 8 ? `${32 / spec.bits}x Throughput` : '1.0x Baseline'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Fewer bytes loaded across memory bus per token
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
