import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'gateway', label: 'API Gateway', desc: 'Authentication, rate limiting, routing — the same role it plays for any API.' },
  { key: 'framework', label: 'Serving Framework', desc: 'Exposes the model as an API, manages requests — queuing, batching decisions, streaming responses back.' },
  { key: 'engine', label: 'Inference Engine', desc: 'Executes the model efficiently — running forward passes, managing the KV cache, implementing PagedAttention/quantization/etc.' },
  { key: 'runtime', label: 'Model Runtime', desc: 'The lower-level execution layer the engine is built on (e.g. PyTorch, or a compiled runtime).' },
  { key: 'hardware', label: 'GPU / CUDA', desc: 'The hardware and driver layer everything ultimately runs on.' },
];

/** A request's actual path through 5 distinct layers -- click one to see
 * what problem it solves. vLLM collapsing framework+engine into one tool
 * is the exception, not the rule -- these are conceptually separate jobs. */
export default function InferenceStackLayersDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(LAYERS.length, 2500, 2);
  const active = LAYERS[activeIdx].key;
  const color = getConceptColor(t, 'attention');
  const info = LAYERS[activeIdx];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LAYERS.map((l, i) => {
          const isActive = active === l.key;
          return (
            <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                onClick={() => pick(i)}
                onMouseEnter={() => pick(i)}
                style={{ flex: 1, cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}
              >
                {l.label}
              </div>
              {i < LAYERS.length - 1 && <span style={{ color: t.textMuted, fontSize: 12 }}>↓</span>}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        User → API Gateway → Serving Framework → Inference Engine → Model Runtime → GPU → CUDA.
      </div>
    </VisualizationContainer>
  );
}
