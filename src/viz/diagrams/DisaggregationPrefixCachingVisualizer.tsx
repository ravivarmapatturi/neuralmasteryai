import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type Mode = 'disaggregation' | 'radix_tree';

export default function DisaggregationPrefixCachingVisualizer() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('disaggregation');

  return (
    <VisualizationContainer
      title="Prefill-Decode Disaggregation & Radix Prefix Caching"
      footer={
        mode === 'disaggregation'
          ? 'Disaggregation decouples compute-bound prefill (TTFT) from memory-bandwidth-bound decode (TPOT), eliminating interference where long prompt prefills stall token generation.'
          : 'Radix Tree Prefix Caching stores shared KV cache blocks in a prefix tree. Request B reuses the 1,024-token system prompt prefix, reducing TTFT from 420ms to 85ms.'
      }
    >
      <VisualizationHeader
        eyebrow="INFERENCE ARCHITECTURE"
        title="Decoupling Prefill Compute from Decode Bandwidth"
        description="Inspect how production serving clusters eliminate head-of-line blocking and reuse KV cache states across multi-turn agent sessions."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<Mode>
          label="Serving Paradigm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'disaggregation', label: '1. Prefill-Decode Disaggregation' },
            { value: 'radix_tree', label: '2. Radix Tree Prefix Cache' },
          ]}
        />
      </div>

      {mode === 'disaggregation' ? (
        <svg viewBox="0 0 680 260" width="100%" role="img" aria-label="Prefill-Decode Disaggregation Architecture">
          {/* Incoming Request */}
          <rect x={20} y={100} width={130} height={60} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
          <text x={85} y={125} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.textPrimary}>Incoming Request</text>
          <text x={85} y={145} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Prompt: 4,096 tok</text>

          {/* Arrow to Prefill */}
          <line x1={150} y1={130} x2={200} y2={70} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#arrow)" />

          {/* Prefill Node */}
          <rect x={200} y={30} width={200} height={80} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
          <text x={300} y={55} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.accentPrimary}>Prefill Worker (GPU Cluster A)</text>
          <text x={300} y={75} textAnchor="middle" fontSize={11} fill={t.textPrimary}>Compute-Bound (Tensor Cores)</text>
          <text x={300} y={95} textAnchor="middle" fontSize={11} fill={t.accentTeal}>TTFT Optimization · High TFLOPS</text>

          {/* KV Transfer line */}
          <line x1={400} y1={70} x2={460} y2={130} stroke={t.border} strokeWidth={2} strokeDasharray="4 4" />
          <text x={440} y={90} textAnchor="middle" fontSize={11} fontWeight={600} fill={t.accentWarn}>RDMA KV Transfer</text>

          {/* Decode Node */}
          <rect x={460} y={100} width={200} height={80} rx={8} fill={t.surfaceAlt} stroke={t.accentSecondary} strokeWidth={2} />
          <text x={560} y={125} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.accentSecondary}>Decode Worker (GPU Cluster B)</text>
          <text x={560} y={145} textAnchor="middle" fontSize={11} fill={t.textPrimary}>Memory-Bound (HBM Bandwidth)</text>
          <text x={560} y={165} textAnchor="middle" fontSize={11} fill={t.accentTeal}>TPOT Optimization · High Batch Size</text>

          {/* Output tokens */}
          <line x1={560} y1={180} x2={560} y2={220} stroke={t.accentSecondary} strokeWidth={2} />
          <rect x={485} y={220} width={150} height={35} rx={6} fill={t.surface} stroke={t.border} strokeWidth={1} />
          <text x={560} y={242} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Tokens 1..128 Streamed</text>
        </svg>
      ) : (
        <svg viewBox="0 0 680 260" width="100%" role="img" aria-label="Radix Tree Prefix Caching Structure">
          {/* Root node */}
          <circle cx={80} cy={130} r={24} fill={t.surfaceAlt} stroke={t.border} strokeWidth={2} />
          <text x={80} y={135} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.textPrimary}>Root</text>

          {/* Shared System Prefix */}
          <line x1={104} y1={130} x2={180} y2={130} stroke={t.accentPrimary} strokeWidth={3} />
          <rect x={180} y={105} width={190} height={50} rx={8} fill={t.surface} stroke={t.accentPrimary} strokeWidth={2} />
          <text x={275} y={126} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Shared System Prefix</text>
          <text x={275} y={144} textAnchor="middle" fontSize={11} fill={t.accentTeal}>1,024 tokens (Cache Hit!)</text>

          {/* Fork branches */}
          <line x1={370} y1={120} x2={430} y2={70} stroke={t.border} strokeWidth={2} />
          <line x1={370} y1={140} x2={430} y2={190} stroke={t.border} strokeWidth={2} />

          {/* Branch A: Request A */}
          <rect x={430} y={45} width={220} height={50} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.5} />
          <text x={540} y={66} textAnchor="middle" fontSize={12} fontWeight={600} fill={t.textPrimary}>Request A: Task "Router Test"</text>
          <text x={540} y={84} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Prefill: only 256 new tokens (TTFT: 85ms)</text>

          {/* Branch B: Request B */}
          <rect x={430} y={165} width={220} height={50} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.5} />
          <text x={540} y={186} textAnchor="middle" fontSize={12} fontWeight={600} fill={t.textPrimary}>Request B: Task "Kernel Spec"</text>
          <text x={540} y={204} textAnchor="middle" fontSize={11} fill={t.textSecondary}>Prefill: only 310 new tokens (TTFT: 92ms)</text>
        </svg>
      )}
    </VisualizationContainer>
  );
}
