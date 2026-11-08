import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type NodeKey = 'start' | 'predictable' | 'single-call' | 'unpredictable' | 'agent';

interface NodeDef {
  lines: string[];
  x: number;
  y: number;
  w: number;
  h: number;
}

const NODES: Record<NodeKey, NodeDef> = {
  start: { lines: ['Can all steps be', 'predicted upfront?'], x: 240, y: 30, w: 180, h: 44 },
  predictable: { lines: ['Yes: known flow'], x: 120, y: 108, w: 150, h: 36 },
  'single-call': { lines: ['Fixed Pipeline / Single Call', 'No dynamic loop needed'], x: 120, y: 182, w: 180, h: 46 },
  unpredictable: { lines: ['No: depends on output'], x: 360, y: 108, w: 150, h: 36 },
  agent: { lines: ['Agentic Feedback Loop', 'Loop earns its complexity'], x: 360, y: 182, w: 180, h: 46 },
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
  const width = 480;
  const height = 224;

  function Node({ id }: { id: NodeKey }) {
    const n = NODES[id];
    const isActive = active === id;
    const isTerminal = id === 'single-call' || id === 'agent';
    const color = id === 'agent' ? noColor : isTerminal ? yesColor : t.textMuted;
    return (
      <g onClick={() => setActive(id)} onMouseEnter={() => setActive(id)} style={{ cursor: 'pointer' }}>
        <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h} rx={7} fill={isActive ? `${color}30` : t.surfaceAlt} stroke="none" />
        <SketchRect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h} color={color} strokeWidth={isActive ? 2.5 : 1.5} id={`wtu-${id}`} />
        {n.lines.map((line, idx) => (
          <text
            key={idx}
            x={n.x}
            y={n.lines.length === 1 ? n.y + 4 : n.y - 4 + idx * 14}
            textAnchor="middle"
            fontSize={n.lines.length === 1 ? 10.5 : 9.5}
            fontWeight={idx === 0 ? 700 : 500}
            fontFamily={HAND_FONT}
            fill={color}
          >
            {line}
          </text>
        ))}
      </g>
    );
  }

  return (
    <VisualizationContainer footer={DESC[active]}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <SketchArrow points={[[NODES.start.x - 30, NODES.start.y + NODES.start.h / 2], [NODES.predictable.x, NODES.predictable.y - NODES.predictable.h / 2]]} color={t.textMuted} strokeWidth={1.5} arrowhead id="wtu-arrow-1" />
        <SketchArrow points={[[NODES.start.x + 30, NODES.start.y + NODES.start.h / 2], [NODES.unpredictable.x, NODES.unpredictable.y - NODES.unpredictable.h / 2]]} color={t.textMuted} strokeWidth={1.5} arrowhead id="wtu-arrow-2" />
        <SketchArrow points={[[NODES.predictable.x, NODES.predictable.y + NODES.predictable.h / 2], [NODES['single-call'].x, NODES['single-call'].y - NODES['single-call'].h / 2]]} color={t.textMuted} strokeWidth={1.5} arrowhead id="wtu-arrow-3" />
        <SketchArrow points={[[NODES.unpredictable.x, NODES.unpredictable.y + NODES.unpredictable.h / 2], [NODES.agent.x, NODES.agent.y - NODES.agent.h / 2]]} color={t.textMuted} strokeWidth={1.5} arrowhead id="wtu-arrow-4" />
        {(Object.keys(NODES) as NodeKey[]).map((k) => <Node key={k} id={k} />)}
      </svg>
    </VisualizationContainer>
  );
}
