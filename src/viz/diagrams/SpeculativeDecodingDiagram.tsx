import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const DRAFT_TOKENS = ['The', 'quick', 'brown', 'fox', 'jumped'];
const ACCEPTED = 3; // target model accepts first 3, rejects the rest

/** A draft model proposes several tokens ahead in one cheap pass; the
 * target model verifies all of them in a SINGLE forward pass and accepts
 * the matching prefix. Click "verify" to see the accept/reject line. */
export default function SpeculativeDecodingDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2400, 1);
  const verified = cycle.value === 1;
  const setVerified = (value: boolean | ((current: boolean) => boolean)) => cycle.pick((typeof value === 'function' ? value(verified) : value) ? 1 : 0);
  const draftColor = getConceptColor(t, 'query');
  const targetColor = getConceptColor(t, 'attention');
  const acceptColor = t.accentPrimary;
  const rejectColor = t.accentDanger;

  return (
    <VisualizationContainer footer={verified ? `Target model verifies all ${DRAFT_TOKENS.length} draft tokens in ONE forward pass -- accepts the matching prefix (${ACCEPTED} tokens), rejects the rest and generates correctly from there. Net result: ${ACCEPTED} tokens for the cost of ~1 target-model step instead of ${ACCEPTED}.` : `A small, fast DRAFT model proposes ${DRAFT_TOKENS.length} tokens ahead -- cheap, but not necessarily what the large model would have generated.`}>
      <button
        type="button"
        onClick={() => setVerified((v) => !v)}
        style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${targetColor}`, background: verified ? `${targetColor}20` : 'transparent', color: targetColor, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
      >
        {verified ? 'Verified by target model' : 'Draft proposal only — click to verify'}
      </button>
      <div style={{ marginBottom: 6, fontSize: 10, color: draftColor, fontWeight: 700 }}>DRAFT MODEL proposes:</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {DRAFT_TOKENS.map((tok, i) => {
          const accepted = i < ACCEPTED;
          const color = verified ? (accepted ? acceptColor : rejectColor) : draftColor;
          return (
            <div key={i} style={{ padding: '5px 10px', borderRadius: 6, background: `${color}20`, border: `1.5px solid ${color}`, fontSize: 11, fontFamily: 'monospace', color }}>
              {tok}
            </div>
          );
        })}
      </div>
      {verified && (
        <div style={{ marginTop: 8, fontSize: 11 }}>
          <span style={{ color: acceptColor, fontWeight: 700 }}>✓ accepted: {ACCEPTED} tokens</span>
          <span style={{ color: t.textMuted }}> · </span>
          <span style={{ color: rejectColor, fontWeight: 700 }}>✗ rejected: {DRAFT_TOKENS.length - ACCEPTED} tokens (regenerated correctly by target model)</span>
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        High acceptance rate = a meaningful wall-clock speedup, since verification is cheaper than generating one token at a time.
      </div>
    </VisualizationContainer>
  );
}
