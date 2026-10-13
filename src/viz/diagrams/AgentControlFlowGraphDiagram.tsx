import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect, VizButton, ControlRow } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type NodeId = 'START' | 'PLAN' | 'ACT' | 'CHECK' | 'HUMAN' | 'END';

const POS: Record<NodeId, { x: number; y: number }> = {
  START: { x: 50, y: 150 },
  PLAN: { x: 190, y: 150 },
  ACT: { x: 340, y: 150 },
  CHECK: { x: 490, y: 150 },
  HUMAN: { x: 490, y: 45 },
  END: { x: 630, y: 150 },
};

const LABEL: Record<NodeId, string> = {
  START: 'Start',
  PLAN: 'Plan',
  ACT: 'Act (tool call)',
  CHECK: 'Check',
  HUMAN: 'Human review',
  END: 'End',
};

// A real, if simplified, LangGraph-style control-flow model: confidence
// rises with diminishing returns on every Act step, and CHECK's branch is a
// genuine comparison against the threshold -- not a scripted animation.
// This is exactly what the prose means by "an explicit graph of nodes and
// edges" versus implicit control flow in a prompt: cycles (CHECK -> ACT),
// conditional branches (CHECK -> HUMAN vs CHECK -> END), and a
// human-in-the-loop checkpoint are all real, inspectable graph edges here.
function confidenceAfter(actCount: number): number {
  return 1 - Math.pow(0.55, actCount);
}

interface Step {
  node: NodeId;
  actCountAtEntry: number;
}

const EDGES: [NodeId, NodeId][] = [
  ['START', 'PLAN'],
  ['PLAN', 'ACT'],
  ['ACT', 'CHECK'],
  ['CHECK', 'ACT'],
  ['CHECK', 'HUMAN'],
  ['CHECK', 'END'],
  ['HUMAN', 'END'],
];

function edgeKey(a: NodeId, b: NodeId): string {
  return `${a}->${b}`;
}

function edgePoints(a: NodeId, b: NodeId): [number, number][] {
  const p1 = POS[a];
  const p2 = POS[b];
  if (a === 'CHECK' && b === 'ACT') {
    // The cycle: a visible dip below the main row so it reads as a loop,
    // not just a second line overlapping the forward edge. Sampled points
    // tracing the same dip the original bezier curve drew, since
    // SketchArrow (unlike SketchPath) draws a hand-drawn arrowhead, which
    // every edge here needs.
    return [
      [p1.x, p1.y + 18],
      [p1.x, p1.y + 70],
      [(p1.x + p2.x) / 2, p1.y + 76],
      [p2.x, p2.y + 70],
      [p2.x, p2.y + 18],
    ];
  }
  return [[p1.x, p1.y], [p2.x, p2.y]];
}

