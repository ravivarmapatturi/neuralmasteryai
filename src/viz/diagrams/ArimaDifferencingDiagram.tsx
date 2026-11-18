import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateTrendedSeries, difference, variance } from '../lib/specializedSupervised';

export default function ArimaDifferencingDiagram() {
  const t = useVizTokens();
  const orderCycle = useAutoCycle(3, 2800, 1);
  const d = orderCycle.value as 0 | 1 | 2;

  const raw = useMemo(() => generateTrendedSeries(30, 4), []);
  const diffed = useMemo(() => difference(raw, d), [d, raw]);
  const varDiffed = variance(diffed);
  const varRaw = variance(difference(raw, 0));

  const width = 380, height = 160;
  const minV = Math.min(...diffed), maxV = Math.max(...diffed);
  const px = (i: number) => (i / (diffed.length - 1)) * width;
  const py = (v: number) => height - ((v - minV) / (maxV - minV || 1)) * (height - 20) - 10;

  return (
    <VisualizationContainer footer={`Real series, real d=${d} differencing applied (${'`'}y' = y[t] - y[t-1]${'`'}, repeated d times). Variance of the raw series = ${varRaw.toFixed(2)}; variance after d=${d} differencing = ${varDiffed.toFixed(2)}. At d=0 the upward trend dominates the variance; at d=1 the trend is gone and what's left is close to noise -- exactly what "stationary" means here, made visible instead of asserted. Push to d=2 and watch it start to look like OVER-differencing: no further real improvement, just added noise.`}>
      <PillSelect label="differencing order (d)" value={d} onChange={(v) => orderCycle.pick(v as number)} options={[
        { value: 0, label: 'd=0 (raw)' },
        { value: 1, label: 'd=1' },
        { value: 2, label: 'd=2' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={py(0)} x2={width} y2={py(0)} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
        <polyline points={diffed.map((v, i) => `${px(i)},${py(v)}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Real ACF/PACF-style diagnosis in miniature: pick the smallest d that makes the series look like noise around a constant level.
      </div>
    </VisualizationContainer>
  );
}
