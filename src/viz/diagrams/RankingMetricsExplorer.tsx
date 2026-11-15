import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
import {
  averagePrecisionAtK,
  catalogCoverage,
  dcgAtK,
  hitRateAtK,
  idcgAtK,
  intraListDiversity,
  ndcgAtK,
  precisionAtK,
  recallAtK,
  reciprocalRank,
} from '../lib/rankingMetrics';

interface RankedDoc {
  id: string;
  title: string;
  category: string;
  grade: number; // 0 to 3
}

const INITIAL_DOCS: RankedDoc[] = [
  { id: 'doc_A', title: 'Doc A: BM25 & Dense Retrieval Guide', category: 'Search', grade: 3 },
  { id: 'doc_D', title: 'Doc D: Unrelated Database Sharding Blog', category: 'Database', grade: 0 },
  { id: 'doc_B', title: 'Doc B: Learning-to-Rank Architectures', category: 'Ranking', grade: 2 },
  { id: 'doc_C', title: 'Doc C: Basic Information Retrieval Notes', category: 'Search', grade: 1 },
  { id: 'doc_E', title: 'Doc E: Network Socket Tuning Tips', category: 'Systems', grade: 0 },
];

const TOTAL_RELEVANT_IN_CORPUS = 3; // docs A, B, C

