import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PAGES = [
  { line1: 'Agent', line2: 'Fundamentals', href: '/docs/agents/agent-fundamentals', desc: 'The loop, tool-calling mechanics, and memory -- the mechanical building blocks.' },
  { line1: 'Agent', line2: 'Architectures', href: '/docs/agents/agent-architectures', desc: 'ReAct, Plan-and-Execute, reflection -- concrete ways to structure the loop.' },
  { line1: 'MCP', line2: 'Protocols', href: '/docs/agents/mcp/overview', desc: 'Standardizing how an agent talks to tools.' },
  { line1: 'A2A', line2: 'Protocols', href: '/docs/agents/a2a/overview', desc: 'Standardizing how an agent talks to other agents.' },
  { line1: 'Multi-Agent', line2: 'Systems', href: '/docs/agents/multi-agent-systems', desc: 'What changes once more than one agent is coordinating.' },
];

/** The reading order this section actually implies: mechanics first, then
 * how to structure them, then the protocols that let more than one agent
 * (or agent+tool) talk to each other at all. */
export default function AgentSectionMapDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(0);
  const color = getConceptColor(t, 'attention');
  const width = 560;
  const height = 95;
  const boxW = 86;
  const boxH = 46;
  const boxY = 18;
  const stepX = (i: number) => 16 + i * 110;
  const arrowY = boxY + boxH / 2;

  return (
    <VisualizationContainer footer={PAGES[active].desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="asm-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 Z" fill={t.textMuted} />
          </marker>
        </defs>

        {/* Arrows strictly between the bounding boxes, never crossing labels */}
        {PAGES.map((_, i) => i > 0 && (
          <line
            key={i}
            x1={stepX(i - 1) + boxW + 3}
            y1={arrowY}
            x2={stepX(i) - 6}
            y2={arrowY}
            stroke={t.textMuted}
            strokeWidth={1.5}
            markerEnd="url(#asm-arrow)"
          />
        ))}

        {/* Stage cards */}
        {PAGES.map((p, i) => {
          const isActive = active === i;
          const x = stepX(i);
          return (
            <g
              key={p.line1 + p.line2}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={8}
                fill={isActive ? `${color}25` : t.surfaceAlt}
                stroke={isActive ? color : t.border}
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={x + boxW / 2}
                y={boxY + 18}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={isActive ? 700 : 600}
                fill={isActive ? color : t.textPrimary}
              >
                {p.line1}
              </text>
              <text
                x={x + boxW / 2}
                y={boxY + 32}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={isActive ? 700 : 600}
                fill={isActive ? color : t.textPrimary}
              >
                {p.line2}
              </text>
              <text
                x={x + boxW / 2}
                y={boxY + boxH + 15}
                textAnchor="middle"
                fontSize={8}
                fill={t.textMuted}
              >
                Stage {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a stage for what it covers and how it builds on the one before it.
      </div>
    </VisualizationContainer>
  );
}
