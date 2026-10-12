import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type NodeKey = 'start' | 'predictable' | 'single-call' | 'unpredictable' | 'agent';

const NODES: Record<NodeKey, { label: string; x: number; y: number }> = {
  start: { label: 'Can the steps be predicted upfront?', x: 200, y: 20 },
  predictable: { label: 'Yes, fully', x: 100, y: 90 },
  'single-call': { label: 'Single call / fixed pipeline -- no loop needed', x: 100, y: 160 },
  unpredictable: { label: "No -- depends on what a step returns", x: 300, y: 90 },
  agent: { label: 'Agentic loop earns its complexity', x: 300, y: 160 },
};

const DESC: Record<NodeKey, string> = {
  start: 'The single question that actually decides this: can every step be known in advance, or does step N depend on what step N-1 returned?',
  predictable: 'The whole sequence of actions is knowable before running it -- even if there are multiple steps.',
  'single-call': 'A single prompt, or a fixed sequence of prompts/steps, does the job -- no loop, no tool-calling decisions to make at runtime, easier to debug.',
  unpredictable: 'The right next action genuinely depends on what came back from a previous step -- it cannot be hardcoded.',
  agent: "This is the actual test for needing an agent: not \"is an LLM involved\" but \"does the next action depend on a result I can't predict beforehand.\"",
};

/** The one real decision point, not a fuzzy "agents are for complex
 * tasks" heuristic -- click any node to see exactly which branch it's on
 * and why. */
export default function WhenToUseAgentsDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<NodeKey>('agent');
  const yesColor = t.accentWarn;
  const noColor = getConceptColor(t, 'attention');
  const width = 420;
  const height = 200;

  function Node({ id }: { id: NodeKey }) {
    const n = NODES[id];
    const isActive = active === id;
    const isTerminal = id === 'single-call' || id === 'agent';
    const color = id === 'agent' ? noColor : isTerminal ? yesColor : t.textMuted;
    return (
      <g onClick={() => setActive(id)} onMouseEnter={() => setActive(id)} style={{ cursor: 'pointer' }}>
        <rect x={n.x - 70} y={n.y - 16} width={140} height={40} rx={7} fill={isActive ? `${color}30` : t.surfaceAlt} stroke="none" />
        <SketchRect x={n.x - 70} y={n.y - 16} width={140} height={40} color={color} strokeWidth={isActive ? 2.5 : 1.5} id={`wtu-${id}`} />
        <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={8} fontFamily={HAND_FONT} fill={color}>{n.label}</text>
      </g>
    );
  }

  return (
    <VisualizationContainer footer={DESC[active]}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <SketchArrow points={[[NODES.start.x, NODES.start.y + 16], [NODES.predictable.x, NODES.predictable.y - 16]]} color={t.textMuted} strokeWidth={1} arrowhead={false} id="wtu-arrow-1" />
        <SketchArrow points={[[NODES.start.x, NODES.start.y + 16], [NODES.unpredictable.x, NODES.unpredictable.y - 16]]} color={t.textMuted} strokeWidth={1} arrowhead={false} id="wtu-arrow-2" />
        <SketchArrow points={[[NODES.predictable.x, NODES.predictable.y + 16], [NODES['single-call'].x, NODES['single-call'].y - 16]]} color={t.textMuted} strokeWidth={1} arrowhead={false} id="wtu-arrow-3" />
        <SketchArrow points={[[NODES.unpredictable.x, NODES.unpredictable.y + 16], [NODES.agent.x, NODES.agent.y - 16]]} color={t.textMuted} strokeWidth={1} arrowhead={false} id="wtu-arrow-4" />
        {(Object.keys(NODES) as NodeKey[]).map((k) => <Node key={k} id={k} />)}
      </svg>
    </VisualizationContainer>
  );
}
