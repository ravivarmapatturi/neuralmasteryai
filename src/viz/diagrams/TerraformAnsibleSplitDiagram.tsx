import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Terraform provisions the VM; Ansible (or a baked container image)
 * configures what runs on it -- a static division-of-responsibility
 * diagram, since the two tools are complementary, not competing. */
export default function TerraformAnsibleSplitDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Terraform is agnostic to immutable vs. configuration-management -- it provisions infrastructure either way. The immutable-infrastructure trend has pushed more configuration into the container image itself, but Ansible-alongside-Terraform remains common.">
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <SketchBox color={color} strokeWidth={1.5} style={{ flex: 1 }}>
          <div style={{ padding: '0.8rem', borderRadius: 8, background: `${color}12` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color, marginBottom: 4, fontFamily: HAND_FONT }}>Terraform</div>
            <div style={{ fontSize: 9.5, color: t.textSecondary, fontFamily: HAND_FONT }}>Provisions the VM itself -- the instance exists, in the right VPC/subnet, with the right size.</div>
          </div>
        </SketchBox>
        <div style={{ display: 'flex', alignItems: 'center', color: t.textMuted, fontSize: 16 }}>+</div>
        <SketchBox color={t.accentPrimary} strokeWidth={1.5} style={{ flex: 1 }}>
          <div style={{ padding: '0.8rem', borderRadius: 8, background: `${t.accentPrimary}12` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: t.accentPrimary, marginBottom: 4, fontFamily: HAND_FONT }}>Ansible (or baked image)</div>
            <div style={{ fontSize: 9.5, color: t.textSecondary, fontFamily: HAND_FONT }}>Configures what runs on that VM -- packages, config files, services.</div>
          </div>
        </SketchBox>
      </div>
    </VisualizationContainer>
  );
}
