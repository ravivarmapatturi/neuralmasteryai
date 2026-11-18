import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { robustAccuracy } from '../lib/humanEval';

const STRENGTHS = [0.4, 0.1, 0.9, 0.6];

export default function AdversarialRobustnessDiagram() {
  const t = useVizTokens();
  const { value: strIdx, stop } = useAutoCycle(STRENGTHS.length, 3000, 0);
  const [userStrength, setUserStrength] = useState<number | null>(null);
  const strength = userStrength ?? STRENGTHS[strIdx];

  const standard = robustAccuracy(strength, false);
  const robust = robustAccuracy(strength, true);

  const width = 420;
  const height = 180;
  const samples = Array.from({ length: 40 }, (_, i) => (i / 39) * 1.5);
  const px = (s: number) => (s / 1.5) * width;
  const py = (v: number) => height - v * height;
  const standardCurve = samples.map((s) => [px(s), py(robustAccuracy(s, false))]);
  const robustCurve = samples.map((s) => [px(s), py(robustAccuracy(s, true))]);

  return (
    <VisualizationContainer footer={`At perturbation strength ${strength.toFixed(2)} (paraphrasing / distracting text / edge-case formatting, applied to an otherwise-identical input): standard model accuracy real-drops from 92% clean to ${(standard * 100).toFixed(1)}%; an adversarially-trained model drops only to ${(robust * 100).toFixed(1)}%. If the output changes substantially under a meaning-preserving perturbation, that's a real robustness gap, not a benchmark artifact.`}>
      <Slider
        label="perturbation strength"
        value={strength}
        onChange={(v) => {
          stop();
          setUserStrength(v);
        }}
        min={0}
        max={1.5}
        step={0.05}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={standardCurve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <polyline points={robustCurve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(strength)} y1={0} x2={px(strength)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> standard model</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> adversarially evaluated/trained model</span>
      </div>
    </VisualizationContainer>
  );
}
