import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const IMG = [
  [1, 2, 3, 0, 1],
  [0, 1, 2, 3, 1],
  [1, 0, 1, 2, 0],
  [2, 1, 0, 1, 1],
  [0, 2, 1, 0, 2],
];
const FILTER = [
  [1, 0, -1],
  [1, 0, -1],
  [1, 0, -1],
];

/** A 3×3 filter sliding across a 5×5 image -- click a position to see
 * the weighted sum computed there, the same filter reused everywhere
 * (translation invariance). */
export default function ConvolutionOperationDiagram() {
  const t = useVizTokens();
  const [pos, setPos] = useState({ r: 1, c: 1 });
  const color = getConceptColor(t, 'attention');
  const cell = 32;

  let sum = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += IMG[pos.r + i][pos.c + j] * FILTER[i][j];
    }
  }

  const positions: { r: number; c: number }[] = [];
  for (let r = 0; r <= 2; r++) for (let c = 0; c <= 2; c++) positions.push({ r, c });

  return (
    <VisualizationContainer footer={`Output at (${pos.r},${pos.c}) = sum of elementwise products between the filter and this 3×3 patch = ${sum}. The SAME filter weights are reused at every position -- far fewer parameters than a fully-connected layer over the whole image.`}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 8.5, color: t.textMuted, marginBottom: 3 }}>5×5 input</div>
          <svg width={5 * cell} height={5 * cell} viewBox={`0 0 ${5 * cell} ${5 * cell}`} className="nm-fit-svg">
            {IMG.map((row, r) =>
              row.map((v, c) => {
                const inWindow = c >= pos.c && c < pos.c + 3 && r >= pos.r && r < pos.r + 3;
                return (
                  <g key={`${r}-${c}`}>
                    <rect x={c * cell} y={r * cell} width={cell} height={cell} fill={inWindow ? `${color}25` : t.surfaceAlt} stroke={inWindow ? color : t.border} strokeWidth={inWindow ? 1.5 : 1} />
                    <text x={c * cell + cell / 2} y={r * cell + cell / 2 + 4} textAnchor="middle" fontSize={10} fill={t.textSecondary}>{v}</text>
                  </g>
                );
              }),
            )}
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 8.5, color: t.textMuted, marginBottom: 3 }}>filter positions (click)</div>
          <svg width={3 * cell} height={3 * cell} viewBox={`0 0 ${3 * cell} ${3 * cell}`} className="nm-fit-svg">
            {positions.map((p) => {
              const isActive = p.r === pos.r && p.c === pos.c;
              return (
                <rect key={`${p.r}-${p.c}`} onClick={() => setPos(p)} x={p.c * cell} y={p.r * cell} width={cell} height={cell} fill={isActive ? `${color}40` : t.surfaceAlt} stroke={isActive ? color : t.border} strokeWidth={isActive ? 2 : 1} style={{ cursor: 'pointer' }} />
              );
            })}
          </svg>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size + 1, fontWeight: 700, color, marginTop: 8 }}>
        output[{pos.r}][{pos.c}] = {sum}
      </div>
    </VisualizationContainer>
  );
}
