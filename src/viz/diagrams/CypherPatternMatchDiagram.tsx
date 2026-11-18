import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

// Same graph as PropertyGraphDiagram, redefined locally (each diagram is
// self-contained per this file's own convention) -- Ada wrote Paper A;
// Paper B cites Paper A; Grace wrote Paper B.
const NODES = [
  { id: 'ada', label: 'Ada', x: 60, y: 130 },
  { id: 'doc1', label: 'Paper A', x: 220, y: 60 },
  { id: 'doc2', label: 'Paper B', x: 380, y: 130 },
  { id: 'grace', label: 'Grace', x: 220, y: 210 },
];
const EDGES = [
  { from: 'ada', to: 'doc1', label: 'WROTE' },
  { from: 'doc2', to: 'doc1', label: 'CITES' },
  { from: 'grace', to: 'doc2', label: 'WROTE' },
];

const STEPS = [
  { clause: 'MATCH (p1:Person)', nodes: ['ada'], edges: [] as number[] },
  { clause: '-[:WROTE]->(d1:Document)', nodes: ['ada', 'doc1'], edges: [0] },
  { clause: '<-[:CITES]-(d2:Document)', nodes: ['ada', 'doc1', 'doc2'], edges: [0, 1] },
  { clause: '<-[:WROTE]-(p2:Person)', nodes: ['ada', 'doc1', 'doc2', 'grace'], edges: [0, 1, 2] },
];

const WIDTH = 460;
const HEIGHT = 260;

export default function CypherPatternMatchDiagram() {
  const t = useVizTokens();
  const { value: autoStep, pick: setAutoStep, stop } = useAutoCycle(STEPS.length, 3000, 0);
  const [userStep, setUserStep] = useState<number | null>(null);
  const stepIdx = userStep ?? autoStep;
  const step = STEPS[stepIdx];
  const matchColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="This one query pattern reads almost like a sketch of the shape you're looking for: a person, connected by WROTE to a document, connected by CITES to another document, connected by WROTE to a different person. The equivalent in SQL would be a 3-way self-referencing join across a people table and a citations table -- readable, but nowhere near this direct.">
      <div style={{ fontFamily: 'monospace', fontSize: 13, background: t.surfaceAlt, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <span style={{ color: t.textMuted }}>MATCH (p1:Person)</span>
        {STEPS.slice(1).map((s, i) => (
          <span key={i} style={{ color: i + 1 <= stepIdx ? matchColor : t.textMuted, fontWeight: i + 1 <= stepIdx ? 700 : 400 }}>
            {s.clause}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STEPS.map((_, i) => (
          <VizButton
            key={i}
            variant={stepIdx === i ? 'primary' : 'secondary'}
            onClick={() => {
              stop();
              setUserStep(i);
              setAutoStep(i);
            }}
          >
            Step {i + 1}
          </VizButton>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block' }}>
        {EDGES.map((e, i) => {
          const from = NODES.find((n) => n.id === e.from)!;
          const to = NODES.find((n) => n.id === e.to)!;
          const active = step.edges.includes(i);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={i} opacity={active ? 1 : 0.25}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={active ? matchColor : t.textMuted} strokeWidth={active ? 2.5 : 1.5} />
              <rect x={midX - 24} y={midY - 10} width={48} height={16} fill={t.surface} />
              <text x={midX} y={midY + 2} textAnchor="middle" fontSize={9} fontWeight={700} fill={active ? matchColor : t.textSecondary}>
                {e.label}
              </text>
            </g>
          );
        })}
        {NODES.map((n) => {
          const active = step.nodes.includes(n.id);
          return (
            <g key={n.id} opacity={active ? 1 : 0.3}>
              <circle cx={n.x} cy={n.y} r={active ? 28 : 24} fill={active ? `${matchColor}22` : t.surfaceAlt} stroke={active ? matchColor : t.border} strokeWidth={active ? 2.5 : 1.5} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={active ? matchColor : t.textMuted}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
