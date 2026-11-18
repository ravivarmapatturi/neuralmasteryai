import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, PulseRect, line, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const STAGES = [
  { name: 'Prompt', adds: '— (the baseline: one prompt in, one completion out)', broke: 'No way to act on the world or use information newer than training data — everything the model can use has to already be in the prompt' },
  { name: 'Context', adds: 'Injects external information into the prompt — retrieved documents, tool outputs, conversation history — before generation', broke: 'Still one-shot: the model can be given richer input, but has no way to take an action and see the result before it has to finish answering' },
  { name: 'Harness', adds: 'Code around the model that can actually execute a tool call and feed the result back in as new context', broke: 'Handles one call-and-response cycle, but nothing structures a sequence of many steps toward a goal' },
  { name: 'Loop', adds: 'A repeating reason → act → observe cycle (ReAct) — the agent takes many steps, using each observation to decide the next action', broke: 'Still one linear path through the task — no explicit branching, no parallel sub-tasks, no shared state across multiple specialized roles' },
  { name: 'Graph', adds: 'Nodes are tool calls, agents, or sub-loops; edges are transitions — including conditional ones — over explicit shared state: a real state machine, not just a straight line (LangGraph is the practical, named implementation)', broke: '— (roughly where practice is today; the next constraint is the cost and latency of coordinating a large graph, not a missing capability)' },
];

/** Prompt -> Context -> Harness -> Loop -> Graph: the same "each stage
 * patches the previous one's ceiling" chain as ArchitectureEvolutionDiagram,
 * applied to how agentic systems actually got built up in practice. Click
 * a stage to read what it added and what it still couldn't do. */
export default function AgentEvolutionDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(STAGES.length, 3000, 4);
  const selected = cyc.value;
  const setSelected = cyc.pick;
  const width = 640;
  const height = 130;
  const nodeW = (width - 40) / STAGES.length;
  const y = 40;

  return (
    <VisualizationContainer footer="Click a stage -- each one exists because the previous one hit a wall in production. A Graph isn't 'fancier than a Loop' for its own sake: it's what you get when a single linear ReAct loop can't express branching failure paths, parallel sub-tasks, or a writer/checker split without collapsing back into one long, hard-to-debug prompt.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="aev-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 20 + i * nodeW + nodeW / 2;
          const isSelected = selected === i;
          const isLast = i === STAGES.length - 1;
          const color = isLast ? t.accentPrimary : t.accentSecondary;
          const prevX = 20 + (i - 1) * nodeW + nodeW / 2;
          return (
            <g key={s.name}>
              {i > 0 && (
                <>
                  <line x1={prevX + 46} y1={y} x2={x - 46} y2={y} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#aev-arrow)" />
                  <FlowDots d={line(prevX + 46, y, x - 46, y)} color={t.accentSecondary} dur={3.2} delay={(i - 1) * 0.7} count={1} />
                </>
              )}
              <PulseRect x={x - 46} y={y - 20} w={92} h={40} color={color} blink dur={3.2} delay={(i - 1) * 0.7 + 0.5} />
              <g
                onClick={() => setSelected(i)}
                onMouseEnter={() => setSelected(i)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${s.name} stage`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(i);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect x={x - 46} y={y - 20} width={92} height={40} rx={8} fill={isSelected ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{s.name}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap', fontSize: DIAGRAM_TYPE.caption.size }}>
        <div style={{ color: t.accentPrimary, maxWidth: 280 }}><strong>Added:</strong> <span style={{ color: t.textSecondary }}>{STAGES[selected].adds}</span></div>
        <div style={{ color: t.accentDanger, maxWidth: 280 }}><strong>Still couldn't:</strong> <span style={{ color: t.textSecondary }}>{STAGES[selected].broke}</span></div>
      </div>
    </VisualizationContainer>
  );
}
