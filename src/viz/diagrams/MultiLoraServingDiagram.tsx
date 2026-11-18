import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Four task-specific fine-tunes, served either as four separately
 * stored/deployed full models or as one base model with four
 * swappable LoRA adapters -- click to compare. */
export default function MultiLoraServingDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 1);
  const shared = value === 1;
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;
  const ADAPTERS = ['support', 'legal', 'billing', 'onboarding'];

  return (
    <VisualizationContainer footer={shared ? 'One base model deployed once, with 4 small swappable LoRA adapters loaded alongside it -- a request specifies which adapter to apply, applied on the fly. vLLM supports this natively.' : 'Each fine-tune fully merged into its own complete model -- 4x the storage, 4x the deployment/scaling overhead, even though most of each model\'s weights are identical to the base.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !shared ? 700 : 500, background: !shared ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!shared ? color : t.border}`, color: !shared ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Full model per fine-tune (4x VRAM ⚠)
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: shared ? 700 : 500, background: shared ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${shared ? color : t.border}`, color: shared ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Multi-LoRA on one base (1x VRAM ✓)
        </button>
      </div>
      {shared ? (
        <div>
          <div style={{ padding: '0.6rem', borderRadius: 7, background: `${okColor}18`, border: `1.5px solid ${okColor}`, textAlign: 'center', marginBottom: 6, transition: 'all 200ms ease' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: okColor }}>base model (deployed once in GPU VRAM)</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ADAPTERS.map((a) => (
              <div key={a} style={{ flex: 1, padding: '0.4rem', borderRadius: 6, background: `${color}15`, border: `1px solid ${color}40`, textAlign: 'center', transition: 'all 200ms ease' }}>
                <span style={{ fontSize: 8.5, color, fontWeight: 600 }}>{a} adapter</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 4 }}>
          {ADAPTERS.map((a) => (
            <div key={a} style={{ flex: 1, padding: '0.6rem 0.3rem', borderRadius: 7, background: `${t.accentDanger}12`, border: `1.5px solid ${t.accentDanger}40`, textAlign: 'center', transition: 'all 200ms ease' }}>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: t.accentDanger }}>{a} model (full copy)</span>
            </div>
          ))}
        </div>
      )}
    </VisualizationContainer>
  );
}
