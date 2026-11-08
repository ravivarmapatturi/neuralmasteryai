import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** The encoder-decoder-with-skip-connections shape -- click "with
 * skip connections" vs. without to see why fine spatial detail
 * survives the downsample-then-upsample round trip. */
export default function UNetArchitectureDiagram() {
  const t = useVizTokens();
  const [skips, setSkips] = useState(true);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;
  const stages = [64, 40, 24];

  return (
    <VisualizationContainer footer={skips ? 'Each encoder stage links DIRECTLY to its corresponding decoder stage -- fine spatial detail (exact boundary locations) that pure downsampling would lose gets carried across, exactly what precise segmentation boundaries need.' : 'Without skip connections, the decoder has to reconstruct fine detail purely from the heavily-downsampled bottleneck -- boundary precision degrades, which is exactly why plain encoder-decoder is worse than U-Net for segmentation.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setSkips(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !skips ? 700 : 500, background: !skips ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!skips ? color : t.border}`, color: !skips ? color : t.textSecondary, cursor: 'pointer' }}>
          No skip connections
        </button>
        <button type="button" onClick={() => setSkips(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: skips ? 700 : 500, background: skips ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${skips ? color : t.border}`, color: skips ? color : t.textSecondary, cursor: 'pointer' }}>
          With skip connections (U-Net)
        </button>
      </div>
      <svg width="100%" viewBox="0 0 360 115" style={{ display: 'block' }}>
        <defs>
          <marker id="unet-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>

        <text x={85} y={10} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.textMuted}>ENCODER</text>
        <text x={177.5} y={10} textAnchor="middle" fontSize={9} fontWeight={700} fill={okColor}>BOTTLENECK</text>
        <text x={275} y={10} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.textMuted}>DECODER</text>

        {stages.map((w, i) => {
          const x = 10 + i * 50;
          const y = 60 - w / 2;
          return (
            <g key={`enc${i}`}>
              <rect x={x} y={y} width={35} height={w} rx={4} fill={t.surfaceAlt} stroke={t.border} />
              <text x={x + 17.5} y={60 + 3} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={t.textMuted}>{w}</text>
            </g>
          );
        })}

        {/* Bottleneck */}
        <rect x={160} y={48} width={35} height={24} rx={4} fill={`${okColor}25`} stroke={okColor} strokeWidth={1.5} />
        <text x={177.5} y={63} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={okColor}>16</text>

        {stages.slice().reverse().map((w, i) => {
          const x = 210 + i * 50;
          const y = 60 - w / 2;
          return (
            <g key={`dec${i}`}>
              <rect x={x} y={y} width={35} height={w} rx={4} fill={t.surfaceAlt} stroke={t.border} />
              <text x={x + 17.5} y={60 + 3} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={t.textMuted}>{w}</text>
            </g>
          );
        })}

        {/* Skip connections routed as cleanly nested arcs that never cross */}
        {skips && (
          <>
            {/* Level 0: outer arc (64-to-64) */}
            <path d="M 45 34 Q 177.5 4 306 34" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,2" markerEnd="url(#unet-arrow)" opacity={0.85} />
            {/* Level 1: middle arc (40-to-40) */}
            <path d="M 95 44 Q 177.5 18 256 44" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,2" markerEnd="url(#unet-arrow)" opacity={0.85} />
            {/* Level 2: inner arc (24-to-24) arching cleanly over bottleneck */}
            <path d="M 145 50 Q 177.5 32 206 50" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,2" markerEnd="url(#unet-arrow)" opacity={0.85} />
          </>
        )}
      </svg>
    </VisualizationContainer>
  );
}
