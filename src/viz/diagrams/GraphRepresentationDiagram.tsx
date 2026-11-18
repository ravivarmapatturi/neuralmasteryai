import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import DiagramMatrix from './DiagramMatrix';
import { DIAGRAM_TYPE } from './diagramSystem';
import { GRAPH_NODES, GRAPH_EDGES, adjacencyMatrix } from '../lib/graphml';

// A few fixed relabelings of the SAME graph -- same nodes, same edges,
// different id order -- so the adjacency matrix genuinely scrambles while
// the picture (drawn from fixed x,y positions, not from the labels) stays
// visually identical. That gap is the entire point: whatever a GNN
// computes from the matrix has to come out the same regardless of this.
const PERMUTATIONS = [
  [0, 1, 2, 3, 4],
  [2, 0, 3, 1, 4],
  [4, 3, 2, 1, 0],
];

export default function GraphRepresentationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(PERMUTATIONS.length, 3000);
  const [userPermIdx, setUserPermIdx] = useState<number | null>(null);
  const permIdx = userPermIdx ?? autoIdx;
  const perm = PERMUTATIONS[permIdx];

  const relabeledEdges: [number, number][] = useMemo(
    () => GRAPH_EDGES.map(([a, b]) => [perm.indexOf(a), perm.indexOf(b)] as [number, number]),
    [perm],
  );
  const matrix = useMemo(() => adjacencyMatrix(relabeledEdges, 5), [relabeledEdges]);

  return (
    <VisualizationContainer footer="Same 5 nodes, same 5 edges, three different id orderings -- the picture never moves (it's drawn from fixed positions, not from the labels), but the adjacency matrix scrambles every time. Any valid graph architecture has to produce the same answer for all three.">
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={200} height={160} viewBox="0 0 420 160">
          {GRAPH_EDGES.map(([a, b], i) => {
            const na = GRAPH_NODES[a];
            const nb = GRAPH_NODES[b];
            return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={t.border} strokeWidth={1.5} />;
          })}
          {GRAPH_NODES.map((n) => {
            const relabeled = perm.indexOf(n.id);
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={20} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={1.5} />
                <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="monospace" fill={t.accentPrimary}>{relabeled}</text>
              </g>
            );
          })}
        </svg>
        <DiagramMatrix data={matrix} concept="attention" rowLabels={['0', '1', '2', '3', '4']} colLabels={['0', '1', '2', '3', '4']} cellSize={36} valueFormat={(v) => String(v)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <VizButton onClick={() => setUserPermIdx((permIdx + 1) % PERMUTATIONS.length)}>Relabel nodes</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        This is exactly why standard CNN/Transformer architectures don't directly apply to graphs -- they assume a fixed grid or sequence order that a graph simply doesn't have.
      </div>
    </VisualizationContainer>
  );
}
