import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

export function VocabularyMismatchDiagram() {
  const t = useVizTokens();
  const [showSynonyms, setShowSynonyms] = useState<boolean>(false);

  // Each search word is drawn on the same row as the document word that means the same.
  const queryWords = [
    { word: 'repair', pair: 'fix' },
    { word: 'automobile', pair: 'car' },
  ];
  const docWords = ['how', 'to', 'fix', 'a', 'car'];

  const width = 720;
  const height = 390;
  const ROW0 = 76;
  const ROW = 54;
  const BOX = 40;
  const HAND = "'Kalam', cursive";

  return (
    <VisualizationContainer
      title="The Vocabulary Mismatch Problem: When Meanings Match but Words Do Not"
      footer={"Same meaning, zero shared words, so the score is 0. Meaning-based search (embeddings) fixes this."}
    >
      <VisualizationHeader
        eyebrow="Watch out"
        title="Same meaning, no shared words"
        description="No line connects the two sides, so TF-IDF gives a score of 0."
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
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {showSynonyms ? 'Hide what a person sees' : 'Show what a person sees'}
        </button>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          minWidth: width,
          display: 'block',
          border: `1.5px solid ${t.border}`,
          borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
          background: t.surface,
        }}
        role="img"
        aria-label="Two column drawing illustrating vocabulary mismatch between query automobile repair and document how to fix a car"
      >
        {/* Column headings */}
        <text x={130} y={34} fill={t.accentPurple} fontSize={17} fontFamily={HAND} fontWeight={700} textAnchor="middle">Your search</text>
        <text x={130} y={56} fill={t.textMuted} fontSize={14} fontFamily={HAND} textAnchor="middle">&ldquo;automobile repair&rdquo;</text>
        <text x={590} y={34} fill={t.accentSecondary} fontSize={17} fontFamily={HAND} fontWeight={700} textAnchor="middle">The document</text>
        <text x={590} y={56} fill={t.textMuted} fontSize={14} fontFamily={HAND} textAnchor="middle">&ldquo;how to fix a car&rdquo;</text>

        {/* Right column: one box per document word */}
        {docWords.map((word, idx) => {
          const y = ROW0 + idx * ROW;
          const isSyn = word === 'fix' || word === 'car';
          const c = isSyn ? t.accentPrimary : t.border;
          return (
            <g key={word}>
              <SketchRect x={500} y={y} width={180} height={BOX} color={c} roughness={1.2} strokeWidth={isSyn ? 1.8 : 1.1} />
              <text x={590} y={y + 26} fill={isSyn ? t.accentPrimary : t.textSecondary} fontSize={16} fontFamily={HAND} fontWeight={isSyn ? 700 : 400} textAnchor="middle">
                &ldquo;{word}&rdquo;
              </text>
            </g>
          );
        })}

        {/* Left column: each search word sits on the same row as its look-alike */}
        {queryWords.map((q) => {
          const y = ROW0 + docWords.indexOf(q.pair) * ROW;
          return (
            <g key={q.word}>
              <SketchRect x={40} y={y} width={180} height={BOX} color={t.accentPurple} roughness={1.3} strokeWidth={1.8} />
              <rect x={43} y={y + 3} width={174} height={BOX - 6} fill={t.accentPurple} opacity={0.1} rx={4} />
              <text x={130} y={y + 26} fill={t.accentPurple} fontSize={16} fontFamily={HAND} fontWeight={700} textAnchor="middle">
                &ldquo;{q.word}&rdquo;
              </text>
              {showSynonyms ? (
                <g>
                  <path d={`M 228 ${y + BOX / 2} L 492 ${y + BOX / 2}`} fill="none" stroke={t.accentWarn} strokeWidth={2} strokeDasharray="6 5" />
                  <text x={360} y={y + BOX / 2 - 8} fill={t.accentWarn} fontSize={14} fontFamily={HAND} fontWeight={700} textAnchor="middle">
                    same meaning, different word
                  </text>
                </g>
              ) : (
                <text x={360} y={y + BOX / 2 + 6} fill={t.accentDanger} fontSize={18} fontFamily={HAND} fontWeight={700} textAnchor="middle">
                  ✗ no match
                </text>
              )}
            </g>
          );
        })}

        {/* The score, in the empty space at the top middle */}
        <SketchRect x={270} y={ROW0 - 2} width={180} height={70} color={t.accentDanger} roughness={1.5} strokeWidth={1.8} />
        <rect x={273} y={ROW0 + 1} width={174} height={64} fill={t.accentDanger} opacity={0.08} rx={4} />
        <text x={360} y={ROW0 + 26} fill={t.accentDanger} fontSize={15} fontFamily={HAND} fontWeight={700} textAnchor="middle">0 shared words</text>
        <text x={360} y={ROW0 + 52} fill={t.accentDanger} fontSize={18} fontFamily={HAND} fontWeight={800} textAnchor="middle">score = 0</text>

        {/* Takeaway */}
        <text x={360} y={height - 22} fill={t.textPrimary} fontSize={15} fontFamily={HAND} textAnchor="middle">
          TF-IDF only counts exact words, so a person sees a match and TF-IDF sees none.
        </text>
      </svg>
    </VisualizationContainer>
  );
}

export default VocabularyMismatchDiagram;