export default function RankingMetricsExplorer() {
  const t = useVizTokens();
  const [docs, setDocs] = useState<RankedDoc[]>(INITIAL_DOCS);
  const [cutoffK, setCutoffK] = useState<number>(3);
  const [gainType, setGainType] = useState<'exponential' | 'linear'>('exponential');

  // Binary relevance: grade >= 1 is relevant
  const grades = docs.map((d) => d.grade);
  const binaryRel = docs.map((d) => (d.grade >= 1 ? 1 : 0));

  // Compute live metrics
  const pAtK = precisionAtK(binaryRel, cutoffK);
  const rAtK = recallAtK(binaryRel, cutoffK, TOTAL_RELEVANT_IN_CORPUS);
  const hrAtK = hitRateAtK(binaryRel, cutoffK);
  const mrr = reciprocalRank(binaryRel);
  const apAtK = averagePrecisionAtK(binaryRel, cutoffK, TOTAL_RELEVANT_IN_CORPUS);
  const dcg = dcgAtK(grades, cutoffK, gainType);
  const idcg = idcgAtK(grades, cutoffK, gainType);
  const ndcg = ndcgAtK(grades, cutoffK, gainType);

  // Recommendation proxies
  const topCategories = docs.slice(0, cutoffK).map((d) => d.category);
  const diversity = intraListDiversity(topCategories);
  const coverage = catalogCoverage(docs.slice(0, cutoffK).map((d) => d.id), 20); // illustrative 20-item catalog

  // Move document up or down
  const moveDoc = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= docs.length) return;
    const updated = [...docs];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setDocs(updated);
  };

  // Presets
  const applyPreset = (preset: 'order1' | 'order2' | 'ideal') => {
    if (preset === 'order1') {
      // [A, D, B, C, E]
      setDocs([INITIAL_DOCS[0], INITIAL_DOCS[1], INITIAL_DOCS[2], INITIAL_DOCS[3], INITIAL_DOCS[4]]);
    } else if (preset === 'order2') {
      // [D, A, B, C, E] - Demotes A behind D
      setDocs([INITIAL_DOCS[1], INITIAL_DOCS[0], INITIAL_DOCS[2], INITIAL_DOCS[3], INITIAL_DOCS[4]]);
    } else if (preset === 'ideal') {
      // [A, B, C, D, E] - Graded order 3, 2, 1, 0, 0
      setDocs([INITIAL_DOCS[0], INITIAL_DOCS[2], INITIAL_DOCS[3], INITIAL_DOCS[1], INITIAL_DOCS[4]]);
    }
  };

  return (
    <VisualizationContainer
      title="Interactive Ranking Evaluation Metrics Calculator"
      footer={
        `Precision@k, Recall@k, and Hit Rate@k evaluate unranked sets within the top-k cutoff. ` +
        `MRR, MAP, and NDCG penalize delaying relevant results. Try switching between Preset 1 [A, D, B] and Preset 2 [D, A, B]: ` +
        `P@3 stays 0.67 and R@3 stays 0.67, while MRR drops from 1.00 to 0.50 and NDCG@3 drops from 0.90 to 0.63.`
      }
    >
      <VisualizationHeader
        eyebrow="Metric Comparison Playground"
        title="Rank-Aware vs. Set-Based Evaluation"
        description="Reorder candidate items to see how set-based metrics (Precision/Recall) stay frozen while rank-aware metrics (MRR/MAP/NDCG) drop when relevance is delayed."
      />

      {/* Preset and Cutoff Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.md,
          background: t.surfaceAlt,
          padding: '10px 14px',
          borderRadius: RADIUS.md,
          border: `1px solid ${t.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Presets:</span>
          <button
            onClick={() => applyPreset('order1')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.surface,
              cursor: 'pointer',
              color: t.textPrimary,
              fontWeight: 600,
            }}
          >
            Preset 1: [A, D, B, C, E]
          </button>
          <button
            onClick={() => applyPreset('order2')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.accentWarn}`,
              background: `${t.accentWarn}15`,
              cursor: 'pointer',
              color: t.accentWarn,
              fontWeight: 600,
            }}
          >
            Preset 2: [D, A, B, C, E] (Demoted)
          </button>
          <button
            onClick={() => applyPreset('ideal')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.accentTeal}`,
              background: `${t.accentTeal}15`,
              cursor: 'pointer',
              color: t.accentTeal,
              fontWeight: 600,
            }}
          >
            Ideal: [A, B, C, D, E]
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <PillSelect<number>
            label="Cutoff k"
            value={cutoffK}
            onChange={(v) => setCutoffK(Number(v))}
            options={[
              { value: 1, label: 'k=1' },
              { value: 2, label: 'k=2' },
              { value: 3, label: 'k=3' },
              { value: 4, label: 'k=4' },
              { value: 5, label: 'k=5' },
            ]}
          />
          <PillSelect<'exponential' | 'linear'>
            label="DCG Gain"
            value={gainType}
            onChange={(v) => setGainType(v as 'exponential' | 'linear')}
            options={[
              { value: 'exponential', label: '2^g - 1' },
              { value: 'linear', label: 'Linear (g)' },
            ]}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          marginBottom: SPACING.md,
        }}
      >
        <div style={{ background: t.surfaceAlt, padding: '10px 12px', borderRadius: RADIUS.md, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 2 }}>Precision@{cutoffK}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {pAtK.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>{cutoffK === 3 && pAtK === 2/3 ? '(2 / 3)' : 'rel / k'}</div>
        </div>

        <div style={{ background: t.surfaceAlt, padding: '10px 12px', borderRadius: RADIUS.md, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 2 }}>Recall@{cutoffK}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {rAtK.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>{cutoffK === 3 && rAtK === 2/3 ? '(2 / 3 total)' : 'rel / total_rel'}</div>
        </div>

        <div style={{ background: t.surfaceAlt, padding: '10px 12px', borderRadius: RADIUS.md, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 2 }}>Hit Rate@{cutoffK}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {hrAtK.toFixed(2)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Any hit in top-k</div>
        </div>

        <div style={{ background: `${t.accentPrimary}10`, padding: '10px 12px', borderRadius: RADIUS.md, border: `1px solid ${t.accentPrimary}40` }}>
          <div style={{ fontSize: 11, color: t.accentPrimary, fontWeight: 600, marginBottom: 2 }}>MRR (1 / First Hit)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.accentPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {mrr.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Rank of 1st hit</div>
        </div>

        <div style={{ background: `${t.accentPrimary}10`, padding: '10px 12px', borderRadius: RADIUS.md, border: `1px solid ${t.accentPrimary}40` }}>
          <div style={{ fontSize: 11, color: t.accentPrimary, fontWeight: 600, marginBottom: 2 }}>AP@{cutoffK} (MAP)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.accentPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {apAtK.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Avg precision @ hits</div>
        </div>

        <div style={{ background: `${t.accentTeal}10`, padding: '10px 12px', borderRadius: RADIUS.md, border: `1px solid ${t.accentTeal}40` }}>
          <div style={{ fontSize: 11, color: t.accentTeal, fontWeight: 600, marginBottom: 2 }}>NDCG@{cutoffK}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.accentTeal, fontVariantNumeric: 'tabular-nums' }}>
            {ndcg.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>DCG: {dcg.toFixed(2)} / {idcg.toFixed(2)}</div>
        </div>
      </div>

      {/* Interactive Reordering Table */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS.md,
          overflowX: 'auto',
          marginBottom: SPACING.md,
        }}
      >
        <div style={{ padding: '8px 12px', background: t.surfaceAlt, borderBottom: `1px solid ${t.border}`, fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
          Current Ranked Output (Total Known Relevant in Corpus: {TOTAL_RELEVANT_IN_CORPUS}):
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: 'left', color: t.textSecondary }}>
              <th style={{ padding: '6px 10px' }}>Rank</th>
              <th style={{ padding: '6px 10px' }}>Item Title</th>
              <th style={{ padding: '6px 10px' }}>Category</th>
              <th style={{ padding: '6px 10px' }}>Grade</th>
              <th style={{ padding: '6px 10px' }}>Binary Rel</th>
              <th style={{ padding: '6px 10px', textAlign: 'center' }}>Reorder</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, idx) => {
              const rank = idx + 1;
              const isInsideK = rank <= cutoffK;
              const isRelevant = doc.grade >= 1;
              const gradeBadgeColor = doc.grade === 3 ? t.accentTeal : doc.grade >= 1 ? t.accentPrimary : t.textMuted;

              return (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: `1px solid ${t.border}`,
                    background: isInsideK ? `${t.accentPrimary}06` : 'transparent',
                    opacity: isInsideK ? 1.0 : 0.65,
                  }}
                >
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: isInsideK ? t.accentPrimary : t.textMuted }}>
                    #{rank} {isInsideK && <span style={{ fontSize: 10, color: t.accentPrimary }}>(top-{cutoffK})</span>}
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: t.textPrimary }}>
                    {doc.title}
                  </td>
                  <td style={{ padding: '8px 10px', color: t.textSecondary }}>
                    {doc.category}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: RADIUS.sm,
                        background: `${gradeBadgeColor}20`,
                        color: gradeBadgeColor,
                        fontWeight: 700,
                      }}
                    >
                      {doc.grade} ({doc.grade === 3 ? 'High' : doc.grade === 2 ? 'Med' : doc.grade === 1 ? 'Low' : 'None'})
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: isRelevant ? t.accentPrimary : t.textMuted, fontWeight: 600 }}>
                    {isRelevant ? '1 (Relevant)' : '0 (Non-rel)'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button
                        onClick={() => moveDoc(idx, 'up')}
                        disabled={idx === 0}
                        aria-label={`Move ${doc.title} up`}
                        style={{
                          padding: '2px 6px',
                          fontSize: 11,
                          borderRadius: RADIUS.sm,
                          border: `1px solid ${t.border}`,
                          background: t.surfaceAlt,
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.3 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDoc(idx, 'down')}
                        disabled={idx === docs.length - 1}
                        aria-label={`Move ${doc.title} down`}
                        style={{
                          padding: '2px 6px',
                          fontSize: 11,
                          borderRadius: RADIUS.sm,
                          border: `1px solid ${t.border}`,
                          background: t.surfaceAlt,
                          cursor: idx === docs.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === docs.length - 1 ? 0.3 : 1,
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendation Proxies Footer */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          fontSize: 11,
          color: t.textSecondary,
          background: t.surfaceAlt,
          padding: '8px 12px',
          borderRadius: RADIUS.sm,
          border: `1px solid ${t.border}`,
        }}
      >
        <span>
          <strong style={{ color: t.textPrimary }}>Recommendation Proxies (Top-{cutoffK}):</strong>
        </span>
        <span>
          Intra-List Diversity: <strong style={{ color: t.textPrimary }}>{(diversity * 100).toFixed(0)}%</strong> ({new Set(topCategories).size}/{cutoffK} unique categories)
        </span>
        <span>
          Catalog Coverage Proxy: <strong style={{ color: t.textPrimary }}>{(coverage * 100).toFixed(0)}%</strong> ({new Set(docs.slice(0, cutoffK).map(d => d.id)).size}/20 catalog items)
        </span>
      </div>
    </VisualizationContainer>
  );
}
