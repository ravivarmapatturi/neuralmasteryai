import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const GRID = 6;
const WIN = 3;

/** A patch grid with local window attention -- click to see the
 * windows shift between layers, so a patch on a window boundary still
 * gets to attend across it over depth. */
export default function SwinWindowAttentionDiagram() {
  const t = useVizTokens();
  const [shifted, setShifted] = useState(false);
  const color = getConceptColor(t, 'attention');
  const cell = 26;
  const offset = shifted ? Math.floor(WIN / 2) : 0;

  return (
    <VisualizationContainer footer={shifted ? 'Shifted window: the window boundaries move by half a window between layers -- a patch pair that was split across two windows in the previous layer now shares one, letting information flow across the original boundary.' : 'Regular window: attention computed only WITHIN each 3×3 window -- far cheaper than attending globally across all 36 patches, but a patch can\'t yet see anything outside its own window.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={() => setShifted(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !shifted ? 700 : 500, background: !shifted ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!shifted ? color : t.border}`, color: !shifted ? color : t.textSecondary, cursor: 'pointer' }}>
          Layer L (regular)
        </button>
        <button type="button" onClick={() => setShifted(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: shifted ? 700 : 500, background: shifted ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${shifted ? color : t.border}`, color: shifted ? color : t.textSecondary, cursor: 'pointer' }}>
          Layer L+1 (shifted)
        </button>
      </div>
      <svg width={GRID * cell} height={GRID * cell} viewBox={`0 0 ${GRID * cell} ${GRID * cell}`} className="nm-fit-svg">
        {Array.from({ length: GRID }).map((_, r) =>
          Array.from({ length: GRID }).map((_, c) => {
            const winR = Math.floor((r + offset) / WIN);
            const winC = Math.floor((c + offset) / WIN);
            const winId = winR * 10 + winC;
            const hue = (winId * 47) % 2 === 0;
            return (
              <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={hue ? `${color}30` : `${color}12`} stroke={t.border} strokeWidth={0.75} />
            );
          }),
        )}
      </svg>
    </VisualizationContainer>
  );
}
