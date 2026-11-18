import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LICENSES = [
  { key: 'apache', label: 'Apache 2.0 / MIT', desc: 'Essentially unrestricted commercial use -- the permissive end of the spectrum.' },
  { key: 'threshold', label: 'User-count threshold', desc: 'Free below a usage threshold (e.g. under 700M monthly active users), commercial license required above it.' },
  { key: 'training', label: 'No training competing models', desc: "Restricts using the model's outputs to train a competing model -- common in several \"open\" LLM releases." },
  { key: 'usecase', label: 'Use-case restrictions', desc: 'Prohibits specific categories of use outright, regardless of scale -- narrower than a pure commercial-use question.' },
];

/** "Open-weight" spans a real spectrum of restrictions -- click a
 * license type to see what it actually permits. Always check the
 * text for the specific model version before commercial deployment. */
export default function ModelLicenseSpectrumDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(LICENSES.length, 2600, 1);
  const color = getConceptColor(t, 'attention');
  const l = LICENSES[activeIndex];

  return (
    <VisualizationContainer footer={l.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {LICENSES.map((x, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div key={x.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.5rem 0.7rem', borderRadius: 7, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{isActive ? `▶ ${x.label}` : x.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: t.textMuted, textAlign: 'center' }}>
        &ldquo;open-weight&rdquo; and &ldquo;open source&rdquo; are not the same guarantee — and terms change between model versions
      </div>
    </VisualizationContainer>
  );
}
