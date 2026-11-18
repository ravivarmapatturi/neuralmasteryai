import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, PulseRect, line, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type State = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed';
const STATES: { key: State; desc: string; label: string; x: number; y: number }[] = [
  { key: 'submitted', label: 'submitted', desc: 'The task has been handed off but the receiving agent hasn\'t started yet.', x: 75, y: 75 },
  { key: 'working', label: 'working', desc: 'The receiving agent is actively processing -- may take far longer than a single function call.', x: 235, y: 75 },
  { key: 'input-required', label: 'input-required', desc: 'The receiving agent needs clarification before it can continue -- something a stateless tool call has no way to express.', x: 235, y: 150 },
  { key: 'completed', label: 'completed', desc: 'The task finished successfully; the result is available to the delegating agent.', x: 425, y: 45 },
  { key: 'failed', label: 'failed', desc: 'The task could not be completed -- the delegating agent needs to decide whether to retry, reassign, or escalate.', x: 425, y: 105 },
];

/** Delegation isn't call-and-return -- it's a task with real states,
 * including one (input-required) that has no equivalent in a stateless
 * tool call. Click a state for what it means. */
export default function TaskLifecycleDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(STATES.length, 2500, 2);
  const active = STATES[cyc.value].key;
  const setActive = (s: State) => cyc.pick(STATES.findIndex((st) => st.key === s));
  const activeState = STATES[cyc.value];
  const color = getConceptColor(t, 'key');
  const terminalColor = (s: State) => (s === 'completed' ? getConceptColor(t, 'attention') : s === 'failed' ? t.accentDanger : color);

  const width = 520;
  const height = 190;
  const stateW = 96;
  const stateH = 34;

  return (
    <VisualizationContainer footer={STATES.find((s) => s.key === active)!.desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {/* submitted -> working */}
        <SketchArrow points={[[75 + stateW / 2, 75], [235 - stateW / 2 - 2, 75]]} color={t.textMuted} strokeWidth={1.5} arrowhead id="tl-arr-sub" />
        <FlowDots d={line(75 + stateW / 2, 75, 235 - stateW / 2 - 2, 75)} color={t.textMuted} dur={2.4} count={1} />

        {/* working -> input-required */}
        <SketchArrow points={[[255, 75 + stateH / 2], [255, 150 - stateH / 2 - 2]]} color={active === 'input-required' ? color : t.textMuted} strokeWidth={1.5} arrowhead id="tl-arr-need" />
        <FlowDots d={line(255, 75 + stateH / 2, 255, 150 - stateH / 2 - 2)} color={color} dur={2.4} count={1} delay={0.6} />

        {/* input-required -> working (loopback upon clarification) */}
        <SketchArrow points={[[215, 150 - stateH / 2], [215, 75 + stateH / 2 + 2]]} color={active === 'input-required' ? color : t.textMuted} strokeWidth={1.5} arrowhead id="tl-arr-back" />
        <FlowDots d={line(215, 150 - stateH / 2, 215, 75 + stateH / 2 + 2)} color={color} dur={2.4} count={1} delay={1.8} />

        {/* working -> completed */}
        <SketchArrow points={[[235 + stateW / 2, 68], [425 - stateW / 2 - 2, 45]]} color={active === 'completed' ? getConceptColor(t, 'attention') : t.textMuted} strokeWidth={1.5} arrowhead id="tl-arr-comp" />
        <FlowDots d={line(235 + stateW / 2, 68, 425 - stateW / 2 - 2, 45)} color={getConceptColor(t, 'attention')} dur={2.4} count={1} delay={1.2} />

        {/* working -> failed */}
        <SketchArrow points={[[235 + stateW / 2, 82], [425 - stateW / 2 - 2, 105]]} color={active === 'failed' ? t.accentDanger : t.textMuted} strokeWidth={1.5} arrowhead id="tl-arr-fail" />

        {/* loop label */}
        <text x={270} y={116} fontSize={8} fontFamily={HAND_FONT} fill={t.textMuted}>needs info</text>
        <text x={170} y={116} textAnchor="end" fontSize={8} fontFamily={HAND_FONT} fill={t.textMuted}>clarification</text>

        {STATES.map((stateInfo) => {
          const isActive = active === stateInfo.key;
          const c = terminalColor(stateInfo.key);
          return (
            <g key={stateInfo.key} onClick={() => setActive(stateInfo.key)} onMouseEnter={() => setActive(stateInfo.key)} style={{ cursor: 'pointer' }}>
              <rect x={stateInfo.x - stateW / 2} y={stateInfo.y - stateH / 2} width={stateW} height={stateH} rx={7} fill={isActive ? `${c}30` : t.surfaceAlt} stroke="none" />
              <SketchRect x={stateInfo.x - stateW / 2} y={stateInfo.y - stateH / 2} width={stateW} height={stateH} color={c} strokeWidth={isActive ? 2.5 : 1.5} id={`tl-state-${stateInfo.key}`} />
              <text x={stateInfo.x} y={stateInfo.y + 4} textAnchor="middle" fontSize={10} fontWeight={isActive ? 700 : 600} fontFamily={HAND_FONT} fill={c}>{stateInfo.label}</text>
            </g>
          );
        })}
        <PulseRect x={activeState.x - stateW / 2} y={activeState.y - stateH / 2} w={stateW} h={stateH} color={terminalColor(activeState.key)} dur={2} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        A delegated task branches from working into terminal completed / failed states, or pauses in input-required for clarification.
      </div>
    </VisualizationContainer>
  );
}
