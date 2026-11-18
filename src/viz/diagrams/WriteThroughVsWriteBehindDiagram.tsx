import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Click to compare write-through (cache and database updated
 * synchronously, before acking) against write-behind (cache updated
 * and acked immediately, database catches up asynchronously). */
export default function WriteThroughVsWriteBehindDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4000);
  const behind = cyc.value === 1;
  const color = getConceptColor(t, 'attention');

  const STEPS = behind
    ? ['App writes', 'Cache updated', 'Ack returned', '(async) DB flush later']
    : ['App writes', 'Cache + DB updated', 'Ack returned'];

  return (
    <VisualizationContainer footer={behind ? 'Write-behind: the write is acked as soon as the cache is updated -- fast, but a cache crash before the async flush to the database loses that write.' : 'Write-through: cache and database are updated together before acking -- never stale, but write latency is at least as slow as the database write itself.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: !behind ? 700 : 500,
            background: !behind ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${!behind ? color : t.border}`,
            color: !behind ? color : t.textSecondary,
            boxShadow: !behind && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Write-through
        </button>
        <button
          type="button"
          onClick={() => cyc.pick(1)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: behind ? 700 : 500,
            background: behind ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${behind ? color : t.border}`,
            color: behind ? color : t.textSecondary,
            boxShadow: behind && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Write-behind
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SketchBox color={last ? color : t.border} strokeWidth={last ? 2 : 1.3} style={{ maxWidth: 130 }}>
                <div style={{ padding: '0.5rem 0.6rem', background: last ? `${color}18` : t.surfaceAlt }}>
                  <span style={{ fontSize: 9, fontWeight: last ? 700 : 500, fontFamily: HAND_FONT, color: last ? color : t.textPrimary }}>{s}</span>
                </div>
              </SketchBox>
              {!last && <span style={{ color: t.textMuted, fontSize: 11 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}