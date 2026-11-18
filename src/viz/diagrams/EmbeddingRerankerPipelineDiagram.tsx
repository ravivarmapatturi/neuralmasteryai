import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A two-stage RAG retrieval pipeline -- click each stage to see why
 * the cheap embedding model runs against the whole corpus while the
 * expensive reranker only touches the shortlist it produces. */
export default function EmbeddingRerankerPipelineDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 0);
  const active: 'embed' | 'rerank' = value === 0 ? 'embed' : 'rerank';
  const color = getConceptColor(t, 'attention');

  const INFO = {
    embed: { label: 'Embedding model (Sentence Transformers, BGE, E5, Jina)', desc: 'Converts text into dense vectors for retrieval -- small, fast, CPU-servable relative to the generative model. Runs against the whole corpus.', scope: 'entire corpus (millions of docs)' },
    rerank: { label: 'Reranker (cross-encoder)', desc: 'Jointly encodes the query and each candidate document for much higher precision than embedding similarity alone -- more expensive per comparison, which is why it only runs on the shortlist.', scope: 'top-K shortlist only (tens of docs)' },
  };
  const info = INFO[active];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: active === 'embed' ? 700 : 500, background: active === 'embed' ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${active === 'embed' ? color : t.border}`, color: active === 'embed' ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Embedding model (Bi-encoder)
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: active === 'rerank' ? 700 : 500, background: active === 'rerank' ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${active === 'rerank' ? color : t.border}`, color: active === 'rerank' ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Reranker (Cross-encoder)
        </button>
      </div>
      <div style={{ padding: '0.6rem 0.8rem', borderRadius: 7, background: `${color}10`, border: `1px solid ${color}40`, transition: 'all 200ms ease' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Runs over</div>
        <div style={{ fontSize: 11, color: t.textPrimary, fontWeight: 600 }}>{info.scope}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 8.5, color: t.textMuted, textAlign: 'center' }}>
        TEI (Hugging Face) is the dedicated serving engine for both model types — the same specialized role vLLM plays for generative LLMs.
      </div>
    </VisualizationContainer>
  );
}
