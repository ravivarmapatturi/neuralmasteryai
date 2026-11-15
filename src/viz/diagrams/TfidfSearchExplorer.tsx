import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import { TOY_TFIDF_DOCS, rankDocumentsTfidf } from '../lib/tfidf';

const PRESET_QUERIES: { label: string; terms: string[] }[] = [
  { label: 'machine learning', terms: ['machine', 'learning'] },
  { label: 'deep learning', terms: ['deep', 'learning'] },
  { label: 'cooking food', terms: ['cooking', 'food'] },
  { label: 'machine search', terms: ['machine', 'search'] },
];

export default function TfidfSearchExplorer() {
  const t = useVizTokens();
  const [selectedQueryIdx, setSelectedQueryIdx] = useState<number>(0);

  const activeQuery = PRESET_QUERIES[selectedQueryIdx];
  const { queryStats, results } = rankDocumentsTfidf(activeQuery.terms, TOY_TFIDF_DOCS);

  // Check if top documents tie
  const isTopTied =
    results.length >= 2 &&
    results[0].score > 0 &&
    Math.abs(results[0].score - results[1].score) < 1e-4;

  return (
    <VisualizationContainer
      title="Interactive TF-IDF Search Engine"
      footer={
        `Corpus: N=4 documents. Uses normalized term frequency (TF = count / document length), ` +
        `textbook natural-log IDF (ln(N / df)), and sum of term weights. ` +
        `Notice that for query "machine learning", D1 and D3 tie at exactly 0.1438 because both documents ` +
        `have 4 words and contain exactly 1 occurrence of each query term.`
      }
    >
      <VisualizationHeader
        eyebrow="Lexical Scoring & Sparse Retrieval"
        title="Explore TF-IDF Term Weighting & Document Ranking"
        description="Select a search query below to inspect per-term document frequencies, natural-log IDF weights, and step-by-step document score breakdowns."
      />

      {/* Query Selector Buttons */}
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
          Select Search Query:
        </div>
        <div
          role="group"
          aria-label="Preset search queries"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.sm,
          }}
        >
          {PRESET_QUERIES.map((q, idx) => {
            const isSelected = idx === selectedQueryIdx;
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => setSelectedQueryIdx(idx)}
                aria-pressed={isSelected}
                style={{
                  padding: `${SPACING.xs}px ${SPACING.md}px`,
                  borderRadius: RADIUS.md,
                  border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
                  backgroundColor: isSelected ? t.surfaceAlt : t.surface,
                  color: isSelected ? t.accentPrimary : t.textPrimary,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 0 0 1px ${t.accentPrimary}` : 'none',
                }}
              >
                &ldquo;{q.label}&rdquo;
              </button>
            );
          })}
        </div>
      </div>

      {/* Step A: Inverse Document Frequency Table */}
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
            marginBottom: SPACING.xs,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 9999,
              backgroundColor: t.accentPrimary,
              color: t.background,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            A
          </span>
          Step A: Per-Term Inverse Document Frequency (IDF)
        </div>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: SPACING.sm }}>
          Formula: <code style={{ color: t.textPrimary }}>IDF(t) = ln(N / df)</code> with N = 4 documents.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                <th style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary }}>Query Term</th>
                <th style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary }}>Doc Frequency (df)</th>
                <th style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary }}>Ratio (N / df)</th>
                <th style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary }}>Computed IDF</th>
                <th style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary }}>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {queryStats.map((qs) => (
                <tr key={qs.term} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, fontWeight: 700, color: t.textPrimary }}>
                    &ldquo;{qs.term}&rdquo;
                  </td>
                  <td style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textPrimary }}>
                    {qs.df} / {qs.N}
                  </td>
                  <td style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textMuted, fontFamily: 'monospace' }}>
                    {qs.df > 0 ? `${qs.N} / ${qs.df} = ${(qs.N / qs.df).toFixed(2)}` : '0'}
                  </td>
                  <td
                    style={{
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      fontWeight: 700,
                      color: t.accentPrimary,
                      fontFamily: 'monospace',
                    }}
                  >
                    {qs.idf.toFixed(4)}
                  </td>
                  <td style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary, fontSize: 11 }}>
                    {qs.df === 1
                      ? 'Rare term (high discriminative power)'
                      : qs.df >= 3
                      ? 'Common term across corpus (moderate weight)'
                      : 'Moderate corpus frequency'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step B: Ranked Documents */}
      <div style={{ marginTop: SPACING.lg }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: t.textPrimary,
            marginBottom: SPACING.xs,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 9999,
              backgroundColor: t.accentPrimary,
              color: t.background,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            B
          </span>
          Step B: Ranked Documents &amp; Term Breakdown
        </div>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: SPACING.md }}>
          Total Score = <code style={{ color: t.textPrimary }}>&sum; [TF(t, D) &times; IDF(t)]</code>
          {isTopTied && (
            <span
              style={{
                marginLeft: SPACING.sm,
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: RADIUS.sm,
                backgroundColor: t.surfaceAlt,
                border: `1px solid ${t.accentSecondary}`,
                color: t.accentSecondary,
                fontWeight: 600,
                fontSize: 11,
              }}
            >
              Exact Mathematical Tie at Rank #1
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
          {results.map((doc, rankIdx) => {
            const isTiedWithTop = isTopTied && rankIdx < 2;
            const hasMatch = doc.score > 0;

            return (
              <div
                key={doc.docId}
                style={{
                  padding: SPACING.md,
                  borderRadius: RADIUS.md,
                  border: `1.5px solid ${isTiedWithTop ? t.accentPrimary : hasMatch ? t.border : t.border}`,
                  backgroundColor: isTiedWithTop ? t.surfaceAlt : t.surface,
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: SPACING.sm,
                    marginBottom: SPACING.xs,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: RADIUS.sm,
                        backgroundColor: hasMatch ? t.accentPrimary : t.textMuted,
                        color: t.background,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      #{rankIdx + 1}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
                      {doc.docId}
                    </span>
                    <span style={{ fontSize: 12, color: t.textMuted }}>
                      ({doc.docLength} {doc.docLength === 1 ? 'word' : 'words'})
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 14,
                      fontWeight: 800,
                      color: hasMatch ? t.accentPrimary : t.textMuted,
                    }}
                  >
                    Score: {doc.score.toFixed(4)}
                  </div>
                </div>

                <div
                  style={{
                    fontStyle: 'italic',
                    fontSize: 13,
                    color: t.textSecondary,
                    marginBottom: SPACING.sm,
                  }}
                >
                  &ldquo;{doc.text}&rdquo;
                </div>

                {/* Per-term breakdown */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: SPACING.xs,
                    fontSize: 11,
                    color: t.textSecondary,
                    paddingTop: SPACING.xs,
                    borderTop: `1px solid ${t.border}`,
                  }}
                >
                  {doc.breakdown.map((b) => (
                    <div
                      key={b.term}
                      style={{
                        padding: '3px 8px',
                        borderRadius: RADIUS.sm,
                        backgroundColor: b.count > 0 ? t.surface : 'transparent',
                        border: `1px solid ${b.count > 0 ? t.border : 'transparent'}`,
                        fontFamily: 'monospace',
                      }}
                    >
                      <strong style={{ color: t.textPrimary }}>{b.term}:</strong>{' '}
                      {b.count}/{b.docLength} (TF={b.tf.toFixed(3)}) &times; {b.idf.toFixed(3)} ={' '}
                      <span style={{ color: b.count > 0 ? t.accentPrimary : t.textMuted, fontWeight: 700 }}>
                        {b.tfidf.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </VisualizationContainer>
  );
}
