import type { ReactNode } from 'react';
import VisualizationMath from './VisualizationMath';
import './stickyNote.css';

export type StickyColor = 'yellow' | 'blue' | 'green' | 'pink' | 'orange';

/**
 * A sticky note stuck on the notebook page: the place for the things a learner
 * should keep in view while playing (the formula, the current step, the rule).
 * `tilt` alternates the slight rotation so a row of notes looks hand-placed.
 */
export default function StickyNote({ title, color = 'yellow', tilt = 0, children, live, latex, active, onSelect }: {
  title?: ReactNode;
  color?: StickyColor;
  tilt?: -1 | 0 | 1;
  children?: ReactNode;
  live?: boolean;
  /** A formula, typeset with KaTeX in the centre of the note. */
  latex?: string;
  /** In a set of notes, the one that is in use right now. */
  active?: boolean;
  /** Makes the note a button (e.g. pick this formula). */
  onSelect?: () => void;
}) {
  const cls = `nm-sticky nm-sticky--${color} nm-sticky--tilt${tilt}${active ? ' is-active' : ''}${active === false ? ' is-dim' : ''}`;
  const body = (
    <>
      {title && <p className="nm-sticky__title">{title}</p>}
      {latex && <div className="nm-sticky__math"><VisualizationMath latex={latex} /></div>}
      {children && <div className="nm-sticky__body">{children}</div>}
    </>
  );
  if (onSelect) {
    return <button type="button" className={cls} onClick={onSelect} aria-pressed={Boolean(active)} aria-label={typeof title === 'string' ? title : undefined}>{body}</button>;
  }
  return <div className={cls} aria-live={live ? 'polite' : undefined}>{body}</div>;
}

/** Lays sticky notes out side by side, wrapping on narrow screens. */
export function StickyRow({ children }: { children: ReactNode }) {
  return <div className="nm-sticky-row">{children}</div>;
}
