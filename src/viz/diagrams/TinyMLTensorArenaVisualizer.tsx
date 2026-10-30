import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

type AllocatorMode = 'static_arena' | 'dynamic_heap';

interface LayerMemory {
  name: string;
  type: string;
  inputSramKb: number;
  outputSramKb: number;
  weightsFlashKb: number;
  arenaOffsetKb: number;
  aliveSpan: [number, number]; // [startLayerIdx, endLayerIdx]
}

const TINYML_LAYERS: LayerMemory[] = [
  { name: 'Layer 1: Conv2D (3x3)', type: 'Conv2D', inputSramKb: 12, outputSramKb: 24, weightsFlashKb: 48, arenaOffsetKb: 0, aliveSpan: [0, 1] },
  { name: 'Layer 2: DepthwiseConv', type: 'Depthwise', inputSramKb: 24, outputSramKb: 24, weightsFlashKb: 16, arenaOffsetKb: 24, aliveSpan: [1, 2] },
  { name: 'Layer 3: Pointwise Conv', type: 'Pointwise', inputSramKb: 24, outputSramKb: 16, weightsFlashKb: 32, arenaOffsetKb: 0, aliveSpan: [2, 3] }, // Reuses offset 0!
  { name: 'Layer 4: MaxPool & Flatten', type: 'Pool', inputSramKb: 16, outputSramKb: 8, weightsFlashKb: 0, arenaOffsetKb: 16, aliveSpan: [3, 4] },
  { name: 'Layer 5: Dense Softmax', type: 'Linear', inputSramKb: 8, outputSramKb: 1, weightsFlashKb: 14, arenaOffsetKb: 0, aliveSpan: [4, 5] },
];

