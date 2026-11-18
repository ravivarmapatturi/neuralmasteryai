import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Stage = 'monitoring' | 'observability';
const STAGES: Stage[] = ['monitoring', 'observability'];

/** Monitoring tells you THAT something broke; observability lets you
 * figure out WHY -- click either to see what each actually answers. */
export default function MonitoringVsObservabilityDiagram() {
  const t = useVizTokens();
  const { value: stageIdx, pick } = useAutoCycle(STAGES.length, 3500, 1);
  const active = STAGES[stageIdx];
  const monColor = getConceptColor(t, 'query');
  const obsColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer
      footer={active === 'monitoring'
        ? 'Monitoring: "a metric crossed a threshold, an alert fired" -- tells you THAT something is wrong, and roughly when.'
        : 'Observability: enough raw, queryable signal to debug a problem you did NOT anticipate in advance -- tells you WHY, even for failure modes nobody wrote a dashboard for.'}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <div onClick={() => pick(0)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(0); } }} onMouseEnter={() => pick(0)} style={{ flex: 1, cursor: 'pointer', padding: '0.8rem', borderRadius: 9, background: active === 'monitoring' ? `${monColor}18` : t.surfaceAlt, border: `1.5px solid ${active === 'monitoring' ? monColor : t.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: active === 'monitoring' ? monColor : t.textPrimary }}>Monitoring</div>
          <div style={{ fontSize: 9.5, color: t.textMuted, marginTop: 4 }}>&ldquo;something is wrong&rdquo;</div>
        </div>
        <div onClick={() => pick(1)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(1); } }} onMouseEnter={() => pick(1)} style={{ flex: 1, cursor: 'pointer', padding: '0.8rem', borderRadius: 9, background: active === 'observability' ? `${obsColor}18` : t.surfaceAlt, border: `1.5px solid ${active === 'observability' ? obsColor : t.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: active === 'observability' ? obsColor : t.textPrimary }}>Observability</div>
          <div style={{ fontSize: 9.5, color: t.textMuted, marginTop: 4 }}>&ldquo;here's why&rdquo;</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Logs, metrics, and traces are the raw signal observability is built from.
      </div>
    </VisualizationContainer>
  );
}
