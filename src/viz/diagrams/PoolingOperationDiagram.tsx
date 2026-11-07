import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const IMG = [
  [1, 3, 2, 0],
  [4, 2, 1, 1],
  [0, 1, 3, 2],
  [1, 2, 0, 4],
];

/** A 4×4 feature map downsampled by 2×2 max-pooling -- click a
 * quadrant to see which value survives, and the resulting 2×2 output. */
export default function PoolingOperationDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(0);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;
  const cell = 34;

  const quadrants = [
    { r: 0, c: 0 }, { r: 0, c: 1 },
    { r: 1, c: 0 }, { r: 1, c: 1 },
  ];
  const q = quadrants[active];
  const values = [IMG[q.r * 2][q.c * 2], IMG[q.r * 2][q.c * 2 + 1], IMG[q.r * 2 + 1][q.c * 2], IMG[q.r * 2 + 1][q.c * 2 + 1]];
  const maxVal = Math.max(...values);

  return (
    <VisualizationContainer footer={`Max of this 2×2 region = ${maxVal} -- the strongest activation survives, the other three are discarded. Output shrinks from 4×4 to 2×2, and small shifts within a region don't change which value wins (a bit of positional robustness).`}>
      <svg width={4 * cell} height={4 * cell} viewBox={`0 0 ${4 * cell} ${4 * cell}`} className="nm-fit-svg">
        {IMG.map((row, r) =>
          row.map((v, c) => {
            const qi = Math.floor(r / 2) * 2 + Math.floor(c / 2);
            const isMax = qi === active && v === maxVal;
            const inActive = qi === active;
            return (
              <g key={`${r}-${c}`} onClick={() => setActive(qi)} style={{ cursor: 'pointer' }}>
                <rect x={c * cell} y={r * cell} width={cell} height={cell} fill={isMax ? `${okColor}35` : inActive ? `${color}18` : t.surfaceAlt} stroke={isMax ? okColor : inActive ? color : t.border} strokeWidth={isMax || inActive ? 1.5 : 1} />
                <text x={c * cell + cell / 2} y={r * cell + cell / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={isMax ? 700 : 400} fill={isMax ? okColor : t.textSecondary}>{v}</text>
              </g>
            );
          }),
        )}
      </svg>
    </VisualizationContainer>
  );
}
