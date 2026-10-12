import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Clone, one setup command, working -- the standard every practice
 * on this page exists to make true, with no tribal knowledge step
 * hiding in the middle. */
export default function OnboardingStandardDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');

  const STEPS = ['git clone', 'one setup command', 'tests pass', 'linting passes', 'local pipeline runs'];

  return (
    <VisualizationContainer footer='No "ask Sarah how the data loads" step hides anywhere in this sequence -- every practice on this page exists to make that true.'>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SketchBox color={last ? color : t.border} strokeWidth={last ? 2 : 1.3}>
                <div style={{ padding: '0.5rem 0.55rem', background: last ? `${color}18` : t.surfaceAlt }}>
                  <span style={{ fontSize: 9, fontWeight: last ? 700 : 500, fontFamily: HAND_FONT, color: last ? color : t.textPrimary }}>{s}</span>
                </div>
              </SketchBox>
              {!last && <span style={{ color: t.textMuted, fontSize: 11 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
