import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchEllipse, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** MCP and A2A standardize two DIFFERENT edges of the same graph -- agent
 * to tool, vs. agent to agent -- and get confused constantly because both
 * are "agent protocols." Click either to see why the same request/response
 * shape doesn't fit both. */
export default function McpVsA2aScopeDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<'mcp' | 'a2a'>('mcp');
  const mcpColor = getConceptColor(t, 'query');
  const a2aColor = getConceptColor(t, 'key');
  const width = 480;
  const height = 170;
  const agentX = 60;
  const agent2X = 420;
  const toolX = 420;
  const y = 85;

  const desc: Record<'mcp' | 'a2a', string> = {
    mcp: 'MCP standardizes agent -> tool: stateless-ish, synchronous, "call a function, get a result." Tools have no reasoning of their own.',
    a2a: 'A2A standardizes agent -> agent: the receiving agent has its own reasoning and state, may ask clarifying questions, take a while, or report partial progress -- closer to delegating to a colleague than calling a function.',
  };

  return (
    <VisualizationContainer footer={desc[active]}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <g onClick={() => setActive('mcp')} onMouseEnter={() => setActive('mcp')} style={{ cursor: 'pointer' }} opacity={active === 'mcp' ? 1 : 0.35}>
          <circle cx={agentX} cy={30} r={22} fill={`${mcpColor}18`} stroke="none" />
          <SketchEllipse cx={agentX} cy={30} width={44} height={44} color={mcpColor} strokeWidth={active === 'mcp' ? 2.5 : 1.5} id="m2a-agent" />
          <text x={agentX} y={34} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={mcpColor}>Agent</text>
          <rect x={toolX - 30} y={10} width={60} height={40} rx={6} fill={`${mcpColor}18`} stroke="none" />
          <SketchRect x={toolX - 30} y={10} width={60} height={40} color={mcpColor} strokeWidth={active === 'mcp' ? 2.5 : 1.5} id="m2a-tool" />
          <text x={toolX} y={34} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={mcpColor}>Tool</text>
          <SketchArrow points={[[agentX + 22, 30], [toolX - 32, 30]]} color={mcpColor} strokeWidth={2} id="m2a-arrow-1" />
          <text x={(agentX + toolX) / 2} y={20} textAnchor="middle" fontSize={8} fontFamily={HAND_FONT} fill={mcpColor}>MCP: call, get result</text>
        </g>

        <g onClick={() => setActive('a2a')} onMouseEnter={() => setActive('a2a')} style={{ cursor: 'pointer' }} opacity={active === 'a2a' ? 1 : 0.35}>
          <circle cx={agentX} cy={y + 40} r={22} fill={`${a2aColor}18`} stroke="none" />
          <SketchEllipse cx={agentX} cy={y + 40} width={44} height={44} color={a2aColor} strokeWidth={active === 'a2a' ? 2.5 : 1.5} id="m2a-agentA" />
          <text x={agentX} y={y + 44} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={a2aColor}>Agent A</text>
          <circle cx={agent2X} cy={y + 40} r={22} fill={`${a2aColor}18`} stroke="none" />
          <SketchEllipse cx={agent2X} cy={y + 40} width={44} height={44} color={a2aColor} strokeWidth={active === 'a2a' ? 2.5 : 1.5} id="m2a-agentB" />
          <text x={agent2X} y={y + 44} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={a2aColor}>Agent B</text>
          <SketchArrow points={[[agentX + 22, y + 34], [agent2X - 22, y + 34]]} color={a2aColor} strokeWidth={2} id="m2a-arrow-2" />
          <SketchArrow points={[[agent2X - 22, y + 48], [agentX + 22, y + 48]]} color={a2aColor} strokeWidth={2} id="m2a-arrow-3" />
          <text x={(agentX + agent2X) / 2} y={y + 20} textAnchor="middle" fontSize={8} fontFamily={HAND_FONT} fill={a2aColor}>A2A: delegate, clarify, report progress</text>
        </g>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>Click either edge -- same "agent talks to X" shape, structurally different problem.</div>
    </VisualizationContainer>
  );
}