export default function AgentControlFlowGraphDiagram() {
  const t = useVizTokens();
  const [threshold, setThreshold] = useState(0.75);
  const [requireApproval, setRequireApproval] = useState<'yes' | 'no'>('yes');
  const [history, setHistory] = useState<Step[]>([{ node: 'START', actCountAtEntry: 0 }]);

  const color = getConceptColor(t, 'attention');
  const current = history[history.length - 1];
  const done = current.node === 'END';

  const step = () => {
    if (done) return;
    const actCount = current.actCountAtEntry;
    let next: NodeId;
    let nextActCount = actCount;
    if (current.node === 'START') next = 'PLAN';
    else if (current.node === 'PLAN') next = 'ACT';
    else if (current.node === 'ACT') {
      nextActCount = actCount + 1;
      next = 'CHECK';
    } else if (current.node === 'CHECK') {
      const conf = confidenceAfter(actCount);
      if (conf >= threshold) next = requireApproval === 'yes' ? 'HUMAN' : 'END';
      else next = 'ACT';
    } else {
      // HUMAN
      next = 'END';
    }
    setHistory((h) => [...h, { node: next, actCountAtEntry: nextActCount }]);
  };

  const reset = () => setHistory([{ node: 'START', actCountAtEntry: 0 }]);

  const traversed = new Set<string>();
  for (let i = 1; i < history.length; i++) {
    traversed.add(edgeKey(history[i - 1].node, history[i].node));
  }

  const confAtCurrentCheck = current.node === 'CHECK' ? confidenceAfter(current.actCountAtEntry) : null;

  let footer = 'Click Step to run the agent through the graph one transition at a time.';
  if (current.node === 'CHECK' && confAtCurrentCheck !== null) {
    footer = `At CHECK after ${current.actCountAtEntry} Act step(s): confidence = 1 − 0.55^${current.actCountAtEntry} = ${confAtCurrentCheck.toFixed(3)}, threshold = ${threshold.toFixed(2)}. ${
      confAtCurrentCheck >= threshold
        ? `Confidence cleared the threshold -- branches to ${requireApproval === 'yes' ? 'Human review' : 'End'}.`
        : 'Below threshold -- branches back to Act. That back-edge is the cycle: the same node runs again, driven by a real comparison, not a fixed step count.'
    }`;
  } else if (current.node === 'ACT') {
    const confBefore = confidenceAfter(current.actCountAtEntry);
    const confAfter = confidenceAfter(current.actCountAtEntry + 1);
    footer = `At Act (attempt ${current.actCountAtEntry + 1}): confidence is ${confBefore.toFixed(3)} going in -- running this step will raise it to ${confAfter.toFixed(3)}, evaluated at CHECK next.`;
  } else if (done) {
    footer = `Done in ${history.length - 1} transitions (${history.filter((s) => s.node === 'ACT').length} Act step(s)). Reset to try a different threshold or approval setting.`;
  } else if (current.node === 'HUMAN') {
    footer = 'At Human review: a real checkpoint node, not just a comment in code -- the graph pauses here whenever the approval-required edge was taken.';
  }

  return (
    <VisualizationContainer footer={footer}>
      <ControlRow>
        <div style={{ minWidth: 200 }}>
          <Slider label="Confidence threshold" value={threshold} onChange={setThreshold} min={0.5} max={0.95} step={0.01} format={(v) => v.toFixed(2)} />
        </div>
        <PillSelect<'yes' | 'no'>
          label="Human approval required"
          value={requireApproval}
          onChange={setRequireApproval}
          options={[
            { value: 'yes', label: 'Required' },
            { value: 'no', label: 'Not required' },
          ]}
        />
        <VizButton onClick={step} disabled={done}>
          Step
        </VizButton>
        <VizButton variant="secondary" onClick={reset}>
          Reset
        </VizButton>
      </ControlRow>

      <svg width="100%" viewBox="0 0 680 210" style={{ marginTop: 10 }}>
        {EDGES.map(([a, b]) => {
          const key = edgeKey(a, b);
          const active = traversed.has(key);
          return (
            <g key={key} opacity={active ? 1 : 0.5}>
              <SketchArrow points={edgePoints(a, b)} color={active ? color : t.border} strokeWidth={active ? 2.5 : 1.5} id={`agentflow-${key}`} />
            </g>
          );
        })}
        {(Object.keys(POS) as NodeId[]).map((id) => {
          const p = POS[id];
          const isCurrent = id === current.node;
          const visited = history.some((s) => s.node === id);
          return (
            <g key={id}>
              <rect
                x={p.x - 55}
                y={p.y - 16}
                width={110}
                height={32}
                rx={DIAGRAM_RADIUS.node}
                fill={isCurrent ? `${color}25` : visited ? t.surfaceAlt : t.surface}
                stroke="none"
              />
              <SketchRect x={p.x - 55} y={p.y - 16} width={110} height={32} color={isCurrent ? color : t.border} strokeWidth={isCurrent ? 2.5 : 1.5} id={`agentflow-node-${id}`} />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontSize={DIAGRAM_TYPE.secondaryLabel.size}
                fontWeight={isCurrent ? 700 : 500}
                fontFamily={HAND_FONT}
                fill={isCurrent ? color : t.textPrimary}
              >
                {LABEL[id]}
              </text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
