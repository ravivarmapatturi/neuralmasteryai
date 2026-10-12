import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { DIAGRAM_TYPE, DIAGRAM_SPACING, DIAGRAM_RADIUS, valueColor, getConceptColor, type DiagramConcept } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/**
 * The one reusable tensor-grid primitive every matrix/vector in this page's
 * diagrams renders through -- same pattern Transformer Explainer's
 * MatrixSvg.svelte uses (a single generic, parameterized cell-grid), so
 * every tensor on the page reads as the same visual object instead of each
 * diagram inventing its own table styling. Cell color is value-encoded
 * (magnitude -> concept color), never a flat decorative fill.
 */
export interface DiagramMatrixProps {
  data: number[][];
  concept: DiagramConcept;
  rowLabels?: string[];
  colLabels?: string[];
  cellSize?: number;
  maxAbs?: number; // normalize by this instead of the data's own max, for cross-matrix comparability
  highlightRow?: number | null;
  highlightCol?: number | null;
  onCellHover?: (row: number, col: number, value: number) => void;
  onCellLeave?: () => void;
  showValues?: boolean;
  valueFormat?: (v: number) => string;
}

export default function DiagramMatrix({
  data,
  concept,
  rowLabels,
  colLabels,
  cellSize = 40,
  maxAbs,
  highlightRow = null,
  highlightCol = null,
  onCellHover,
  onCellLeave,
  showValues = true,
  valueFormat = (v) => v.toFixed(2),
}: DiagramMatrixProps) {
  const t = useVizTokens();
  const [hovered, setHovered] = useState<[number, number] | null>(null);

  const nRows = data.length;
  const nCols = data[0]?.length ?? 0;
  const normalizer = maxAbs ?? Math.max(0.05, ...data.flat().map((v) => Math.abs(v)));

  const labelColW = rowLabels ? 64 : 0;
  const labelRowH = colLabels ? 28 : 0;
  const gap = DIAGRAM_SPACING.cellGap;
  const width = labelColW + nCols * cellSize + (nCols - 1) * gap;
  const height = labelRowH + nRows * cellSize + (nRows - 1) * gap;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width, display: 'block', overflow: 'visible' }}>
      {colLabels?.map((label, c) => (
        <text
          key={`col-${c}`}
          x={labelColW + c * (cellSize + gap) + cellSize / 2}
          y={labelRowH - 10}
          textAnchor="middle"
          fontSize={DIAGRAM_TYPE.secondaryLabel.size + 1}
          fontWeight={DIAGRAM_TYPE.secondaryLabel.weight}
          fontFamily={HAND_FONT}
          fill={c === highlightCol ? getConceptColor(t, concept) : t.textMuted}
        >
          {label}
        </text>
      ))}
      {rowLabels?.map((label, r) => (
        <text
          key={`row-${r}`}
          x={labelColW - 10}
          y={labelRowH + r * (cellSize + gap) + cellSize / 2 + 4}
          textAnchor="end"
          fontSize={DIAGRAM_TYPE.secondaryLabel.size + 1}
          fontWeight={DIAGRAM_TYPE.secondaryLabel.weight}
          fontFamily={HAND_FONT}
          fill={r === highlightRow ? getConceptColor(t, concept) : t.textMuted}
        >
          {label}
        </text>
      ))}
      {data.map((row, r) =>
        row.map((v, c) => {
          const isHovered = hovered?.[0] === r && hovered?.[1] === c;
          const inHighlightBand = r === highlightRow || c === highlightCol;
          const x = labelColW + c * (cellSize + gap);
          const y = labelRowH + r * (cellSize + gap);
          return (
            <g
              key={`${r}-${c}`}
              onMouseEnter={() => {
                setHovered([r, c]);
                onCellHover?.(r, c, v);
              }}
              onMouseLeave={() => {
                setHovered(null);
                onCellLeave?.();
              }}
              style={{ cursor: onCellHover ? 'pointer' : 'default' }}
            >
              {/* fill is real data (magnitude -> concept color), not
                  decoration -- kept as a plain rect so the value encoding
                  stays exact. SketchRect adds only the hand-drawn border
                  on top, no fillColor (same legibility fix as every other
                  diagram converted this session, now applied at the root
                  shared primitive every matrix on the site renders
                  through). */}
              <rect x={x} y={y} width={cellSize} height={cellSize} rx={DIAGRAM_RADIUS.cell} fill={valueColor(t, concept, Math.abs(v) / normalizer)} stroke="none" />
              <SketchRect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                color={isHovered || inHighlightBand ? getConceptColor(t, concept) : t.border}
                strokeWidth={isHovered ? 2 : inHighlightBand ? 1.5 : 1}
                opacity={isHovered || inHighlightBand ? 1 : 0.5}
                roughness={1.1}
                id={`dm-cell-${r}-${c}`}
              />
              {showValues && (
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize={DIAGRAM_TYPE.cellValue.size}
                  fontWeight={DIAGRAM_TYPE.cellValue.weight}
                  fontFamily="monospace"
                  fill={Math.abs(v) / normalizer > 0.55 ? t.background : t.textPrimary}
                  style={{ pointerEvents: 'none' }}
                >
                  {valueFormat(v)}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
