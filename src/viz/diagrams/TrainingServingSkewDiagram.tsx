import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** The exact same feature, computed two subtly different ways -- click
 * to reveal the discrepancy that silently degrades accuracy in
 * production. */
export default function TrainingServingSkewDiagram() {
  const t = useVizTokens();
  const [revealed, setRevealed] = useState(true);
  const trainColor = getConceptColor(t, 'query');
  const serveColor = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;

  return (
    <VisualizationContainer footer={revealed ? 'Both compute "last-hour click count" -- but the batch job uses a strict 60-minute window while the real-time service uses a rolling window with slightly different boundary handling. Same feature NAME, different VALUES -- the model sees a distribution shift it was never trained on.' : 'Click "reveal computation" -- both pipelines claim to compute the identical feature.'}>
      <button type="button" onClick={() => setRevealed((r) => !r)} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${badColor}`, background: 'transparent', color: badColor, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
        {revealed ? 'Hide computation details' : 'Reveal computation details'}
      </button>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, padding: '0.7rem', borderRadius: 9, background: `${trainColor}15`, border: `1.5px solid ${trainColor}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: trainColor }}>Training (batch, Python)</div>
          <div style={{ fontSize: 9.5, color: t.textMuted, marginTop: 4 }}>{revealed ? 'strict 60-min window, historical data' : 'last_hour_clicks'}</div>
        </div>
        <div style={{ flex: 1, padding: '0.7rem', borderRadius: 9, background: `${serveColor}15`, border: `1.5px solid ${serveColor}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: serveColor }}>Serving (real-time)</div>
          <div style={{ fontSize: 9.5, color: t.textMuted, marginTop: 4 }}>{revealed ? 'rolling window, different boundary logic' : 'last_hour_clicks'}</div>
        </div>
      </div>
      {revealed && (
        <div style={{ textAlign: 'center', fontSize: 11, color: badColor, fontWeight: 700, marginTop: 8 }}>
          same feature name, different values -- skew
        </div>
      )}
    </VisualizationContainer>
  );
}
