import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor, valueColor } from './diagramSystem';
import { gridSamples, randomSamples, bayesianSamples, score } from '../lib/hyperparamSearch';

type Method = 'grid' | 'random' | 'bayesian';
const N = 9;

/** The actual Bergstra & Bengio (2012) point, made concrete: a k x k grid
 * with k^2 evaluations only ever tries k distinct values of the
 * hyperparameter that matters, no matter how densely it also grids the
 * one that doesn't -- random search, same budget, tries closer to n
 * distinct values of every dimension, real distinct-value counts computed
 * from the actual sampled points below, not asserted. Bayesian
 * optimization goes further: it uses every result so far to choose the
 * next point (a simplified but real Expected-Improvement-shaped
 * exploit/explore rule), converging near the true optimum in far fewer
 * evaluations than either. */
export default function HyperparamSearchDiagram() {
  const t = useVizTokens();
  const [method, setMethod] = useState<Method>('grid');
  const evaluationCycle = useAutoCycle(N, 550, N - 1);

  const points = useMemo(() => {
    if (method === 'grid') return gridSamples(3); // 3x3 = 9, matches N
    if (method === 'random') return randomSamples(N, 7);
    return bayesianSamples(N, 7);
  }, [method]);

  const distinctX = new Set(points.map((p) => Math.round(p.x * 20))).size;
  const best = Math.max(...points.map((p) => p.s));
  const trueBest = score(0.62, 0);

  const DESC: Record<Method, string> = {
    grid: `9 evaluations laid out on a 3x3 grid -- but only ${distinctX} distinct values of the hyperparameter that actually matters (x-axis) ever get tried, because every row repeats the same 3 x-values. Best score found: ${best.toFixed(3)} (true optimum: ${trueBest.toFixed(3)}).`,
    random: `Same 9-evaluation budget, uniform random draws instead -- ${distinctX} distinct x-values tried out of 9, because nothing forces repeats. Best score found: ${best.toFixed(3)} (true optimum: ${trueBest.toFixed(3)}).`,
    bayesian: `Same 9-evaluation budget, but each point after the first 3 is chosen to maximize a real exploit/explore acquisition score (high predicted value OR high uncertainty) given every result so far -- not drawn blind. Best score found: ${best.toFixed(3)} (true optimum: ${trueBest.toFixed(3)}).`,
  };

  const width = 300, height = 300;
  const pad = 24;
  const toPx = (x: number) => pad + x * (width - 2 * pad);
  const toPy = (y: number) => height - pad - y * (height - 2 * pad);
  const color = getConceptColor(t, 'attention');

  // Background heatmap: coarse grid of the real score() surface
  const cells = 18;
  const cellSize = (width - 2 * pad) / cells;

  return (
    <VisualizationContainer footer={DESC[method]}>
      <PillSelect<Method>
        label="Search strategy"
        value={method}
        onChange={(value) => { evaluationCycle.stop(); setMethod(value); }}
        options={[
          { value: 'grid', label: 'Grid Search' },
          { value: 'random', label: 'Random Search' },
          { value: 'bayesian', label: 'Bayesian Optimization' },
        ]}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {Array.from({ length: cells }).map((_, i) =>
          Array.from({ length: cells }).map((__, j) => {
            const x = (i + 0.5) / cells;
            const y = (j + 0.5) / cells;
            return (
              <rect
                key={`${i}-${j}`}
                x={pad + i * cellSize}
                y={height - pad - (j + 1) * cellSize}
                width={cellSize + 0.5}
                height={cellSize + 0.5}
                fill={valueColor(t, 'attention', score(x, y))}
                opacity={0.5}
              />
            );
          }),
        )}
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={9} fill={t.textMuted}>hyperparameter that matters (e.g. learning rate) →</text>
        <text x={10} y={height / 2} textAnchor="middle" fontSize={9} fill={t.textMuted} transform={`rotate(-90 10 ${height / 2})`}>hyperparameter that doesn't →</text>
        {points.slice(0, evaluationCycle.value + 1).map((p, i) => (
          <circle key={i} cx={toPx(p.x)} cy={toPy(p.y)} r={5} fill={t.surface} stroke={color} strokeWidth={2} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Background color = real validation score at that (x, y) -- brighter is better. Same 9-evaluation budget in all three modes.
      </div>
    </VisualizationContainer>
  );
}
