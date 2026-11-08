import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PAGES = [
  { label: 'Relational Databases', desc: 'The model, SQL fundamentals, indexing, ACID transactions -- and when relational is (and isn\'t) the right tool.', route: '/docs/databases/relational/overview' },
  { label: 'PostgreSQL (deep dive)', desc: 'Schemas and types, writing queries end to end, indexing, transactions, JSONB, pgvector.', route: '/docs/databases/relational/postgresql' },
  { label: 'Vector Databases', desc: 'What they store and search, distance metrics, HNSW/IVF, ChromaDB and production options, hybrid search.', route: '/docs/databases/vector/overview' },
  { label: 'Graph Databases', desc: 'The property graph model, Neo4j and Cypher, when graph beats relational, GraphRAG.', route: '/docs/databases/graph/overview' },
];

/** A clickable map of the section, read-order left to right -- reinforces
 * the reading path in the prose without just re-listing links. */
export default function DatabasesSectionMapDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState(0);
  const color = getConceptColor(t, 'attention');
  const width = 600;

  return (
    <VisualizationContainer footer={PAGES[selected].desc}>
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block' }}>
        <defs>
          <marker id="dbmap-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {PAGES.map((p, i) => {
          // Perfectly fit 4 cards within width=600 without clipping
          const x = 80 + i * 146;
          const isSelected = selected === i;
          return (
            <g key={p.route}>
              {i > 0 && (
                <line
                  x1={80 + (i - 1) * 146 + 55}
                  y1={45}
                  x2={x - 57}
                  y2={45}
                  stroke={t.textMuted}
                  strokeWidth={1.5}
                  markerEnd="url(#dbmap-arrow)"
                />
              )}
              <g onClick={() => setSelected(i)} onMouseEnter={() => setSelected(i)} style={{ cursor: 'pointer' }}>
                <rect x={x - 55} y={25} width={110} height={40} rx={8} fill={isSelected ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
                {p.label.includes('(') ? (
                  <>
                    <text x={x} y={43} textAnchor="middle" fontSize={9.5} fontWeight={isSelected ? 700 : 500} fill={color}>{p.label.split(' (')[0]}</text>
                    <text x={x} y={55} textAnchor="middle" fontSize={8} fill={t.textMuted}>({p.label.split('(')[1]}</text>
                  </>
                ) : (
                  <text x={x} y={49} textAnchor="middle" fontSize={9.5} fontWeight={isSelected ? 700 : 500} fill={color}>{p.label}</text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a page for what it covers.
      </div>
    </VisualizationContainer>
  );
}
