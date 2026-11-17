import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
import {
  BM25_DEFAULT_B,
  BM25_DEFAULT_K1,
  bm25Idf,
  bm25LengthNorm,
  bm25TermScore,
} from '../lib/bm25';

interface ToyDoc {
  id: string;
  name: string;
  text: string;
  tokens: string[];
}

const TOY_CORPUS: ToyDoc[] = [
  {
    id: 'D1',
    name: 'Doc 1 (Concise)',
    text: 'search ranking engine',
    tokens: ['search', 'ranking', 'engine'],
  },
  {
    id: 'D2',
    name: 'Doc 2 (Verbose & Repeated)',
    text: 'search ranking ranking neural ranking',
    tokens: ['search', 'ranking', 'ranking', 'neural', 'ranking'],
  },
  {
    id: 'D3',
    name: 'Doc 3 (Average Length)',
    text: 'neural search recommendation system',
    tokens: ['neural', 'search', 'recommendation', 'system'],
  },
  {
    id: 'D4',
    name: 'Doc 4 (Unrelated)',
    text: 'recommendation deep learning model',
    tokens: ['recommendation', 'deep', 'learning', 'model'],
  },
];

const QUERY = ['search', 'ranking'];

export function Bm25ScoringExplorer() {
  const t = useVizTokens();
  const [k1, setK1] = useState<number>(BM25_DEFAULT_K1);
  const [b, setB] = useState<number>(BM25_DEFAULT_B);
  const [selectedDocId, setSelectedDocId] = useState<string>('D1');

  const N = TOY_CORPUS.length;
  const totalLength = TOY_CORPUS.reduce((sum, d) => sum + d.tokens.length, 0);
  const avgdl = totalLength / N; // 16 / 4 = 4.0

  // Calculate stats for query terms
  const termStats = QUERY.map((term) => {
    const df = TOY_CORPUS.filter((d) => d.tokens.includes(term)).length;
    const idf = bm25Idf(df, N);
    return { term, df, idf };
  });

  // Calculate scores for all documents
  const scoredDocs = TOY_CORPUS.map((doc) => {
    const docLength = doc.tokens.length;
    const lenNorm = bm25LengthNorm(docLength, avgdl, b);
    let totalScore = 0;
    const termBreakdowns = QUERY.map((term) => {
      const tf = doc.tokens.filter((tok) => tok === term).length;
      const stat = termStats.find((s) => s.term === term)!;
      const termScore = bm25TermScore(tf, docLength, avgdl, stat.df, N, k1, b);
      totalScore += termScore;
      const denom = tf + k1 * lenNorm;
      const sat = denom > 0 ? (tf * (k1 + 1)) / denom : 0;
      return { term, tf, idf: stat.idf, lenNorm, sat, termScore };
    });

    return {
      ...doc,
      docLength,
      lenNorm,
      totalScore,
      termBreakdowns,
    };
  });

  const selectedDoc = scoredDocs.find((d) => d.id === selectedDocId) ?? scoredDocs[0];
  const maxScore = Math.max(...scoredDocs.map((d) => d.totalScore), 0.001);

  return (
    <VisualizationContainer
      title="Interactive BM25 Parameter Explorer"
      footer={
        `Corpus N=4 docs, avgdl=4.0 tokens. Query: "search ranking". ` +
        `Adjust k1 to observe term-frequency saturation and b for document-length penalization. ` +
        `At b=0.75, Doc 1 (|D|=3 < 4) receives a length bonus (B=0.81), while Doc 2 (|D|=5 > 4) is penalized (B=1.19). ` +
        `Doc 3 (|D|=4 == avgdl) has B=1.00 regardless of b.`
      }
    >
      <VisualizationHeader
        eyebrow="Interactive Formula Calculator"
        title="BM25 Scoring: TF Saturation & Document Length Normalization"
        description="Inspect how k1 dampens repeated query terms and b adjusts for document length on an illustrative 4-document toy corpus."
      />

      {/* Parameter Sliders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: SPACING.md,
          marginBottom: SPACING.md,
          background: t.surfaceAlt,
          padding: '12px 14px',
          borderRadius: RADIUS.md,
          border: `1px solid ${t.border}`,
        }}
      >
        <div>
          <Slider
            label="k1 (TF Saturation parameter)"
            min={0}
            max={3.0}
            step={0.1}
            value={k1}
            onChange={setK1}
            format={(v) => v.toFixed(1)}
          />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
            Higher k1 rewards multiple term occurrences more before saturating (ceiling = k1 + 1).
          </div>
        </div>

        <div>
          <Slider
            label="b (Length Normalization parameter)"
            min={0}
            max={1.0}
            step={0.05}
            value={b}
            onChange={setB}
            format={(v) => v.toFixed(2)}
          />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
            b=0 ignores document length; b=1 fully penalizes documents exceeding avgdl ({avgdl.toFixed(1)} tokens).
          </div>
        </div>
      </div>

      {/* Query & Corpus Statistics Bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: SPACING.md,
          fontSize: 12,
          color: t.textSecondary,
        }}
      >
        <span style={{ fontWeight: 600, color: t.textPrimary }}>Query Terms:</span>
        {termStats.map((st) => (
          <span
            key={st.term}
            style={{
              padding: '2px 8px',
              borderRadius: RADIUS.sm,
              background: `${t.accentPrimary}15`,
              color: t.accentPrimary,
              fontWeight: 600,
            }}
          >
            "{st.term}" (df={st.df}, IDF={st.idf.toFixed(4)})
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: t.textMuted }}>
          Corpus N={N}, avgdl={avgdl.toFixed(1)}
        </span>
      </div>

      {/* Document Selection & Score Bar Chart */}
      <div style={{ marginBottom: SPACING.md }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>
          Corpus Documents & Live Scores (Click to inspect breakdown):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scoredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocId;
            const barPct = Math.max(4, Math.round((doc.totalScore / maxScore) * 100));
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                style={{
                  background: isSelected ? `${t.accentPrimary}15` : t.surfaceAlt,
                  border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
                  borderRadius: RADIUS.md,
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? t.accentPrimary : t.textPrimary }}>
                    {doc.name}: <span style={{ fontWeight: 400, color: t.textSecondary }}>"{doc.text}"</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    Score: {doc.totalScore.toFixed(4)}
                  </span>
                </div>
                {/* Visual score bar */}
                <div style={{ height: 6, background: t.border, borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${barPct}%`,
                      background: doc.totalScore > 0 ? t.accentPrimary : t.textMuted,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Document Breakdown Table */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS.md,
          padding: '10px 14px',
          overflowX: 'auto',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
          Worked Derivation for {selectedDoc.name} (|D| = {selectedDoc.docLength}, Length factor B = {selectedDoc.lenNorm.toFixed(4)}):
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: 'left', color: t.textSecondary }}>
              <th style={{ padding: '6px 8px' }}>Query Term</th>
              <th style={{ padding: '6px 8px' }}>tf</th>
              <th style={{ padding: '6px 8px' }}>IDF(q)</th>
              <th style={{ padding: '6px 8px' }}>TF Saturation (k1, b)</th>
              <th style={{ padding: '6px 8px' }}>Term Score</th>
            </tr>
          </thead>
          <tbody>
            {selectedDoc.termBreakdowns.map((tb) => (
              <tr key={tb.term} style={{ borderBottom: `1px solid ${t.border}`, fontVariantNumeric: 'tabular-nums' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: t.textPrimary }}>"{tb.term}"</td>
                <td style={{ padding: '6px 8px', color: t.textPrimary }}>{tb.tf}</td>
                <td style={{ padding: '6px 8px', color: t.textSecondary }}>{tb.idf.toFixed(4)}</td>
                <td style={{ padding: '6px 8px', color: t.textSecondary }}>{tb.sat.toFixed(4)}</td>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: t.accentPrimary }}>{tb.termScore.toFixed(4)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, color: t.textPrimary }}>
              <td colSpan={4} style={{ padding: '8px 8px', textAlign: 'right' }}>Total BM25 Score:</td>
              <td style={{ padding: '8px 8px', color: t.accentPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {selectedDoc.totalScore.toFixed(4)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </VisualizationContainer>
  );
}

export default Bm25ScoringExplorer;
