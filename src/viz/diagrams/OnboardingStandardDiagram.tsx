import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Clone, one setup command, working -- the standard every practice
 * on this page exists to make true, with no tribal knowledge step
 * hiding in the middle. */
export default function OnboardingStandardDiagram() {
  const t = useVizTokens();
  const STEPS = ['git clone', 'one setup command', 'tests pass', 'linting passes', 'local pipeline runs'];
  const { value: activeIndex, pick } = useAutoCycle(STEPS.length, 2400, 1);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer='No "ask Sarah how the data loads" step hides anywhere in this sequence -- every practice on this page exists to make that true.'>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const isActive = activeIndex === i;
          const last = i === STEPS.length - 1;
          const boxColor = isActive ? color : last ? t.accentPrimary : t.border;
          return (
            <div key={s} onClick={() => pick(i)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <SketchBox color={boxColor} strokeWidth={isActive ? 2.5 : last ? 2 : 1.3}>
                <div style={{ padding: '0.5rem 0.55rem', background: isActive ? `${color}25` : last ? `${t.accentPrimary}18` : t.surfaceAlt, transition: 'background 250ms ease' }}>
                  <span style={{ fontSize: 9.5, fontWeight: isActive || last ? 700 : 500, fontFamily: HAND_FONT, color: isActive ? color : last ? t.accentPrimary : t.textPrimary }}>
                    {isActive ? `▶ ${s}` : s}
                  </span>
                </div>
              </SketchBox>
              {!last && <span style={{ color: activeIndex > i ? color : t.textMuted, fontSize: 11, fontWeight: activeIndex > i ? 700 : 400 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
