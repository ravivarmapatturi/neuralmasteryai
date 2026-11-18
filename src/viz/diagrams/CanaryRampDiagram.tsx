import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [5, 25, 50, 100];

/** Step through the actual 5 -> 25 -> 50 -> 100 ramp -- each stage gated
 * on the previous one's metrics staying healthy, with a rollback option
 * at every step. */
export default function CanaryRampDiagram() {
  const t = useVizTokens();
  const { value: stage, pick } = useAutoCycle(STAGES.length, 3000, 1);
  const oldColor = getConceptColor(t, 'query');
  const newColor = getConceptColor(t, 'attention');
  const pct = STAGES[stage];

  return (
    <VisualizationContainer footer={`Stage ${stage + 1} of ${STAGES.length}: ${pct}% of traffic on the new version. Each stage only proceeds if the previous stage's metrics stayed healthy -- a degradation at any point routes traffic back away from the canary.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {STAGES.map((p, i) => (
          <button key={p} type="button" onClick={() => pick(i)} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: stage === i ? 700 : 500, background: stage === i ? `${newColor}20` : t.surfaceAlt, border: `1.25px solid ${stage === i ? newColor : t.border}`, color: stage === i ? newColor : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
            {p}%
          </button>
        ))}
      </div>
      <div style={{ height: 26, borderRadius: 6, overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <div style={{ width: `${100 - pct}%`, background: oldColor, opacity: 0.7, transition: 'width 400ms ease' }} />
        <div style={{ width: `${pct}%`, background: newColor, opacity: 0.85, transition: 'width 400ms ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: oldColor, fontWeight: 600 }}>■ old version ({100 - pct}%)</span>
        <span style={{ color: newColor, fontWeight: 700 }}>■ canary ({pct}%)</span>
      </div>
    </VisualizationContainer>
  );
}
