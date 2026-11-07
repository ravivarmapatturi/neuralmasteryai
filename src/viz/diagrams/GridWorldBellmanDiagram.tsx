import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationStepController, useStepController } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { VI_GRID, valueIterationHistory } from '../lib/rl';

const ITERATIONS = 12;

export default function GridWorldBellmanDiagram() {
  const t = useVizTokens();
  const history = useMemo(() => valueIterationHistory(VI_GRID, ITERATIONS), []);
  const controller = useStepController(history.length);
  const V = history[controller.step];
  const prevV = controller.step > 0 ? history[controller.step - 1] : null;

  const maxAbs = Math.max(...history.flat(2).map(Math.abs), 1e-6);
  const cellSize = 64;

  return (
    <VisualizationContainer footer={`Iteration ${controller.step}: every cell runs V(s) ← max over 4 actions of [reward + γ·V(s')] using LAST iteration's V, all simultaneously -- the literal Bellman optimality equation, applied ${ITERATIONS} times until the values stop moving. Goal cell (top-right, marked +1) stays fixed at 0 -- it's terminal, nothing to back up.`}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={VI_GRID.cols * cellSize} height={VI_GRID.rows * cellSize} viewBox={`0 0 ${VI_GRID.cols * cellSize} ${VI_GRID.rows * cellSize}`} className="nm-fit-svg">
          {V.map((row, r) =>
            row.map((v, c) => {
              const isGoal = r === VI_GRID.goal[0] && c === VI_GRID.goal[1];
              const prev = prevV ? prevV[r][c] : v;
              const changed = Math.abs(v - prev) > 0.001;
              const mag = Math.min(1, Math.abs(v) / maxAbs);
              return (
                <g key={`${r}-${c}`} transform={`translate(${c * cellSize}, ${r * cellSize})`}>
                  <rect width={cellSize - 3} height={cellSize - 3} rx={DIAGRAM_RADIUS.cell}
                    fill={isGoal ? t.accentPrimary : v >= 0 ? t.accentPrimary : t.accentDanger}
                    fillOpacity={isGoal ? 0.9 : 0.08 + mag * 0.7}
                    stroke={changed ? t.accentWarn : t.border} strokeWidth={changed ? 2 : 1} />
                  <text x={(cellSize - 3) / 2} y={(cellSize - 3) / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="monospace" fill={isGoal ? t.background : mag > 0.5 ? t.background : t.textPrimary}>
                    {isGoal ? '+1' : v.toFixed(2)}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>
      <VisualizationStepController controller={controller} totalSteps={history.length} stepLabel={(s) => `iter ${s}`} />
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Amber border = this cell's value changed since the last iteration. Watch the "changed" ring shrink toward nothing as V converges -- that's what "solving the Bellman equation" looks like in practice.
      </div>
    </VisualizationContainer>
  );
}
