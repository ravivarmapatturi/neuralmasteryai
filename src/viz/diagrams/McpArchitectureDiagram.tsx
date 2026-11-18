import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { FlowDots, PulseRect, line } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';
import { edgeToEdge, type Box } from './architectureShapes';

const CLIENT_BOX: Box = { x: 25, y: 55, w: 110, h: 40 };
const SERVERS = [
  { key: 'fs', label: 'Filesystem server', offers: 'Tools: read_file, write_file, list_directory' },
  { key: 'gh', label: 'GitHub server', offers: 'Tools: create_issue, search_code · Resources: repo contents' },
  { key: 'db', label: 'Database server', offers: 'Tools: run_query · Resources: table schemas' },
];

/** One AI application connecting to multiple MCP servers -- click a
 * server to see what it exposes to the client. */
export default function McpArchitectureDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(SERVERS.length, 3500);
  const active = SERVERS[cyc.value].key;
  const color = getConceptColor(t, 'attention');
  const s = SERVERS[cyc.value];

  return (
    <VisualizationContainer footer={s.offers}>
      <svg width="100%" viewBox="0 0 320 150" style={{ display: 'block' }}>
        <defs>
          <marker id="mcp-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
          </marker>
        </defs>
        <rect x={CLIENT_BOX.x} y={CLIENT_BOX.y} width={CLIENT_BOX.w} height={CLIENT_BOX.h} rx={7} fill={`${color}25`} stroke={color} strokeWidth={2} />
        <text x={CLIENT_BOX.x + CLIENT_BOX.w / 2} y={CLIENT_BOX.y + 24} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={color}>MCP Client (AI app)</text>
        {SERVERS.map((x, i) => {
          const isActive = active === x.key;
          const y = 15 + i * 45;
          const serverBox: Box = { x: 200, y, w: 105, h: 26 };
          const { from, to } = edgeToEdge(CLIENT_BOX, serverBox);
          return (
            <g key={x.key} onClick={() => cyc.pick(i)} onMouseEnter={() => cyc.pick(i)} style={{ cursor: 'pointer' }}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={isActive ? color : t.textMuted} strokeWidth={isActive ? 2 : 1} opacity={isActive ? 1 : 0.35} markerEnd={isActive ? 'url(#mcp-arrow)' : undefined} />
              {isActive && !reducedMotion && (
                <FlowDots
                  d={line(from.x, from.y, to.x, to.y)}
                  color={color}
                  count={2}
                  dur={2.2}
                  r={3}
                />
              )}
              <rect x={serverBox.x} y={serverBox.y} width={serverBox.w} height={serverBox.h} rx={6} fill={isActive ? `${color}20` : t.surfaceAlt} stroke={isActive ? color : t.border} strokeWidth={1.5} />
              {isActive && !reducedMotion && (
                <PulseRect x={serverBox.x} y={serverBox.y} w={serverBox.w} h={serverBox.h} color={color} />
              )}
              <text x={serverBox.x + serverBox.w / 2} y={y + 16} textAnchor="middle" fontSize={8} fontWeight={isActive ? 700 : 500} fill={isActive ? color : t.textPrimary}>{x.label}</text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}