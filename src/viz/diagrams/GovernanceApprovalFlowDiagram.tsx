import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const STEPS = ['Written policy', 'Which models approved for which use cases', 'Who has deploy authority', 'Enforced via CI/CD gate'];

/** Governance policy only matters once it's enforced technically --
 * a static flow from written policy to an actual CI/CD gate, not left
 * as a document nobody checks against before shipping. */
export default function GovernanceApprovalFlowDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(STEPS.length, 2600, 3);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="A policy document nobody actually checks against before shipping isn't governance -- it becomes governance the moment it's enforced as an automated CI/CD gate, the same gate every other deploy passes through.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const isActive = activeIndex === i;
          const last = i === STEPS.length - 1;
          const boxColor = isActive ? color : last ? t.accentPrimary : t.border;
          return (
            <div key={s} onClick={() => pick(i)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <SketchBox color={boxColor} strokeWidth={isActive ? 2.5 : last ? 2 : 1.3} style={{ maxWidth: 110 }}>
                <div style={{ padding: '0.5rem 0.6rem', background: isActive ? `${color}25` : last ? `${t.accentPrimary}18` : t.surfaceAlt, transition: 'all 200ms ease' }}>
                  <span style={{ fontSize: 9, fontWeight: isActive || last ? 700 : 500, fontFamily: HAND_FONT, color: isActive ? color : last ? t.accentPrimary : t.textPrimary }}>
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
