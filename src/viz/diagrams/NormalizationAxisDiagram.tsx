import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const NORMS = [
  { key: 'batch', label: 'BatchNorm', axis: 'batch', desc: 'Normalizes each feature across the current MINI-BATCH -- stabilizes deep CNN training, but dependent on batch statistics, a poor fit for variable-length sequences processed one token at a time.' },
  { key: 'layer', label: 'LayerNorm', axis: 'feature', desc: 'Normalizes across a single example\'s OWN features instead of across the batch -- batch-size-independent, the default in Transformers.' },
  { key: 'rms', label: 'RMSNorm', axis: 'feature', desc: 'A simplified LayerNorm -- only rescales by root-mean-square, no mean-centering or learned bias. Cheaper, comparable stability, the current default in most modern LLMs.' },
  { key: 'group', label: 'GroupNorm', axis: 'group', desc: 'Normalizes within GROUPS of channels rather than the whole batch or whole layer -- a middle ground for when batch sizes are too small for BatchNorm, common in diffusion U-Nets.' },
];

const ROWS = 4, COLS = 6;

/** Same tensor, four different axes to normalize over -- click a norm
 * type to see exactly which cells get normalized together. */
export default function NormalizationAxisDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('layer');
  const color = getConceptColor(t, 'attention');
  const n = NORMS.find((x) => x.key === active)!;
  const cell = 24;

  const isGrouped = (r: number, c: number) => {
    if (n.axis === 'batch') return c === 1;
    if (n.axis === 'feature') return r === 1;
    if (n.axis === 'group') return c < 3 ? r === 1 && c < 3 : false;
    return false;
  };

  return (
    <VisualizationContainer footer={n.desc}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {NORMS.map((x) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div>
          <svg width={COLS * cell} height={ROWS * cell} viewBox={`0 0 ${COLS * cell} ${ROWS * cell}`} className="nm-fit-svg">
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => (
                <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell - 2} height={cell - 2} rx={3} fill={isGrouped(r, c) ? `${color}40` : t.surfaceAlt} stroke={isGrouped(r, c) ? color : t.border} strokeWidth={isGrouped(r, c) ? 1.5 : 1} />
              )),
            )}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: t.textMuted, marginTop: 3 }}>
            <span>← batch</span>
            <span>feature/channel →</span>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
