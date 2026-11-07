import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const T = 16;

/** Causal, dilated 1D convolutions along the time axis -- click a
 * layer to see the receptive field grow exponentially, and note it
 * only ever looks backward in time. */
export default function TcnDilatedConvDiagram() {
  const t = useVizTokens();
  const [layer, setLayer] = useState(2);
  const color = getConceptColor(t, 'attention');
  const cell = 18;
  const target = T - 1;
  const dilation = 2 ** (layer - 1);
  const rf = 1 + layer * 2 * dilation;

  return (
    <VisualizationContainer footer={`Layer ${layer}: dilation = ${dilation}, receptive field = ${rf} time steps, all strictly in the PAST -- the prediction at time t never depends on t+1 or later. Dilation doubling each layer means the field grows exponentially with depth, not linearly like a plain (non-dilated) convolution.`}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {[1, 2, 3].map((l) => (
          <div key={l} onClick={() => setLayer(l)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLayer(l); } }} onMouseEnter={() => setLayer(l)} style={{ cursor: 'pointer', padding: '0.4rem 0.7rem', borderRadius: 7, background: layer === l ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${layer === l ? color : t.border}` }}>
            <span style={{ fontSize: 10, fontWeight: layer === l ? 700 : 500, color: layer === l ? color : t.textPrimary }}>layer {l}</span>
          </div>
        ))}
      </div>
      <svg width={T * cell} height={40} viewBox={`0 0 ${T * cell} ${40}`} className="nm-fit-svg">
        {Array.from({ length: T }).map((_, i) => {
          const dist = target - i;
          const inField = dist >= 0 && dist <= rf && dist % dilation === 0;
          const isTarget = i === target;
          return (
            <rect key={i} x={i * cell} y={10} width={cell - 3} height={20} rx={3} fill={isTarget ? color : inField ? `${color}40` : t.surfaceAlt} stroke={isTarget ? color : inField ? color : t.border} strokeWidth={isTarget ? 2 : 1} />
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
