import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TERMS = [
  { key: 'engine', label: 'Inference engine/runtime', verb: 'EXECUTES the model', examples: 'vLLM, llama.cpp, TensorRT-LLM', isTraining: false },
  { key: 'framework', label: 'Serving framework', verb: 'EXPOSES the model as an API', examples: 'Often the same tool as the engine (vLLM); or separate (Triton runs several engines underneath)', isTraining: false },
  { key: 'platform', label: 'Hosting/deployment platform', verb: 'PROVIDES the infrastructure', examples: 'A cloud GPU provider, a Kubernetes cluster', isTraining: false },
  { key: 'training', label: 'Fine-tuning framework', verb: 'TRAINS/ADAPTS a model', examples: 'Unsloth — NOT what you deploy to serve traffic', isTraining: true },
];

/** Four terms used interchangeably in casual conversation that name four
 * actually-different jobs -- click one, with Unsloth called out explicitly
 * as the one that's commonly mistaken for an inference tool. */
export default function EngineTerminologyDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(TERMS.length, 2500, 3);
  const active = TERMS[activeIdx].key;
  const infColor = getConceptColor(t, 'attention');
  const trainColor = t.accentWarn;
  const info = TERMS[activeIdx];

  return (
    <VisualizationContainer footer={`${info.verb}. Examples: ${info.examples}.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TERMS.map((term, idx) => {
          const isSelected = active === term.key;
          const color = term.isTraining ? trainColor : infColor;
          return (
            <div
              key={term.key}
              onClick={() => pick(idx)}
              onMouseEnter={() => pick(idx)}
              style={{ cursor: 'pointer', padding: '0.55rem 0.8rem', borderRadius: 7, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}` }}
            >
              <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? color : t.textPrimary }}>{term.label}</span>
              {term.isTraining && <span style={{ marginLeft: 8, fontSize: 9.5, color: trainColor, fontWeight: 700 }}>← the odd one out</span>}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A model fine-tuned with Unsloth still needs to be handed off to an inference engine to actually be served.
      </div>
    </VisualizationContainer>
  );
}
