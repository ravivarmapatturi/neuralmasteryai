import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const CATEGORIES = [
  { key: 'llm', label: 'LLM', route: 'LLMs & GenAI' },
  { key: 'vlm', label: 'VLM', route: 'Modern Vision & Multimodal' },
  { key: 'embed', label: 'Embedding', route: 'RAG — Embedding Models' },
  { key: 'rerank', label: 'Reranker', route: 'RAG — Cross-Encoders' },
  { key: 'speech', label: 'Speech (ASR/TTS)', route: 'Speech & Audio Tasks' },
  { key: 'imggen', label: 'Image generation', route: 'Generative Models' },
  { key: 'video', label: 'Video', route: 'Modern Vision & Multimodal' },
  { key: 'audiogen', label: 'Audio generation', route: 'Speech & Audio Tasks' },
  { key: 'reasoning', label: 'Reasoning models', route: 'Training Pipeline — GRPO' },
];

/** Nine model categories, click one to see exactly which page on this
 * site actually covers it in depth -- a map, not a leaderboard. */
export default function ModelCategoryMapDiagram() {
  const t = useVizTokens();
  const { value: selectedIdx, pick, stop } = useAutoCycle(CATEGORIES.length, 2500, 0);
  const color = getConceptColor(t, 'attention');
  const active = CATEGORIES[selectedIdx];

  return (
    <VisualizationContainer footer={`${active.label} → covered in depth at "${active.route}".`}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c, i) => {
          const isSelected = selectedIdx === i;
          return (
            <div
              key={c.key}
              onClick={() => { stop(); pick(i); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); pick(i); } }}
              onMouseEnter={() => { stop(); pick(i); }}
              style={{ cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 8, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`, transition: 'all 0.25s ease' }}
            >
              <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, color: isSelected ? color : t.textPrimary }}>{c.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A taxonomy, not a leaderboard -- categories stay stable even as which specific models lead within each one changes.
      </div>
    </VisualizationContainer>
  );
}
