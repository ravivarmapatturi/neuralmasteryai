import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A transposed convolution learning to expand a small feature map
 * back to a larger spatial size -- the inverse operation of a
 * regular strided convolution. */
export default function TransposedConvUpsampleDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Used in the decoder half of U-Net and in GAN/diffusion generators -- the learned counterpart to a fixed upsampling operation like nearest-neighbor or bilinear interpolation.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
        <div>
          <svg width={2 * 20} height={2 * 20} viewBox={`0 0 ${2 * 20} ${2 * 20}`} className="nm-fit-svg">
            {[0, 1].map((r) => [0, 1].map((c) => (
              <rect key={`${r}-${c}`} x={c * 20} y={r * 20} width={18} height={18} rx={3} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
            )))}
          </svg>
          <div style={{ fontSize: 8, color: t.textMuted, textAlign: 'center', marginTop: 3 }}>2×2 input</div>
        </div>
        <span style={{ color: t.textMuted, fontSize: 16 }}>→</span>
        <div>
          <svg width={4 * 16} height={4 * 16} viewBox={`0 0 ${4 * 16} ${4 * 16}`} className="nm-fit-svg">
            {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => (
              <rect key={`${r}-${c}`} x={c * 16} y={r * 16} width={14} height={14} rx={2} fill={`${t.accentPrimary}25`} stroke={t.accentPrimary} strokeWidth={1} />
            )))}
          </svg>
          <div style={{ fontSize: 8, color: t.textMuted, textAlign: 'center', marginTop: 3 }}>4×4 output (learned upsample)</div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
