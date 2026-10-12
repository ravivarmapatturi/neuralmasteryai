import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

/** Two genuinely different error mechanisms in MCP -- click to
 * compare a protocol-level JSON-RPC error (unknown tool, invalid
 * args) against a tool execution error (isError: true in a normal
 * result). */
export default function ToolErrorTypesDiagram() {
  const t = useVizTokens();
  const [execError, setExecError] = useState(true);
  const color = getConceptColor(t, 'attention');

  const protocolJson = '{"error":{"code":-32602,"message":"Unknown tool: invalid_tool_name"}}';
  const execJson = '{"result":{"content":[{"type":"text","text":"Failed to fetch weather data: API rate limit exceeded"}],"isError":true}}';

  return (
    <VisualizationContainer footer={execError ? 'A tool that RAN but failed at the business-logic/API level -- this is a normal JSON-RPC success response, just with isError:true. The client can feed this back to the LLM so it can self-correct.' : 'The tools/call request itself is malformed -- unknown tool name, invalid arguments, server-side failure -- reported as a standard JSON-RPC error object, same as any other protocol-level failure.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setExecError(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: !execError ? 700 : 500, background: !execError ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!execError ? color : t.border}`, color: !execError ? color : t.textSecondary, cursor: 'pointer' }}>
          Protocol error
        </button>
        <button type="button" onClick={() => setExecError(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: execError ? 700 : 500, background: execError ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${execError ? color : t.border}`, color: execError ? color : t.textSecondary, cursor: 'pointer' }}>
          Tool execution error
        </button>
      </div>
      <SketchBox color={color} strokeWidth={1.3}>
        <div style={{ fontFamily: 'monospace', fontSize: 8.5, padding: '0.6rem', borderRadius: 7, background: t.surfaceAlt, color: t.textSecondary, wordBreak: 'break-word' }}>
          {execError ? execJson : protocolJson}
        </div>
      </SketchBox>
    </VisualizationContainer>
  );
}
