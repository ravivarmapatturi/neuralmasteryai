import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

export function SearchVsRecLanesDiagram() {
  const t = useVizTokens();
  const [activeLane, setActiveLane] = useState<'both' | 'search' | 'rec'>('both');

  const width = 580;
  const height = 330;

  return (
    <VisualizationContainer
      title="Retrieval Architectures: Search vs. Recommendation Lanes"
      footer={
        "Search begins with explicit, high-intent user tokens ('vector search'). " +
        "Recommendation begins with no query: the system must infer latent taste from user history, timestamp, and catalog interaction patterns. " +
        "Both systems funnel broad candidates into deep ranking stages, but candidate generation relies on fundamentally different inputs."
      }
    >
      <VisualizationHeader
        eyebrow="Architectural comparison"
        title="Search vs. Recommendation: Two Retrieval Lanes"
        description="Inspect the two parallel funnels: query-driven lexical/dense search versus history-driven collaborative recommendations."
      />

      <div style={{ marginTop: 8, marginBottom: 12, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setActiveLane('both')}
          style={{
            padding: '4px 12px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${activeLane === 'both' ? t.accentPrimary : t.border}`,
            background: activeLane === 'both' ? t.surfaceAlt : t.surface,
            color: activeLane === 'both' ? t.accentPrimary : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Compare both lanes
        </button>
        <button
          type="button"
          onClick={() => setActiveLane('search')}
          style={{
            padding: '4px 12px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${activeLane === 'search' ? t.accentSecondary : t.border}`,
            background: activeLane === 'search' ? t.surfaceAlt : t.surface,
            color: activeLane === 'search' ? t.accentSecondary : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          1. Query-Driven Search
        </button>
        <button
          type="button"
          onClick={() => setActiveLane('rec')}
          style={{
            padding: '4px 12px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${activeLane === 'rec' ? t.accentPrimary : t.border}`,
            background: activeLane === 'rec' ? t.surfaceAlt : t.surface,
            color: activeLane === 'rec' ? t.accentPrimary : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          2. Context-Driven Recommendation
        </button>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          display: 'block',
          border: `1.5px solid ${t.border}`,
          borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
          background: t.surface,
        }}
        role="img"
        aria-label="Two parallel lanes diagram contrasting query-driven search with context-driven recommendation"
      >
        <defs>
          <marker id="arrow-search" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentSecondary} />
          </marker>
          <marker id="arrow-rec" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentPrimary} />
          </marker>
        </defs>

        {/* Lane 1: Search */}
        <g style={{ opacity: activeLane === 'both' || activeLane === 'search' ? 1 : 0.2, transition: 'opacity 0.2s' }}>
          <text x={20} y={30} fill={t.accentSecondary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={800}>
            Lane 1: Query-Driven Search (Explicit Intent)
          </text>

          {/* Step 1: Query */}
          <g transform="translate(20, 42)">
            <SketchRect x={0} y={0} width={115} height={60} color={t.accentSecondary} roughness={1.3} strokeWidth={1.5} />
            <text x={57} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              User Query
            </text>
            <text x={57} y={42} fill={t.accentSecondary} fontSize={11} fontFamily="'Kalam', cursive" textAnchor="middle">
              &ldquo;vector index&rdquo;
            </text>
          </g>

          {/* Arrow 1 -> 2 */}
          <line x1={140} y1={72} x2={165} y2={72} stroke={t.accentSecondary} strokeWidth={2} markerEnd="url(#arrow-search)" />

          {/* Step 2: Match */}
          <g transform="translate(170, 42)">
            <SketchRect x={0} y={0} width={120} height={60} color={t.accentSecondary} roughness={1.3} strokeWidth={1.5} />
            <text x={60} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              Lexical / Dense
            </text>
            <text x={60} y={42} fill={t.textSecondary} fontSize={11} fontFamily="'Kalam', cursive" textAnchor="middle">
              BM25 + HNSW
            </text>
          </g>

          {/* Arrow 2 -> 3 */}
          <line x1={295} y1={72} x2={320} y2={72} stroke={t.accentSecondary} strokeWidth={2} markerEnd="url(#arrow-search)" />

          {/* Step 3: Candidate pool */}
          <g transform="translate(325, 42)">
            <SketchRect x={0} y={0} width={110} height={60} color={t.accentSecondary} roughness={1.3} strokeWidth={1.5} />
            <text x={55} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              Top 1,000
            </text>
            <text x={55} y={42} fill={t.textSecondary} fontSize={11} fontFamily="'Kalam', cursive" textAnchor="middle">
              Candidates
            </text>
          </g>

          {/* Arrow 3 -> 4 */}
          <line x1={440} y1={72} x2={465} y2={72} stroke={t.accentSecondary} strokeWidth={2} markerEnd="url(#arrow-search)" />

          {/* Step 4: Reranker */}
          <g transform="translate(470, 42)">
            <SketchRect x={0} y={0} width={95} height={60} color={t.accentSecondary} roughness={1.4} strokeWidth={1.8} />
            <text x={47} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              LTR Rerank
            </text>
            <text x={47} y={42} fill={t.accentSecondary} fontSize={11} fontFamily="'Kalam', cursive" textAnchor="middle">
              Final Top 10
            </text>
          </g>
        </g>

        {/* Divider line */}
        <line x1={20} y1={130} x2={560} y2={130} stroke={t.border} strokeDasharray="4 4" opacity={0.5} />

        {/* Lane 2: Recommendation */}
        <g style={{ opacity: activeLane === 'both' || activeLane === 'rec' ? 1 : 0.2, transition: 'opacity 0.2s' }}>
          <text x={20} y={158} fill={t.accentPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={800}>
            Lane 2: Context-Driven Recommendation (Latent Taste)
          </text>

          {/* Step 1: User Context */}
          <g transform="translate(20, 172)">
            <SketchRect x={0} y={0} width={115} height={65} color={t.accentPrimary} roughness={1.3} strokeWidth={1.5} />
            <text x={57} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              User History
            </text>
            <text x={57} y={40} fill={t.textSecondary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              Clicks, Reads, Time
            </text>
            <text x={57} y={54} fill={t.accentPrimary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              (No typed query!)
            </text>
          </g>

          {/* Arrow 1 -> 2 */}
          <line x1={140} y1={204} x2={165} y2={204} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#arrow-rec)" />

          {/* Step 2: Collaborative / Matrix */}
          <g transform="translate(170, 172)">
            <SketchRect x={0} y={0} width={120} height={65} color={t.accentPrimary} roughness={1.3} strokeWidth={1.5} />
            <text x={60} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              Collaborative
            </text>
            <text x={60} y={40} fill={t.textSecondary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              Neighborhoods
            </text>
            <text x={60} y={54} fill={t.textSecondary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              &amp; Content Filters
            </text>
          </g>

          {/* Arrow 2 -> 3 */}
          <line x1={295} y1={204} x2={320} y2={204} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#arrow-rec)" />

          {/* Step 3: Candidate pool */}
          <g transform="translate(325, 172)">
            <SketchRect x={0} y={0} width={110} height={65} color={t.accentPrimary} roughness={1.3} strokeWidth={1.5} />
            <text x={55} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              Candidate Pool
            </text>
            <text x={55} y={40} fill={t.textSecondary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              Top 2,000 Items
            </text>
            <text x={55} y={54} fill={t.textSecondary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              From catalog
            </text>
          </g>

          {/* Arrow 3 -> 4 */}
          <line x1={440} y1={204} x2={465} y2={204} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#arrow-rec)" />

          {/* Step 4: CTR Ranker */}
          <g transform="translate(470, 172)">
            <SketchRect x={0} y={0} width={95} height={65} color={t.accentPrimary} roughness={1.4} strokeWidth={1.8} />
            <text x={47} y={24} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
              Deep CTR
            </text>
            <text x={47} y={40} fill={t.textSecondary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              Cross-network
            </text>
            <text x={47} y={54} fill={t.accentPrimary} fontSize={10} fontFamily="'Kalam', cursive" textAnchor="middle">
              Personalized
            </text>
          </g>
        </g>

        {/* Bottom notebook note */}
        <g transform="translate(20, 260)">
          <SketchRect x={0} y={0} width={540} height={52} color={t.border} roughness={1.2} strokeWidth={1.2} />
          <text x={14} y={22} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive">
            Core difference: search matches your words to the text.
          </text>
          <text x={14} y={40} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive">
            Recommendation guesses what you will click, from what you did before.
          </text>
        </g>
      </svg>
    </VisualizationContainer>
  );
}

export default SearchVsRecLanesDiagram;
