import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type State = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed';
const STATES: { key: State; desc: string }[] = [
  { key: 'submitted', desc: 'The task has been handed off but the receiving agent hasn\'t started yet.' },
  { key: 'working', desc: 'The receiving agent is actively processing -- may take far longer than a single function call.' },
  { key: 'input-required', desc: 'The receiving agent needs clarification before it can continue -- something a stateless tool call has no way to express.' },
  { key: 'completed', desc: 'The task finished successfully; the result is available to the delegating agent.' },
  { key: 'failed', desc: 'The task could not be completed -- the delegating agent needs to decide whether to retry, reassign, or escalate.' },
];

/** Delegation isn't call-and-return -- it's a task with real states,
 * including one (input-required) that has no equivalent in a stateless
 * tool call. Click a state for what it means. */
export default function TaskLifecycleDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<State>('input-required');
  const color = getConceptColor(t, 'key');
  const terminalColor = (s: State) => (s === 'completed' ? getConceptColor(t, 'attention') : s === 'failed' ? t.accentDanger : color);

  const width = 600;
  const y = 55;
  const xFor = (i: number) => 50 + i * ((width - 100) / (STATES.length - 1));

  return (
    <VisualizationContainer footer={STATES.find((s) => s.key === active)!.desc}>
      <svg width="100%" viewBox={`0 0 ${width} 100`} style={{ display: 'block' }}>
        {STATES.map((_, i) => i > 0 && (
          <SketchArrow key={`l${i}`} points={[[xFor(i - 1) + 45, y], [xFor(i) - 45, y]]} color={t.textMuted} strokeWidth={1.5} id={`tl-arrow-${i}`} />
        ))}
        {active === 'input-required' && (
          <SketchArrow points={[[xFor(2), y - 18], [xFor(2), y - 45], [xFor(1), y - 45], [xFor(1), y - 18]]} color={color} strokeWidth={1.5} id="tl-loop" />
        )}
        {STATES.map((stateInfo, i) => {
          const isActive = active === stateInfo.key;
          const c = terminalColor(stateInfo.key);
          return (
            <g key={stateInfo.key} onClick={() => setActive(stateInfo.key)} onMouseEnter={() => setActive(stateInfo.key)} style={{ cursor: 'pointer' }}>
              <rect x={xFor(i) - 44} y={y - 18} width={88} height={36} rx={7} fill={isActive ? `${c}30` : t.surfaceAlt} stroke="none" />
              <SketchRect x={xFor(i) - 44} y={y - 18} width={88} height={36} color={c} strokeWidth={isActive ? 2.5 : 1.5} id={`tl-state-${stateInfo.key}`} />
              <text x={xFor(i)} y={y + 4} textAnchor="middle" fontSize={9} fontWeight={isActive ? 700 : 500} fontFamily={HAND_FONT} fill={c}>{stateInfo.key}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        The curved arrow: input-required can loop back to working once clarification arrives.
      </div>
    </VisualizationContainer>
  );
}
