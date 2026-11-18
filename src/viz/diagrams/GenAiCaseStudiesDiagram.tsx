import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const CATEGORIES = [
  { key: 'rag', label: 'RAG pipeline design', offline: 'Faithfulness, relevance', online: 'User satisfaction, task completion', arch: 'Embedding service + vector DB + LLM inference, each with its own latency budget' },
  { key: 'agent', label: 'Agent system design', offline: 'Task success rate on eval set', online: 'Real-world task completion, cost per resolved task', arch: 'Multi-step workflow with retries, fallbacks, and tracing -- cost isn\'t one inference call anymore' },
  { key: 'serving', label: 'LLM serving infrastructure', offline: 'n/a -- steps 7-9 of the framework', online: 'Cost-per-token, TTFT/TPOT', arch: 'Batching, KV cache management, applied specifically to LLM-shaped serving concerns' },
];

/** Three GenAI case-study categories, each still mapping onto the same
 * 9-step framework -- click one for its specific metrics and architecture. */
export default function GenAiCaseStudiesDiagram() {
  const t = useVizTokens();
  const { value: catIdx, pick, stop } = useAutoCycle(CATEGORIES.length, 3000, 1);
  const color = getConceptColor(t, 'attention');
  const active = CATEGORIES[catIdx];

  return (
    <VisualizationContainer footer={active.arch}>
      <div style={{ display: 'flex', gap: 6 }}>
        {CATEGORIES.map((c, i) => {
          const isSelected = catIdx === i;
          return (
            <div
              key={c.key}
              onClick={() => { stop(); pick(i); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); pick(i); } }}
              onMouseEnter={() => { stop(); pick(i); }}
              style={{ flex: 1, cursor: 'pointer', padding: '0.6rem', borderRadius: 8, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`, textAlign: 'center', transition: 'all 0.25s ease' }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: isSelected ? color : t.textPrimary }}>{c.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <div style={{ flex: 1, fontSize: 10.5 }}>
          <span style={{ color: t.textMuted }}>Offline: </span>
          <span style={{ color: t.textSecondary }}>{active.offline}</span>
        </div>
        <div style={{ flex: 1, fontSize: 10.5 }}>
          <span style={{ color: t.textMuted }}>Online: </span>
          <span style={{ color: t.textSecondary }}>{active.online}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Each still maps onto the same 9-step framework -- just with GenAI-specific fillers at each step.
      </div>
    </VisualizationContainer>
  );
}
