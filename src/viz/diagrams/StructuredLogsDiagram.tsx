import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const UNSTRUCTURED = '2026-08-20 14:32:07 ERROR user 4471 request failed timeout after 30s on /predict';
const STRUCTURED = { timestamp: '2026-08-20T14:32:07Z', level: 'ERROR', user_id: 4471, endpoint: '/predict', error: 'timeout', duration_ms: 30000 };

/** The same event, two formats -- toggle to see why "queryable at scale"
 * needs consistent fields, not just readable text. */
export default function StructuredLogsDiagram() {
  const t = useVizTokens();
  const [structured, setStructured] = useState(true);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={structured ? 'Structured: query "all ERROR logs where endpoint=/predict and duration_ms > 10000" directly -- the fields are consistent and machine-parseable.' : 'Unstructured: fine to grep by hand, but "all timeouts on /predict over 10s" requires parsing free text, not a direct query.'}>
      <button type="button" onClick={() => setStructured((s) => !s)} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${color}`, background: structured ? `${color}15` : 'transparent', color, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
        {structured ? 'Structured (JSON)' : 'Unstructured (free text)'}
      </button>
      <SketchBox color={color} strokeWidth={1.3}>
        <div style={{ padding: '0.7rem 0.9rem', background: t.surfaceAlt, fontFamily: 'monospace', fontSize: 10.5, color: t.textSecondary, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {structured ? JSON.stringify(STRUCTURED, null, 2) : UNSTRUCTURED}
        </div>
      </SketchBox>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        "Structured" is the operative word for production systems -- this is what makes logs aggregatable at scale.
      </div>
    </VisualizationContainer>
  );
}
