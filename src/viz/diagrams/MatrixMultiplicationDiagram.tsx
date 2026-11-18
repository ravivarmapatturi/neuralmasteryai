import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import DiagramMatrix from './DiagramMatrix';
import { DIAGRAM_TYPE } from './diagramSystem';
import { matMul } from '../lib/linalg';

const A = [[2, 0, 1], [1, 3, -1]];
const B = [[1, 2], [0, 1], [3, 1]];
const C = matMul(A, B);

const CELLS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

export default function MatrixMultiplicationDiagram() {
  const t = useVizTokens();
  const [hover, setHover] = useState<[number, number] | null>(null);
  const { value: autoIdx } = useAutoCycle(CELLS.length, 2500);

  const activeCell = hover ?? CELLS[autoIdx];
  const rowVals = activeCell ? A[activeCell[0]] : null;
  const colVals = activeCell ? B.map((row) => row[activeCell[1]]) : null;
  const terms = rowVals && colVals ? rowVals.map((v, i) => `${v}×${colVals[i]}`) : null;

  return (
    <VisualizationContainer footer={activeCell
      ? `C[${activeCell[0]},${activeCell[1]}] = row ${activeCell[0]} of A · col ${activeCell[1]} of B = ${terms!.join(' + ')} = ${C[activeCell[0]][activeCell[1]]}`
      : 'Hover any output cell to see exactly which row and column produced it -- real dot products, not a schematic.'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, textAlign: 'center', marginBottom: 4 }}>A (2×3)</div>
          <DiagramMatrix data={A} concept="query" cellSize={44} highlightRow={activeCell?.[0] ?? null} />
        </div>
        <div style={{ fontSize: 20, color: t.textMuted }}>×</div>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, textAlign: 'center', marginBottom: 4 }}>B (3×2)</div>
          <DiagramMatrix data={B} concept="key" cellSize={44} highlightCol={activeCell?.[1] ?? null} />
        </div>
        <div style={{ fontSize: 20, color: t.textMuted }}>=</div>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, textAlign: 'center', marginBottom: 4 }}>C (2×2)</div>
          <DiagramMatrix data={C} concept="output" cellSize={44} onCellHover={(r, c) => setHover([r, c])} onCellLeave={() => setHover(null)} />
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A is (2×3), B is (3×2) -- the shared inner dimension (3) cancels, leaving a (2×2) result, exactly the shape rule used throughout attention (`Q·Kᵀ`).
      </div>
    </VisualizationContainer>
  );
}
