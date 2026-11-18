import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STEPS = [
  { key: 'write', label: 'Write config', desc: 'Infrastructure declared in .tf files -- reviewed like any other code change, in a pull request.' },
  { key: 'plan', label: 'terraform plan', desc: 'Terraform diffs "what\'s declared" against its state file (what it last created) and shows exactly what would change -- before touching anything.' },
  { key: 'apply', label: 'terraform apply', desc: 'Only the computed diff is actually applied -- unchanged resources are left alone.' },
  { key: 'state', label: 'State updated', desc: 'The state file now reflects reality again -- the record the next plan diffs against.' },
];

/** The core Terraform loop -- click a step to see what it actually
 * does, from declared config to applied infrastructure. */
export default function TerraformWorkflowDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(STEPS.length, 2600, 1);
  const color = getConceptColor(t, 'attention');
  const s = STEPS[activeIndex];

  return (
    <VisualizationContainer footer={s.desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((x, i) => {
          const isActive = activeIndex === i;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer', padding: '0.5rem 0.65rem', borderRadius: 7, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
                <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{isActive ? `▶ ${x.label}` : x.label}</span>
              </div>
              {i < STEPS.length - 1 && <span style={{ color: activeIndex > i ? color : t.textMuted, fontSize: 12, fontWeight: activeIndex > i ? 700 : 400 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
