import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, ControlRow, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Mode = 'router' | 'supervisor';

interface Step {
  actor: string;
  detail: string;
}

// The same two-part request, handled two different real architectures.
// Router: LangGraph's Command(goto=...) pattern -- one classification,
// one dispatch, done, no way back in. Supervisor: langgraph_supervisor's
// tool-based handoff loop -- the supervisor inspects each result and
// decides whether more work is needed before finishing.
const REQUEST = '"What\'s the weather in Paris tomorrow, and should I pack a coat?"';

const ROUTER_STEPS: Step[] = [
  { actor: 'Router', detail: 'Classifies the request once: "weather" is the dominant intent -> Command(goto="weather_agent"). This decision is final.' },
  { actor: 'weather_agent', detail: 'Answers: "14°C, light rain." The router already exited -- there is no step where anything re-reads this output and decides more is needed.' },
  { actor: 'Done', detail: 'Response returned as-is. The packing-advice half of the question goes unanswered unless weather_agent happens to address it unprompted -- routing has no mechanism to notice it didn\'t.' },
];

const SUPERVISOR_STEPS: Step[] = [
  { actor: 'Supervisor', detail: 'Receives the request, calls its weather_agent tool (a real LLM tool call, not a classification label).' },
  { actor: 'weather_agent', detail: 'Returns "14°C, light rain" as a tool result -- control returns to the supervisor, not to the user.' },
  { actor: 'Supervisor', detail: 'Inspects the result against the original request: the packing question is still unanswered. Decides to call a second tool.' },
  { actor: 'advice_agent', detail: 'Given the weather result as context, answers: "Yes, light rain at 14°C -- pack a light coat."' },
  { actor: 'Supervisor', detail: 'Both parts of the original request are now addressed. Synthesizes one final answer and stops -- a real termination decision, not running out of steps.' },
];

/** Steps through the same 2-part request via LangGraph's Router
 * (Command(goto=...), single dispatch) vs. the supervisor pattern (a tool-
 * calling loop that inspects results and decides whether more work is
 * needed) -- the actual architectural difference, not just an assertion
 * of one. */
export default function RouterVsSupervisorDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('router');
  const [step, setStep] = useState(0);
  const color = getConceptColor(t, 'attention');

  const steps = mode === 'router' ? ROUTER_STEPS : SUPERVISOR_STEPS;
  const atEnd = step === steps.length - 1;

  const setModeAndReset = (m: Mode) => {
    setMode(m);
    setStep(0);
  };

  return (
    <VisualizationContainer footer={steps[step].detail} title="Router vs. supervisor handling the same request">
      <ControlRow>
        <PillSelect<Mode>
          label="Pattern"
          value={mode}
          onChange={setModeAndReset}
          options={[
            { value: 'router', label: 'Router' },
            { value: 'supervisor', label: 'Supervisor' },
          ]}
        />
        <VizButton onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))} disabled={atEnd}>Step</VizButton>
        <VizButton variant="secondary" onClick={() => setStep(0)}>Reset</VizButton>
      </ControlRow>

      <div style={{ marginTop: 10, fontSize: 12.5, color: t.textSecondary, fontStyle: 'italic' }}>{REQUEST}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {steps.map((s, i) => (
          <SketchBox key={i} color={i === step ? color : t.border} strokeWidth={i === step ? 2 : 1.3} style={{ opacity: i <= step ? 1 : 0.45 }}>
            <div
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                fontSize: DIAGRAM_TYPE.secondaryLabel.size,
                background: i === step ? `${color}20` : i < step ? t.surfaceAlt : t.surface,
                fontWeight: i === step ? 700 : 500,
                fontFamily: HAND_FONT,
              }}
            >
              {i + 1}. {s.actor}
            </div>
          </SketchBox>
        ))}
      </div>

      {mode === 'router' && atEnd && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#d9534f' }}>
          {steps.length} step(s), 1 agent called -- and the "should I pack a coat" half of the request was never actually handled.
        </div>
      )}
      {mode === 'supervisor' && atEnd && (
        <div style={{ marginTop: 10, fontSize: 12, color: t.textSecondary }}>
          {steps.length} step(s), 2 agents called across 2 rounds of supervisor decision-making -- both parts of the request addressed, at the cost of 2 extra LLM calls (the supervisor's own inspect-and-decide steps) that the router never pays.
        </div>
      )}
    </VisualizationContainer>
  );
}
