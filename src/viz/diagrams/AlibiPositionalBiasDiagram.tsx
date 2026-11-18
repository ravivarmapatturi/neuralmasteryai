import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const SEQ_LEN = 10;

/** ALiBi doesn't touch Q/K at all -- it adds a fixed, non-learned penalty
 * of -m*|i-j| directly to the raw attention scores before softmax,
 * proportional to distance. Drag the query position and slope m to see
 * exactly which keys get penalized and by how much. */
export default function AlibiPositionalBiasDiagram() {
  const t = useVizTokens();
  const queryCycle = useAutoCycle(SEQ_LEN, 650, 6);
  const queryPos = queryCycle.value;
  const setQueryPos = queryCycle.pick;
  const [slope, setSlope] = useState(0.5);
  const color = getConceptColor(t, 'query');
  const penaltyColor = t.accentDanger;

  const width = 560;
  const height = 130;
  const cellW = (width - 40) / SEQ_LEN;

  const penalty = (j: number) => -slope * Math.abs(queryPos - j);
  const maxPenalty = -slope * (SEQ_LEN - 1);

  return (
    <VisualizationContainer footer="Unlike RoPE (which rotates Q/K vectors themselves), ALiBi leaves Q/K untouched and instead subtracts a distance-proportional penalty directly from the attention score matrix, before softmax -- simpler, and specifically designed for extrapolating well past training-time sequence lengths.">
      <Slider label={`query position = ${queryPos}`} min={0} max={SEQ_LEN - 1} step={1} value={queryPos} onChange={setQueryPos} />
      <Slider label={`slope m = ${slope.toFixed(2)}`} min={0.1} max={1} step={0.1} value={slope} onChange={setSlope} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {Array.from({ length: SEQ_LEN }, (_, j) => {
          const x = 20 + j * cellW;
          const p = penalty(j);
          const intensity = maxPenalty === 0 ? 0 : p / maxPenalty;
          const isQuery = j === queryPos;
          return (
            <g key={j}>
              <rect x={x} y={20} width={cellW - 3} height={40} rx={4} fill={isQuery ? `${color}30` : `rgba(${t.mode === 'dark' ? '244,91,91' : '212,63,63'}, ${intensity * 0.7})`} stroke={isQuery ? color : t.border} strokeWidth={isQuery ? 2 : 1} />
              <text x={x + cellW / 2} y={44} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={isQuery ? color : t.textSecondary}>{j}</text>
              <text x={x + cellW / 2} y={75} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={t.textMuted}>{p.toFixed(1)}</text>
            </g>
          );
        })}
        <text x={20} y={95} fontSize={9} fill={t.textMuted}>key position →</text>
        <text x={20} y={110} fontSize={9} fill={t.textMuted}>score penalty ↑</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: penaltyColor, fontWeight: 700, marginTop: 4 }}>
        Farther keys (darker) get penalized more before softmax — no learned parameters, purely a function of distance.
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="\text{score}(i,j) = q_i \cdot k_j - m \cdot |i - j|" />
      </div>
    </VisualizationContainer>
  );
}
