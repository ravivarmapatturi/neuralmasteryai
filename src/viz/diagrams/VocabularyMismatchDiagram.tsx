import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

export function VocabularyMismatchDiagram() {
  const t = useVizTokens();
  const [showSynonyms, setShowSynonyms] = useState<boolean>(true);

  const queryWords = ['automobile', 'repair'];
  const docWords = ['how', 'to', 'fix', 'a', 'car'];

  const width = 540;
  const height = 310;

  return (
    <VisualizationContainer
      title="The Vocabulary Mismatch Problem: When Meanings Match but Words Do Not"
      footer={
        "In lexical matching (TF-IDF and BM25), relevance requires literal character token matches. " +
        "Even though 'automobile repair' and 'how to fix a car' express the exact same human intent, " +
        "the intersection of their vocabulary sets is completely empty (Score = 0.0000). " +
        "Dense semantic retrieval (covered in Semantic & Hybrid Search) solves this by mapping synonyms into nearby geometric points."
      }
    >
      <VisualizationHeader
        eyebrow="Lexical limitation"
        title="Vocabulary Mismatch: Why Synonyms Fail in TF-IDF"
        description="Compare query words and document words in two columns. Notice that zero lines connect, producing an artificial score of 0.0."
      />

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowSynonyms((v) => !v)}
          style={{
            padding: '6px 14px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${showSynonyms ? t.accentDanger : t.border}`,
            background: showSynonyms ? t.surfaceAlt : t.surface,
            color: showSynonyms ? t.accentDanger : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {showSynonyms ? 'Hide synonym relation' : 'Show synonym relation (why human understands)'}
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
        aria-label="Two column drawing illustrating vocabulary mismatch between query automobile repair and document how to fix a car"
      >
        {/* Left Column: Query Words */}
        <g transform="translate(40, 25)">
          <text x={70} y={15} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
            User Query Words
          </text>
          <text x={70} y={30} fill={t.textMuted} fontSize={11} fontFamily="'Kalam', cursive" textAnchor="middle">
            &ldquo;automobile repair&rdquo;
          </text>

          {queryWords.map((word, idx) => {
            const y = 48 + idx * 56;
            return (
              <g key={word}>
                <SketchRect x={0} y={y} width={140} height={42} color={t.accentPrimary} roughness={1.3} strokeWidth={1.5} />
                <rect x={2} y={y + 2} width={136} height={38} fill={t.accentPrimary} opacity={0.08} rx={4} />
                <text x={70} y={y + 26} fill={t.accentPrimary} fontSize={15} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
                  &ldquo;{word}&rdquo;
                </text>
              </g>
            );
          })}
        </g>

        {/* Right Column: Document Words */}
        <g transform="translate(360, 25)">
          <text x={70} y={15} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
            Document Words
          </text>
          <text x={70} y={30} fill={t.textMuted} fontSize={11} fontFamily="'Kalam', cursive" textAnchor="middle">
            &ldquo;how to fix a car&rdquo;
          </text>

          {docWords.map((word, idx) => {
            const y = 44 + idx * 42;
            const isTargetSynonym = word === 'fix' || word === 'car';
            return (
              <g key={word}>
                <SketchRect x={0} y={y} width={140} height={34} color={isTargetSynonym ? t.accentSecondary : t.border} roughness={1.2} strokeWidth={isTargetSynonym ? 1.5 : 1} />
                <text x={70} y={y + 22} fill={isTargetSynonym ? t.accentSecondary : t.textSecondary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={isTargetSynonym ? 700 : 500} textAnchor="middle">
                  &ldquo;{word}&rdquo;
                </text>
              </g>
            );
          })}
        </g>

        {/* Middle Divide: Zero Literal Overlap */}
        <g transform="translate(190, 80)">
          {/* Red X / No match badge */}
          <SketchRect x={10} y={20} width={140} height={60} color={t.accentDanger} roughness={1.5} strokeWidth={1.8} />
          <rect x={12} y={22} width={136} height={56} fill={t.accentDanger} opacity={0.1} rx={4} />
          <text x={80} y={44} fill={t.accentDanger} fontSize={13} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
            0 Shared Words
          </text>
          <text x={80} y={64} fill={t.accentDanger} fontSize={15} fontFamily="'Kalam', cursive" fontWeight={800} textAnchor="middle">
            Score = 0.0000
          </text>

          {/* Dotted lines showing missed synonyms */}
          {showSynonyms && (
            <g>
              {/* automobile -> car */}
              <path d="M -10 15 C 40 40, 120 120, 170 145" fill="none" stroke={t.accentWarn} strokeWidth={2} strokeDasharray="5 5" />
              <text x={75} y={110} fill={t.accentWarn} fontSize={11} fontFamily="'Kalam', cursive" fontWeight={700}>
                synonym: car ≈ automobile
              </text>

              {/* repair -> fix */}
              <path d="M -10 70 C 50 65, 110 55, 170 52" fill="none" stroke={t.accentWarn} strokeWidth={2} strokeDasharray="5 5" />
              <text x={80} y={15} fill={t.accentWarn} fontSize={11} fontFamily="'Kalam', cursive" fontWeight={700}>
                synonym: repair ≈ fix
              </text>
            </g>
          )}
        </g>

        {/* Bottom takeaway banner */}
        <g transform="translate(40, 255)">
          <SketchRect x={0} y={0} width={460} height={42} color={t.border} roughness={1.2} strokeWidth={1.2} />
          <text x={14} y={26} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive">
            Lexical rule: If exact characters differ, TF-IDF multiplies by 0. Zero words match = 0 score.
          </text>
        </g>
      </svg>
    </VisualizationContainer>
  );
}

export default VocabularyMismatchDiagram;
