import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, ControlRow } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type ActionKind = 'click' | 'type' | 'scroll' | 'screenshot';

interface StepDef {
  kind: ActionKind;
  label: string;
  consequential: boolean;
  detail: string;
}

// A real task sequence through Anthropic's documented computer-use loop:
// screenshot -> model proposes one action -> consequential actions pause
// for human confirmation, others execute immediately -> new screenshot.
// The "consequential" flag on each step mirrors Anthropic's own stated
// guidance (see the page prose) almost verbatim: "asking a human to
// confirm decisions that might result in meaningful real-world
// consequences... such as accepting cookies, completing financial
// transactions, or agreeing to terms of service."
const STEPS: StepDef[] = [
  { kind: 'screenshot', label: 'Screenshot', consequential: false, detail: 'Initial screen captured as a base64 PNG and sent to the model.' },
  { kind: 'click', label: 'click(340, 120)', consequential: false, detail: 'Model clicks the search field. Routine UI navigation -- executes immediately.' },
  { kind: 'type', label: 'type("flights to Denver")', consequential: false, detail: 'Model types into the focused field. No real-world consequence yet -- executes immediately.' },
  { kind: 'click', label: 'click(512, 300)', consequential: false, detail: 'Model clicks a search result to view flight details. Still just navigation.' },
  { kind: 'click', label: 'click(640, 460) -- "Confirm Purchase"', consequential: true, detail: 'This click would complete a financial transaction -- exactly the category Anthropic\'s own guidance calls out for mandatory human confirmation before proceeding.' },
  { kind: 'screenshot', label: 'Screenshot', consequential: false, detail: 'Once a human confirms (or the model picks a different action), the loop continues from a fresh screenshot.' },
];

const ICON: Record<ActionKind, string> = {
  click: '🖱',
  type: '⌨',
  scroll: '↕',
  screenshot: '📷',
};

/** Steps through Anthropic's actual computer-use agent loop -- screenshot,
 * propose one action, execute or pause for human confirmation, repeat --
 * using the real distinction their own documentation draws between
 * routine UI actions and "consequential" ones. */
export default function ComputerUseLoopDiagram() {
  const t = useVizTokens();
  const [index, setIndex] = useState(0);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmed, setConfirmed] = useState<boolean[]>(new Array(STEPS.length).fill(false));

  const color = getConceptColor(t, 'attention');
  const step = STEPS[index];
  const atEnd = index === STEPS.length - 1 && (confirmed[index] || !step.consequential);

  const advance = () => {
    if (awaitingConfirmation) return;
    if (step.consequential && !confirmed[index]) {
      setAwaitingConfirmation(true);
      return;
    }
    if (index < STEPS.length - 1) setIndex(index + 1);
  };

  const confirm = () => {
    const next = [...confirmed];
    next[index] = true;
    setConfirmed(next);
    setAwaitingConfirmation(false);
  };

  const reset = () => {
    setIndex(0);
    setAwaitingConfirmation(false);
    setConfirmed(new Array(STEPS.length).fill(false));
  };

  let footer: string;
  if (awaitingConfirmation) {
    footer = `Paused: "${step.label}" is flagged consequential -- the loop will not execute it until a human confirms. This is Anthropic's own documented mitigation, not an assumption this diagram is making up.`;
  } else if (atEnd) {
    footer = 'Loop complete. Every consequential action in this task was gated on human confirmation before executing -- the routine ones (click, type, scroll) ran immediately.';
  } else {
    footer = `Step ${index + 1}/${STEPS.length}: ${step.detail}`;
  }

  return (
    <VisualizationContainer footer={footer} title="Computer-use agent loop with consequential-action confirmation">
      <ControlRow>
        {awaitingConfirmation ? (
          <VizButton onClick={confirm}>Confirm (human-in-the-loop)</VizButton>
        ) : (
          <VizButton onClick={advance} disabled={atEnd}>Step</VizButton>
        )}
        <VizButton variant="secondary" onClick={reset}>Reset</VizButton>
      </ControlRow>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const isCurrent = i === index;
          const isPast = i < index || (i === index && confirmed[i]);
          return (
            <SketchBox
              key={i}
              color={isCurrent ? color : s.consequential ? '#d9534f' : t.border}
              strokeWidth={1.5}
              style={{ flex: '1 1 90px', minWidth: 90, opacity: isPast || isCurrent ? 1 : 0.55 }}
            >
              <div
                style={{
                  padding: '8px 6px',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontSize: DIAGRAM_TYPE.secondaryLabel.size,
                  background: isCurrent ? `${color}20` : isPast ? t.surfaceAlt : t.surface,
                }}
              >
                <div style={{ fontSize: 16 }}>{ICON[s.kind]}</div>
                <div style={{ marginTop: 2, fontWeight: isCurrent ? 700 : 500, fontFamily: HAND_FONT }}>{s.label}</div>
                {s.consequential && (
                  <div style={{ color: '#d9534f', fontWeight: 600, marginTop: 2, fontFamily: HAND_FONT }}>consequential</div>
                )}
              </div>
            </SketchBox>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
