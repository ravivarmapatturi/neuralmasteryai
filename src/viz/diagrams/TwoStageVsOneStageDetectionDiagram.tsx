import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** R-CNN's two-stage pipeline vs. YOLO/SSD's single pass -- click to
 * compare the steps each one runs per image. */
export default function TwoStageVsOneStageDetectionDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2600, 1);
  const oneStage = cycle.value === 1;
  const setOneStage = (value: boolean) => cycle.pick(value ? 1 : 0);
  const color = getConceptColor(t, 'attention');

  const TWO_STAGE = ['Propose candidate regions (Region Proposal Network)', 'Classify + refine each proposed region separately', 'Non-max suppression to remove overlapping boxes'];
  const ONE_STAGE = ['Divide image into a grid', 'Predict boxes + class probabilities directly, one forward pass', 'No separate proposal stage'];

  return (
    <VisualizationContainer footer={oneStage ? 'YOLO/SSD: dramatically faster than R-CNN-family models -- historically at some accuracy cost, though later versions have closed most of that gap. The standard choice for real-time detection.' : 'R-CNN family: accurate, but slower because of the two-stage pipeline -- propose, THEN classify each proposal.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setOneStage(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !oneStage ? 700 : 500, background: !oneStage ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!oneStage ? color : t.border}`, color: !oneStage ? color : t.textSecondary, cursor: 'pointer' }}>
          Two-stage (R-CNN family)
        </button>
        <button type="button" onClick={() => setOneStage(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: oneStage ? 700 : 500, background: oneStage ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${oneStage ? color : t.border}`, color: oneStage ? color : t.textSecondary, cursor: 'pointer' }}>
          One-stage (YOLO/SSD)
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(oneStage ? ONE_STAGE : TWO_STAGE).map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.65rem', borderRadius: 6, background: `${color}10` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color }}>{i + 1}.</span>
            <span style={{ fontSize: 9.5, color: t.textSecondary }}>{s}</span>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
