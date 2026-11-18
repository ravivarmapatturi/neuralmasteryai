import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { FlowDots } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Two full environments, one atomic switch -- click "cut over" to flip
 * the router, and "roll back" to flip it right back, instantly. */
export default function BlueGreenCutoverDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 4000);
  const live = value === 0 ? 'blue' : 'green';
  const blueColor = getConceptColor(t, 'query');
  const greenColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={live === 'blue' ? 'Blue is live, green is fully deployed and health-checked but receiving zero traffic -- ready for an atomic switch.' : 'Green is live -- blue stays running, untouched, as an instant rollback target. If green misbehaves, flip back immediately.'}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => pick(live === 'blue' ? 1 : 0)}
          style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${live === 'blue' ? greenColor : blueColor}`, background: 'transparent', color: live === 'blue' ? greenColor : blueColor, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}
        >
          {live === 'blue' ? 'Cut over to green →' : '← Roll back to blue'}
        </button>
      </div>

      {/* Traffic router diagram with animated live flow */}
      <svg width="100%" viewBox="0 0 380 50" style={{ display: 'block', marginBottom: 6 }}>
        <rect x={150} y={4} width={80} height={22} rx={4} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
        <text x={190} y={19} textAnchor="middle" fontSize={10} fontWeight={600} fill={t.textPrimary}>Router (100%)</text>
        
        {/* Path to Blue */}
        <path d="M 170 26 L 90 46" stroke={live === 'blue' ? blueColor : t.border} strokeWidth={live === 'blue' ? 2 : 1} strokeDasharray={live === 'blue' ? undefined : '3 3'} />
        {/* Path to Green */}
        <path d="M 210 26 L 290 46" stroke={live === 'green' ? greenColor : t.border} strokeWidth={live === 'green' ? 2 : 1} strokeDasharray={live === 'green' ? undefined : '3 3'} />

        {live === 'blue' ? (
          <FlowDots d="M 170 26 L 90 46" color={blueColor} dur={1.4} count={3} r={3} />
        ) : (
          <FlowDots d="M 210 26 L 290 46" color={greenColor} dur={1.4} count={3} r={3} />
        )}
      </svg>

      <div style={{ display: 'flex', gap: 12 }}>
        <div onClick={() => pick(0)} role="button" tabIndex={0} style={{ flex: 1, padding: '0.8rem', borderRadius: 9, background: live === 'blue' ? `${blueColor}20` : t.surfaceAlt, border: `2px solid ${blueColor}`, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: blueColor }}>Blue</div>
          <div style={{ fontSize: 9.5, color: live === 'blue' ? blueColor : t.textMuted, marginTop: 4, fontWeight: live === 'blue' ? 600 : 400 }}>{live === 'blue' ? '● LIVE -- 100% traffic' : 'standing by (rollback target)'}</div>
        </div>
        <div onClick={() => pick(1)} role="button" tabIndex={0} style={{ flex: 1, padding: '0.8rem', borderRadius: 9, background: live === 'green' ? `${greenColor}20` : t.surfaceAlt, border: `2px solid ${greenColor}`, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: greenColor }}>Green</div>
          <div style={{ fontSize: 9.5, color: live === 'green' ? greenColor : t.textMuted, marginTop: 4, fontWeight: live === 'green' ? 600 : 400 }}>{live === 'green' ? '● LIVE -- 100% traffic' : 'deployed, health-checked, 0% traffic'}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        The switch is atomic -- 0% or 100%, never a partial state in between. The cost: two full production environments running simultaneously.
      </div>
    </VisualizationContainer>
  );
}
