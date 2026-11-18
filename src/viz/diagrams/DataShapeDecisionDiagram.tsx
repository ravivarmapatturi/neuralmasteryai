import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Answer = 'exact' | 'similar' | 'connected';
const QUESTIONS: { key: Answer; q: string; store: string; why: string }[] = [
  { key: 'exact', q: 'Do you need exact rows matching specific conditions, with strong consistency guarantees?', store: 'Relational', why: 'ACID transactions and structured queries are relational\'s whole reason to exist.' },
  { key: 'similar', q: 'Are you looking for the most semantically similar items to a query, not an exact match?', store: 'Vector', why: 'Approximate nearest-neighbor search over embeddings is what vector databases are purpose-built for.' },
  { key: 'connected', q: 'Does the answer depend on chains of relationships, possibly several hops deep?', store: 'Graph', why: 'Relationships are stored as first-class structures, so multi-hop traversal stays fast regardless of depth.' },
];

/** The decision isn't "which database do I like" -- it's "what shape is
 * this specific query." Click each question to see which engine it routes
 * to and why. */
export default function DataShapeDecisionDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick: setAutoIdx, stop } = useAutoCycle(QUESTIONS.length, 3500, 1);
  const colorFor = (k: Answer) => (k === 'exact' ? getConceptColor(t, 'query') : k === 'similar' ? getConceptColor(t, 'attention') : t.accentWarn);
  const active = QUESTIONS[autoIdx];
  const selected = active.key;

  return (
    <VisualizationContainer footer={active.why}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUESTIONS.map((q, i) => {
          const isSelected = selected === q.key;
          const color = colorFor(q.key);
          return (
            <div
              key={q.key}
              onClick={() => {
                stop();
                setAutoIdx(i);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '0.7rem 0.9rem', borderRadius: 8,
                background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`,
              }}
            >
              <div style={{ flex: 1, fontSize: 13, color: t.textPrimary }}>{q.q}</div>
              <div style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}` }}>
                → {q.store}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Real queries often need more than one -- "find similar docs, then check who wrote the ones that cite each other" is vector + graph.
      </div>
    </VisualizationContainer>
  );
}
