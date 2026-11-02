import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type Mode = 'hierarchy' | 'flash_tiling';

export default function KernelMemoryHierarchyVisualizer() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('hierarchy');

  return (
    <VisualizationContainer
      title="GPU Memory Hierarchy & FlashAttention Tiling"
      footer={
        mode === 'hierarchy'
          ? 'On NVIDIA H100 GPUs, on-chip SRAM provides ~33 TB/s bandwidth compared to 3.35 TB/s for HBM3. Standard attention is memory-bound by repeatedly reading and writing N×N attention scores to slow HBM.'
          : 'FlashAttention loads blocks of Q, K, and V into on-chip SRAM (64×64 tiles), computing online softmax rescaling in fast registers and fusing the backward pass without writing the full N×N matrix to HBM.'
      }
    >
      <VisualizationHeader
        eyebrow="HARDWARE KERNEL INTERNALS"
        title="Why Memory Bandwidth Governs Transformer Execution"
        description="Inspect the physical memory hierarchy of modern AI accelerators and how kernel tiling eliminates high-bandwidth memory bottlenecks."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<Mode>
          label="Architecture View"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'hierarchy', label: '1. Memory Hierarchy & Bandwidths' },
            { value: 'flash_tiling', label: '2. FlashAttention SRAM Tiling' },
          ]}
        />
      </div>

      {mode === 'hierarchy' ? (
        <svg viewBox="0 0 680 260" width="100%" role="img" aria-label="GPU Memory Hierarchy Levels">
          {/* Register File */}
          <rect x={180} y={20} width={320} height={42} rx={6} fill={t.accentPrimary} />
          <text x={340} y={40} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.background}>Registers (RF) · ~300 TB/s · ~32 MB total</text>
          <text x={340} y={54} textAnchor="middle" fontSize={10} fill={t.background}>Zero-cycle latency · Single-instruction scope</text>

          {/* SRAM / Shared Memory */}
          <rect x={140} y={76} width={400} height={46} rx={6} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
          <text x={340} y={98} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.accentPrimary}>On-Chip SRAM / Shared Memory (L1)</text>
          <text x={340} y={114} textAnchor="middle" fontSize={11} fill={t.textSecondary}>~33 TB/s bandwidth · 228 KB per SM (~50 MB total) · ~20-30 cycles</text>

          {/* L2 Cache */}
          <rect x={100} y={136} width={480} height={46} rx={6} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
          <text x={340} y={158} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.textPrimary}>L2 Cache · ~12 TB/s · 50 MB total</text>
          <text x={340} y={174} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Shared cross-SM cache · ~150-200 cycles</text>

          {/* High Bandwidth Memory (HBM3) */}
          <rect x={60} y={196} width={560} height={50} rx={6} fill={t.surfaceAlt} stroke={t.accentDanger} strokeWidth={2} />
          <text x={340} y={218} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.accentDanger}>High Bandwidth Memory (HBM3)</text>
          <text x={340} y={236} textAnchor="middle" fontSize={11} fill={t.textSecondary}>3.35 TB/s bandwidth (10× slower than SRAM!) · 80 GB capacity · ~400+ cycles</text>
        </svg>
      ) : (
        <svg viewBox="0 0 680 260" width="100%" role="img" aria-label="FlashAttention Online Tiling Mechanism">
          {/* HBM Block */}
          <rect x={30} y={40} width={180} height={180} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
          <text x={120} y={70} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.textPrimary}>HBM (Slow Off-Chip)</text>
          <text x={120} y={95} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Matrix Q: [N × d]</text>
          <text x={120} y={120} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Matrix K: [N × d]</text>
          <text x={120} y={145} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Matrix V: [N × d]</text>
          <text x={120} y={185} textAnchor="middle" fontSize={10} fill={t.accentTeal}>No N×N Matrix Written!</text>

          {/* Arrow */}
          <line x1={210} y1={130} x2={270} y2={130} stroke={t.accentPrimary} strokeWidth={2} />
          <text x={240} y={120} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Tile Read</text>

          {/* SRAM Tile Processor */}
          <rect x={270} y={40} width={220} height={180} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
          <text x={380} y={70} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.accentPrimary}>On-Chip SRAM Tile</text>
          <rect x={290} y={85} width={75} height={40} rx={4} fill={t.accentPrimary} />
          <text x={327} y={110} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.background}>Q Tile (Br)</text>
          <rect x={395} y={85} width={75} height={40} rx={4} fill={t.accentSecondary} />
          <text x={432} y={110} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.background}>K Tile (Bc)</text>
          <text x={380} y={150} textAnchor="middle" fontSize={11} fontWeight={600} fill={t.textPrimary}>Online Softmax Rescaling</text>
          <text x={380} y={170} textAnchor="middle" fontSize={10} fill={t.textSecondary}>m_new = max(m_old, row_max)</text>
          <text x={380} y={190} textAnchor="middle" fontSize={10} fill={t.accentTeal}>Fused Accumulation into O</text>

          {/* Arrow */}
          <line x1={490} y1={130} x2={530} y2={130} stroke={t.accentPrimary} strokeWidth={2} />

          {/* Output Block */}
          <rect x={530} y={70} width={120} height={120} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
          <text x={590} y={105} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Final Output</text>
          <text x={590} y={130} textAnchor="middle" fontSize={11} fill={t.textSecondary}>O: [N × d]</text>
          <text x={590} y={155} textAnchor="middle" fontSize={10} fill={t.accentPrimary}>Strictly O(N)</text>
        </svg>
      )}
    </VisualizationContainer>
  );
}
