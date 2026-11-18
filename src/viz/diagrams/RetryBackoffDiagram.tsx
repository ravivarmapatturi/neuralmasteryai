import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** A flaky task failing twice then succeeding, with exponential backoff
 * between attempts -- click "run" to step through it. */
export default function RetryBackoffDiagram() {
  const t = useVizTokens();
  const outcomes = ['fail', 'fail', 'success'];
  const delays = [0, 30, 90]; // seconds before each attempt
  const { value: attempt, pick } = useAutoCycle(outcomes.length, 2500, 2);
  const failColor = t.accentDanger;
  const okColor = t.accentPrimary;
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={`Attempt ${attempt + 1}: ${outcomes[attempt] === 'success' ? 'succeeds -- the task completes, no human paged.' : `fails (transient error) -- waits ${delays[attempt + 1]}s before retrying, backing off rather than hammering immediately.`}`}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {outcomes.map((_, i) => (
          <button key={i} type="button" onClick={() => pick(i)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: attempt === i ? 700 : 500, background: attempt === i ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${attempt === i ? color : t.border}`, color: attempt === i ? color : t.textSecondary, cursor: 'pointer' }}>
            Attempt {i + 1}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {outcomes.map((o, i) => (
          <div key={i} style={{ flex: 1, opacity: i <= attempt ? 1 : 0.25, padding: '0.6rem', borderRadius: 8, textAlign: 'center', background: i > attempt ? t.surfaceAlt : o === 'success' ? `${okColor}18` : `${failColor}18`, border: `1.5px solid ${i > attempt ? t.border : o === 'success' ? okColor : failColor}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: i > attempt ? t.textMuted : o === 'success' ? okColor : failColor }}>{i <= attempt ? o : 'pending'}</div>
            {i > 0 && <div style={{ fontSize: 8, color: t.textMuted, marginTop: 3 }}>+{delays[i]}s delay</div>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Only escalates to a human after retries are exhausted -- most transient failures resolve themselves on retry.
      </div>
    </VisualizationContainer>
  );
}
