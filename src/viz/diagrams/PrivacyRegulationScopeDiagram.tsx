import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const REGS = [
  { key: 'pii', label: 'PII controls', desc: 'Detecting, redacting, and controlling access to personal data flowing through training data, logs, and traces -- the technical layer underneath both regulations below.' },
  { key: 'gdpr', label: 'GDPR (EU)', desc: 'Grants a "right to be forgotten" -- genuinely difficult for a model trained on that person\'s data, since deleting a row has no clean equivalent for deleting influence from trained weights. Active, unresolved governance practice, not a solved checkbox.' },
  { key: 'hipaa', label: 'HIPAA (U.S. healthcare)', desc: 'Access controls scoped to legitimate need, audit logging, careful third-party data-processing agreements -- the healthcare-specific case, but the pattern generalizes to other regulated-data domains.' },
];

/** PII/GDPR/HIPAA cover overlapping but distinct ground -- click one
 * for what it actually requires. */
export default function PrivacyRegulationScopeDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(REGS.length, 2600, 1);
  const color = getConceptColor(t, 'attention');
  const r = REGS[activeIndex];

  return (
    <VisualizationContainer footer={r.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {REGS.map((x, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div key={x.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.5rem 0.7rem', borderRadius: 7, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{isActive ? `▶ ${x.label}` : x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
