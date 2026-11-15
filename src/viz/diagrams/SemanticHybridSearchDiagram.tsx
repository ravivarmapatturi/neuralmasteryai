import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
import { rankByRRF } from '../lib/hybridSearch';

interface PresetOption {
  label: string;
  weightLex: number;
  weightDense: number;
}

const WEIGHT_PRESETS: PresetOption[] = [
  { label: 'Equal (1.0 : 1.0)', weightLex: 1.0, weightDense: 1.0 },
  { label: 'Lexical Biased (2.0 : 0.5)', weightLex: 2.0, weightDense: 0.5 },
  { label: 'Dense Biased (0.5 : 2.0)', weightLex: 0.5, weightDense: 2.0 },
];

const K_OPTIONS = [
  { label: 'k = 60 (Standard)', value: 60 },
  { label: 'k = 20 (Responsive)', value: 20 },
  { label: 'k = 1 (Rank-1 Dominant)', value: 1 },
];

const FIXED_DOCS = [
  {
    id: 'D1',
    title: 'D1: HNSW Graph Indexing and Vector Quantization in Lucene',
    snippet: 'Exact inverted index postings with scalar quantization techniques.',
    lexicalRank: 1,
    denseRank: 3,
  },
  {
    id: 'D2',
    title: 'D2: Semantic Embeddings for Large-Scale Approximate Nearest Neighbors',
    snippet: 'Dense vector representations and cosine metric space navigation.',
    lexicalRank: 2,
    denseRank: 1,
  },
  {
    id: 'D3',
    title: 'D3: Deep Bi-Encoder Retrieval and Late Interaction Architectures',
    snippet: 'Multi-vector token alignments and MaxSim scoring over passages.',
    lexicalRank: 4,
    denseRank: 2,
  },
  {
    id: 'D4',
    title: 'D4: Distributed Partitioning Strategies for Inverted Index Shards',
    snippet: 'Sharding posting lists across cluster nodes for horizontal scale.',
    lexicalRank: 3,
    denseRank: 4,
  },
];

