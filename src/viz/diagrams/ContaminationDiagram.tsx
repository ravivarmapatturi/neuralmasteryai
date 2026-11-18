import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { contaminatedScore } from '../lib/evaluationFundamentals';

const TRUE_CAPABILITY = 0.62;
const CONTAMINATIONS = [0.15, 0.05, 0.40, 0.25];

export default function ContaminationDiagram() {
  const t = useVizTokens();
  const { value: contamIdx, stop } = useAutoCycle(CONTAMINATIONS.length, 3000, 0);
  const [userContam, setUserContam] = useState<number | null>(null);
  const contamination = userContam ?? CONTAMINATIONS[contamIdx];

  const reportedScore = useMemo(() => contaminatedScore(TRUE_CAPABILITY, contamination), [contamination]);
  const inflation = reportedScore - TRUE_CAPABILITY;

  const width = 420;
  const height = 140;
  const samples = Array.from({ length: 41 }, (_, i) => i / 40);
  const px = (c: number) => c * width;
  const py = (v: number) => height - v * height;
  const curve = samples.map((c) => [px(c), py(contaminatedScore(TRUE_CAPABILITY, c))]);

  return (
    <VisualizationContainer footer={`Real capability = ${(TRUE_CAPABILITY * 100).toFixed(0)}% (fixed, unaffected by contamination). With ${(contamination * 100).toFixed(0)}% of benchmark items memorized during training (answered perfectly, contributing 100% on exactly those items), the REPORTED score is ${(reportedScore * 100).toFixed(1)}% -- a real ${(inflation * 100).toFixed(1)}-point inflation, computed as (1−c)·true + c·1.0, not estimated.`}>
      <Slider
        label="fraction of benchmark contaminated into training data"
        value={contamination}
        onChange={(v) => {
          stop();
          setUserContam(v);
        }}
        min={0}
        max={0.6}
        step={0.01}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={py(TRUE_CAPABILITY)} x2={width} y2={py(TRUE_CAPABILITY)} stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={4} y={py(TRUE_CAPABILITY) - 4} fontSize={10} fill={t.textMuted}>true capability</text>
        <polyline points={curve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <line x1={px(contamination)} y1={0} x2={px(contamination)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(contamination)} cy={py(reportedScore)} r={5} fill={t.accentWarn} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        A contaminated benchmark score reflects memorization, not the capability being tested -- and the gap grows linearly and predictably with contamination fraction, not just "a bit off."
      </div>
    </VisualizationContainer>
  );
}
