import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Pattern = 'hierarchical' | 'peer' | 'blackboard';

const DESC: Record<Pattern, string> = {
  hierarchical: 'One orchestrator delegates to specialized sub-agents and combines results. Easiest to reason about and debug -- there\'s a clear owner of the overall task.',
  peer: 'Agents communicate directly with each other as equals, no central coordinator. More flexible, but harder to guarantee convergence or debug when something goes wrong.',
  blackboard: 'Agents don\'t talk to each other directly -- they read/write shared state and react to changes in it. Useful when the set of contributing agents isn\'t fixed in advance.',
};

/** Trim line coordinates so lines stop cleanly at node perimeters */
function getPerimeterPoints(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { startX: x1, startY: y1, endX: x2, endY: y2 };
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    startX: x1 + ux * r1,
    startY: y1 + uy * r1,
    endX: x2 - ux * r2,
    endY: y2 - uy * r2,
  };
}

/** The three topologies from Multi-Agent Systems, drawn as actual graphs
 * instead of described in prose -- the shape difference (star vs. mesh vs.
 * shared-node) is the entire tradeoff between debuggability and
 * flexibility. */
export default function CoordinationPatternsDiagram() {
  const t = useVizTokens();
  const [pattern, setPattern] = useState<Pattern>('hierarchical');
  const color = getConceptColor(t, 'attention');
  const width = 340;
  const height = 220;
  const cx = width / 2;
  const cy = height / 2;
  const orbitR = 68;
  const agentR = 18;
  const centerR = 20;

  const agents = [0, 1, 2, 3].map((i) => {
    const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + orbitR * Math.cos(angle), y: cy + orbitR * Math.sin(angle) };
  });

  return (
    <VisualizationContainer footer={DESC[pattern]}>
      <PillSelect<Pattern>
        label="Coordination pattern"
        value={pattern}
        onChange={setPattern}
        options={[
          { value: 'hierarchical', label: 'Hierarchical' },
          { value: 'peer', label: 'Peer-to-peer' },
          { value: 'blackboard', label: 'Blackboard' },
        ]}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <defs>
          <marker id="coord-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>

        {/* Lines strictly between perimeters, never intersecting labels */}
        {pattern === 'hierarchical' &&
          agents.map((a, i) => {
            const { startX, startY, endX, endY } = getPerimeterPoints(cx, cy, centerR, a.x, a.y, agentR + 4);
            return (
              <line
                key={i}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={color}
                strokeWidth={1.5}
                markerEnd="url(#coord-arrow)"
              />
            );
          })}

        {pattern === 'peer' &&
          agents.map((a, i) =>
            agents.slice(i + 1).map((b, j) => {
              const actualJ = i + 1 + j;
              const isOpposite = Math.abs(i - actualJ) === 2;
              // If opposite, curve slightly so diagonal lines do not collide dead center
              if (isOpposite) {
                const midAngle = (i === 0 ? 0 : Math.PI);
                const offset = 18;
                const midX = cx + offset * Math.cos(midAngle);
                const midY = cy + offset * Math.sin(midAngle);
                return (
                  <path
                    key={`${i}-${actualJ}`}
                    d={`M ${a.x},${a.y} Q ${midX},${midY} ${b.x},${b.y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.65}
                  />
                );
              }
              const { startX, startY, endX, endY } = getPerimeterPoints(a.x, a.y, agentR, b.x, b.y, agentR);
              return (
                <line
                  key={`${i}-${actualJ}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={color}
                  strokeWidth={1.2}
                  opacity={0.65}
                />
              );
            })
          )}

        {pattern === 'blackboard' &&
          agents.map((a, i) => {
            const { startX, startY, endX, endY } = getPerimeterPoints(a.x, a.y, agentR, cx, cy, 26);
            return (
              <line
                key={i}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={color}
                strokeWidth={1.3}
                strokeDasharray="3 2"
                opacity={0.7}
              />
            );
          })}

        {/* Center node for hierarchical */}
        {pattern === 'hierarchical' && (
          <g>
            <circle cx={cx} cy={cy} r={centerR} fill={t.surface} stroke="none" />
            <circle cx={cx} cy={cy} r={centerR} fill={`${color}30`} stroke={color} strokeWidth={2} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={color}>
              Orch.
            </text>
          </g>
        )}

        {/* Center node for blackboard */}
        {pattern === 'blackboard' && (
          <g>
            <rect x={cx - 30} y={cy - 14} width={60} height={28} rx={6} fill={t.surface} stroke="none" />
            <rect x={cx - 30} y={cy - 14} width={60} height={28} rx={6} fill={t.surfaceAlt} stroke={t.textMuted} strokeWidth={1.5} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={8} fontWeight={600} fill={t.textPrimary}>
              shared state
            </text>
          </g>
        )}

        {/* Outer Agent nodes */}
        {agents.map((a, i) => (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r={agentR} fill={t.surface} stroke="none" />
            <circle cx={a.x} cy={a.y} r={agentR} fill={`${color}20`} stroke={color} strokeWidth={1.5} />
            <text x={a.x} y={a.y + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill={color}>
              A{i + 1}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same 4 agents, 3 different topologies -- the shape IS the tradeoff.
      </div>
    </VisualizationContainer>
  );
}
