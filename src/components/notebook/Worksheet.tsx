import { useState, type ReactNode } from 'react';
import SketchBox from './SketchBox';
import { useVizTokens } from '../../theme/vizTokens';
import Watermark from './Watermark';

/**
 * Neural Mastery worksheet: the whole method on one sheet, with every real
 * number written in a grid, one highlighter colour per stage, top to bottom.
 * Page standard 2.10. HTML grids (not positioned SVG text), so nothing can
 * overlap at any width; wide grids scroll inside their own row.
 */
export type WsColor = 'yellow' | 'blue' | 'purple' | 'green' | 'orange' | 'pink';

export interface WsGridProps {
  /** Column headings (first one sits above the row labels; may be ''). */
  head: ReactNode[];
  /** Each row: a label then its cells. */
  rows: { label: ReactNode; cells: ReactNode[] }[];
  /** Cells to leave blank until the reader clicks "Show answers", as [row, col]. */
  hide?: [number, number][];
}

export interface WsStageProps {
  tag: string;
  color: WsColor;
  /** One plain sentence on what this stage does. */
  note?: ReactNode;
  grid?: WsGridProps;
  children?: ReactNode;
}

interface WorksheetProps {
  title: string;
  stages: WsStageProps[];
  ariaLabel: string;
}

function useHighlighter() {
  const t = useVizTokens();
  const dark = t.mode === 'dark';
  // Light pastel fills on paper; deeper, low-opacity fills in dark mode.
  const fill: Record<WsColor, string> = dark
    ? { yellow: 'rgba(250,204,21,0.22)', blue: 'rgba(96,165,250,0.22)', purple: 'rgba(192,132,252,0.22)', green: 'rgba(74,222,128,0.2)', orange: 'rgba(251,146,60,0.22)', pink: 'rgba(244,114,182,0.22)' }
    : { yellow: '#FEF3C7', blue: '#DBEAFE', purple: '#F3E8FF', green: '#DCFCE7', orange: '#FFEDD5', pink: '#FCE7F3' };
  const ink: Record<WsColor, string> = dark
    ? { yellow: '#FDE68A', blue: '#93C5FD', purple: '#D8B4FE', green: '#86EFAC', orange: '#FDBA74', pink: '#F9A8D4' }
    : { yellow: '#92400E', blue: '#1D4ED8', purple: '#7E22CE', green: '#15803D', orange: '#C2410C', pink: '#BE185D' };
  return { t, fill, ink };
}

function Grid({ grid, color, reveal }: { grid: WsGridProps; color: WsColor; reveal: boolean }) {
  const { t, fill, ink } = useHighlighter();
  const hidden = (r: number, c: number) => !reveal && grid.hide?.some(([hr, hc]) => hr === r && hc === c);
  const cell = { border: `1.5px solid ${t.textPrimary}`, padding: '0.35rem 0.6rem', textAlign: 'center' as const, minWidth: 64, whiteSpace: 'nowrap' as const };
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table className="nm-ws-grid" style={{ borderCollapse: 'collapse', fontFamily: "'Kalam', cursive", fontSize: 16, margin: 0, display: 'table', border: 'none', background: 'transparent' }}>
        <thead>
          <tr>
            {grid.head.map((h, i) => (
              <th key={i} style={{ ...cell, border: i === 0 ? 'none' : cell.border, background: i === 0 ? 'transparent' : fill[color], color: ink[color], fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, r) => (
            <tr key={r}>
              <th scope="row" style={{ ...cell, border: 'none', textAlign: 'right', fontWeight: 700, color: t.textPrimary, background: 'transparent' }}>{row.label}</th>
              {row.cells.map((c, ci) => (
                <td key={ci} style={{ ...cell, background: hidden(r, ci) ? 'transparent' : t.surface, color: t.textPrimary }}>
                  {hidden(r, ci) ? <span style={{ color: t.textMuted }}>?</span> : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Worksheet({ title, stages, ariaLabel }: WorksheetProps) {
  const { t, fill, ink } = useHighlighter();
  const [reveal, setReveal] = useState(false);
  const hasBlanks = stages.some((s) => s.grid?.hide?.length);
  return (
    <figure className="nm-worksheet" role="group" aria-label={ariaLabel} style={{ margin: '1.75rem 0' }}>
      <SketchBox color={t.border} strokeWidth={1.3}>
        <div style={{ padding: '1.1rem 1.1rem 1.25rem', fontFamily: "'Kalam', cursive" }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: t.textPrimary }}>{title}</div>
            {hasBlanks && (
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                style={{ fontFamily: "'Kalam', cursive", fontSize: 16, fontWeight: 700, padding: '4px 14px', cursor: 'pointer', color: ink.green, background: fill.green, border: `1.5px solid ${ink.green}`, borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
              >
                {reveal ? 'Hide answers' : 'Work it out, then show answers'}
              </button>
            )}
          </div>
          {stages.map((s, i) => (
            <div key={i} className="nm-ws-stage" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', alignItems: 'flex-start', padding: '0.75rem 0', borderTop: i ? `1px dashed ${t.border}` : 'none' }}>
              <div style={{ flex: '0 0 150px', maxWidth: '100%' }}>
                <span style={{ display: 'inline-block', fontSize: 18, fontWeight: 700, color: ink[s.color], background: fill[s.color], padding: '2px 10px', transform: 'rotate(-1.5deg)', borderRadius: 3 }}>
                  {s.tag}
                </span>
              </div>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                {s.note && <div style={{ fontSize: 16, color: t.textSecondary, marginBottom: s.grid || s.children ? 8 : 0, lineHeight: 1.5 }}>{s.note}</div>}
                {s.grid && <Grid grid={s.grid} color={s.color} reveal={reveal} />}
                {s.children}
              </div>
            </div>
          ))}
          <Watermark />
        </div>
      </SketchBox>
    </figure>
  );
}
