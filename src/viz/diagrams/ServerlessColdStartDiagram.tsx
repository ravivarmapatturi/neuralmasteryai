import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Serverless GPU vs. an always-on VM -- click to compare cost during
 * idle periods and the cold-start penalty on the first request after
 * one. */
export default function ServerlessColdStartDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 1);
  const serverless = value === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={serverless ? 'Scales to zero when idle -- no cost during the gap, but the next request pays a cold-start penalty (seconds to tens of seconds) while a GPU worker spins up and loads weights. Right fit for spiky, low-average-utilization traffic.' : 'Continuously running -- billed for every hour whether or not it\'s handling requests, but every request gets the same fast response, no cold start. Right fit for steady, high-volume traffic.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !serverless ? 700 : 500, background: !serverless ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!serverless ? color : t.border}`, color: !serverless ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Always-on GPU VM (Predictable)
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: serverless ? 700 : 500, background: serverless ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${serverless ? color : t.border}`, color: serverless ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Serverless GPU (Scale-to-zero)
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: serverless ? `${okColor}12` : `${badColor}15`, border: `1px solid ${serverless ? `${okColor}30` : `${badColor}30`}`, transition: 'all 200ms ease' }}>
          <span style={{ fontSize: 10.5, color: t.textSecondary }}>Cost during idle period</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: serverless ? okColor : badColor }}>{serverless ? '✓ $0 (zero waste)' : '⚠ full hourly rate'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: serverless ? `${badColor}15` : `${okColor}12`, border: `1px solid ${serverless ? `${badColor}30` : `${okColor}30`}`, transition: 'all 200ms ease' }}>
          <span style={{ fontSize: 10.5, color: t.textSecondary }}>First request after idle</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: serverless ? badColor : okColor }}>{serverless ? '⚠ cold start: seconds-tens of sec' : '✓ warm: normal latency'}</span>
        </div>
      </div>
    </VisualizationContainer>
  );
}
