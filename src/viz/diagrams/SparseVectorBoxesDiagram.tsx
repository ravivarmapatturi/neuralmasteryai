import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

interface VocabCell {
  term: string;
  weight: number;
  isHit: boolean;
  docCount: number;
}

export function SparseVectorBoxesDiagram() {
  const t = useVizTokens();
  const [selectedDoc, setSelectedDoc] = useState<'D1' | 'D2'>('D1');

  const VOCAB_D1: VocabCell[] = [
    { term: 'cooking', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'deep', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'food', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'is', weight: 0.0, isHit: false, docCount: 3 },
    { term: 'learning', weight: 0.0719, isHit: true, docCount: 3 },
    { term: 'machine', weight: 0.0719, isHit: true, docCount: 3 },
    { term: 'powerful', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'search', weight: 0.0, isHit: false, docCount: 1 },
  ];

  const VOCAB_D2: VocabCell[] = [
    { term: 'cooking', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'deep', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'food', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'is', weight: 0.0, isHit: false, docCount: 3 },
    { term: 'learning', weight: 0.0822, isHit: true, docCount: 3 },
    { term: 'machine', weight: 0.0411, isHit: true, docCount: 3 },
    { term: 'powerful', weight: 0.0, isHit: false, docCount: 1 },
    { term: 'search', weight: 0.0, isHit: false, docCount: 1 },
  ];

  const cells = selectedDoc === 'D1' ? VOCAB_D1 : VOCAB_D2;
  const width = 560;
  const height = 260;

  return (
    <VisualizationContainer
      title="Sparse Vector Representation: Coordinate Boxes Across Vocabulary"
      footer={
        `Sparse vector coordinate row for ${selectedDoc}. Notice that each box represents one vocabulary dimension. ` +
        `Only the query terms that appear in the document ('learning' and 'machine') hold positive non-zero weights. ` +
        `All other vocabulary coordinates are exactly 0.0. In production catalogs with |V| > 100,000 words, over 99.5% of coordinates are zero.`
      }
    >
      <VisualizationHeader
        eyebrow="Sparse coordinate structure"
        title="Sparse Vector Coordinates as Hand-Drawn Boxes"
        description="Inspect how document vectors allocate non-zero scalar weights only to words present in the document, leaving unmentioned vocabulary coordinates empty."
      />

      <div style={{ marginTop: 8, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontFamily: "'Kalam', cursive", fontWeight: 700, color: t.textSecondary }}>
          Select document vector:
        </span>
        <button
          type="button"
          onClick={() => setSelectedDoc('D1')}
          style={{
            padding: '4px 12px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${selectedDoc === 'D1' ? t.accentPrimary : t.border}`,
            background: selectedDoc === 'D1' ? t.surfaceAlt : t.surface,
            color: selectedDoc === 'D1' ? t.accentPrimary : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          D1: &ldquo;machine learning is powerful&rdquo;
        </button>
        <button
          type="button"
          onClick={() => setSelectedDoc('D2')}
          style={{
            padding: '4px 12px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${selectedDoc === 'D2' ? t.accentPrimary : t.border}`,
            background: selectedDoc === 'D2' ? t.surfaceAlt : t.surface,
            color: selectedDoc === 'D2' ? t.accentPrimary : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          D2: &ldquo;deep learning is part...&rdquo;
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
        aria-label="Sparse vector diagram showing coordinate boxes with highlighted non-zero entries for machine and learning"
      >
        {/* Title above vector */}
        <text x={20} y={32} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700}>
          d_{selectedDoc.toLowerCase()} = [
        </text>

        {/* Row of Vocabulary Boxes */}
        {cells.map((cell, idx) => {
          const boxWidth = 56;
          const boxHeight = 65;
          const startX = 35 + idx * (boxWidth + 6);
          const startY = 55;

          return (
            <g key={cell.term}>
              {/* Term Label on top */}
              <text
                x={startX + boxWidth / 2}
                y={startY - 8}
                fill={cell.isHit ? t.accentPrimary : t.textSecondary}
                fontSize={11}
                fontFamily="'Kalam', cursive"
                fontWeight={cell.isHit ? 700 : 500}
                textAnchor="middle"
              >
                &ldquo;{cell.term}&rdquo;
              </text>

              {/* Hand-drawn box */}
              <SketchRect
                x={startX}
                y={startY}
                width={boxWidth}
                height={boxHeight}
                color={cell.isHit ? t.accentPrimary : t.border}
                roughness={cell.isHit ? 1.5 : 1.1}
                strokeWidth={cell.isHit ? 2 : 1.2}
                id={`box-${cell.term}`}
              />

              {/* Box Fill tint if Hit */}
              {cell.isHit && (
                <rect
                  x={startX + 3}
                  y={startY + 3}
                  width={boxWidth - 6}
                  height={boxHeight - 6}
                  fill={t.accentPrimary}
                  opacity={0.12}
                  rx={4}
                />
              )}

              {/* Value inside box */}
              <text
                x={startX + boxWidth / 2}
                y={startY + 38}
                fill={cell.isHit ? t.accentPrimary : t.textMuted}
                fontSize={cell.isHit ? 14 : 13}
                fontFamily="'Kalam', cursive"
                fontWeight={cell.isHit ? 800 : 400}
                textAnchor="middle"
              >
                {cell.weight > 0 ? cell.weight.toFixed(4) : '0.0'}
              </text>

              {/* Subtitle index */}
              <text
                x={startX + boxWidth / 2}
                y={startY + 54}
                fill={t.textMuted}
                fontSize={9}
                fontFamily="'Kalam', cursive"
                textAnchor="middle"
              >
                dim {idx + 1}
              </text>
            </g>
          );
        })}

        {/* Closing bracket & ellipsis */}
        <text x={35 + cells.length * 62} y={92} fill={t.textPrimary} fontSize={16} fontFamily="'Kalam', cursive" fontWeight={700}>
          ... 0.0 ]^T
        </text>

        {/* Annotation Arrow to non-zero box */}
        <g transform="translate(290, 155)">
          <path d="M 40 45 C 30 25, 20 10, 0 0" fill="none" stroke={t.accentPrimary} strokeWidth={1.8} markerEnd="url(#arrow-annot)" />
          <text x={48} y={50} fill={t.accentPrimary} fontSize={13} fontFamily="'Kalam', cursive" fontWeight={700}>
            Non-zero weight (matched query term)
          </text>
        </g>

        {/* Annotation Arrow to zero box */}
        <g transform="translate(100, 155)">
          <path d="M 30 45 C 20 25, 10 10, -5 0" fill="none" stroke={t.textMuted} strokeWidth={1.5} />
          <text x={38} y={50} fill={t.textMuted} fontSize={12} fontFamily="'Kalam', cursive">
            Absent word: coordinate is exactly 0.0
          </text>
        </g>

        {/* Global Vocabulary Callout */}
        <g transform="translate(30, 195)">
          <SketchRect x={0} y={0} width={500} height={50} color={t.border} roughness={1.2} strokeWidth={1.2} />
          <text x={12} y={22} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700}>
            Why sparse?
          </text>
          <text x={12} y={38} fill={t.textSecondary} fontSize={11} fontFamily="'Kalam', cursive">
            A document contains ~50–1,000 unique words out of 100,000+ total English words. We store only (term_id, weight) pairs.
          </text>
        </g>
      </svg>
    </VisualizationContainer>
  );
}

export default SparseVectorBoxesDiagram;
