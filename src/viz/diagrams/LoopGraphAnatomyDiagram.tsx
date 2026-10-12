import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { useNotebookPalette } from '../../theme/notebookPalette';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { SketchArrow, SketchPath, SketchRect } from '../../components/notebook/RoughShape';

type NodeKind = 'splitter' | 'worker' | 'gate' | 'code';
type ReturnPath = 'correction' | 'learning';

const NODE_DESC: Record<NodeKind, string> = {
  splitter: 'Cuts the task into units of work. The highest-leverage decision in the whole graph -- split along the wrong dimension and every downstream node inherits the mistake.',
  worker: "Does one unit, from its own isolated context -- not shared with the other worker. Two workers sharing context tend to converge on the same answer, which means paying twice for one opinion instead of two independent ones.",
  gate: "The approval checkpoint. Doesn't grade confidence -- checks a real pass/fail condition (tests exit 0, every claim has a source, the diff only touches planned files) and routes accordingly.",
  code: 'A deterministic transformation -- merge, rank, dedupe, diff. No model call: if a step can be described without "judge / decide / assess / summarize," it belongs here, not in an LLM call.',
};

const NODES: Record<NodeKind | 'worker-a' | 'worker-b', { x: number; y: number; label: string; kind: NodeKind }> = {
  splitter: { x: 280, y: 30, label: 'Splitter', kind: 'splitter' },
  'worker-a': { x: 160, y: 120, label: 'Worker A', kind: 'worker' },
  'worker-b': { x: 400, y: 120, label: 'Worker B', kind: 'worker' },
  gate: { x: 280, y: 210, label: 'Gate', kind: 'gate' },
  code: { x: 280, y: 270, label: 'Merge (code)', kind: 'code' },
} as never;

const NODE_ORDER: (keyof typeof NODES)[] = ['splitter', 'worker-a', 'worker-b', 'gate', 'code'];

/** A graph's actual anatomy: a splitter creates units, isolated workers
 * process them, a gate checks a real condition rather than a vibe, and a
 * code node merges what passes -- with two different return paths for what
 * fails, toggled below rather than both drawn at once (they answer
 * different questions: "fix THIS run" vs. "fix every future run"). */
const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Hand-drawn rendering pass: same NODES/state/interaction logic as
 * before, every shape now a real rough.js stroke instead of a plain SVG
 * primitive -- piloting the notebook illustration language from the
 * homepage (AgentGraphSketch) on a real, interactive, already-shipped
 * diagram rather than only a decorative one. Colors come from
 * notebookPalette.ts (plain hex, not CSS custom properties) so this
 * renders correctly regardless of whether a page-level `.nb-theme`
 * wrapper is present. */
