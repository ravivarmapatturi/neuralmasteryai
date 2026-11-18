import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** An MCP server that needs to call an upstream API on the user's
 * behalf -- click to compare the forbidden "confused deputy" pattern
 * against the required one, where the server acts as its own OAuth
 * client to the upstream API. */
export default function TokenAudienceBindingDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 3800);
  const correct = cyc.value === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={correct ? 'The MCP server validates the incoming token was issued FOR IT (audience check), then obtains a SEPARATE token as its own OAuth client to call the upstream API.' : 'MUST NOT: forwarding the client\'s token unmodified to an upstream API lets that API incorrectly trust it as validated -- the "confused deputy" problem this spec explicitly forbids.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: !correct ? 700 : 500,
            background: !correct ? `${badColor}20` : t.surfaceAlt,
            border: `1.25px solid ${!correct ? badColor : t.border}`,
            color: !correct ? badColor : t.textSecondary,
            boxShadow: !correct && !reducedMotion ? `0 0 6px ${badColor}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Token passthrough (forbidden)
        </button>
        <button
          type="button"
          onClick={() => cyc.pick(1)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: correct ? 700 : 500,
            background: correct ? `${okColor}20` : t.surfaceAlt,
            border: `1.25px solid ${correct ? okColor : t.border}`,
            color: correct ? okColor : t.textSecondary,
            boxShadow: correct && !reducedMotion ? `0 0 6px ${okColor}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Separate upstream token
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ padding: '0.5rem 0.5rem', borderRadius: 7, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, fontSize: 8.5, textAlign: 'center' }}>MCP client<br />token A</div>
        <span style={{ color: t.textMuted, fontSize: 12 }}>→</span>
        <div style={{ padding: '0.5rem 0.5rem', borderRadius: 7, background: `${color}12`, border: `1.5px solid ${color}`, fontSize: 8.5, textAlign: 'center' }}>MCP server</div>
        <span style={{ color: t.textMuted, fontSize: 12 }}>→</span>
        <div
          style={{
            padding: '0.5rem 0.5rem',
            borderRadius: 7,
            background: correct ? `${okColor}18` : `${badColor}18`,
            border: `1.5px solid ${correct ? okColor : badColor}`,
            fontSize: 8.5,
            textAlign: 'center',
            fontWeight: 700,
            color: correct ? okColor : badColor,
            boxShadow: !reducedMotion ? `0 0 8px ${correct ? okColor : badColor}33` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Upstream API<br />{correct ? 'token B (new)' : 'token A (reused!)'}
        </div>
      </div>
    </VisualizationContainer>
  );
}