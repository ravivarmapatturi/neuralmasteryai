import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchPath } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const D_MODEL = 512;
const POSITIONS = 60;
// A handful of dimension pairs spanning the full frequency range -- low
// indices oscillate fast (fine position detail), high indices oscillate
// slow (coarse position), exactly the claim the prose makes right above
// this diagram.
const DIM_PAIRS = [0, 4, 16, 64, 256];

function pe(pos: number, dim: number): number {
  const i = Math.floor(dim / 2);
  const angle = pos / 10000 ** ((2 * i) / D_MODEL);
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
}

/** The sinusoidal positional-encoding formula, plotted for real -- every
 * point below is computed live from PE(pos, dim), not a static screenshot. */
export default function PositionalEncodingSinusoids() {
  const t = useVizTokens();
  const [hoveredDim, setHoveredDim] = useState<number | null>(null);

  const width = 600;
  const height = 260;
  const padL = 40;
  const padR = 16;
  const padT = 12;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const xFor = (pos: number) => padL + (pos / (POSITIONS - 1)) * plotW;
  const yFor = (v: number) => padT + plotH / 2 - (v * plotH) / 2.3;

  const colors = [getConceptColor(t, 'embedding'), getConceptColor(t, 'attention'), getConceptColor(t, 'value'), getConceptColor(t, 'query'), getConceptColor(t, 'key')];

  return (
    <VisualizationContainer footer="Every dimension is a fixed sine or cosine wave of position -- no data, no training, just the formula. Hover a dimension to trace its wave alone.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={padL} y1={yFor(0)} x2={width - padR} y2={yFor(0)} stroke={t.border} strokeWidth={1} />
        <text x={padL - 8} y={yFor(1) + 4} textAnchor="end" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted}>1</text>
        <text x={padL - 8} y={yFor(-1) + 4} textAnchor="end" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted}>−1</text>
        <text x={padL} y={height - 8} textAnchor="start" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted}>pos = 0</text>
        <text x={width - padR} y={height - 8} textAnchor="end" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted}>pos = {POSITIONS - 1}</text>

        {DIM_PAIRS.map((dim, di) => {
          const dimmed = hoveredDim !== null && hoveredDim !== dim;
          const d = Array.from({ length: POSITIONS }, (_, pos) => `${pos === 0 ? 'M' : 'L'} ${xFor(pos)},${yFor(pe(pos, dim))}`).join(' ');
          return (
            <g key={dim} opacity={dimmed ? 0.15 : 0.9}>
              <SketchPath d={d} color={colors[di % colors.length]} roughness={1.2} strokeWidth={hoveredDim === dim ? 2.5 : 1.75} id={`pe-sine-${dim}`} />
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
        {DIM_PAIRS.map((dim, di) => (
          <div
            key={dim}
            onMouseEnter={() => setHoveredDim(dim)}
            onMouseLeave={() => setHoveredDim(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: DIAGRAM_TYPE.caption.size, color: hoveredDim === dim ? colors[di % colors.length] : t.textMuted, fontWeight: hoveredDim === dim ? 700 : 400 }}
          >
            <span style={{ width: 12, height: 3, background: colors[di % colors.length], display: 'inline-block', borderRadius: 2 }} />
            dim {dim}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
