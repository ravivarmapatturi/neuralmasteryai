import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { Pulse } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

// 20 runs from a sweep: learning rate (log scale, x) vs. final accuracy (y).
const RUNS = Array.from({ length: 20 }, (_, i) => {
  const logLr = -4 + (i / 19) * 3.5; // 1e-4 to ~3
  const optimalLogLr = -2.3;
  const acc = 0.95 - Math.pow(logLr - optimalLogLr, 2) * 0.08 + (Math.sin(i * 3.1) * 0.015);
  return { lr: Math.pow(10, logLr), acc: Math.max(0.3, Math.min(0.96, acc)) };
});

const bestIndex = RUNS.reduce((best, r, i, arr) => (r.acc > arr[best].acc ? i : best), 0);

/** A hyperparameter sweep, made concrete: 20 runs, one per learning
 * rate, click any point for its exact config -- this is what a sweep
 * dashboard actually shows. */
export default function HyperparameterSweepDiagram() {
  const t = useVizTokens();
  const { value: selected, pick } = useAutoCycle(RUNS.length, 1200, bestIndex);
  const color = getConceptColor(t, 'attention');
  const width = 480;
  const height = 130;
  const chartTop = 10;
  const chartBottom = 110;
  const xFor = (i: number) => 40 + (i / (RUNS.length - 1)) * (width - 60);
  const yFor = (acc: number) => chartBottom - ((acc - 0.3) / 0.66) * (chartBottom - chartTop);

  const selX = xFor(selected);
  const selY = yFor(RUNS[selected].acc);

  return (
    <VisualizationContainer footer={`Run ${selected + 1}: lr=${RUNS[selected].lr.toExponential(2)}, accuracy=${(RUNS[selected].acc * 100).toFixed(1)}%. Sweeping learning rate reveals the actual shape of the tradeoff -- too low undertrains, too high overshoots, an optimum sits in between.`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={40} y1={chartBottom} x2={width - 20} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <line x1={40} y1={chartTop} x2={40} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        {RUNS.map((r, i) => {
          const isSelected = selected === i;
          return <circle key={i} cx={xFor(i)} cy={yFor(r.acc)} r={isSelected ? 6 : 4} fill={isSelected ? color : `${color}80`} onClick={() => pick(i)} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer', transition: 'r 200ms ease' }} />;
        })}
        <Pulse cx={selX} cy={selY} r={14} color={color} dur={1.6} />
        <text x={40} y={chartTop - 2} fontSize={8} fill={t.textMuted}>accuracy</text>
        <text x={width - 20} y={chartBottom + 14} textAnchor="end" fontSize={8} fill={t.textMuted}>learning rate (log scale) →</text>
      </svg>
    </VisualizationContainer>
  );
}
