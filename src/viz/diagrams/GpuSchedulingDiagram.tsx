import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Workload = 'cpu' | 'gpu';

/** The same HPA scale-up event, on a CPU node vs a GPU node -- CPU
 * capacity is cheap and fast to add; GPU capacity is expensive to keep
 * idle and slow to provision, which is why this wrinkle exists at all. */
export default function GpuSchedulingDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 1);
  const workload: Workload = value === 0 ? 'cpu' : 'gpu';
  const color = getConceptColor(t, 'attention');
  const cpuColor = getConceptColor(t, 'query');

  const c = workload === 'gpu' ? color : cpuColor;
  const provisionTime = workload === 'gpu' ? '5-10 min (or longer, capacity-dependent)' : '~30 sec';
  const idleCost = workload === 'gpu' ? 'High -- GPUs are expensive to keep running unused' : 'Low';

  return (
    <VisualizationContainer footer={`Scale-up event on a ${workload.toUpperCase()} node: provisioning time ≈ ${provisionTime}. Cost of keeping spare capacity idle: ${idleCost}.`}>
      <PillSelect<Workload>
        label="Node type"
        value={workload}
        onChange={(w) => {
          const next = typeof w === 'function' ? w(workload) : w;
          pick(next === 'cpu' ? 0 : 1);
        }}
        options={[{ value: 'cpu', label: 'CPU web service' }, { value: 'gpu', label: 'GPU inference service' }]}
      />
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ padding: '0.6rem 0.85rem', borderRadius: 8, background: `${c}15`, border: `1.5px solid ${c}`, transition: 'all 200ms ease' }}>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>Requires</div>
          <div style={{ fontSize: 11.5, color: c, fontFamily: 'monospace', fontWeight: 600 }}>{workload === 'gpu' ? 'nvidia.com/gpu resource request + NVIDIA device plugin (DaemonSet)' : 'cpu / memory resource request'}</div>
        </div>
        <div style={{ padding: '0.6rem 0.85rem', borderRadius: 8, background: `${c}15`, border: `1.5px solid ${c}`, transition: 'all 200ms ease' }}>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>HPA scale-up under load</div>
          <div style={{ fontSize: 11.5, color: c, fontWeight: 600 }}>{provisionTime}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        This is a major reason serverless-style GPU platforms exist as an alternative to running your own GPU-backed cluster.
      </div>
    </VisualizationContainer>
  );
}
