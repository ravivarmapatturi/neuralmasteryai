import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';

const STEPS = 90;
const PHASE = 30;

/** Illustrative, not a literal training log -- but the shape is the real
 * point: naive sequential fine-tuning doesn't just stop improving on Task
 * A once training moves to Task B, it actively unlearns it, because
 * nothing in the Task B gradient knows Task A exists. EWC's Fisher-
 * weighted penalty slows that unlearning without fully stopping it. */
function naiveAccuracy(t: number): number {
  if (t < PHASE) return (t / (PHASE - 1)) * 0.95;
  if (t < PHASE * 2) {
    const p = (t - PHASE) / (PHASE - 1);
    return 0.95 - (0.95 - 0.08) * p ** 1.3;
  }
  const p = (t - PHASE * 2) / (PHASE - 1);
  return 0.08 - 0.03 * p;
}

function ewcAccuracy(t: number): number {
  if (t < PHASE) return (t / (PHASE - 1)) * 0.95;
  if (t < PHASE * 2) {
    const p = (t - PHASE) / (PHASE - 1);
    return 0.95 - (0.95 - 0.8) * p;
  }
  const p = (t - PHASE * 2) / (PHASE - 1);
  return 0.8 - (0.8 - 0.72) * p;
}

export default function CatastrophicForgettingDiagram() {
  const t = useVizTokens();
  const width = 460;
  const height = 220;
  const px = (i: number) => (i / (STEPS - 1)) * width;
  const py = (v: number) => height - 10 - v * (height - 30);

  const naive = Array.from({ length: STEPS }, (_, i) => naiveAccuracy(i));
  const ewc = Array.from({ length: STEPS }, (_, i) => ewcAccuracy(i));
  const line = (series: number[]) => series.map((v, i) => `${px(i)},${py(v)}`).join(' ');

  return (
    <VisualizationContainer
      footer={`Same Task A → Task B → Task C sequential training, measuring Task A accuracy throughout. Naive fine-tuning (red) learns Task A to ${(naive[PHASE - 1] * 100).toFixed(0)}%, then collapses to ${(naive[STEPS - 1] * 100).toFixed(0)}% once training moves on -- nothing in Task B's gradient protects it. EWC's Fisher-weighted penalty (green) only slows that collapse, ending at ${(ewc[STEPS - 1] * 100).toFixed(0)}% -- mitigation, not a cure.`}
    >
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={px(PHASE)} y1={10} x2={px(PHASE)} y2={height - 10} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={px(PHASE * 2)} y1={10} x2={px(PHASE * 2)} y2={height - 10} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
        <text x={px(PHASE / 2)} y={height - 2} fontSize={9} fill={t.textMuted} textAnchor="middle">training Task A</text>
        <text x={px(PHASE * 1.5)} y={height - 2} fontSize={9} fill={t.textMuted} textAnchor="middle">training Task B</text>
        <text x={px(PHASE * 2.5)} y={height - 2} fontSize={9} fill={t.textMuted} textAnchor="middle">training Task C</text>

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
