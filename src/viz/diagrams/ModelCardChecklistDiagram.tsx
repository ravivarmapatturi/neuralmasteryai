import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ITEMS = [
  { key: 'arch', label: 'Architecture', desc: 'Decoder-only, encoder-decoder, diffusion, etc.' },
  { key: 'params', label: 'Parameters', desc: 'Total AND active (for MoE) -- active params determine per-token inference cost.' },
  { key: 'context', label: 'Context length', desc: 'Directly bounds KV cache memory requirements at serving time.' },
  { key: 'modalities', label: 'Modalities', desc: 'What input/output types are actually supported.' },
  { key: 'training', label: 'Training data & recency', desc: 'Effective knowledge cutoff -- relevant to the RAG-vs-fine-tuning decision.' },
  { key: 'license', label: 'License', desc: 'Check the actual current terms every time -- they change between versions of the same family.' },
  { key: 'benchmarks', label: 'Benchmark scores', desc: 'Read with contamination/saturation skepticism, not at face value.' },
  { key: 'hardware', label: 'Hardware requirements', desc: 'VRAM needed to serve at a given precision.' },
  { key: 'inference', label: 'Inference support', desc: 'Narrow engine support is a real operational constraint.' },
  { key: 'finetune', label: 'Fine-tuning support', desc: 'Whether LoRA/QLoRA tooling has mature support for the architecture.' },
  { key: 'quant', label: 'Quantization support', desc: 'Whether pre-quantized versions are readily available.' },
  { key: 'usecases', label: 'Use cases', desc: 'The out-of-scope-uses section is often more informative than the intended-use section.' },
];

/** 12 checklist items -- click one for why it's on the checklist, not
 * just that it is. */
export default function ModelCardChecklistDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick, stop } = useAutoCycle(ITEMS.length, 2500, 1);
  const color = getConceptColor(t, 'attention');
  const info = ITEMS[activeIdx];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 5 }}>
        {ITEMS.map((item, i) => {
          const isActive = activeIdx === i;
          return (
            <div
              key={item.key}
              onClick={() => { stop(); pick(i); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); pick(i); } }}
              onMouseEnter={() => { stop(); pick(i); }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.6rem', borderRadius: 6, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.25px solid ${isActive ? color : t.border}`, transition: 'all 0.25s ease' }}
            >
              <span style={{ color, fontSize: 11 }}>✓</span>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The same attribute set the Model Cards standard formalizes -- applies to any category above.
      </div>
    </VisualizationContainer>
  );
}
