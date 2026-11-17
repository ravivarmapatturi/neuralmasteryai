import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, VisualizationMath } from '../primitives';
import { TOY_TFIDF_DOCS, rankDocumentsTfidf } from '../lib/tfidf';

const PRESET_QUERIES: { label: string; terms: string[] }[] = [
  { label: 'machine learning', terms: ['machine', 'learning'] },
  { label: 'deep learning', terms: ['deep', 'learning'] },
  { label: 'cooking food', terms: ['cooking', 'food'] },
  { label: 'machine search', terms: ['machine', 'search'] },
];

export function TfidfSearchExplorer() {
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
      footer={"D1 and D3 tie at exactly 0.1438: both have 4 words and use each search word once."}
    >
      <VisualizationHeader
        eyebrow="Try it"
        title="Score the four documents for a search"
        description="Pick a search. Each document shows its TF × IDF for every word and its total."
      />

      {/* Query Selector Buttons */}
      <div style={{ marginTop: SPACING.md }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'Kalam', cursive",
            color: t.textSecondary,
            marginBottom: SPACING.xs,
          }}
        >
          Select search query:
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
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                  border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
                  backgroundColor: isSelected ? t.surfaceAlt : t.surface,
                  color: isSelected ? t.accentPrimary : t.textPrimary,
                  fontFamily: "'Kalam', cursive",
                  fontSize: 14,
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
          borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
          border: `1.5px solid ${t.border}`,
        }}
      >
        <div
          style={{
            fontSize: 15,
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
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            A
          </span>
          Step A: Per-Term Inverse Document Frequency (IDF)
        </div>
        <div style={{ fontSize: 15, color: t.textSecondary, marginBottom: SPACING.sm, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>Formula:</span>
          <VisualizationMath latex="\text{IDF}(t) = \ln(N / \text{df})" display={false} />
          <span>with N = 4 documents.</span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', border: `1px solid ${t.border}` }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 15,
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
                  <td style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textSecondary, fontSize: 15 }}>
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
            fontSize: 15,
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
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            B
          </span>
          Step B: Ranked Documents &amp; Term Breakdown
        </div>
        <div style={{ fontSize: 15, color: t.textSecondary, marginBottom: SPACING.md, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>Total Score =</span>
          <VisualizationMath latex="\sum_{t \in q} \text{TF}(t, D) \cdot \text{IDF}(t)" display={false} />
          {isTopTied && (
            <span
              style={{
                marginLeft: SPACING.sm,
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                backgroundColor: t.surfaceAlt,
                border: `1.5px solid ${t.accentSecondary}`,
                color: t.accentSecondary,
                fontFamily: "'Kalam', cursive",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Exact mathematical tie at rank #1
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
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
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
                        fontSize: 15,
                        fontWeight: 800,
                      }}
                    >
                      #{rankIdx + 1}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
                      {doc.docId}
                    </span>
                    <span style={{ fontSize: 15, color: t.textMuted }}>
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
                    fontSize: 15,
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
                    fontSize: 15,
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

export default TfidfSearchExplorer;
