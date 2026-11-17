import type { ReactNode } from 'react';
import SketchBox from './SketchBox';
import { useVizTokens } from '../../theme/vizTokens';
import Watermark from './Watermark';

/**
 * A pen-drawn flow diagram for Learn pages: boxes drawn by hand, joined by
 * hand-drawn arrows, top to bottom. Replaces ASCII-art flows (notebook rule 2).
 *
 * Built from HTML (not absolutely positioned SVG text), so labels wrap
 * instead of overlapping, at every width.
 *
 * rows: each row is one box, or an array of boxes drawn side by side
 * (they stack on phones). An optional `arrow` label sits beside the arrow
 * that leads into the row.
 */
export type PenTone = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'ink';

export interface PenStep {
  title: ReactNode;
  lines?: ReactNode[];
  tone?: PenTone;
}

export interface PenRow {
  steps: PenStep | PenStep[];
  arrow?: ReactNode;
}

interface PenFlowProps {
  title?: ReactNode;
  rows: PenRow[];
  caption?: ReactNode;
  ariaLabel: string;
}

function DownArrow({ color }: { color: string }) {
  return (
    <svg width="22" height="34" viewBox="0 0 22 34" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d="M11 2 C 10 10, 12 18, 11 28" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 21 L 11 30 L 18 21" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PenFlow({ title, rows, caption, ariaLabel }: PenFlowProps) {
  const t = useVizTokens();
  const toneColor: Record<PenTone, string> = {
    blue: t.accentSecondary,
    green: t.accentPrimary,
    purple: t.accentPurple,
    orange: t.accentWarn,
    red: t.accentDanger,
    ink: t.textPrimary,
  };

  const box = (s: PenStep, key: number) => {
    const c = toneColor[s.tone ?? 'blue'];
    return (
      <SketchBox key={key} color={c} style={{ flex: '1 1 180px', minWidth: 0, maxWidth: 420 }}>
        <div style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: c, lineHeight: 1.4 }}>{s.title}</div>
          {s.lines?.map((l, i) => (
            <div key={i} style={{ color: t.textSecondary, fontSize: '0.92em', lineHeight: 1.45, marginTop: 2 }}>
              {l}
            </div>
          ))}
        </div>
      </SketchBox>
    );
  };

  return (
    <figure className="nm-pen-flow" role="img" aria-label={ariaLabel} style={{ margin: '1.5rem 0' }}>
      <SketchBox color={t.border} strokeWidth={1.2}>
        <div style={{ padding: '1rem 0.9rem 1.1rem', fontFamily: "'Kalam', cursive" }}>
          {title && (
            <div style={{ fontWeight: 700, color: t.textPrimary, textAlign: 'center', marginBottom: '0.75rem' }}>{title}</div>
          )}
          {rows.map((row, i) => {
            const steps = Array.isArray(row.steps) ? row.steps : [row.steps];
            return (
              <div key={i}>
                {i > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0.3rem 0' }}>
                    <DownArrow color={t.textMuted} />
                    {row.arrow && <span style={{ color: t.accentWarn, fontSize: '0.9em', lineHeight: 1.35 }}>{row.arrow}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                  {steps.map(box)}
                </div>
              </div>
            );
          })}
          {caption && (
            <figcaption style={{ marginTop: '0.9rem', color: t.textSecondary, textAlign: 'center', lineHeight: 1.5 }}>
              {caption}
            </figcaption>
          )}
          <Watermark />
        </div>
      </SketchBox>
    </figure>
  );
}
