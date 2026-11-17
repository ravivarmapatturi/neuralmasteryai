import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

interface MatrixCell {
  val: number | null; // null = unobserved dot
  isHighlight?: boolean;
}

export function UserItemMatrixDiagram() {
  const t = useVizTokens();
  const [showNeighborhood, setShowNeighborhood] = useState<boolean>(false);

  const users = ['Alice (u1)', 'Bob (u2)', 'Charlie (u3)', 'Diana (u4)'];
  const items = ['1. Matrix Alg', '2. Vector Search', '3. Two-Tower', '4. Graph RAG'];

  // Matrix R from recommendation-foundations.mdx
  // Alice:   [ 5, 4, 1, · ]
  // Bob:     [ 4, 5, ·, 2 ]
  // Charlie: [ 1, 2, 5, 4 ]
  // Diana:   [ ·, 1, 4, 5 ]
  const matrix: MatrixCell[][] = [
    [{ val: 5 }, { val: 4 }, { val: 1 }, { val: null }],
    [{ val: 4 }, { val: 5 }, { val: null }, { val: 2 }],
    [{ val: 1 }, { val: 2 }, { val: 5 }, { val: 4 }],
    [{ val: null }, { val: 1 }, { val: 4 }, { val: 5 }],
  ];

  const width = 560;
  const height = 330;
  const startX = 140;
  const startY = 60;
  const cellW = 85;
  const cellH = 46;

  return (
    <VisualizationContainer
      title="The User-Item Interaction Matrix: Observed Ratings vs. Unobserved Dots"
      footer={
        "The interaction matrix R records observed ratings on a 1-to-5 star scale. " +
        "Dots (·) represent unobserved interactions. " +
        "Critical rule: An unobserved dot is never a 0 or negative rating—it simply means the user has not yet encountered or consumed that item. " +
        "Notice that Alice and Bob have nearly identical ratings for Item 1 (5 & 4) and Item 2 (4 & 5), forming a strong collaborative neighborhood."
      }
    >
      <VisualizationHeader
        eyebrow="Matrix structure"
        title="Hand-Drawn User-Item Interaction Matrix"
        description="Inspect the observed explicit ratings and unobserved entries across users and catalog items."
      />

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowNeighborhood((v) => !v)}
          style={{
            padding: '6px 14px',
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            border: `1.5px solid ${showNeighborhood ? t.accentPrimary : t.border}`,
            background: showNeighborhood ? t.surfaceAlt : t.surface,
            color: showNeighborhood ? t.accentPrimary : t.textPrimary,
            fontFamily: "'Kalam', cursive",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {showNeighborhood ? 'Show all entries' : 'Highlight Alice & Bob shared taste (neighborhood)'}
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
        aria-label="User-Item matrix diagram showing rows for Alice, Bob, Charlie, Diana and columns for catalog items"
      >
        {/* Column Headers (Items) */}
        {items.map((item, colIdx) => (
          <text
            key={item}
            x={startX + colIdx * cellW + cellW / 2}
            y={startY - 12}
            fill={t.textPrimary}
            fontSize={11}
            fontFamily="'Kalam', cursive"
            fontWeight={700}
            textAnchor="middle"
          >
            {item}
          </text>
        ))}

        {/* Rows (Users & Cells) */}
        {users.map((user, rowIdx) => {
          const isAliceBob = rowIdx === 0 || rowIdx === 1;
          const y = startY + rowIdx * cellH;

          return (
            <g key={user}>
              {/* Row Header (User) */}
              <text
                x={startX - 12}
                y={y + cellH / 2 + 5}
                fill={showNeighborhood && isAliceBob ? t.accentPrimary : t.textPrimary}
                fontSize={13}
                fontFamily="'Kalam', cursive"
                fontWeight={showNeighborhood && isAliceBob ? 800 : 600}
                textAnchor="end"
              >
                {user}
              </text>

              {/* Cells */}
              {matrix[rowIdx].map((cell, colIdx) => {
                const x = startX + colIdx * cellW;
                const isSharedHit = showNeighborhood && isAliceBob && (colIdx === 0 || colIdx === 1);
                const isUnobserved = cell.val === null;

                return (
                  <g key={`${rowIdx}-${colIdx}`}>
                    {/* Hand-drawn cell outline */}
                    <SketchRect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      color={isSharedHit ? t.accentPrimary : isUnobserved ? t.border : t.border}
                      roughness={isSharedHit ? 1.5 : 1.1}
                      strokeWidth={isSharedHit ? 2 : 1.1}
                      id={`cell-${rowIdx}-${colIdx}`}
                    />

                    {/* Cell fill if highlighted */}
                    {isSharedHit && (
                      <rect x={x + 2} y={y + 2} width={cellW - 4} height={cellH - 4} fill={t.accentPrimary} opacity={0.15} rx={3} />
                    )}

                    {/* Cell content */}
                    {isUnobserved ? (
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 5}
                        fill={t.textMuted}
                        fontSize={20}
                        fontFamily="'Kalam', cursive"
                        fontWeight={700}
                        textAnchor="middle"
                      >
                        ·
                      </text>
                    ) : (
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 5}
                        fill={isSharedHit ? t.accentPrimary : t.textPrimary}
                        fontSize={16}
                        fontFamily="'Kalam', cursive"
                        fontWeight={isSharedHit ? 800 : 700}
                        textAnchor="middle"
                      >
                        {cell.val}★
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Annotations below */}
        {showNeighborhood ? (
          <g transform="translate(140, 260)">
            <SketchRect x={0} y={0} width={380} height={50} color={t.accentPrimary} roughness={1.3} strokeWidth={1.5} />
            <text x={14} y={22} fill={t.accentPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700}>
              High-overlap neighborhood:
            </text>
            <text x={14} y={38} fill={t.textPrimary} fontSize={11} fontFamily="'Kalam', cursive">
              Both rated Matrix Alg (5 &amp; 4) and Vector Search (4 &amp; 5) highly. Shared tastes predict unseen ratings!
            </text>
          </g>
        ) : (
          <g transform="translate(140, 260)">
            <SketchRect x={0} y={0} width={380} height={50} color={t.border} roughness={1.2} strokeWidth={1.2} />
            <text x={14} y={22} fill={t.textPrimary} fontSize={12} fontFamily="'Kalam', cursive" fontWeight={700}>
              Notebook invariant:
            </text>
            <text x={14} y={38} fill={t.textSecondary} fontSize={11} fontFamily="'Kalam', cursive">
              &bull; rating = observed preference (1 to 5). &bull; dot (·) = unobserved item (NOT a zero!).
            </text>
          </g>
        )}
      </svg>
    </VisualizationContainer>
  );
}

export default UserItemMatrixDiagram;
