import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, useAutoCycle } from '../primitives';

interface PostingItem {
  docId: string;
  tf: number;
}

interface TermPosting {
  term: string;
  postings: PostingItem[];
}

const DICTIONARY: TermPosting[] = [
  { term: 'engine', postings: [{ docId: 'D1', tf: 1 }] },
  { term: 'learning', postings: [{ docId: 'D4', tf: 1 }] },
  { term: 'neural', postings: [{ docId: 'D2', tf: 1 }, { docId: 'D3', tf: 1 }] },
  { term: 'ranking', postings: [{ docId: 'D1', tf: 1 }, { docId: 'D2', tf: 2 }] },
  { term: 'recommendation', postings: [{ docId: 'D3', tf: 1 }, { docId: 'D4', tf: 1 }] },
  { term: 'search', postings: [{ docId: 'D1', tf: 1 }, { docId: 'D2', tf: 1 }, { docId: 'D3', tf: 1 }] },
];

const PRESET_QUERIES = [
  {
    label: 'search AND ranking',
    terms: ['search', 'ranking'],
    operator: 'AND',
    matchDocs: ['D1', 'D2'],
    explanation: 'List intersection: D1 and D2 appear in both posting lists.',
  },
  {
    label: 'search AND neural',
    terms: ['search', 'neural'],
    operator: 'AND',
    matchDocs: ['D2', 'D3'],
    explanation: 'List intersection: D2 and D3 contain both tokens.',
  },
  {
    label: 'ranking OR recommendation',
    terms: ['ranking', 'recommendation'],
    operator: 'OR',
    matchDocs: ['D1', 'D2', 'D3', 'D4'],
    explanation: 'List union: merges all distinct document IDs from both lists.',
  },
  {
    label: 'search AND NOT neural',
    terms: ['search', 'neural'],
    operator: 'AND NOT',
    matchDocs: ['D1'],
    explanation: 'Set difference: takes D1, D2, D3 and eliminates documents containing neural (D2, D3).',
  },
];

export default function InvertedIndexVisualizer() {
  const t = useVizTokens();
  const queryCycle = useAutoCycle(PRESET_QUERIES.length, 2600);
  const selectedQueryIdx = queryCycle.value;

  const activeQuery = PRESET_QUERIES[selectedQueryIdx];

  return (
    <VisualizationContainer
      title="Interactive Inverted Index & Boolean Retrieval"
      footer={
        `The inverted index maps normalized vocabulary terms to sorted posting lists containing document IDs ` +
        `and term frequencies. Boolean operations evaluate postings using linear merge scans or skip pointers in sub-millisecond time ` +
        `without inspecting raw document bodies.`
      }
    >
      <VisualizationHeader
        eyebrow="Lexical Indexing Architecture"
        title="Inverted Postings & Boolean Query Evaluation"
        description="Select a Boolean query to observe how postings lists are scanned, filtered, and intersected to yield candidate document sets."
      />

      {/* Query Selector */}
      <div style={{ marginTop: SPACING.md }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: t.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: SPACING.xs,
          }}
        >
          Select Boolean Query:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.xs }}>
          {PRESET_QUERIES.map((q, idx) => {
            const isSelected = idx === selectedQueryIdx;
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => queryCycle.pick(idx)}
                aria-pressed={isSelected}
                style={{
                  padding: `${SPACING.xs}px ${SPACING.md}px`,
                  borderRadius: RADIUS.md,
                  border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
                  backgroundColor: isSelected ? t.surfaceAlt : t.surface,
                  color: isSelected ? t.accentPrimary : t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inverted Index Table Display */}
      <div
        style={{
          marginTop: SPACING.lg,
          padding: SPACING.md,
          backgroundColor: t.surfaceAlt,
          borderRadius: RADIUS.md,
          border: `1px solid ${t.border}`,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: t.textPrimary,
            marginBottom: SPACING.sm,
          }}
        >
          Term Dictionary &amp; Postings Lists
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
          {DICTIONARY.map((entry) => {
            const isQueried = activeQuery.terms.includes(entry.term);

            return (
              <div
                key={entry.term}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: SPACING.sm,
                  padding: `${SPACING.xs}px ${SPACING.sm}px`,
                  borderRadius: RADIUS.sm,
                  backgroundColor: isQueried ? t.surface : 'transparent',
                  border: `1px solid ${isQueried ? t.accentPrimary : 'transparent'}`,
                }}
              >
                <div
                  style={{
                    minWidth: 120,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: isQueried ? 700 : 500,
                    color: isQueried ? t.accentPrimary : t.textPrimary,
                  }}
                >
                  &ldquo;{entry.term}&rdquo;
                </div>

                <div style={{ color: t.textMuted, fontSize: 12 }}>&rarr;</div>

                {/* Postings */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {entry.postings.map((p) => {
                    const isMatchedDoc = activeQuery.matchDocs.includes(p.docId);
                    const highlight = isQueried && isMatchedDoc;

                    return (
                      <span
                        key={p.docId}
                        style={{
                          padding: '2px 8px',
                          borderRadius: RADIUS.sm,
                          backgroundColor: highlight
                            ? t.accentPrimary
                            : isQueried
                            ? t.surfaceAlt
                            : t.surface,
                          color: highlight ? t.background : t.textPrimary,
                          border: `1px solid ${highlight ? t.accentPrimary : t.border}`,
                          fontSize: 11,
                          fontFamily: 'monospace',
                          fontWeight: highlight ? 700 : 500,
                        }}
                      >
                        {p.docId} (tf={p.tf})
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Query Result Evaluation Slate */}
      <div
        style={{
          marginTop: SPACING.lg,
          padding: SPACING.md,
          borderRadius: RADIUS.md,
          backgroundColor: t.surface,
          border: `1.5px solid ${t.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xs }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
            Boolean Query Result:
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            {activeQuery.explanation}
          </div>
        </div>

        <div style={{ display: 'flex', gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: 'wrap' }}>
          {activeQuery.matchDocs.map((docId) => (
            <div
              key={docId}
              style={{
                padding: `${SPACING.xs}px ${SPACING.md}px`,
                borderRadius: RADIUS.sm,
                backgroundColor: t.surfaceAlt,
                border: `1px solid ${t.accentPrimary}`,
                color: t.accentPrimary,
                fontFamily: 'monospace',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Candidate {docId} (Matched)
            </div>
          ))}
        </div>
      </div>
    </VisualizationContainer>
  );
}
