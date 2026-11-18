import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { adjacencyList, biasedRandomWalk } from '../lib/graphml';

// A tight cluster {0,1,2,3} plus a chain extending out to 4,5 -- exactly
// the shape needed to make node2vec's p/q bias visible: a "local" walk
// should stay inside the cluster, an "exploratory" walk should wander out
// the chain.
const NODES = [
  { id: 0, x: 60, y: 40 },
  { id: 1, x: 60, y: 130 },
  { id: 2, x: 150, y: 85 },
  { id: 3, x: 250, y: 85 },
  { id: 4, x: 340, y: 55 },
  { id: 5, x: 420, y: 30 },
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [4, 5]];
const ADJ = adjacencyList(EDGES, 6);
const START = 1;
const LENGTH = 7;

type Mode = 'local' | 'exploratory';

export default function RandomWalkEmbeddingDiagram() {
  const t = useVizTokens();
  const MODES: Mode[] = ['local', 'exploratory'];
  const { value: autoIdx } = useAutoCycle(MODES.length, 3400);
  const [userMode, setUserMode] = useState<Mode | null>(null);
  const mode = userMode ?? MODES[autoIdx];

  const { walk, p, q } = useMemo(() => {
    const [p, q] = mode === 'local' ? [1, 2] : [1, 0.5];
    return { walk: biasedRandomWalk(ADJ, START, LENGTH, p, q, 42), p, q };
  }, [mode]);

  const pathEdges: [number, number][] = walk.slice(0, -1).map((n, i) => [n, walk[i + 1]]);
  const color = mode === 'local' ? t.accentPrimary : t.accentWarn;

  return (
    <VisualizationContainer footer={`p=${p}, q=${q}. Walk: ${walk.join(' → ')}. ${mode === 'local' ? 'High q (2) discourages moving further from the previous node, so the walk keeps circling back inside the tight {0,1,2,3} cluster -- captures community structure.' : 'Low q (0.5) rewards moving further away, so the walk pushes outward along the chain toward 4 and 5 -- captures structural role (this node is a bridge/hub) more than local community.'}`}>
      <PillSelect label="Walk bias" value={mode} onChange={(v) => setUserMode(v as Mode)} options={[
        { value: 'local', label: 'Local (BFS-like, high q)' },
        { value: 'exploratory', label: 'Exploratory (DFS-like, low q)' },
      ]} />

      <svg width="100%" viewBox="0 0 460 160" style={{ display: 'block', marginTop: 8 }}>
        {EDGES.map(([a, b], i) => {
          const na = NODES[a]; const nb = NODES[b];
          return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={t.border} strokeWidth={1.5} />;
        })}
        {pathEdges.map(([a, b], i) => {
          const na = NODES[a]; const nb = NODES[b];
          return <line key={`p${i}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={color} strokeWidth={3} strokeOpacity={0.55} />;
        })}
        {NODES.map((n) => {
          const visits = walk.filter((w) => w === n.id).length;
          const isStart = n.id === START;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={isStart ? 20 : 16} fill={visits > 0 ? `${color}25` : t.surfaceAlt} stroke={isStart ? t.textPrimary : color} strokeWidth={isStart ? 2.5 : 1.5} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill={t.textPrimary}>{n.id}</text>
              {visits > 1 && <text x={n.x + 18} y={n.y - 14} fontSize={9} fill={color}>×{visits}</text>}
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        A real 2nd-order weighted random walk, sampled step by step: at each hop the transition weight is 1/p to return to the previous node, 1 to a shared neighbor, 1/q to move strictly further away.
      </div>
    </VisualizationContainer>
  );
}
