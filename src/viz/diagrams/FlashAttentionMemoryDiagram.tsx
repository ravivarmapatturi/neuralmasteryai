import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Standard attention materializes the full n x n attention matrix in
 * slow HBM; FlashAttention computes it in small tiles that stay in fast
 * on-chip SRAM, never writing the full matrix out. Toggle to see which
 * memory tier each approach actually touches. */
export default function FlashAttentionMemoryDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'standard' | 'flash'>('flash');
  const color = getConceptColor(t, 'attention');
  const width = 560;

  return (
    <VisualizationContainer
      footer={
        mode === 'standard'
          ? 'Standard attention: the full n x n attention matrix is written to slow HBM (off-chip GPU memory), then read back for softmax and the value-weighted sum -- that round trip is the bottleneck, not the FLOPs.'
          : "FlashAttention: computes attention in small TILES that fit entirely in fast on-chip SRAM, fusing the score/softmax/weighted-sum steps so the full n x n matrix is never materialized in slow memory at all."
      }
    >
      <PillSelect<'standard' | 'flash'> label="Attention implementation" value={mode} onChange={setMode} options={[{ value: 'standard', label: 'Standard' }, { value: 'flash', label: 'FlashAttention' }]} />
      <svg width="100%" viewBox={`0 0 ${width} 150`} style={{ display: 'block', marginTop: 8 }}>
        <defs>
          <marker id="fam-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
          </marker>
        </defs>
        <rect x={20} y={100} width={520} height={35} rx={6} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={30} y={92} fontSize={9} fill={t.textMuted}>slow HBM (off-chip)</text>
        <rect x={220} y={20} width={120} height={35} rx={6} fill="none" stroke={color} strokeWidth={1.5} />
        <text x={225} y={12} fontSize={9} fill={color}>fast SRAM (on-chip)</text>

        {mode === 'standard' ? (
          <>
            <rect x={40} y={106} width={480} height={22} rx={4} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
            <text x={280} y={121} textAnchor="middle" fontSize={9} fill={color}>full n × n attention matrix, materialized here</text>
            <line x1={280} y1={100} x2={280} y2={58} stroke={color} strokeWidth={1.5} strokeDasharray="2 2" markerEnd="url(#fam-arrow)" />
            <text x={292} y={80} fontSize={8} fill={t.textMuted}>read back for softmax + weighted sum</text>
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={240 + i * 24} y={27} width={20} height={20} rx={3} fill={`${color}40`} stroke={color} strokeWidth={1.25} />
            ))}
            <text x={280} y={62} textAnchor="middle" fontSize={9} fill={color}>tiled Q/K/V blocks, fused compute -- stays here</text>
            <rect x={40} y={106} width={100} height={22} rx={4} fill="none" stroke={t.textMuted} strokeWidth={1} strokeDasharray="2 2" opacity={0.4} />
            <text x={90} y={121} textAnchor="middle" fontSize={8} fill={t.textMuted} opacity={0.6}>full matrix: never written here</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        A foundational speedup used inside most of the engines covered elsewhere on this page, not a competing engine itself.
      </div>
    </VisualizationContainer>
  );
}
