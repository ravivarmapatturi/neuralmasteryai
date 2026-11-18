import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateUncalibratedPredictions, reliabilityBins } from '../lib/modelEvaluation';

export default function CalibrationDiagram() {
  const t = useVizTokens();

  const preds = useMemo(() => generateUncalibratedPredictions(3, 600), []);
  const bins = useMemo(() => reliabilityBins(preds), [preds]);
  const populated = bins.filter((b) => b.avgPredicted !== null);
  const binCursor = useAutoCycle(populated.length, 850);

  const width = 260, height = 260;
  const px = (v: number) => v * width;
  const py = (v: number) => height - v * height;

  return (
    <VisualizationContainer footer="Real 600 predictions, binned by predicted probability, real empirical accuracy computed per bin. The model says '90% confident' but the real observed accuracy at that confidence level is far lower -- systematically overconfident, exactly what calibration is built to catch and correct (via, e.g., temperature scaling or Platt scaling).">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: 260, margin: '0 auto' }}>
        <line x1={0} y1={height} x2={width} y2={0} stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" />
        <polyline
          points={populated.map((b) => `${px(b.avgPredicted!)},${py(b.avgActual!)}`).join(' ')}
          fill="none" stroke={t.accentDanger} strokeWidth={2.5}
        />
        {populated.map((b, i) => (
          <circle key={i} cx={px(b.avgPredicted!)} cy={py(b.avgActual!)} r={(3 + Math.min(5, b.count / 30)) * (binCursor.value === i ? 1.35 : 1)} fill={t.accentDanger} fillOpacity={binCursor.value === i ? 1 : 0.65} style={{ transition: 'r 250ms, fill-opacity 250ms' }} />
        ))}
        <line x1={px(populated[binCursor.value].avgPredicted!)} y1={py(populated[binCursor.value].avgPredicted!)} x2={px(populated[binCursor.value].avgPredicted!)} y2={py(populated[binCursor.value].avgActual!)} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="3 3" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.textMuted }}>┈</span> perfect calibration</span>
        <span><span style={{ color: t.accentDanger }}>⬤</span> real observed reliability (dot size = bin count)</span>
      </div>
    </VisualizationContainer>
  );
}
