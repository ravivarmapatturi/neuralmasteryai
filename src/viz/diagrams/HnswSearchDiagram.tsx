import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PlaybackControls } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchEllipse } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

interface Node {
  id: number;
  x: number;
  y: number; // visual jitter only, not used by the search itself
}

const ALL_NODES: Node[] = [
  { id: 0, x: 20, y: 10 },
  { id: 1, x: 65, y: -6 },
  { id: 2, x: 105, y: 14 },
  { id: 3, x: 150, y: -4 },
  { id: 4, x: 195, y: 8 },
  { id: 5, x: 240, y: -8 },
  { id: 6, x: 285, y: 12 },
  { id: 7, x: 330, y: -2 },
  { id: 8, x: 375, y: 10 },
  { id: 9, x: 420, y: -6 },
];

// Every node in a higher layer also exists in every layer below it --
// the actual HNSW invariant, not just a visual convenience.
const LAYER_IDS = [
  [2, 7], // layer 2 (top, sparsest)
  [1, 2, 4, 7, 8], // layer 1
  ALL_NODES.map((n) => n.id), // layer 0 (bottom, everything)
];
const ENTRY_ID = 2;
const QUERY_X = 400; // close to node 8/9 -- entry point (id 2) starts far away

function layerAdjacency(ids: number[]): Map<number, number[]> {
  const sorted = [...ids].sort((a, b) => (ALL_NODES[a].x - ALL_NODES[b].x));
  const adj = new Map<number, number[]>();
  sorted.forEach((id, i) => {
    const neighbors: number[] = [];
    if (i > 0) neighbors.push(sorted[i - 1]);
    if (i < sorted.length - 1) neighbors.push(sorted[i + 1]);
    adj.set(id, neighbors);
  });
  return adj;
}

interface Step {
  layer: number;
  nodeId: number;
  note: string;
}

/** Real greedy search over the layers/adjacency above -- at each layer,
 * move to whichever neighbor is closer to the query than the current node;
 * once no neighbor improves, that's the layer's local optimum, and search
 * drops to the same node one layer down. This is the actual HNSW search
 * procedure (simplified to 1D distance for a diagram that fits on screen),
 * not a scripted illustration of it. */
function computeSearchPath(): Step[] {
  const steps: Step[] = [];
  let currentId = ENTRY_ID;
  steps.push({ layer: 0, nodeId: currentId, note: `Start at the entry point (node ${currentId}) in the top layer.` });

  for (let layer = 0; layer < LAYER_IDS.length; layer++) {
    const adj = layerAdjacency(LAYER_IDS[layer]);
    let improved = true;
    while (improved) {
      improved = false;
      const currentDist = Math.abs(ALL_NODES[currentId].x - QUERY_X);
      for (const neighborId of adj.get(currentId) ?? []) {
        const nDist = Math.abs(ALL_NODES[neighborId].x - QUERY_X);
        if (nDist < currentDist) {
          currentId = neighborId;
          steps.push({ layer, nodeId: currentId, note: `Layer ${LAYER_IDS.length - 1 - layer}: node ${neighborId} is closer to the query than the current node -- move there.` });
          improved = true;
          break;
        }
      }
    }
    if (layer < LAYER_IDS.length - 1) {
      steps.push({ layer: layer + 1, nodeId: currentId, note: `Node ${currentId} is a local optimum in this layer -- drop down one layer and keep searching from here.` });
    } else {
      steps.push({ layer, nodeId: currentId, note: `Node ${currentId} is a local optimum in the bottom layer -- search converges here as the approximate nearest neighbor.` });
    }
  }
  return steps;
}

const SEARCH_PATH = computeSearchPath();
const WIDTH = 460;
const LAYER_H = 70;
const LAYER_LABELS = ['Layer 2 (sparsest)', 'Layer 1', 'Layer 0 (all nodes)'];

export default function HnswSearchDiagram() {
  const t = useVizTokens();
  const [stepIdx, setStepIdx] = useState(0);

  const step = SEARCH_PATH[stepIdx];
  const visitedByLayer = new Set(SEARCH_PATH.slice(0, stepIdx + 1).filter((s) => s.layer === step.layer).map((s) => s.nodeId));
  const pathColor = getConceptColor(t, 'attention');
  const queryColor = getConceptColor(t, 'query');

  return (
    <VisualizationContainer footer={step.note}>
      <PlaybackControls
        playing={false}
        onTogglePlay={() => {}}
        onReset={() => setStepIdx(0)}
        onStepBack={() => setStepIdx((i) => Math.max(0, i - 1))}
        onStepForward={() => setStepIdx((i) => Math.min(SEARCH_PATH.length - 1, i + 1))}
        disableBack={stepIdx === 0}
        disableForward={stepIdx === SEARCH_PATH.length - 1}
      />
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '8px 0' }}>
        Step {stepIdx + 1} of {SEARCH_PATH.length}
      </div>
      <svg width="100%" viewBox={`-10 -20 ${WIDTH + 20} ${LAYER_H * LAYER_IDS.length + 20}`} style={{ display: 'block' }}>
        <SketchArrow points={[[QUERY_X, -15], [QUERY_X, LAYER_H * LAYER_IDS.length]]} color={queryColor} strokeWidth={1.5} arrowhead={false} id="hnsw-query-line" />
        <text x={QUERY_X} y={-6} textAnchor="middle" fontSize={10} fontWeight={700} fontFamily={HAND_FONT} fill={queryColor}>query</text>

        {LAYER_IDS.map((ids, li) => {
          const y = li * LAYER_H + 20;
          const adj = layerAdjacency(ids);
          const isCurrentLayer = step.layer === li;
          return (
            <g key={li} opacity={li <= step.layer || (li === step.layer) ? 1 : 0.25}>
              <text x={0} y={y - 24} fontSize={10} fontWeight={700} fontFamily={HAND_FONT} fill={t.textMuted}>{LAYER_LABELS[li]}</text>
              {ids.map((id) =>
                (adj.get(id) ?? []).filter((n) => n > id).map((n) => (
                  <SketchArrow key={`${id}-${n}`} points={[[ALL_NODES[id].x, y], [ALL_NODES[n].x, y]]} color={t.border} strokeWidth={1.5} arrowhead={false} id={`hnsw-edge-${li}-${id}-${n}`} />
                )),
              )}
              {ids.map((id) => {
                const visited = isCurrentLayer && visitedByLayer.has(id);
                const isCurrent = isCurrentLayer && id === step.nodeId;
                const r = isCurrent ? 10 : 7;
                return (
                  <g key={id}>
                    <circle
                      cx={ALL_NODES[id].x}
                      cy={y}
                      r={r}
                      fill={isCurrent ? pathColor : visited ? `${pathColor}55` : t.surfaceAlt}
                      stroke="none"
                    />
                    <SketchEllipse cx={ALL_NODES[id].x} cy={y} width={r * 2} height={r * 2} color={isCurrent || visited ? pathColor : t.border} strokeWidth={isCurrent ? 2.5 : 1.5} id={`hnsw-node-${li}-${id}`} />
                    <text x={ALL_NODES[id].x} y={y + 22} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={isCurrent ? pathColor : t.textMuted}>
                      {id}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
