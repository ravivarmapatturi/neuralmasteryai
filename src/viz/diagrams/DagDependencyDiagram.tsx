import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const NODES = [
  { key: 'a', label: 'A: extract', x: 60, y: 30, deps: [] as string[] },
  { key: 'b', label: 'B: validate', x: 60, y: 100, deps: [] as string[] },
  { key: 'c', label: 'C: merge', x: 220, y: 65, deps: ['a', 'b'] },
  { key: 'd', label: 'D: train', x: 380, y: 65, deps: ['c'] },
];

/** Step C can't start until BOTH A and B finish -- click C to see its
 * dependencies highlight, click A or B to see what's waiting on them. */
export default function DagDependencyDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState('c');
  const color = getConceptColor(t, 'attention');
  const readyColor = t.accentPrimary;
  const waitingColor = t.textMuted;

  const node = NODES.find((n) => n.key === selected)!;
  const highlighted = new Set([selected, ...node.deps]);

  return (
    <VisualizationContainer footer={node.deps.length > 0 ? `${node.label} waits for: ${node.deps.map((d) => NODES.find((n) => n.key === d)!.label).join(', ')}.` : `${node.label} has no dependencies -- ready to run immediately.`}>
      <svg width="100%" viewBox="0 0 440 140" style={{ display: 'block' }}>
        <defs>
          <marker id="dag-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.border} />
          </marker>
          <marker id="dag-arrow-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
          </marker>
        </defs>
        {NODES.flatMap((n) => n.deps.map((d) => {
          const from = NODES.find((x) => x.key === d)!;
          const isHighlighted = highlighted.has(n.key) && highlighted.has(d);
          // Connect cleanly between node perimeters without penetrating card backgrounds
          const x1 = from.x + 45;
          const y1 = from.y;
          const x2 = n.x - 47;
          const y2 = n.y;
          return (
            <line
              key={`${d}-${n.key}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHighlighted ? color : t.border}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              markerEnd={isHighlighted ? 'url(#dag-arrow-active)' : 'url(#dag-arrow)'}
            />
          );
        }))}
        {NODES.map((n) => {
          const isSelected = selected === n.key;
          const isDep = node.deps.includes(n.key);
          const c = isSelected ? color : isDep ? readyColor : waitingColor;
          return (
            <g key={n.key} onClick={() => setSelected(n.key)} onMouseEnter={() => setSelected(n.key)} style={{ cursor: 'pointer' }}>
              <rect x={n.x - 45} y={n.y - 18} width={90} height={36} rx={7} fill={isSelected || isDep ? `${c}20` : t.surfaceAlt} stroke={c} strokeWidth={isSelected ? 2.5 : 1.5} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={9.5} fontWeight={isSelected ? 700 : 500} fill={c}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        No cycles allowed -- if D depended on A depended on D, no valid execution order would exist.
      </div>
    </VisualizationContainer>
  );
}
