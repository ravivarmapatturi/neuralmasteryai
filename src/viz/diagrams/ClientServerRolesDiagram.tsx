import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Who plays each role in practice -- click to see concrete examples
 * of MCP clients versus MCP servers. */
export default function ClientServerRolesDiagram() {
  const t = useVizTokens();
  const [role, setRole] = useState<'client' | 'server'>('client');
  const color = getConceptColor(t, 'attention');

  const EXAMPLES = {
    client: ['An IDE (Claude Code, Cursor, VS Code + extension)', 'An agent framework orchestrating tool calls', 'A chat application connecting to multiple data sources'],
    server: ['A tool author wrapping an API (GitHub, Slack, a database)', 'A company exposing internal systems to AI tools', 'A SaaS product offering an MCP-compatible integration'],
  };

  return (
    <VisualizationContainer footer={role === 'client' ? 'The client is typically the AI application itself -- it connects to one or more servers and makes their capabilities available to the LLM.' : 'The server is whoever owns the tool/data being exposed -- built once, usable by any MCP-compatible client without custom integration code.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setRole('client')} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: role === 'client' ? 700 : 500, background: role === 'client' ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${role === 'client' ? color : t.border}`, color: role === 'client' ? color : t.textSecondary, cursor: 'pointer' }}>
          MCP client
        </button>
        <button type="button" onClick={() => setRole('server')} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: role === 'server' ? 700 : 500, background: role === 'server' ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${role === 'server' ? color : t.border}`, color: role === 'server' ? color : t.textSecondary, cursor: 'pointer' }}>
          MCP server
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {EXAMPLES[role].map((e) => (
          <SketchBox key={e} color={color} strokeWidth={1.2}>
            <div style={{ padding: '0.4rem 0.65rem', borderRadius: 6, background: `${color}10`, fontSize: 10, color: t.textSecondary, fontFamily: HAND_FONT }}>{e}</div>
          </SketchBox>
        ))}
      </div>
    </VisualizationContainer>
  );
}
