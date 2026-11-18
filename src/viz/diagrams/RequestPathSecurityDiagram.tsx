import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'vpc', label: 'VPC', desc: 'An isolated virtual network -- where every resource actually lives, with subnets controlling what\'s public vs. private.' },
  { key: 'gateway', label: 'ALB / API Gateway', desc: 'ALB distributes traffic across a serving fleet; API Gateway additionally authenticates and rate-limits traffic in front of Lambda or other backends.' },
  { key: 'compute', label: 'Compute (EC2/ECS/EKS/Lambda)', desc: 'The actual workload -- whichever compute option fits the job, sitting inside the VPC\'s private subnets.' },
  { key: 'iam', label: 'IAM + Secrets Manager/KMS', desc: 'Governs what the compute layer is allowed to do, and where API keys/DB credentials live instead of a config file or Dockerfile -- the most common source of both access bugs and real security incidents when over-permissioned.' },
];

/** A request's path through AWS networking/security layers -- click
 * one to see what it's actually responsible for. */
export default function RequestPathSecurityDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(LAYERS.length, 3000);
  const color = getConceptColor(t, 'attention');
  const l = LAYERS[cyc.value];

  return (
    <VisualizationContainer footer={l.desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {LAYERS.map((x, i) => {
          const isActive = cyc.value === i;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div
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
                  padding: '0.5rem 0.55rem',
                  borderRadius: 7,
                  background: isActive ? `${color}18` : t.surfaceAlt,
                  border: `1.5px solid ${isActive ? color : t.border}`,
                  boxShadow: isActive && !reducedMotion ? `0 0 6px ${color}33` : 'none',
                  transform: isActive && !reducedMotion ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  maxWidth: 110,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
              </div>
              {i < LAYERS.length - 1 && (
                <span
                  style={{
                    color: cyc.value === i && !reducedMotion ? color : t.textMuted,
                    fontSize: 11,
                    fontWeight: cyc.value === i ? 700 : 400,
                    transition: 'color 0.2s ease',
                  }}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}