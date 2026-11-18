import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'model', label: 'Model', desc: 'The trained/fine-tuned weights -- the artifact everything downstream packages and serves.' },
  { key: 'container', label: 'Container', desc: 'The model artifact packaged into a container running one of the Tier 1/2 inference engines.' },
  { key: 'vm', label: 'GPU VM', desc: 'Deployed onto a GPU-backed VM or Kubernetes node -- the hardware the container actually runs on.' },
  { key: 'engine', label: 'Inference Engine', desc: 'vLLM/llama.cpp/SGLang/TensorRT-LLM -- handles the actual forward passes, batching, and KV cache.' },
  { key: 'lb', label: 'Load Balancer', desc: 'Distributes incoming traffic across however many replicas of the deployment exist.' },
  { key: 'api', label: 'API', desc: 'What callers actually talk to -- a single, stable endpoint regardless of how many replicas sit behind it.' },
];

/** The generic hosting pattern, regardless of provider -- click a
 * stage for what it actually does. */
export default function HostingStackDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(STAGES.length, 2500, 3);
  const color = getConceptColor(t, 'attention');
  const s = STAGES[activeIndex];

  return (
    <VisualizationContainer footer={s.desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {STAGES.map((x, i) => {
          const isActive = activeIndex === i;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer', padding: '0.45rem 0.5rem', borderRadius: 7, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
                <span style={{ fontSize: 8.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{isActive ? `▶ ${x.label}` : x.label}</span>
              </div>
              {i < STAGES.length - 1 && <span style={{ color: activeIndex > i ? color : t.textMuted, fontSize: 10, fontWeight: activeIndex > i ? 700 : 400 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
