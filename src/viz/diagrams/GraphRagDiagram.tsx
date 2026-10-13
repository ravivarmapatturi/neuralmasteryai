import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchEllipse } from '../../components/notebook/RoughShape';

const NODES = [
  { id: 'A', label: 'Acme Corp', x: 80, y: 60 },
  { id: 'B', label: 'CEO Jane Lee', x: 240, y: 40 },
  { id: 'C', label: 'Acquired 2023', x: 240, y: 110 },
  { id: 'D', label: 'Beta Inc', x: 400, y: 110 },
  { id: 'E', label: 'Founded by Jane Lee', x: 400, y: 40 },
];
const EDGES: [string, string][] = [['A', 'B'], ['A', 'C'], ['C', 'D'], ['D', 'E'], ['B', 'E']];

/** Standard chunk retrieval only ever returns isolated chunks -- it can't
 * answer "who founded the company Acme acquired?" if that fact spans two
 * separate documents. Click a node to traverse its graph relationships
 * directly instead, chaining across documents in one hop. */
export default function GraphRagDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<string | null>('A');
  const nodeColor = getConceptColor(t, 'embedding');
  const edgeColor = getConceptColor(t, 'attention');

  const neighbors = (id: string) => new Set(EDGES.filter(([a, b]) => a === id || b === id).flatMap(([a, b]) => [a, b]));
  const reachable = selected ? neighbors(selected) : new Set<string>();

  const width = 480;
  const height = 150;

  return (
    <VisualizationContainer footer='Click a node -- its directly-connected facts light up. "Who founded the company Acme acquired?" resolves in one traversal: Acme → Acquired 2023 → Beta Inc → Founded by Jane Lee, chaining across what were originally separate document chunks.'>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {EDGES.map(([a, b], i) => {
          const na = NODES.find((n) => n.id === a)!;
          const nb = NODES.find((n) => n.id === b)!;
          const isActive = selected && (a === selected || b === selected);
          return (
            <g key={i} opacity={selected && !isActive ? 0.3 : 1}>
              <SketchArrow
                points={[[na.x, na.y], [nb.x, nb.y]]}
                color={isActive ? edgeColor : t.border}
                strokeWidth={isActive ? 2.25 : 1.25}
                roughness={1.4}
                arrowhead={false}
                id={`graphrag-edge-${a}-${b}`}
              />
            </g>
          );
        })}
        {NODES.map((n) => {
          const isSelected = selected === n.id;
          const isReachable = reachable.has(n.id);
          const dim = selected !== null && !isReachable;
          return (
            <g key={n.id} onClick={() => setSelected(n.id)} onMouseEnter={() => setSelected(n.id)} style={{ cursor: 'pointer' }} opacity={dim ? 0.3 : 1}>
              {/* plain backing circle carries the data-fill (selected highlight);
                  SketchEllipse layered on top adds only the hand-drawn border,
                  same text-legibility split used by every other converted diagram. */}
              <circle cx={n.x} cy={n.y} r={26} fill={isSelected ? `${nodeColor}30` : t.surfaceAlt} stroke="none" />
              <SketchEllipse cx={n.x} cy={n.y} width={52} height={52} color={nodeColor} strokeWidth={isSelected ? 2.25 : 1.5} roughness={1.3} id={`graphrag-node-${n.id}`} />
              <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={7.5} fill={t.textSecondary}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        A knowledge graph built from source documents -- entities as nodes, relationships as edges.
      </div>
    </VisualizationContainer>
  );
}
