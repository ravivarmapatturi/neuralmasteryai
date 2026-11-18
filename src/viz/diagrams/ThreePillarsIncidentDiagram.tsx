import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { key: 'metric', label: 'Metric spike', desc: 'A dashboard shows p99 latency jumped at 14:32 -- something degraded, and roughly when.' },
  { key: 'trace', label: 'Pivot to traces', desc: 'Pull traces from that time window -- which service in the request path actually got slow.' },
  { key: 'logs', label: 'Pivot to logs', desc: 'Pull logs from that specific service, that specific time -- the exact error, the exact input that triggered it.' },
];

/** A real incident investigation, step by step -- click through the
 * actual pivot from "something's wrong" to "here's exactly what
 * happened." */
export default function ThreePillarsIncidentDiagram() {
  const t = useVizTokens();
  const { value: step, pick } = useAutoCycle(STEPS.length, 2500, 0);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={STEPS[step].desc}>
      <div style={{ display: 'flex', gap: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              onClick={() => pick(i)}
              onMouseEnter={() => pick(i)}
              style={{ cursor: 'pointer', padding: '0.6rem 0.9rem', borderRadius: 8, background: step === i ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${step === i ? color : t.border}`, fontSize: 11, fontWeight: step === i ? 700 : 500, color: step === i ? color : t.textPrimary }}
            >
              {i + 1}. {s.label}
            </div>
            {i < STEPS.length - 1 && <span style={{ color: t.textMuted, margin: '0 4px' }}>→</span>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Alerting runs on step 1 (cheap, fast). Root-causing an actual incident is steps 2 and 3.
      </div>
    </VisualizationContainer>
  );
}