export default function TinyMLTensorArenaVisualizer() {
  const t = useVizTokens();
  const [mode, setMode] = useState<AllocatorMode>('static_arena');
  const [activeLayerIdx, setActiveLayerIdx] = useState<number>(1);

  // Microcontroller Constraints (e.g. STM32 / ESP32)
  const TOTAL_SRAM_KB = 128; // Total RAM
  const TOTAL_FLASH_KB = 512; // Total ROM

  const activeLayer = TINYML_LAYERS[activeLayerIdx];

  // Static Arena Peak SRAM is only 48 KB (buffer reuse)
  const peakArenaSramKb = 48;
  const totalModelWeightsFlashKb = TINYML_LAYERS.reduce((acc, l) => acc + l.weightsFlashKb, 0); // ~110 KB

  // Dynamic Heap Failure simulation:
  // After 50 inferences, heap fragmentation leaves 0 contiguous blocks > 16KB!
  const heapFragmentation = mode === 'dynamic_heap' ? 84 : 0;
  const oomRisk = mode === 'dynamic_heap' ? 'CRITICAL (Hard Fault / Reset)' : 'ZERO (Deterministic Memory)';

  return (
    <VisualizationContainer footer="TinyML runs on microcontrollers with milliwatt budgets and zero OS. Dynamic malloc/free causes fatal heap fragmentation on embedded systems. TensorFlow Lite Micro uses a static Tensor Arena: model weights execute directly from Flash (ROM), while intermediate layer activations overlap and reuse SRAM offsets with zero dynamic allocation.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPrimary }}>
            Edge AI & Microcontroller Architecture
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            TinyML Memory Architecture: Flash (ROM) vs SRAM Tensor Arena
          </div>
        </div>
        <PillSelect<AllocatorMode>
          label="Memory Planning Model"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'static_arena', label: '1. TFLite Micro Static Arena (Zero-Copy)' },
            { value: 'dynamic_heap', label: '2. Naive Dynamic Heap (malloc / free)' },
          ]}
        />
      </div>

      {/* Layer Step Selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TINYML_LAYERS.map((layer, idx) => (
          <button
            key={idx}
            onClick={() => setActiveLayerIdx(idx)}
            style={{
              background: activeLayerIdx === idx ? t.accentPrimary : t.surfaceAlt,
              color: activeLayerIdx === idx ? '#000' : t.textPrimary,
              border: `1px solid ${activeLayerIdx === idx ? t.accentPrimary : t.border}`,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {layer.name}
          </button>
        ))}
      </div>

      {/* Hardware Memory Split: Flash ROM vs SRAM Arena */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Flash ROM Card */}
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accentPurple, textTransform: 'uppercase' }}>
              Flash Memory (ROM) — Read Only
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary }}>
              {totalModelWeightsFlashKb} KB / {TOTAL_FLASH_KB} KB
            </span>
          </div>
          <div style={{ fontSize: 12, color: t.textPrimary, marginBottom: 10 }}>
            Model weights, quantized INT8 constants, and operator kernels execute directly in place (XIP - eXecute In Place). <strong>Consumes 0 bytes of SRAM!</strong>
          </div>
          <div style={{ height: 16, background: t.background, borderRadius: 4, overflow: 'hidden', border: `1px solid ${t.border}` }}>
            <div style={{ width: `${(totalModelWeightsFlashKb / TOTAL_FLASH_KB) * 100}%`, height: '100%', background: t.accentPurple }} />
          </div>
        </div>

        {/* SRAM Working Memory Card */}
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: mode === 'static_arena' ? t.accentPrimary : t.accentDanger, textTransform: 'uppercase' }}>
              SRAM Working RAM — {mode === 'static_arena' ? 'Tensor Arena' : 'Fragmented Heap'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary }}>
              {mode === 'static_arena' ? `${peakArenaSramKb} KB` : '96 KB'} / {TOTAL_SRAM_KB} KB
            </span>
          </div>
          <div style={{ fontSize: 12, color: t.textPrimary, marginBottom: 10 }}>
            {mode === 'static_arena'
              ? 'Activation tensors share planned buffer offsets. Layer 3 immediately reuses memory vacated by Layer 1.'
              : 'Repeated malloc/free leaves memory riddled with uncoalesced gaps. System crashes with Out-of-Memory.'}
          </div>
          <div style={{ height: 16, background: t.background, borderRadius: 4, overflow: 'hidden', border: `1px solid ${t.border}` }}>
            <div
              style={{
                width: `${((mode === 'static_arena' ? peakArenaSramKb : 96) / TOTAL_SRAM_KB) * 100}%`,
                height: '100%',
                background: mode === 'static_arena' ? t.accentPrimary : t.accentDanger,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tensor Arena Memory Map Visualizer */}
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Activation Memory Offsets during &ldquo;{activeLayer.name}&rdquo;
          </span>
          <span style={{ fontSize: 11, color: t.textMuted }}>Peak Arena Budget: 48 KB</span>
        </div>

        {/* Horizontal Memory Blocks */}
        <div style={{ display: 'flex', height: 44, background: t.background, borderRadius: 6, border: `1px solid ${t.border}`, overflow: 'hidden', marginBottom: 12 }}>
          {/* Buffer 0 (24 KB) */}
          <div
            style={{
              width: '50%',
              background: activeLayer.arenaOffsetKb === 0 ? t.accentPrimary : `${t.accentPrimary}33`,
              borderRight: `1px solid ${t.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: activeLayer.arenaOffsetKb === 0 ? '#000' : t.textMuted,
            }}
          >
            <span>Offset 0..24 KB</span>
            <span style={{ fontSize: 9 }}>{activeLayer.arenaOffsetKb === 0 ? 'ACTIVE LAYER OUTPUT' : 'INACTIVE / REUSABLE'}</span>
          </div>

          {/* Buffer 1 (24 KB) */}
          <div
            style={{
              width: '50%',
              background: activeLayer.arenaOffsetKb === 24 ? t.accentTeal : `${t.accentTeal}33`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: activeLayer.arenaOffsetKb === 24 ? '#000' : t.textMuted,
            }}
          >
            <span>Offset 24..48 KB</span>
            <span style={{ fontSize: 9 }}>{activeLayer.arenaOffsetKb === 24 ? 'ACTIVE LAYER OUTPUT' : 'INACTIVE / REUSABLE'}</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: t.textSecondary }}>
          Layer Input: <strong style={{ color: t.textPrimary }}>{activeLayer.inputSramKb} KB</strong> | Output Tensor: <strong style={{ color: t.textPrimary }}>{activeLayer.outputSramKb} KB</strong> | Flash Weights: <strong style={{ color: t.textPrimary }}>{activeLayer.weightsFlashKb} KB</strong>
        </div>
      </div>

      {/* TinyML Diagnostic KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Memory Strategy</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginTop: 4 }}>
            {mode === 'static_arena' ? 'Zero Dynamic Malloc' : 'Dynamic Heap Malloc'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {mode === 'static_arena' ? 'Pre-allocated single uint8_t[] buffer' : 'Unbounded runtime fragmentation'}
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Fragmentation Risk</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: mode === 'static_arena' ? t.accentPrimary : t.accentDanger, marginTop: 4 }}>
            {mode === 'static_arena' ? '0% Fragmentation' : `${heapFragmentation}% Fragmented`}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {oomRisk}
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Target Platforms</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.accentTeal, marginTop: 4 }}>
            ARM Cortex-M4 / ESP32 / RISC-V
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Battery & solar-powered sensory edge nodes
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
