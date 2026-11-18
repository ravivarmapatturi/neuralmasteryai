import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Pattern = 'structured' | 'semantic' | 'connected';

const PATTERNS: Record<Pattern, { question: string; answer: string; example: string; concept: 'query' | 'attention' | 'key' }> = {
  structured: {
    question: '"Get me this specific record, and its direct attributes."',
    answer: 'Relational (Postgres)',
    example: 'A user\'s account details, an order and its line items, anything with a well-defined schema and a need for strong consistency.',
    concept: 'query',
  },
  semantic: {
    question: '"Find things that mean something similar to this, even with different words."',
    answer: 'Vector database',
    example: 'RAG retrieval, semantic search, recommendation by content similarity -- anywhere the match is fuzzy/conceptual, not exact.',
    concept: 'attention',
  },
  connected: {
    question: '"Find every way these entities are connected, possibly several hops apart."',
    answer: 'Graph database (Neo4j)',
    example: 'Fraud rings, friend-of-a-friend recommendations, knowledge graphs, GraphRAG multi-hop reasoning.',
    concept: 'key',
  },
};

const PATTERN_KEYS = Object.keys(PATTERNS) as Pattern[];

export default function DatabaseChoiceDecisionDiagram() {
  const t = useVizTokens();
  const { value: patIdx, pick: setPatIdx, stop } = useAutoCycle(PATTERN_KEYS.length, 3500, 2);
  const pattern = PATTERN_KEYS[patIdx];
  const info = PATTERNS[pattern];
  const color = getConceptColor(t, info.concept);

  return (
    <VisualizationContainer footer="Real systems typically use all three side by side -- Postgres for accounts and transactions, a vector index (or pgvector, inside that same Postgres) for retrieval, a graph database for the relationship-heavy slice of the problem. The question is never 'which one database should this whole system use' so much as 'which store does this specific query pattern belong in.'">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {PATTERN_KEYS.map((k, idx) => (
          <VizButton
            key={k}
            variant={pattern === k ? 'primary' : 'secondary'}
            onClick={() => {
              stop();
              setPatIdx(idx);
            }}
          >
            {PATTERNS[k].question.split('"')[1].slice(0, 24)}...
          </VizButton>
        ))}
      </div>
      <div style={{ fontSize: 14, fontStyle: 'italic', color: t.textSecondary, marginBottom: 10 }}>{info.question}</div>
      <div style={{ padding: '12px 16px', borderRadius: 8, background: `${color}18`, border: `1px solid ${color}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color }}>{info.answer}</div>
        <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>{info.example}</div>
      </div>
    </VisualizationContainer>
  );
}
