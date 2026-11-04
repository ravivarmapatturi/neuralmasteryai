import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Part = 'header' | 'payload' | 'signature';
const PARTS: Record<Part, { text: string; raw: string; desc: string }> = {
  header: { text: '{"alg":"HS256","typ":"JWT"}', raw: 'eyJhbGciOiJIUzI1NiJ9', desc: 'Which signing algorithm was used. Base64url-encoded, not encrypted -- anyone can read it.' },
  payload: { text: '{"sub":"user_123","role":"admin","exp":1735689600}', raw: 'eyJzdWIiOiJ1c2VyXzEyMyJ9...', desc: 'The actual claims -- who this is, what they\'re allowed to do, when it expires. Also just base64url-encoded, NOT encrypted -- never put secrets here.' },
  signature: { text: 'HMACSHA256(header + "." + payload, secretKey)', raw: '4f8a2c9e1b...', desc: 'Proof the header+payload weren\'t tampered with -- computed with a secret/private key only the issuer holds. This is the part that\'s actually unforgeable.' },
};

/** A JWT laid out as its three real parts -- click one. The core
 * misconception this exists to correct: the payload is ENCODED, not
 * ENCRYPTED, so its contents are always readable by anyone who has the
 * token, they just can't forge a valid signature for altered contents. */
export default function JwtStructureDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<Part>('payload');
  const colorFor = (p: Part) => (p === 'header' ? getConceptColor(t, 'query') : p === 'payload' ? getConceptColor(t, 'attention') : t.accentWarn);

  return (
    <VisualizationContainer footer={PARTS[active].desc}>
      <div style={{ display: 'flex', gap: 2, fontFamily: 'monospace', fontSize: 11, flexWrap: 'wrap' }}>
        {(['header', 'payload', 'signature'] as Part[]).map((p, i) => (
          <span key={p} style={{ display: 'flex', alignItems: 'center' }}>
            <span
              onClick={() => setActive(p)}
              onMouseEnter={() => setActive(p)}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 5, background: active === p ? `${colorFor(p)}25` : t.surfaceAlt, color: colorFor(p), fontWeight: active === p ? 700 : 500, border: `1.25px solid ${active === p ? colorFor(p) : t.border}` }}
            >
              {PARTS[p].raw.slice(0, 16)}…
            </span>
            {i < 2 && <span style={{ color: t.textMuted, margin: '0 2px' }}>.</span>}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 10, padding: '0.6rem 0.8rem', borderRadius: 7, background: `${colorFor(active)}12`, border: `1px solid ${colorFor(active)}40`, fontFamily: 'monospace', fontSize: 11, color: t.textSecondary, overflowX: 'auto', maxWidth: '100%' }}>
        {PARTS[active].text}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        header.payload.signature -- header and payload are only base64url-ENCODED (readable by anyone); only the signature requires the secret key.
      </div>
    </VisualizationContainer>
  );
}
