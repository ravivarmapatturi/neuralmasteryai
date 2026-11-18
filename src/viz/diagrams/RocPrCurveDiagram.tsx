import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateScoredExamples, rocCurve, metricsAtThreshold } from '../lib/modelEvaluation';

type Mode = 'roc' | 'pr';

export default function RocPrCurveDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('roc');
  const thresholdCycle = useAutoCycle(51, 120, 25);
  const threshold = thresholdCycle.value / 50;

  const examples = useMemo(() => generateScoredExamples(6, 200), []);
  const curve = useMemo(() => rocCurve(examples), [examples]);
  const m = useMemo(() => metricsAtThreshold(examples, threshold), [examples, threshold]);

  const width = 260, height = 260;
  const px = (v: number) => v * width;
  const py = (v: number) => height - v * height;

  const xKey = mode === 'roc' ? 'fpr' : 'recall';
  const yKey = mode === 'roc' ? 'tpr' : 'precision';
  const currentX = mode === 'roc' ? m.fpr : m.recall;
  const currentY = mode === 'roc' ? m.tpr : m.precision;

  return (
    <VisualizationContainer footer={`Real 200-example toy classifier (30% positive rate). At threshold=${threshold.toFixed(2)}: TP=${m.tp}, FP=${m.fp}, TN=${m.tn}, FN=${m.fn} -- precision=${m.precision.toFixed(2)}, recall=${m.recall.toFixed(2)}, F1=${m.f1.toFixed(2)}. Drag the threshold and watch the marked point slide along the REAL curve, computed by literally re-thresholding all 200 real scores.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="Curve" value={mode} onChange={(v) => setMode(v as Mode)} options={[
          { value: 'roc', label: 'ROC' },
          { value: 'pr', label: 'Precision-Recall' },
        ]} />
        <Slider label="threshold" value={threshold} onChange={(v) => thresholdCycle.pick(Math.round(v * 50))} min={0} max={1} step={0.02} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 260, margin: '8px auto 0' }}>
        {mode === 'roc' && <line x1={0} y1={height} x2={width} y2={0} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />}
        <polyline points={curve.map((c) => `${px(c[xKey])},${py(c[yKey])}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <circle cx={px(currentX)} cy={py(currentY)} r={6} fill={t.accentWarn} stroke={t.background} strokeWidth={2} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        {mode === 'roc' ? 'x = false positive rate, y = true positive rate' : 'x = recall, y = precision'}
      </div>
    </VisualizationContainer>
  );
}
