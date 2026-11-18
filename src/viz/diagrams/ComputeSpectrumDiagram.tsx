import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { Pulse } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

const OPTIONS = [
  { key: 'ec2', label: 'EC2', control: 90, desc: 'Raw virtual machines -- the building block everything else is built on. GPU instances (p/g families) are where training and self-hosted inference actually run.' },
  { key: 'ecs', label: 'ECS', control: 55, desc: "AWS's own container orchestration -- simpler than Kubernetes, a reasonable choice when you don't need its full feature set." },
  { key: 'eks', label: 'EKS', control: 60, desc: 'Managed Kubernetes on AWS -- same orchestration model as self-managed K8s, with the control plane operated for you.' },
  { key: 'lambda', label: 'Lambda', control: 15, desc: 'Serverless functions, billed per invocation -- good for lightweight, spiky, stateless workloads; a poor fit for GPU inference or long cold-start-sensitive model loads.' },
];

/** EC2 through Lambda arranged on a control-vs-abstraction spectrum --
 * click one to see where it sits and what it actually trades off. */
export default function ComputeSpectrumDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(OPTIONS.length, 3000);
  const color = getConceptColor(t, 'attention');
  const o = OPTIONS[cyc.value];

  return (
    <VisualizationContainer footer={o.desc}>
      <div style={{ position: 'relative', height: 60, marginBottom: 10 }}>
        <div style={{ position: 'absolute', top: 26, left: 0, right: 0, height: 3, background: t.border, borderRadius: 2 }} />
        {OPTIONS.map((x, i) => {
          const isActive = cyc.value === i;
          return (
            <SelectableRow
              key={x.key}
              selected={isActive}
              label={x.label}
              onSelect={() => cyc.pick(i)}
              onMouseEnter={() => cyc.pick(i)}
              style={{
                position: 'absolute',
                left: `${100 - x.control}%`,
                top: 0,
                transform: 'translateX(-50%)',
                textAlign: 'center',
                width: 70,
              }}
            >
              <div style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textSecondary, marginBottom: 4 }}>{x.label}</div>
              <div style={{ position: 'relative', width: 14, height: 14, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isActive && !reducedMotion && (
                  <svg style={{ position: 'absolute', top: -13, left: -13, width: 40, height: 40, overflow: 'visible', pointerEvents: 'none' }}>
                    <Pulse cx={20} cy={20} r={10} color={color} />
                  </svg>
                )}
                <div style={{ width: isActive ? 14 : 10, height: isActive ? 14 : 10, borderRadius: '50%', background: isActive ? color : t.textMuted, border: `2px solid ${t.background}`, transition: 'all 0.2s ease' }} />
              </div>
            </SelectableRow>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: t.textMuted }}>
        <span>← more managed / less control</span>
        <span>more control / less managed →</span>
      </div>
    </VisualizationContainer>
  );
}