export default function SemanticHybridSearchDiagram() {
  const t = useVizTokens();
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);
  const [activeK, setActiveK] = useState<number>(60);
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);

  const currentPreset = WEIGHT_PRESETS[activePresetIndex];
  const fusedDocs = rankByRRF(
    FIXED_DOCS,
    activeK,
    currentPreset.weightLex,
    currentPreset.weightDense
  );

  return (
    <VisualizationContainer
      footer="Reciprocal Rank Fusion fuses disparate rank orders without score normalization. Adjust channel weights or smoothing constant k to observe how fused order dynamically adapts."
    >
      <div role="group" aria-label="Reciprocal Rank Fusion Hybrid Search Explorer">
        <VisualizationHeader
          title="Reciprocal Rank Fusion (RRF) Interactive Simulator"
          description="Observe how lexical keyword precision and dense embedding semantics combine through reciprocal rank position"
        />

        {/* Controls Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.md,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.md,
            padding: SPACING.sm,
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            border: `1px solid ${t.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>
              Channel Weights:
            </span>
            <PillSelect
              options={WEIGHT_PRESETS.map((p) => ({ value: p.label, label: p.label }))}
              value={currentPreset.label}
              onChange={(val) => {
                const idx = WEIGHT_PRESETS.findIndex((p) => p.label === val);
                if (idx !== -1) setActivePresetIndex(idx);
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>
              Constant k:
            </span>
            <PillSelect
              options={K_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
              value={activeK}
              onChange={(val) => {
                setActiveK(val as number);
              }}
            />
          </div>
        </div>

        {/* Active Formula Card */}
        <div
          style={{
            padding: SPACING.sm,
            background: t.surface,
            borderRadius: RADIUS.sm,
            border: `1px solid ${t.border}`,
            marginBottom: SPACING.md,
            fontSize: 12,
            fontFamily: 'monospace',
            color: t.textSecondary,
            textAlign: 'center',
          }}
        >
          Formula: <strong style={{ color: t.accentPrimary }}>RRF(d)</strong> = ({currentPreset.weightLex} / ({activeK} + r_lex)) + ({currentPreset.weightDense} / ({activeK} + r_dense))
        </div>

        {/* Three Columns Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: SPACING.md,
          }}
        >
          {/* Lexical Channel Column */}
          <div
            style={{
              background: t.surfaceAlt,
              borderRadius: RADIUS.md,
              border: `1px solid ${t.border}`,
              padding: SPACING.sm,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: t.accentPrimary,
                marginBottom: SPACING.xs,
                borderBottom: `2px solid ${t.accentPrimary}`,
                paddingBottom: 4,
              }}
            >
              Lexical (BM25) Channel (w = {currentPreset.weightLex})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...FIXED_DOCS]
                .sort((a, b) => a.lexicalRank - b.lexicalRank)
                .map((doc) => {
                  const isHovered = hoveredDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onMouseEnter={() => setHoveredDocId(doc.id)}
                      onMouseLeave={() => setHoveredDocId(null)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${isHovered ? t.accentPrimary : t.border}`,
                        background: isHovered ? `${t.accentPrimary}15` : t.surface,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: t.textPrimary }}>
                          Rank #{doc.lexicalRank}: {doc.id}
                        </span>
                        <span style={{ color: t.textMuted, fontSize: 11 }}>
                          +{ (currentPreset.weightLex / (activeK + doc.lexicalRank)).toFixed(5) }
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: t.textSecondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {doc.title.replace(`${doc.id}: `, '')}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Dense Channel Column */}
          <div
            style={{
              background: t.surfaceAlt,
              borderRadius: RADIUS.md,
              border: `1px solid ${t.border}`,
              padding: SPACING.sm,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: t.accentSecondary,
                marginBottom: SPACING.xs,
                borderBottom: `2px solid ${t.accentSecondary}`,
                paddingBottom: 4,
              }}
            >
              Dense (Bi-Encoder) Channel (w = {currentPreset.weightDense})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...FIXED_DOCS]
                .sort((a, b) => a.denseRank - b.denseRank)
                .map((doc) => {
                  const isHovered = hoveredDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onMouseEnter={() => setHoveredDocId(doc.id)}
                      onMouseLeave={() => setHoveredDocId(null)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${isHovered ? t.accentSecondary : t.border}`,
                        background: isHovered ? `${t.accentSecondary}15` : t.surface,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: t.textPrimary }}>
                          Rank #{doc.denseRank}: {doc.id}
                        </span>
                        <span style={{ color: t.textMuted, fontSize: 11 }}>
                          +{ (currentPreset.weightDense / (activeK + doc.denseRank)).toFixed(5) }
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: t.textSecondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {doc.title.replace(`${doc.id}: `, '')}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Fused RRF Output Column */}
          <div
            style={{
              background: t.surfaceAlt,
              borderRadius: RADIUS.md,
              border: `1px solid ${t.border}`,
              padding: SPACING.sm,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: t.accentTeal,
                marginBottom: SPACING.xs,
                borderBottom: `2px solid ${t.accentTeal}`,
                paddingBottom: 4,
              }}
            >
              Fused RRF Order (Output)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fusedDocs.map((doc) => {
                const isHovered = hoveredDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onMouseEnter={() => setHoveredDocId(doc.id)}
                    onMouseLeave={() => setHoveredDocId(null)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${isHovered ? t.accentTeal : t.border}`,
                      background: isHovered ? `${t.accentTeal}15` : t.surface,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: t.accentTeal }}>
                        #{doc.fusedRank} {doc.id}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: t.textPrimary,
                        }}
                      >
                        {doc.totalScore.toFixed(5)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: t.textMuted,
                        marginTop: 2,
                      }}
                    >
                      Lex #{doc.lexicalRank} ({doc.channelScores.lexical.toFixed(5)}) + Dense #{doc.denseRank} ({doc.channelScores.dense.toFixed(5)})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
