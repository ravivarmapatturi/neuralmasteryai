import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { ewcForgettingTrace, naiveForgettingTrace, STEPS_PER_PHASE, TOTAL_STEPS } from '../lib/continualLearning';

export default function CatastrophicForgettingDiagram() {
  const t = useVizTokens();
  const width = 460;
  const height = 220;
  const px = (i: number) => (i / (TOTAL_STEPS - 1)) * width;
  const py = (v: number) => height - 10 - v * (height - 30);

  const naive = useMemo(() => naiveForgettingTrace(), []);
  const ewc = useMemo(() => ewcForgettingTrace(), []);
  const line = (series: number[]) => series.map((v, i) => `${px(i)},${py(v)}`).join(' ');

  return (
    <VisualizationContainer
      footer={`Real gradient descent on a single parameter across Task A → Task B → Task C, measuring Task A accuracy throughout (not a hand-drawn curve). Naive sequential fine-tuning (red) learns Task A to ${(naive[STEPS_PER_PHASE - 1] * 100).toFixed(0)}%, then collapses to ${(naive[TOTAL_STEPS - 1] * 100).toFixed(0)}% once training moves on -- nothing in Task B's gradient protects it. EWC's real Fisher-weighted penalty (green), anchored at each task's own post-training value, only slows that collapse, ending at ${(ewc[TOTAL_STEPS - 1] * 100).toFixed(0)}% -- mitigation, not a cure.`}
    >
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={px(STEPS_PER_PHASE)} y1={10} x2={px(STEPS_PER_PHASE)} y2={height - 10} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={px(STEPS_PER_PHASE * 2)} y1={10} x2={px(STEPS_PER_PHASE * 2)} y2={height - 10} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
        <text x={px(STEPS_PER_PHASE / 2)} y={height - 2} fontSize={9} fill={t.textMuted} textAnchor="middle">training Task A</text>
        <text x={px(STEPS_PER_PHASE * 1.5)} y={height - 2} fontSize={9} fill={t.textMuted} textAnchor="middle">training Task B</text>
        <text x={px(STEPS_PER_PHASE * 2.5)} y={height - 2} fontSize={9} fill={t.textMuted} textAnchor="middle">training Task C</text>

        <polyline points={line(ewc)} fill="none" stroke={t.accentPrimary} strokeWidth={2} />
        <polyline points={line(naive)} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, fontSize: 11 }}>
        <span style={{ color: t.accentDanger, fontWeight: 700 }}>— Naive sequential fine-tuning</span>
        <span style={{ color: t.accentPrimary, fontWeight: 700 }}>— EWC-regularized</span>
      </div>
    </VisualizationContainer>
  );
}
