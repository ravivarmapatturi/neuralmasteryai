import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { biasVarianceAt } from '../lib/modelEvaluation';

const DEGREES = [1, 2, 3, 5, 8, 12];

export default function BiasVarianceDecompositionDiagram() {
  const t = useVizTokens();
  const [testX, setTestX] = useState(1.2);

  const results = useMemo(() => DEGREES.map((d) => ({ degree: d, ...biasVarianceAt(d, testX, 150, 9) })), [testX]);
  const maxTotal = Math.max(...results.map((r) => r.total));

  const width = 380, height = 180;
  const padX = 28;
  const plotWidth = width - padX * 2;
  const px = (i: number) => padX + (i / (DEGREES.length - 1)) * plotWidth;
  const py = (v: number) => 150 - (v / maxTotal) * 135;

  return (
    <VisualizationContainer footer={`Real Monte Carlo: 150 real resampled noisy datasets per polynomial degree, real bias²+variance decomposition at x=${testX.toFixed(2)}. Low-degree models (underfit) show real high bias, low variance; high-degree models (overfit) flip to real low bias, high variance. Total error is genuinely U-shaped -- there's a real minimum in the middle, not at either extreme.`}>
      <Slider label="test point x" value={testX} onChange={setTestX} min={-2} max={2} step={0.1} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={padX - 8} y1={152} x2={width - padX + 8} y2={152} stroke={t.border} strokeWidth={1} />
        <polyline points={results.map((r, i) => `${px(i)},${py(r.bias2)}`).join(' ')} fill="none" stroke={t.accentSecondary} strokeWidth={2} />
        <polyline points={results.map((r, i) => `${px(i)},${py(r.variance)}`).join(' ')} fill="none" stroke={t.accentWarn} strokeWidth={2} />
        <polyline points={results.map((r, i) => `${px(i)},${py(r.total)}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        {results.map((r, i) => (
          <text key={i} x={px(i)} y={170} textAnchor="middle" fontSize={9.5} fill={t.textMuted}>
            deg {r.degree}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, flexWrap: 'wrap' }}>
        <span><span style={{ color: t.accentSecondary }}>⬤</span> bias²</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> variance</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> total error</span>
      </div>
    </VisualizationContainer>
  );
}
