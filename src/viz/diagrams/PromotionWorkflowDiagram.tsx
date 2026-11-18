import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Gate = 'manual' | 'automated';

/** Promotion is a deliberate GATE, not a side effect -- toggle between
 * the two ways that gate can be enforced. */
export default function PromotionWorkflowDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3600, 1);
  const gate: Gate = value === 0 ? 'manual' : 'automated';
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={gate === 'manual' ? 'Manual approval: a human reviews the candidate (metrics, a sample of predictions) and explicitly promotes it -- slower, but a person is accountable for the decision.' : 'Automated: promotion happens only if the model passes the regression checks from ML CI/CD -- faster, consistent, but only as good as the checks themselves.'}>
      <PillSelect<Gate>
        label="Promotion gate"
        value={gate}
        onChange={(g) => {
          const next = typeof g === 'function' ? g(gate) : g;
          pick(next === 'manual' ? 0 : 1);
        }}
        options={[{ value: 'manual', label: 'Manual approval' }, { value: 'automated', label: 'Automated (CI gate)' }]}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <SketchBox color={t.border} style={{ flex: 1 }}>
          <div style={{ padding: '0.6rem', borderRadius: 8, background: t.surfaceAlt, textAlign: 'center' }}>
            <span style={{ fontSize: 10.5, color: t.textMuted, fontFamily: HAND_FONT }}>Staging candidate</span>
          </div>
        </SketchBox>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color, fontFamily: HAND_FONT, marginBottom: 2 }}>{gate === 'manual' ? '👤 Human Sign-off' : '⚙ CI Tests Gate'}</div>
          <div style={{ fontSize: 16, color, fontWeight: 700 }}>→</div>
        </div>
        <SketchBox color={color} strokeWidth={2} style={{ flex: 1 }}>
          <div style={{ padding: '0.6rem', borderRadius: 8, background: `${color}18`, textAlign: 'center', transition: 'background 250ms ease' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color, fontFamily: HAND_FONT }}>Production (Promoted)</span>
          </div>
        </SketchBox>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Not an implicit side effect of training finishing -- a deliberate, gated action either way.
      </div>
    </VisualizationContainer>
  );
}
