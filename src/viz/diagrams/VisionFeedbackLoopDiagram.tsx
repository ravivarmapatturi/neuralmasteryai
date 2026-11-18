import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';

const STAGES = ['collect conditions', 'label & audit', 'train / evaluate', 'ship guarded', 'monitor failures', 'targeted refresh'];
export default function VisionFeedbackLoopDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(STAGES.length, 2500);
  const [userStep, setUserStep] = useState<number | null>(null);
  const step = userStep ?? autoIdx;

  return (
    <VisualizationContainer footer={`Step ${step + 1}: ${STAGES[step]}. Reliable vision improves by feeding real deployment failures back into the next data collection pass.`}>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ display: 'contents' }}>
            <button
              type="button"
              onClick={() => setUserStep(i)}
              style={{
                border: `2px solid ${step === i ? t.accentPrimary : t.border}`,
                background: step === i ? `${t.accentPrimary}25` : t.surfaceAlt,
                color: t.textPrimary,
                borderRadius: 999,
                padding: '7px 10px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {i + 1}. {s}
            </button>
            {i < STAGES.length - 1 && <span style={{ color: t.textMuted }}>→</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: t.textSecondary }}>
        Loop auto-cycles; click any stage to inspect the operational evidence feed.
      </div>
    </VisualizationContainer>
  );
}
