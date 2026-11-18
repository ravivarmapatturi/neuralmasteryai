import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A "charge the customer" request that times out after actually
 * succeeding, then gets retried -- click to see it duplicate the
 * charge without an idempotency key, versus get deduplicated with
 * one. */
export default function IdempotencyKeyDiagram() {
  const t = useVizTokens();
  const { value: keyIdx, pick } = useAutoCycle(2, 3500, 1);
  const hasKey = keyIdx === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={hasKey ? 'The retry carries the same idempotency key as attempt 1. The server recognizes it as already-processed and returns the original result -- no duplicate charge.' : 'Attempt 1 actually succeeded server-side, but the client never saw the response before timing out. The retry looks like a brand-new request -- the customer is charged twice.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !hasKey ? 700 : 500, background: !hasKey ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!hasKey ? color : t.border}`, color: !hasKey ? color : t.textSecondary, cursor: 'pointer' }}>
          No idempotency key
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: hasKey ? 700 : 500, background: hasKey ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${hasKey ? color : t.border}`, color: hasKey ? color : t.textSecondary, cursor: 'pointer' }}>
          With idempotency key
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: `${okColor}12` }}>
          <span style={{ fontSize: 10.5, color: t.textSecondary }}>Attempt 1{hasKey ? ' (key: abc-123)' : ''} — timed out client-side, succeeded server-side</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: okColor }}>charged</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: hasKey ? `${okColor}12` : `${badColor}15` }}>
          <span style={{ fontSize: 10.5, color: t.textSecondary }}>Retry{hasKey ? ' (key: abc-123)' : ''}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: hasKey ? okColor : badColor }}>{hasKey ? 'deduped — returns original result' : 'charged again'}</span>
        </div>
      </div>
    </VisualizationContainer>
  );
}
