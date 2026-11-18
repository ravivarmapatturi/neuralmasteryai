import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const ARTIFACTS = [
  { key: 'docker', label: 'Docker container', desc: 'Runs on any of the three clouds\' compute (EC2/ECS/EKS, GCE/GKE, Azure VMs/AKS) with minimal to zero changes.' },
  { key: 'k8s', label: 'Kubernetes manifest', desc: 'Deploys identically to EKS, GKE, or AKS -- the Kubernetes API itself is the portability boundary, not any one cloud\'s implementation.' },
  { key: 'terraform', label: 'Terraform module', desc: 'The same infrastructure-as-code tool targets all three clouds\' provider APIs -- swap the provider block, not the workflow.' },
];

/** One artifact, portable across all three clouds -- click one to see
 * why deliberately staying cloud-agnostic here keeps a real option to
 * migrate or run multi-cloud, even without a near-term plan to. */
export default function CloudNeutralPortabilityDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(ARTIFACTS.length, 3500);
  const color = getConceptColor(t, 'attention');
  const a = ARTIFACTS[cyc.value];

  return (
    <VisualizationContainer footer={a.desc}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
        {ARTIFACTS.map((x, i) => {
          const isActive = cyc.value === i;
          return (
            <div
              key={x.key}
              onClick={() => cyc.pick(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  cyc.pick(i);
                }
              }}
              onMouseEnter={() => cyc.pick(i)}
              style={{
                cursor: 'pointer',
                padding: '0.5rem 0.8rem',
                borderRadius: 7,
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : t.border}`,
                boxShadow: isActive && !reducedMotion ? `0 0 8px ${color}33` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '0.6rem 1rem', borderRadius: 8, background: `${color}18`, border: `1.5px solid ${color}`, fontSize: 10.5, fontWeight: 700, color }}>{a.label}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        {['AWS', 'GCP', 'Azure'].map((cloud) => (
          <div
            key={cloud}
            style={{
              flex: 1,
              maxWidth: 90,
              textAlign: 'center',
              padding: '0.5rem 0.4rem',
              borderRadius: 7,
              background: `${t.accentPrimary}12`,
              border: `1px solid ${t.accentPrimary}40`,
              boxShadow: !reducedMotion ? `0 0 6px ${t.accentPrimary}22` : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: t.accentPrimary }}>{cloud}</span>
            <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2 }}>✓ runs as-is</div>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}