import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const POOL_SIZE = 6;

/** A slow downstream dependency, with and without a timeout -- click
 * to see hung requests silently pile up and exhaust the connection
 * pool, versus fail fast and free the slot back up. */
export default function TimeoutCascadeDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick } = useAutoCycle(2, 3500, 0);
  const hasTimeout = modeIdx === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;
  const hungCount = hasTimeout ? 1 : 5;

  return (
    <VisualizationContainer footer={hasTimeout ? 'With a timeout, the hung request fails fast -- its connection slot frees up immediately for the next request.' : 'Without a timeout, each new request against the slow dependency hangs indefinitely -- the connection pool fills with stuck requests until nothing gets through, for callers unrelated to the slow dependency.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !hasTimeout ? 700 : 500, background: !hasTimeout ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!hasTimeout ? color : t.border}`, color: !hasTimeout ? color : t.textSecondary, cursor: 'pointer' }}>
          No timeout
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: hasTimeout ? 700 : 500, background: hasTimeout ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${hasTimeout ? color : t.border}`, color: hasTimeout ? color : t.textSecondary, cursor: 'pointer' }}>
          2s timeout
        </button>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {Array.from({ length: POOL_SIZE }).map((_, i) => {
          const isHung = i < hungCount;
          return (
            <div key={i} style={{ flex: 1, height: 44, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isHung ? `${badColor}18` : `${okColor}18`, border: `1.5px solid ${isHung ? badColor : okColor}` }}>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: isHung ? badColor : okColor }}>{isHung ? 'hung' : 'free'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 9, color: t.textMuted, marginTop: 8 }}>
        connection pool ({POOL_SIZE} slots) — {hungCount}/{POOL_SIZE} stuck waiting on the slow dependency
      </div>
    </VisualizationContainer>
  );
}
