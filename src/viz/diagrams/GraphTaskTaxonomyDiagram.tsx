import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { GRAPH_NODES, GRAPH_EDGES, adjacencyList, commonNeighbors, meanAgg } from '../lib/graphml';

type Task = 'node' | 'link' | 'graph';
const ADJ = adjacencyList(GRAPH_EDGES, 5);

export default function GraphTaskTaxonomyDiagram() {
  const t = useVizTokens();
  const TASKS: Task[] = ['node', 'link', 'graph'];
  const { value: autoIdx } = useAutoCycle(TASKS.length, 3200);
  const [userTask, setUserTask] = useState<Task | null>(null);
  const task = userTask ?? TASKS[autoIdx];

  const nodeTarget = 2;
  const neighborAvg = meanAgg(ADJ[nodeTarget].map((n) => GRAPH_NODES[n].feature));

  const linkPair: [number, number] = [0, 3];
  const shared = commonNeighbors(linkPair[0], linkPair[1], ADJ);

  const graphMean = meanAgg(GRAPH_NODES.map((n) => n.feature));

  return (
    <VisualizationContainer footer={
      task === 'node'
        ? `Predict a label for node ${nodeTarget} using its own feature (${GRAPH_NODES[nodeTarget].feature}) AND its neighbors' -- mean of neighbors {0,1,3} = ${neighborAvg.toFixed(3)}. A real GNN layer would combine both, not just look up node ${nodeTarget} in isolation.`
        : task === 'link'
        ? `Will nodes ${linkPair[0]} and ${linkPair[1]} connect? They share ${shared.length} common neighbor${shared.length === 1 ? '' : 's'} (node ${shared.join(', ')}) -- a real, simple link-prediction heuristic: more shared neighbors, more plausible edge.`
        : `Pool every node's feature into one whole-graph representation -- mean = ${graphMean.toFixed(3)}. A graph-level classifier (e.g. "is this molecule toxic") reads only this one pooled number, never individual nodes.`
    }>
      <PillSelect label="Task" value={task} onChange={(v) => setUserTask(v as Task)} options={[
        { value: 'node', label: 'Node classification' },
        { value: 'link', label: 'Link prediction' },
        { value: 'graph', label: 'Graph classification' },
      ]} />

      <svg width="100%" viewBox="0 0 420 170" style={{ display: 'block', marginTop: 8 }}>
        {task === 'graph' && <rect x={30} y={10} width={360} height={140} rx={12} fill="none" stroke={t.accentPrimary} strokeWidth={2} strokeDasharray="6 4" />}

        {GRAPH_EDGES.map(([a, b], i) => {
          const na = GRAPH_NODES[a];
          const nb = GRAPH_NODES[b];
          return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={t.border} strokeWidth={1.5} />;
        })}

        {task === 'link' && (
          <line x1={GRAPH_NODES[linkPair[0]].x} y1={GRAPH_NODES[linkPair[0]].y} x2={GRAPH_NODES[linkPair[1]].x} y2={GRAPH_NODES[linkPair[1]].y}
            stroke={t.accentWarn} strokeWidth={2} strokeDasharray="5 3" />
        )}

        {GRAPH_NODES.map((n) => {
          const isNodeTarget = task === 'node' && n.id === nodeTarget;
          const isNodeNeighbor = task === 'node' && ADJ[nodeTarget].includes(n.id);
          const isLinkEndpoint = task === 'link' && linkPair.includes(n.id);
          const isSharedNeighbor = task === 'link' && shared.includes(n.id);
          const highlighted = isNodeTarget || isLinkEndpoint;
          const color = isNodeTarget ? t.accentPrimary : isLinkEndpoint ? t.accentWarn : isSharedNeighbor ? t.accentSecondary : isNodeNeighbor ? t.accentPrimary : t.border;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={highlighted ? 22 : 18} fill={highlighted ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={highlighted || isSharedNeighbor ? 2.5 : 1.5} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill={t.textPrimary}>{n.feature}</text>
              <text x={n.x} y={n.y - 26} textAnchor="middle" fontSize={9} fill={t.textMuted}>node {n.id}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Numbers on nodes are each node's real feature value, reused by every task above -- what changes is only what's being predicted from the same graph.
      </div>
    </VisualizationContainer>
  );
}
