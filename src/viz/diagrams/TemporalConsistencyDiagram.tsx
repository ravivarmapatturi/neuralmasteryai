import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';

const N_FRAMES = 6;

// Deterministic pseudo-random jitter (not Math.random -- reproducible on
// every render) standing in for "each frame generated independently, with
// no memory of the last one."
function independentPos(frame: number): { x: number; r: number; hue: number } {
  return {
    x: 40 + ((Math.sin(frame * 12.9) * 0.5 + 0.5) * 200),
    r: 14 + Math.sin(frame * 7.3) * 6,
    hue: (frame * 71) % 360,
  };
}
function consistentPos(frame: number): { x: number; r: number; hue: number } {
  const t = frame / (N_FRAMES - 1);
  return { x: 40 + t * 200, r: 18, hue: 140 };
}

const CELL_W = 46;
const CELL_H = 60;

export default function TemporalConsistencyDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'independent' | 'consistent'>('independent');
  const posFn = mode === 'independent' ? independentPos : consistentPos;
  const accent = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer
      footer={
        mode === 'independent'
          ? "Generating each frame independently: the object's size and color jump around frame to frame -- individually each frame might look fine, but played as video it flickers and warps, since nothing ties consecutive frames together."
          : 'Temporal consistency: the object\'s size and color change smoothly across frames -- this is what temporal attention/convolution layers (or a shared spatiotemporal latent) are specifically trained to enforce, on top of per-frame quality.'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <VizButton variant={mode === 'independent' ? 'primary' : 'secondary'} onClick={() => setMode('independent')}>
          Independent per-frame
        </VizButton>
        <VizButton variant={mode === 'consistent' ? 'primary' : 'secondary'} onClick={() => setMode('consistent')}>
          Temporally consistent
        </VizButton>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: N_FRAMES }, (_, i) => {
          const p = posFn(i);
          return (
            <svg key={i} width={CELL_W} height={CELL_H} viewBox={`0 0 ${CELL_W} ${CELL_H}`} className="nm-fit-svg" style={{ border: `1px solid ${t.border}`, borderRadius: 4, background: t.surfaceAlt }}>
              <circle cx={CELL_W / 2} cy={CELL_H / 2} r={p.r} fill={mode === 'independent' ? `hsl(${p.hue}, 60%, 55%)` : accent} />
              <text x={CELL_W / 2} y={CELL_H - 4} textAnchor="middle" fontSize={8} fill={t.textMuted}>
                t{i + 1}
              </text>
            </svg>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
