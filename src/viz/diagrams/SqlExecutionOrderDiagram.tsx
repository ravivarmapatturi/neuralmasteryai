import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_ANIMATION } from './diagramSystem';
import { SketchPath, SketchRect } from '../../components/notebook/RoughShape';

interface Clause {
  key: string;
  label: string;
  writtenOrder: number;
  execOrder: number;
  description: string;
}

/** writtenOrder/execOrder are both 1..8 row ranks within their own column --
 * the gap between a clause's two numbers (SELECT: 1 -> 6 is the big one) is
 * the entire point of this diagram. */
const CLAUSES: Clause[] = [
  { key: 'select', label: 'SELECT', writtenOrder: 1, execOrder: 6, description: "Chooses and computes the output columns -- but by the time it runs, WHERE/GROUP BY/HAVING have already thrown away the rows it won't see. That's why a WHERE clause can't reference a SELECT alias, but ORDER BY can." },
  { key: 'from', label: 'FROM', writtenOrder: 2, execOrder: 1, description: 'Identifies the source table(s) -- the very first thing Postgres resolves, before any filtering happens.' },
  { key: 'join', label: 'JOIN', writtenOrder: 3, execOrder: 2, description: 'Combines rows from the FROM table with any joined tables, row by row, before any filtering runs.' },
  { key: 'where', label: 'WHERE', writtenOrder: 4, execOrder: 3, description: "Filters individual rows from the joined result. Runs before grouping, so it can't reference an aggregate like COUNT(*) -- that's what HAVING is for." },
  { key: 'groupby', label: 'GROUP BY', writtenOrder: 5, execOrder: 4, description: 'Collapses the filtered rows into groups that share the same key values.' },
  { key: 'having', label: 'HAVING', writtenOrder: 6, execOrder: 5, description: 'Filters entire groups, after aggregation -- this is where a condition on COUNT(*) or SUM(...) belongs, since WHERE runs too early to see it.' },
  { key: 'orderby', label: 'ORDER BY', writtenOrder: 7, execOrder: 7, description: 'Sorts the final result set. Runs after SELECT, which is why it CAN reference a SELECT alias.' },
  { key: 'limit', label: 'LIMIT', writtenOrder: 8, execOrder: 8, description: 'Trims the sorted result down to the requested number of rows -- always last.' },
];

const ROWS = 8;

export default function SqlExecutionOrderDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<string | null>(null);

  const width = 620;
  const boxW = 148;
  const boxH = 34;
  const rowGap = 42;
  const topPad = 34;
  const leftX = 30;
  const rightX = width - 30 - boxW;
  const midX = (leftX + boxW + rightX) / 2;
  const height = topPad + (ROWS - 1) * rowGap + boxH + 20;

  const active = CLAUSES.find((c) => c.key === selected) ?? null;

  return (
    <VisualizationContainer footer={active ? <><strong style={{ color: t.textPrimary }}>{active.label}:</strong> {' '}{active.description}</> : 'Click any clause to trace how it moves from where you write it to when Postgres actually runs it.'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: width, margin: '0 auto 4px', fontSize: DIAGRAM_TYPE.secondaryLabel.size, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <span>You write it</span>
        <span>Postgres executes it</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: width, margin: '0 auto' }}>
        {CLAUSES.map((c) => {
          const isActive = selected === c.key;
          const dim = selected !== null && !isActive;
          const wy = topPad + (c.writtenOrder - 1) * rowGap;
          const ey = topPad + (c.execOrder - 1) * rowGap;
          const x1 = leftX + boxW;
          const y1 = wy + boxH / 2;
          const x2 = rightX;
          const y2 = ey + boxH / 2;
          return (
            <g
              key={`path-${c.key}`}
              opacity={dim ? 0.18 : isActive ? 1 : 0.4}
              style={{ transition: `opacity ${DIAGRAM_ANIMATION.normal}ms ${DIAGRAM_ANIMATION.easing}`, cursor: 'pointer' }}
              onClick={() => setSelected(isActive ? null : c.key)}
            >
              <SketchPath
                d={`M ${x1},${y1} C ${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                color={isActive ? t.accentPrimary : t.textMuted}
                strokeWidth={isActive ? 2.5 : 1.25}
                id={`sql-path-${c.key}`}
              />
            </g>
          );
        })}

        {CLAUSES.map((c) => {
          const isActive = selected === c.key;
          const dim = selected !== null && !isActive;
          const wy = topPad + (c.writtenOrder - 1) * rowGap;
          return (
            <g
              key={`written-${c.key}`}
              style={{ cursor: 'pointer', transition: `opacity ${DIAGRAM_ANIMATION.normal}ms ${DIAGRAM_ANIMATION.easing}` }}
              opacity={dim ? 0.35 : 1}
              onClick={() => setSelected(isActive ? null : c.key)}
            >
              <rect x={leftX} y={wy} width={boxW} height={boxH} rx={8} fill={isActive ? `${t.accentPrimary}22` : t.surfaceAlt} stroke="none" />
              <SketchRect x={leftX} y={wy} width={boxW} height={boxH} color={isActive ? t.accentPrimary : t.border} strokeWidth={isActive ? 2 : 1.25} id={`sql-w-${c.key}`} />
              <text x={leftX + 14} y={wy + boxH / 2 + 4} fontSize={12} fontFamily="monospace" fontWeight={700} fill={isActive ? t.accentPrimary : t.textPrimary}>{c.label}</text>
              <text x={leftX + boxW - 12} y={wy + boxH / 2 + 4} textAnchor="end" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={t.textMuted}>{c.writtenOrder}</text>
            </g>
          );
        })}

        {CLAUSES.map((c) => {
          const isActive = selected === c.key;
          const dim = selected !== null && !isActive;
          const ey = topPad + (c.execOrder - 1) * rowGap;
          return (
            <g
              key={`exec-${c.key}`}
              style={{ cursor: 'pointer', transition: `opacity ${DIAGRAM_ANIMATION.normal}ms ${DIAGRAM_ANIMATION.easing}` }}
              opacity={dim ? 0.35 : 1}
              onClick={() => setSelected(isActive ? null : c.key)}
            >
              <rect x={rightX} y={ey} width={boxW} height={boxH} rx={8} fill={isActive ? `${t.accentPrimary}22` : t.surfaceAlt} stroke="none" />
              <SketchRect x={rightX} y={ey} width={boxW} height={boxH} color={isActive ? t.accentPrimary : t.border} strokeWidth={isActive ? 2 : 1.25} id={`sql-e-${c.key}`} />
              <text x={rightX + 14} y={ey + boxH / 2 + 4} fontSize={11} fontWeight={700} fill={isActive ? t.accentPrimary : t.textSecondary}>{c.execOrder}.</text>
              <text x={rightX + 36} y={ey + boxH / 2 + 4} fontSize={12} fontFamily="monospace" fontWeight={700} fill={isActive ? t.accentPrimary : t.textPrimary}>{c.label}</text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
