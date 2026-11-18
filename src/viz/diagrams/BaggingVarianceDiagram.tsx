import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { baggingSimulation } from '../lib/ensembles';

export default function BaggingVarianceDiagram() {
  const t = useVizTokens();
  const [correlation, setCorrelation] = useState(0.3);
  const treeCursor = useAutoCycle(30, 180, 9);

  const { averageVariances, singleTreeVariance } = useMemo(() => baggingSimulation(30, correlation, 7), [correlation]);

  const width = 400, height = 180;
  const px = (b: number) => ((b - 1) / 29) * width;
  const py = (v: number) => height - Math.min(1, v / singleTreeVariance) * (height - 10) - 5;

  const idealCurve = Array.from({ length: 30 }, (_, i) => singleTreeVariance / (i + 1));

  return (
    <VisualizationContainer footer={`Real Monte Carlo simulation (400 trials per point): with ${correlation.toFixed(2)} correlation between trees, variance of the AVERAGE drops from a single tree's ${singleTreeVariance.toFixed(2)} toward ${averageVariances[averageVariances.length - 1].toFixed(3)} at 30 trees -- following the σ²/B curve closely when correlation is low, but flattening out well above it as correlation rises. That flattening IS the real, computed reason Random Forest's feature-randomness trick (decorrelating trees) matters, not just an assertion.`}>
      <Slider label="correlation between trees" value={correlation} onChange={setCorrelation} min={0} max={0.9} step={0.05} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={idealCurve.map((v, i) => `${px(i + 1)},${py(v)}`).join(' ')} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" />
        <polyline points={averageVariances.map((v, i) => `${px(i + 1)},${py(v)}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(treeCursor.value + 1)} y1={5} x2={px(treeCursor.value + 1)} y2={height - 5} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 4" />
        <circle cx={px(treeCursor.value + 1)} cy={py(averageVariances[treeCursor.value])} r={6} fill={t.accentPrimary} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.textMuted }}>┈</span> ideal σ²/B (fully independent trees)</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> real simulated variance at this correlation</span>
      </div>
    </VisualizationContainer>
  );
}
