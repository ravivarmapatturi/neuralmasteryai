import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [1, 2, 3, 4];
const GRID = 9;

/** How many layers of 3×3 convolutions -- click to see the receptive
 * field of one output neuron grow, and what it's abstracted into. */
export default function ReceptiveFieldGrowthDiagram() {
  const t = useVizTokens();
  const [layers, setLayers] = useState(2);
  const color = getConceptColor(t, 'attention');
  const cell = 24;
  const rf = 1 + layers * 2;
  const center = Math.floor(GRID / 2);
  const half = Math.floor(rf / 2);

  const ABSTRACTION = ['edges', 'edges → textures', 'textures → parts', 'parts → objects'];

  return (
    <VisualizationContainer footer={`After ${layers} layer${layers > 1 ? 's' : ''} of stacked 3×3 convolutions, one output neuron "sees" a ${rf}×${rf} patch of the original image -- deeper layers see larger, more abstract patterns (${ABSTRACTION[layers - 1]}).`}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {LAYERS.map((l) => (
          <div key={l} onClick={() => setLayers(l)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLayers(l); } }} onMouseEnter={() => setLayers(l)} style={{ cursor: 'pointer', padding: '0.4rem 0.7rem', borderRadius: 7, background: layers === l ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${layers === l ? color : t.border}` }}>
            <span style={{ fontSize: 10, fontWeight: layers === l ? 700 : 500, color: layers === l ? color : t.textPrimary }}>{l} layer{l > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
      <svg width={GRID * cell} height={GRID * cell} viewBox={`0 0 ${GRID * cell} ${GRID * cell}`} className="nm-fit-svg">
        {Array.from({ length: GRID }).map((_, r) =>
          Array.from({ length: GRID }).map((_, c) => {
            const inField = Math.abs(r - center) <= half && Math.abs(c - center) <= half;
            const isCenter = r === center && c === center;
            return (
              <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={isCenter ? color : inField ? `${color}30` : t.surfaceAlt} stroke={t.border} strokeWidth={0.5} />
            );
          }),
        )}
      </svg>
    </VisualizationContainer>
  );
}
