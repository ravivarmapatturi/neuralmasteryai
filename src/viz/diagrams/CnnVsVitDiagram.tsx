import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** How far apart two patches can "talk" at layer 1 -- click to
 * compare a CNN's local receptive field against a ViT's global
 * self-attention from the very first layer. */
export default function CnnVsVitDiagram() {
  const t = useVizTokens();
  const [vit, setVit] = useState(true);
  const color = getConceptColor(t, 'attention');
  const grid = 6;
  const cell = 30;
  const center = { r: 2, c: 2 };

  return (
    <VisualizationContainer footer={vit ? 'A Vision Transformer splits the image into patches and applies self-attention across ALL of them -- any patch attends to any other patch from layer 1. Needs more data to train well (no built-in locality bias), but matches or beats CNNs at scale.' : 'A CNN\'s first layer only sees a small local neighborhood -- reaching a distant patch requires stacking many layers to grow the receptive field (see the receptive-field diagram above).'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setVit(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !vit ? 700 : 500, background: !vit ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!vit ? color : t.border}`, color: !vit ? color : t.textSecondary, cursor: 'pointer' }}>
          CNN (layer 1)
        </button>
        <button type="button" onClick={() => setVit(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: vit ? 700 : 500, background: vit ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${vit ? color : t.border}`, color: vit ? color : t.textSecondary, cursor: 'pointer' }}>
          ViT (layer 1)
        </button>
      </div>
      <svg width={grid * cell} height={grid * cell} viewBox={`0 0 ${grid * cell} ${grid * cell}`} className="nm-fit-svg">
        {Array.from({ length: grid }).map((_, r) =>
          Array.from({ length: grid }).map((_, c) => {
            const isCenter = r === center.r && c === center.c;
            const dist = Math.max(Math.abs(r - center.r), Math.abs(c - center.c));
            const connected = vit || dist <= 1;
            return (
              <g key={`${r}-${c}`}>
                <rect x={c * cell} y={r * cell} width={cell} height={cell} fill={isCenter ? color : connected ? `${color}25` : t.surfaceAlt} stroke={t.border} strokeWidth={0.5} />
              </g>
            );
          }),
        )}
      </svg>
    </VisualizationContainer>
  );
}