export default function LoopGraphAnatomyDiagram() {
  const t = useVizTokens();
  const nb = useNotebookPalette();
  const [selectedNode, setSelectedNode] = useState<keyof typeof NODES>('gate');
  const [returnPath, setReturnPath] = useState<ReturnPath>('correction');
  const width = 560;
  const height = 300;
  const colorFor = (kind: NodeKind) =>
    kind === 'splitter' ? nb.cobalt : kind === 'worker' ? nb.teal : kind === 'gate' ? nb.amber : nb.inkSoft;

  return (
    <VisualizationContainer footer={NODE_DESC[NODES[selectedNode].kind]}>
      <PillSelect<ReturnPath>
        label="Return path on rejection"
        value={returnPath}
        onChange={setReturnPath}
        options={[
          { value: 'correction', label: 'Correction (fixes this run)' },
          { value: 'learning', label: 'Learning (fixes future runs)' },
        ]}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {/* Forward edges -- each one carries a real named unit, not just "then" */}
        <SketchArrow points={[[NODES.splitter.x - 14, NODES.splitter.y + 12], [NODES['worker-a'].x + 6, NODES['worker-a'].y - 12]]} color={nb.inkSoft} id="lga-e1" />
        <SketchArrow points={[[NODES.splitter.x + 14, NODES.splitter.y + 12], [NODES['worker-b'].x - 6, NODES['worker-b'].y - 12]]} color={nb.inkSoft} id="lga-e2" />
        <SketchArrow points={[[NODES['worker-a'].x + 8, NODES['worker-a'].y + 12], [NODES.gate.x - 40, NODES.gate.y - 10]]} color={nb.inkSoft} id="lga-e3" />
        <SketchArrow points={[[NODES['worker-b'].x - 8, NODES['worker-b'].y + 12], [NODES.gate.x + 40, NODES.gate.y - 10]]} color={nb.inkSoft} id="lga-e4" />
        <SketchArrow points={[[NODES.gate.x, NODES.gate.y + 12], [NODES.code.x, NODES.code.y - 10]]} color={nb.inkSoft} id="lga-e5" />
        <text x={(NODES.gate.x + NODES.code.x) / 2 + 8} y={(NODES.gate.y + NODES.code.y) / 2 + 3} fontSize={9} fontFamily={HAND_FONT} fill={nb.inkSoft}>accepted</text>

        {/* Return path -- one or the other, toggled, never both at once */}
        {returnPath === 'correction' ? (
          <SketchArrow
            points={[
              [NODES.gate.x - 20, NODES.gate.y - 8],
              [NODES.gate.x - 120, NODES.gate.y - 60],
              [NODES['worker-a'].x - 30, NODES['worker-a'].y + 40],
              [NODES['worker-a'].x - 6, NODES['worker-a'].y + 14],
            ]}
            color={nb.coral}
            id="lga-return-correction"
          />
        ) : (
          <SketchArrow
            points={[
              [NODES.gate.x + 20, NODES.gate.y - 4],
              [NODES.gate.x + 160, NODES.gate.y - 120],
              [NODES.splitter.x + 120, NODES.splitter.y + 40],
              [NODES.splitter.x + 18, NODES.splitter.y + 10],
            ]}
            color={nb.coral}
            id="lga-return-learning"
          />
        )}
        <text x={returnPath === 'correction' ? NODES['worker-a'].x - 90 : NODES.splitter.x + 60} y={returnPath === 'correction' ? NODES.gate.y - 55 : NODES.gate.y - 100} fontSize={9.5} fontFamily={HAND_FONT} fill={nb.coral} fontWeight={700}>
          {returnPath === 'correction' ? 'reject: this unit only' : 'accepted → constraint'}
        </text>

        {NODE_ORDER.map((key) => {
          const n = NODES[key];
          const isSelected = selectedNode === key;
          const color = colorFor(n.kind);
          const fill = isSelected ? color : undefined;
          return (
            <g
              key={key}
              onClick={() => setSelectedNode(key)}
              onMouseEnter={() => setSelectedNode(key)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${n.label} node`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedNode(key);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {n.kind === 'gate' ? (
                <SketchPath
                  d={`M ${n.x - 24} ${n.y} L ${n.x} ${n.y - 18} L ${n.x + 24} ${n.y} L ${n.x} ${n.y + 18} Z`}
                  color={color}
                  fillColor={fill}
                  strokeWidth={isSelected ? 2.6 : 1.8}
                  id={`lga-node-${key}`}
                />
              ) : n.kind === 'code' ? (
                <SketchRect x={n.x - 60} y={n.y - 12} width={120} height={24} color={color} fillColor={fill} strokeWidth={isSelected ? 2.6 : 1.8} id={`lga-node-${key}`} />
              ) : (
                <SketchRect x={n.x - 44} y={n.y - 16} width={88} height={32} color={color} fillColor={fill} strokeWidth={isSelected ? 2.6 : 1.8} id={`lga-node-${key}`} />
              )}
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={10.5} fontFamily={HAND_FONT} fontWeight={700} fill={color}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="nb-hand" style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size + 1, color: t.textMuted, marginTop: 4, fontFamily: HAND_FONT }}>
        Click a node for what it is. Toggle above for where a rejection actually goes.
      </div>
    </VisualizationContainer>
  );
}
