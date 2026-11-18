import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'image', label: 'Image', desc: 'The raw input image, alongside the text prompt.' },
  { key: 'encoder', label: 'Vision Encoder', desc: 'Often a ViT -- produces image features from the raw pixels.' },
  { key: 'projector', label: 'Projector', desc: "Maps those image features into the LLM's embedding space -- the piece that makes image features look like token embeddings to the LLM." },
  { key: 'llm', label: 'LLM', desc: 'Processes the projected image features as if they were additional input tokens, alongside the text prompt.' },
];

/** LLaVA, Qwen-VL, and similar VLMs share this architecture -- click a
 * stage to see what it does. Serving one means the engine supports
 * this multi-stage forward pass, not just standard text generation. */
export default function VlmArchitectureDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(STAGES.length, 2800, 1);
  const active = STAGES[cycle.value].key;
  const setActive = (key: string) => cycle.pick(STAGES.findIndex((stage) => stage.key === key));
  const color = getConceptColor(t, 'attention');
  const s = STAGES.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={s.desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STAGES.map((x, i) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.5rem 0.65rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
                <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
              </div>
              {i < STAGES.length - 1 && <span style={{ color: t.textMuted, fontSize: 12 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
