import { useState, useEffect } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, ControlRow, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

interface Element {
  index: number;
  tag: string;
  text: string;
}

// A real (if small) DOM-extraction result -- indexed interactive elements,
// the actual mechanism browser-use and similar frameworks use instead of
// pixel coordinates. Standing in for a flight-search results page.
const ELEMENTS: Element[] = [
  { index: 0, tag: 'input', text: '[search box]' },
  { index: 1, tag: 'button', text: '"Search flights"' },
  { index: 2, tag: 'a', text: '"United 2140 -- $412"' },
  { index: 3, tag: 'a', text: '"Delta 918 -- $389"' },
  { index: 4, tag: 'button', text: '"Sort by price"' },
];

type StageId = 'load' | 'extract' | 'decide' | 'act';

const STAGES: { id: StageId; label: string }[] = [
  { id: 'load', label: 'Page loads' },
  { id: 'extract', label: 'Extract DOM' },
  { id: 'decide', label: 'Model picks index' },
  { id: 'act', label: 'Execute action' },
];

/** The DOM-extraction action loop: interactive elements get indexed once
 * per step, the model chooses an action by index (not a pixel coordinate),
 * the action executes, and the page is re-extracted for the next step --
 * the real mechanism, not a screenshot-based approximation of it. */
export default function BrowserAgentActionDiagram() {
  const t = useVizTokens();
  const reduced = usePrefersReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const color = getConceptColor(t, 'attention');

  const stage = STAGES[stageIndex].id;

  useEffect(() => {
    if (reduced || !auto) return;
    const timer = window.setInterval(() => {
      setStageIndex((prev) => {
        if (prev < STAGES.length - 1) {
          if (prev === 1) setChosen(3);
          return prev + 1;
        }
        setChosen(null);
        return 0;
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [reduced, auto]);

  const step = () => {
    setAuto(false);
    if (stage === 'decide') {
      setChosen(3); // the model "chooses" the cheaper Delta result
    }
    setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
  };

  const reset = () => {
    setAuto(false);
    setStageIndex(0);
    setChosen(null);
  };

  const footerByStage: Record<StageId, string> = {
    load: 'A real page with 5 interactive elements has loaded -- to a vision-only agent this would just be pixels; here it\'s about to become structured data instead.',
    extract: 'The DOM (or accessibility tree) is parsed into an indexed list of interactive elements -- click(3) is unambiguous in a way click(640, 460) never is, because it names the element, not a screen position.',
    decide: `Model reasons over the indexed list and picks element ${chosen ?? '?'}: "${ELEMENTS[3].text}" -- selecting the cheaper result by comparing extracted text, not by recognizing pixels.`,
    act: `click(${chosen}) executes against the DOM node directly. The page changes -> re-extract -> next step. No coordinate math, no screenshot round-trip.`,
  };

  return (
    <VisualizationContainer footer={footerByStage[stage]} title="Browser agent DOM-extraction action loop">
      <div onPointerDown={() => setAuto(false)}>
        <ControlRow>
          <VizButton onClick={step} disabled={stageIndex === STAGES.length - 1}>Step</VizButton>
          <VizButton variant="secondary" onClick={reset}>Reset</VizButton>
        </ControlRow>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {STAGES.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 4px',
              borderRadius: 8,
              fontSize: DIAGRAM_TYPE.secondaryLabel.size,
              fontWeight: i === stageIndex ? 700 : 500,
              background: i === stageIndex ? `${color}20` : i < stageIndex ? t.surfaceAlt : t.surface,
              border: `1.5px solid ${i === stageIndex ? color : t.border}`,
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {stageIndex >= 1 && (
        <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12.5 }}>
          {ELEMENTS.map((el) => {
            const isChosen = stageIndex >= 2 && chosen === el.index;
            return (
              <div
                key={el.index}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  marginBottom: 3,
                  background: isChosen ? `${color}25` : 'transparent',
                  border: `1px solid ${isChosen ? color : t.border}`,
                  color: t.textPrimary,
                }}
              >
                [{el.index}] &lt;{el.tag}&gt; {el.text}
              </div>
            );
          })}
        </div>
      )}
    </VisualizationContainer>
  );
}
