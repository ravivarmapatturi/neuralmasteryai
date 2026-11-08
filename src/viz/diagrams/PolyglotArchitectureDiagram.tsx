import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Step = 'user' | 'app' | 'relational' | 'vector' | 'graph';
const STEPS: { key: Step; label: string; desc: string }[] = [
  { key: 'user', label: 'User asks a question', desc: 'A multi-hop question arrives at the app.' },
  { key: 'relational', label: 'Relational: session + permissions', desc: 'App looks up who the user is and what they can see -- a fast, exact, transactional lookup.' },
  { key: 'vector', label: 'Vector: retrieve relevant chunks', desc: 'The question is embedded and matched against the vector store for semantically relevant context.' },
  { key: 'graph', label: 'Graph: traverse relationships', desc: 'For a multi-hop question, the graph store connects facts across documents (GraphRAG) that vector similarity alone would miss.' },
  { key: 'app', label: 'Answer + logging', desc: 'The app assembles an answer and writes the interaction back to the relational store for analytics.' },
];

/** One real request, three stores, each doing the one job it's actually
 * good at -- "polyglot persistence" as a concrete request trace instead of
 * an abstract term. Click a stage for what it's responsible for. */
export default function PolyglotArchitectureDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<Step>('vector');
  const width = 600;
  const height = 200;

  const colorFor = (k: Step) => (k === 'relational' ? getConceptColor(t, 'query') : k === 'vector' ? getConceptColor(t, 'attention') : k === 'graph' ? t.accentWarn : t.textMuted);
  const pos: Record<Step, { x: number; y: number }> = {
    user: { x: 80, y: 40 },
    app: { x: 260, y: 100 },
    relational: { x: 490, y: 40 },
    vector: { x: 490, y: 100 },
    graph: { x: 490, y: 160 },
  };

  const userAppW = 120;
  const storeW = 170;

  return (
    <VisualizationContainer footer={STEPS.find((s) => s.key === active)!.desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="pg-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
          {(['relational', 'vector', 'graph'] as Step[]).map((k) => (
            <marker key={k} id={`pg-arrow-${k}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={colorFor(k)} />
            </marker>
          ))}
        </defs>
        <line x1={pos.user.x + userAppW / 2} y1={pos.user.y} x2={pos.app.x - userAppW / 2} y2={pos.app.y - 12} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#pg-arrow)" />
        {(['relational', 'vector', 'graph'] as Step[]).map((k) => (
          <line
            key={k}
            x1={pos.app.x + userAppW / 2}
            y1={pos.app.y + (k === 'relational' ? -10 : k === 'graph' ? 10 : 0)}
            x2={pos[k].x - storeW / 2}
            y2={pos[k].y}
            stroke={colorFor(k)}
            strokeWidth={active === k ? 2.5 : 1.25}
            opacity={active === null || active === k || active === 'app' ? 1 : 0.35}
            markerEnd={`url(#pg-arrow-${k})`}
          />
        ))}
        {STEPS.map((s) => {
          const p = pos[s.key];
          const isActive = active === s.key;
          const color = colorFor(s.key);
          const w = s.key === 'user' || s.key === 'app' ? userAppW : storeW;
          return (
            <g key={s.key} onClick={() => setActive(s.key)} onMouseEnter={() => setActive(s.key)} style={{ cursor: 'pointer' }}>
              <rect x={p.x - w / 2} y={p.y - 16} width={w} height={32} rx={7} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fontWeight={isActive ? 700 : 500} fill={color}>{s.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a stage -- three specialized stores, one request, each engine owning only what it's actually good at.
      </div>
    </VisualizationContainer>
  );
}
