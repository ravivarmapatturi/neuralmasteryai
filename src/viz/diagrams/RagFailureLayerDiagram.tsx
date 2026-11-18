import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'chunks', label: 'Bad chunks', symptom: 'A relevant document exists, but the passage was split mid-sentence or too coarsely -- what gets embedded doesn\'t represent the useful content.', fix: 'Re-chunk with semantic boundaries; try smaller/overlapping chunks.' },
  { key: 'retrieval', label: 'Bad retrieval', symptom: 'The right chunk exists and is well-formed, but the vector/hybrid search never surfaces it in the candidate set at all.', fix: 'Check embedding model fit, add hybrid keyword search, inspect Recall@K on a labeled set.' },
  { key: 'ranking', label: 'Bad ranking', symptom: 'The right chunk IS retrieved, but it lands at rank 8 of 10 instead of rank 1 -- buried below less-relevant results.', fix: 'Add a reranker stage; this is what MRR/NDCG are built to catch.' },
  { key: 'generation', label: 'Ungrounded generation', symptom: 'The right chunk is retrieved and ranked well, but the model ignores it and states something not actually in the context.', fix: 'Tighten the prompt\'s grounding instructions; measure with faithfulness scoring.' },
];

/** A RAG system "feels wrong" for one of four distinct reasons -- click
 * a layer to see its specific symptom and where the fix actually goes,
 * since the failure mode looks identical from the outside. */
export default function RagFailureLayerDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(LAYERS.length, 2800, 2);
  const color = getConceptColor(t, 'attention');
  const layer = LAYERS[activeIndex];

  return (
    <VisualizationContainer footer={layer.symptom}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {LAYERS.map((x, i) => {
          const isActive = activeIndex === i;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer', padding: '0.5rem 0.6rem', borderRadius: 7, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
                <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{isActive ? `▶ ${x.label}` : x.label}</span>
              </div>
              {i < LAYERS.length - 1 && <span style={{ color: activeIndex > i ? color : t.textMuted, fontSize: 12, fontWeight: activeIndex > i ? 700 : 400 }}>→</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '0.6rem 0.8rem', borderRadius: 7, background: `${t.accentPrimary}10`, border: `1px solid ${t.accentPrimary}40`, transition: 'all 200ms ease' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: t.accentPrimary, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Fix for {layer.label}</div>
        <div style={{ fontSize: 10.5, color: t.textSecondary }}>{layer.fix}</div>
      </div>
    </VisualizationContainer>
  );
}
