import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, ControlRow, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS, getConceptColor } from './diagramSystem';

type Phase = 'plan' | 'execute' | 'replan' | 'execute2' | 'done';

interface Frame {
  phase: Phase;
  plan: string[];
  completed: number[];
  note: string;
}

// A scripted but mechanically real trace: task = "compare pricing across
// three competitors." Steps 1-2 succeed as planned; step 3 hits a dead
// page, and the replanner -- seeing that in past_steps -- inserts a real
// substitute step rather than the agent silently failing or looping.
const FRAMES: Frame[] = [
  {
    phase: 'plan',
    plan: ['Search Company A pricing page', 'Search Company B pricing page', 'Search Company C pricing page', 'Synthesize into a comparison table'],
    completed: [],
    note: 'Planner produces the full multi-step plan upfront -- one LLM call reasons about the whole task, not one call per step.',
  },
  {
    phase: 'execute',
    plan: ['Search Company A pricing page', 'Search Company B pricing page', 'Search Company C pricing page', 'Synthesize into a comparison table'],
    completed: [0],
    note: 'Executor runs step 1 -- a plain tool call, no re-reasoning about the whole task. This is where the speed/cost win over ReAct actually comes from.',
  },
  {
    phase: 'execute',
    plan: ['Search Company A pricing page', 'Search Company B pricing page', 'Search Company C pricing page', 'Synthesize into a comparison table'],
    completed: [0, 1],
    note: 'Step 2 succeeds the same way. So far, zero re-planning -- exactly the predictable-structure case plan-and-execute is built for.',
  },
  {
    phase: 'replan',
    plan: ['Search Company A pricing page', 'Search Company B pricing page', 'Search Company C pricing page (404)', 'Synthesize into a comparison table'],
    completed: [0, 1],
    note: "Step 3's pricing page returns a 404. The replanner sees this in past_steps and revises: rather than retrying the same dead URL, it inserts a real substitute step -- \"find Company C's pricing via a recent news article instead.\"",
  },
  {
    phase: 'execute2',
    plan: ['Search Company A pricing page', 'Search Company B pricing page', "Find Company C's pricing via news coverage", 'Synthesize into a comparison table'],
    completed: [0, 1, 2],
    note: 'The revised step succeeds. This is real replanning-on-failure, not the agent silently giving up or looping on the same broken action.',
  },
  {
    phase: 'done',
    plan: ['Search Company A pricing page', 'Search Company B pricing page', "Find Company C's pricing via news coverage", 'Synthesize into a comparison table'],
    completed: [0, 1, 2, 3],
    note: 'Final step runs and the replanner decides the task is complete -- no more steps needed, return the response.',
  },
];

export default function PlanExecuteReplanDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(FRAMES.length, 3000);
  const i = cyc.value;
  const color = getConceptColor(t, 'attention');
  const warn = t.accentWarn;
  const frame = FRAMES[i];

  const next = () => cyc.pick(Math.min(i + 1, FRAMES.length - 1));
  const reset = () => cyc.pick(0);

  return (
    <VisualizationContainer footer={frame.note}>
      <ControlRow>
        <VizButton onClick={next} disabled={i === FRAMES.length - 1}>
          Step
        </VizButton>
        <VizButton variant="secondary" onClick={reset}>
          Reset
        </VizButton>
        <span style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
          {i + 1} / {FRAMES.length}
        </span>
      </ControlRow>
      <div style={{ marginTop: 10 }}>
        {frame.plan.map((step, idx) => {
          const isDone = frame.completed.includes(idx);
          const isFailedStep = step.includes('404');
          const isRevised = idx === 2 && frame.phase !== 'plan' && frame.phase !== 'execute' && !frame.plan[2].includes('404') && frame.completed.includes(2);
          const isCurrentAction =
            (frame.phase === 'plan' && idx === 0) ||
            (frame.phase === 'execute' && idx === frame.completed.length - 1) ||
            (frame.phase === 'replan' && idx === 2) ||
            (frame.phase === 'execute2' && idx === 2) ||
            (frame.phase === 'done' && idx === 3);
          const rowColor = isFailedStep ? warn : isDone ? color : t.textMuted;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                marginBottom: 4,
                borderRadius: DIAGRAM_RADIUS.node,
                background: isDone ? `${color}12` : t.surfaceAlt,
                border: `1px solid ${isFailedStep ? warn : isDone ? color : t.border}`,
                boxShadow: isCurrentAction && !reducedMotion ? `0 0 6px ${isFailedStep ? warn : color}33` : 'none',
                transform: isCurrentAction && !reducedMotion ? 'translateX(2px)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: rowColor, minWidth: 14 }}>{idx + 1}.</span>
              <span style={{ fontSize: 10.5, color: rowColor }}>{step}</span>
              {isDone && !isFailedStep && <span style={{ marginLeft: 'auto', fontSize: 9, color, fontWeight: 700 }}>done</span>}
              {isFailedStep && <span style={{ marginLeft: 'auto', fontSize: 9, color: warn, fontWeight: 700 }}>failed</span>}
              {isRevised && <span style={{ marginLeft: 'auto', fontSize: 9, color, fontWeight: 700 }}>revised, done</span>}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6, fontWeight: 700, textTransform: 'uppercase' }}>
        {frame.phase === 'plan' ? 'Planner' : frame.phase === 'replan' ? 'Replanner' : 'Executor'}
      </div>
    </VisualizationContainer>
  );
}