import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Governance policy only matters once it's enforced technically --
 * a static flow from written policy to an actual CI/CD gate, not left
 * as a document nobody checks against before shipping. */
export default function GovernanceApprovalFlowDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');

  const STEPS = ['Written policy', 'Which models approved for which use cases', 'Who has deploy authority', 'Enforced via CI/CD gate'];

  return (
    <VisualizationContainer footer="A policy document nobody actually checks against before shipping isn't governance -- it becomes governance the moment it's enforced as an automated CI/CD gate, the same gate every other deploy passes through.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SketchBox color={last ? color : t.border} strokeWidth={last ? 2 : 1.3} style={{ maxWidth: 110 }}>
                <div style={{ padding: '0.5rem 0.6rem', background: last ? `${color}18` : t.surfaceAlt }}>
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
