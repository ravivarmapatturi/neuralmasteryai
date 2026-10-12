import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Click Hit vs Miss to see the two paths a cache-aside read can
 * take -- a miss falls through to the database and writes the
 * result back into the cache before returning it. */
export default function CacheAsideFlowDiagram() {
  const t = useVizTokens();
  const [hit, setHit] = useState(false);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;

  const STEPS = hit
    ? ['Request', 'Check cache', 'Hit -- return cached value']
    : ['Request', 'Check cache', 'Miss -- query database', 'Write result to cache (TTL)', 'Return value'];

  return (
    <VisualizationContainer footer={hit ? 'Cache hit: no database round-trip at all -- the fastest possible path.' : 'Cache miss: the request falls through to the database, then writes the result back into the cache so the next request for the same key is a hit.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setHit(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !hit ? 700 : 500, background: !hit ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!hit ? color : t.border}`, color: !hit ? color : t.textSecondary, cursor: 'pointer' }}>
          Cache miss
        </button>
        <button type="button" onClick={() => setHit(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: hit ? 700 : 500, background: hit ? `${okColor}20` : t.surfaceAlt, border: `1.25px solid ${hit ? okColor : t.border}`, color: hit ? okColor : t.textSecondary, cursor: 'pointer' }}>
          Cache hit
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          const stepColor = last ? (hit ? okColor : color) : t.border;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SketchBox color={stepColor} strokeWidth={last ? 2 : 1.3} style={{ maxWidth: 120 }}>
                <div style={{ padding: '0.5rem 0.6rem', background: last ? `${stepColor}18` : t.surfaceAlt }}>
                  <span style={{ fontSize: 9, fontWeight: last ? 700 : 500, fontFamily: HAND_FONT, color: last ? stepColor : t.textPrimary }}>{s}</span>
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
