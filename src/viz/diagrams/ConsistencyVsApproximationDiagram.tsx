import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** ANN's actual tradeoff, made concrete: recall (chance of finding the
 * TRUE nearest neighbor) traded against query latency, as the search
 * scope widens -- while relational stays at exactly 100% recall always,
 * just slower per additional join depth. Two different kinds of "give
 * something up," shown as two different curves. */
export default function ConsistencyVsApproximationDiagram() {
  const t = useVizTokens();
  const [searchScope, setSearchScope] = useState(30); // % of candidates actually compared
  const relColor = getConceptColor(t, 'query');
  const vecColor = getConceptColor(t, 'attention');

  // Toy model: recall approaches ~99.5% asymptotically as scope widens;
  // latency grows roughly linearly with scope -- illustrates the shape of
  // the real ANN recall/latency tradeoff, not a specific algorithm's exact curve.
  const recall = 60 + 39.5 * (1 - Math.exp(-searchScope / 25));
  const latencyMs = 2 + searchScope * 0.9;

  const width = 560;
  const height = 160;
  const chartTop = 22;
  const chartBottom = 130;
  const xFor = (v: number) => 50 + (v / 100) * (width - 90);

  return (
    <VisualizationContainer footer="Relational stays exact always (100% correct), the cost shows up as join latency growing with relationship depth instead. Vector search trades a small, tunable miss-rate for latency that stays flat as the collection grows -- widen the search scope and recall climbs back up, at a latency cost.">
      <Slider label={`ANN search scope: compare against ${searchScope}% of candidate cluster`} min={5} max={100} step={5} value={searchScope} onChange={setSearchScope} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={50} y1={chartBottom} x2={width - 20} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <line x1={50} y1={chartTop} x2={50} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        {/* relational: flat line at 100% recall */}
        <line x1={50} y1={chartTop} x2={width - 20} y2={chartTop} stroke={relColor} strokeWidth={2} strokeDasharray="4 3" />
        <text x={width - 20} y={chartTop - 6} textAnchor="end" fontSize={9.5} fontWeight={600} fill={relColor}>Relational: always exact</text>
        {/* vector recall curve */}
        <path
          d={Array.from({ length: 21 }, (_, i) => {
            const x = i * 5;
            const r = 60 + 39.5 * (1 - Math.exp(-x / 25));
            const y = chartBottom - ((r - 55) / 45) * (chartBottom - chartTop);
            return `${i === 0 ? 'M' : 'L'} ${xFor(x)},${y}`;
          }).join(' ')}
          fill="none" stroke={vecColor} strokeWidth={2.5}
        />
        <circle cx={xFor(searchScope)} cy={chartBottom - ((recall - 55) / 45) * (chartBottom - chartTop)} r={4.5} fill={vecColor} />
        <text x={50} y={chartTop - 6} fontSize={9.5} fill={t.textMuted}>recall (accuracy)</text>
        <text x={width - 20} y={chartBottom + 16} textAnchor="end" fontSize={9} fill={t.textMuted}>search scope →</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: vecColor, fontWeight: 700, marginTop: 4 }}>
        recall ≈ {recall.toFixed(1)}% · estimated query latency ≈ {latencyMs.toFixed(1)}ms
      </div>
    </VisualizationContainer>
  );
}
