import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TOKENS = ['The', 'cat', 'sat'];
const N_EXPERTS = 8;
const TOP_K = 2;
// Fixed, deterministic "router scores" per token so the top-2 is stable and inspectable.
const SCORES: Record<string, number[]> = {
  The: [0.05, 0.03, 0.62, 0.04, 0.08, 0.02, 0.11, 0.05],
  cat: [0.71, 0.04, 0.03, 0.02, 0.05, 0.09, 0.03, 0.03],
  sat: [0.02, 0.58, 0.05, 0.03, 0.22, 0.02, 0.04, 0.04],
};

/** Every token gets its OWN top-k expert selection from the router --
 * click a token to see which 2 of 8 experts actually run for it, and that
 * every other token's parameters sit completely idle for this forward
 * pass. That's the whole mechanism behind "larger model, same compute." */
export default function MoeRoutingDiagram() {
  const t = useVizTokens();
  const tokenKeys = TOKENS;
  const cycle = useAutoCycle(tokenKeys.length, 2600);
  const selected = tokenKeys[cycle.value];
  const routerColor = getConceptColor(t, 'attention');
  const activeColor = getConceptColor(t, 'embedding');

  const scores = SCORES[selected];
  const topIndices = [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, TOP_K);

  return (
    <VisualizationContainer footer={`Router scores every expert for "${selected}"; only the top-${TOP_K} (experts ${topIndices.join(', ')}) actually run. The other ${N_EXPERTS - TOP_K} experts' parameters sit idle for this token -- a different token activates a different subset.`}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {TOKENS.map((tok) => (
          <div
            key={tok}
            onClick={() => cycle.pick(tokenKeys.indexOf(tok))}
            style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, background: selected === tok ? `${routerColor}30` : t.surfaceAlt, border: `1.5px solid ${selected === tok ? routerColor : t.border}`, color: selected === tok ? routerColor : t.textSecondary }}
          >
            {tok}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {Array.from({ length: N_EXPERTS }, (_, i) => {
          const isActive = topIndices.includes(i);
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? `${activeColor}30` : t.surfaceAlt, border: `2px solid ${isActive ? activeColor : t.border}`, opacity: isActive ? 1 : 0.4 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: isActive ? activeColor : t.textMuted }}>E{i}</span>
              </div>
              <div style={{ fontSize: 8, fontFamily: 'monospace', color: t.textMuted, marginTop: 3 }}>{scores[i].toFixed(2)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Click a token — its router distribution changes, and a different top-{TOP_K} of {N_EXPERTS} experts light up.
      </div>
    </VisualizationContainer>
  );
}
