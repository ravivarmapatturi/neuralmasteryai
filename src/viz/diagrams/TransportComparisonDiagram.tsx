import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** stdio vs. Streamable HTTP -- click to compare the concrete framing
 * and connection rules each one actually follows. */
export default function TransportComparisonDiagram() {
  const t = useVizTokens();
  const [http, setHttp] = useState(false);
  const color = getConceptColor(t, 'attention');

  const STDIO_RULES = ['Client launches server as a local subprocess', 'Messages are newline-delimited JSON-RPC, no embedded newlines', 'Server MUST NOT write anything to stdout that isn\'t a valid MCP message', 'stderr is free for logging -- client may capture, forward, or ignore it'];
  const HTTP_RULES = ['Single endpoint supports both POST and GET', 'POST carries one JSON-RPC request/notification/response per call', 'Server responds with text/event-stream (SSE) or a single application/json object', 'Mcp-Session-Id header (if issued) required on every subsequent request'];

  return (
    <VisualizationContainer footer={http ? 'For remote servers -- multiple clients, a session model, and streaming responses via SSE for long-running tool calls.' : 'For local tools -- client and server on the same machine, simplest possible framing.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setHttp(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !http ? 700 : 500, background: !http ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!http ? color : t.border}`, color: !http ? color : t.textSecondary, cursor: 'pointer' }}>
          stdio
        </button>
        <button type="button" onClick={() => setHttp(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: http ? 700 : 500, background: http ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${http ? color : t.border}`, color: http ? color : t.textSecondary, cursor: 'pointer' }}>
          Streamable HTTP
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(http ? HTTP_RULES : STDIO_RULES).map((r) => (
          <SketchBox key={r} color={color} strokeWidth={1.2}>
            <div style={{ padding: '0.4rem 0.65rem', borderRadius: 6, background: `${color}10`, fontSize: 9.5, color: t.textSecondary, fontFamily: HAND_FONT }}>{r}</div>
          </SketchBox>
        ))}
      </div>
    </VisualizationContainer>
  );
}
