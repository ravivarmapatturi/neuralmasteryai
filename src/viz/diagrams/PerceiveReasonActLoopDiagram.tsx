import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'perceive', label: 'Perceive', angle: -90, desc: 'Take in the current state -- a user request, a tool result, an observation from the last action.' },
  { key: 'reason', label: 'Reason', angle: 30, desc: 'Decide what to do about it, given everything so far -- the whole point of the underlying LLM call.' },
  { key: 'act', label: 'Act', angle: 150, desc: 'Take an action that changes the state -- call a tool, respond to the user, hand off to another agent.' },
] as const;

/** The section-level abstraction every architecture on this site's Agent
 * Architectures page is a concrete answer to -- click a stage for what it
 * actually does, then note the loop has no fixed exit: it keeps cycling
 * until reasoning decides the task is done. */
export default function PerceiveReasonActLoopDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<'perceive' | 'reason' | 'act'>('reason');
  const color = getConceptColor(t, 'attention');
  const width = 320;
  const height = 260;
  const cx = width / 2;
  const cy = 110;
  const r = 80;
  const pos = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  return (
    <VisualizationContainer footer={STAGES.find((s) => s.key === active)!.desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="pra-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const next = STAGES[(i + 1) % STAGES.length];
          const startAngle = s.angle + 30;
          const endAngle = (i === 2 ? s.angle + 120 - 30 : next.angle - 30);
          const p1 = pos(startAngle);
          const p2 = pos(endAngle);
          const midAngle = (startAngle + endAngle) / 2;
          const arcMid = pos(midAngle);
          return (
            <path
              key={s.key}
              d={`M ${p1.x},${p1.y} Q ${arcMid.x},${arcMid.y} ${p2.x},${p2.y}`}
              fill="none"
              stroke={t.textMuted}
              strokeWidth={1.5}
              markerEnd="url(#pra-arrow)"
              opacity={0.8}
            />
          );
        })}
        {STAGES.map((s) => {
          const p = pos(s.angle);
          const isActive = active === s.key;
          return (
            <g key={s.key} onClick={() => setActive(s.key)} onMouseEnter={() => setActive(s.key)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r={38} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{s.label}</text>
            </g>
          );
        })}
        <text x={cx} y={height - 20} textAnchor="middle" fontSize={9} fill={t.textMuted}>loop continues until reasoning decides the task is done</text>
      </svg>
    </VisualizationContainer>
  );
}
