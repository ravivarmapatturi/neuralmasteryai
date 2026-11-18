import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { FlowDots, PulseRect, line } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

const APPS = ['IDE', 'Agent framework', 'Chat app'];
const TOOLS = ['Filesystem', 'GitHub', 'Database', 'Slack'];

/** Every app needing custom code for every tool, versus every app and
 * every tool needing only MCP -- click to compare the M×N wiring
 * against M+N. */
export default function MxNIntegrationProblemDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4500);
  const withMcp = cyc.value === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;
  const connections = APPS.length * TOOLS.length;

  return (
    <VisualizationContainer footer={withMcp ? `Every app implements MCP once, every tool exposes an MCP server once -- ${APPS.length} + ${TOOLS.length} = ${APPS.length + TOOLS.length} integrations total, and any app can now use any tool.` : `Every app needs custom integration code for every tool it wants to use -- ${APPS.length} × ${TOOLS.length} = ${connections} separate integrations, and adding one more app or tool means writing that many more.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: !withMcp ? 700 : 500,
            background: !withMcp ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${!withMcp ? color : t.border}`,
            color: !withMcp ? color : t.textSecondary,
            boxShadow: !withMcp && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Custom integrations
        </button>
        <button
          type="button"
          onClick={() => cyc.pick(1)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: withMcp ? 700 : 500,
            background: withMcp ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${withMcp ? color : t.border}`,
            color: withMcp ? color : t.textSecondary,
            boxShadow: withMcp && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Via MCP
        </button>
      </div>
      <svg width="100%" viewBox="0 0 320 140" style={{ display: 'block' }}>
        {APPS.map((app, i) => {
          const y = 15 + i * 32;
          return (
            <g key={app}>
              <rect x={5} y={y} width={90} height={20} rx={5} fill={t.surfaceAlt} stroke={t.border} />
              <text x={50} y={y + 14} textAnchor="middle" fontSize={8} fill={t.textPrimary}>{app}</text>
            </g>
          );
        })}
        {withMcp && (
          <g>
            <rect x={135} y={55} width={50} height={24} rx={6} fill={`${okColor}25`} stroke={okColor} strokeWidth={1.5} />
            {!reducedMotion && (
              <PulseRect x={135} y={55} w={50} h={24} color={okColor} />
            )}
            <text x={160} y={70} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={okColor}>MCP</text>
          </g>
        )}
        {TOOLS.map((tool, i) => {
          const y = 5 + i * 32;
          return (
            <g key={tool}>
              <rect x={225} y={y} width={90} height={20} rx={5} fill={t.surfaceAlt} stroke={t.border} />
              <text x={270} y={y + 14} textAnchor="middle" fontSize={8} fill={t.textPrimary}>{tool}</text>
            </g>
          );
        })}
        {withMcp ? (
          <>
            {APPS.map((_, i) => (
              <g key={`app-flow-${i}`}>
                <line x1={95} y1={15 + i * 32 + 10} x2={135} y2={67} stroke={okColor} strokeWidth={1} opacity={0.6} />
                {!reducedMotion && (
                  <FlowDots
                    d={line(95, 15 + i * 32 + 10, 135, 67)}
                    color={okColor}
                    count={1}
                    dur={2}
                    r={2.5}
                  />
                )}
              </g>
            ))}
            {TOOLS.map((_, j) => (
              <g key={`tool-flow-${j}`}>
                <line x1={185} y1={67} x2={225} y2={5 + j * 32 + 10} stroke={okColor} strokeWidth={1} opacity={0.6} />
                {!reducedMotion && (
                  <FlowDots
                    d={line(185, 67, 225, 5 + j * 32 + 10)}
                    color={okColor}
                    count={1}
                    dur={2}
                    r={2.5}
                  />
                )}
              </g>
            ))}
          </>
        ) : (
          APPS.flatMap((_, i) =>
            TOOLS.map((_, j) => (
              <line key={`${i}-${j}`} x1={95} y1={15 + i * 32 + 10} x2={225} y2={5 + j * 32 + 10} stroke={badColor} strokeWidth={0.75} opacity={0.4} />
            )),
          )
        )}
      </svg>
    </VisualizationContainer>
  );
}