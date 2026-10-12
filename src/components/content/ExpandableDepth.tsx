import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SPACING } from '../../theme/vizTokens';
import { useNotebookPalette } from '../../theme/notebookPalette';
import { useGamification } from '../../contexts/GamificationContext';
import { SketchRect } from '../notebook/RoughShape';

type Depth = 'eli5' | 'deeper' | 'solution' | 'qa';

const DEPTH_META: Record<Depth, { icon: string; label: string }> = {
  eli5: { icon: '💡', label: 'Simple Explanation' },
  deeper: { icon: '🔬', label: 'Go deeper' },
  solution: { icon: '🔑', label: 'Show solution' },
  qa: { icon: '❓', label: 'Question' },
};

/**
 * The progressive-depth primitive: a page's default body stays exactly
 * where it is (the "Standard" tier -- untouched, always visible), and this
 * wraps optional content one tier lighter (ELI5) or heavier (Go deeper) as
 * an inline expand/collapse -- never a separate route, so "learn on this
 * page" never fragments into "the beginner page" vs "the real page".
 *
 * ELI5 defaults open (it's a short on-ramp meant to be seen first); Go
 * deeper defaults closed (it's the opt-in expert extra, not required
 * reading). Both are plain <button>-driven disclosure, so keyboard/AT
 * support comes for free -- no custom role/tabIndex wiring needed here,
 * unlike the SVG-based diagram controls elsewhere on this site.
 */
function ExpandableDepth({
  kind,
  title,
  defaultOpen,
  onReveal,
  children,
}: {
  kind: Depth;
  title?: string;
  defaultOpen?: boolean;
  /** Fires once, only on the first closed->open transition -- never on
   * re-opening after collapsing again, and never on mount for a
   * defaultOpen block. Optional; only QA currently passes one (see
   * QA below), so ELI5/GoDeeper/Solution are unaffected. */
  onReveal?: () => void;
  children: ReactNode;
}) {
  const nb = useNotebookPalette();
  const meta = DEPTH_META[kind];
  const [open, setOpen] = useState(defaultOpen ?? kind === 'eli5');
  const color = kind === 'eli5' ? nb.teal : kind === 'solution' ? nb.amber : kind === 'qa' ? nb.cobalt : nb.lavender;

  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 48 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    setOpen((wasOpen) => {
      if (!wasOpen) onReveal?.();
      return !wasOpen;
    });
  }

  return (
    <div ref={ref} style={{ position: 'relative', margin: `${SPACING.sm}px 0` }}>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <SketchRect
          x={3}
          y={3}
          width={Math.max(size.width - 6, 10)}
          height={Math.max(size.height - 6, 10)}
          color={color}
          roughness={1.3}
          strokeWidth={1.5}
          id={`depth-${kind}-${title ?? 'box'}`}
        />
      </svg>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: `${SPACING.xs}px ${SPACING.sm}px`,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "'Kalam', 'Comic Sans MS', cursive",
          color,
        }}
      >
        <span aria-hidden="true">{meta.icon}</span>
        <span>{title ?? meta.label}</span>
        <span
          aria-hidden="true"
          style={{ marginLeft: 'auto', fontSize: 11, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }}
        >
          ▶
        </span>
      </button>
      {open && (
        <div style={{ position: 'relative', padding: `0 ${SPACING.sm}px ${SPACING.xs}px` }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Real reward-gap audit finding: expanding an ELI5/Deep-Dive block is a
 * genuine extra-effort action that previously earned nothing (see
 * DEPTH_REVEAL_POINTS in lib/gamification.ts). Builds a synthetic,
 * page-scoped id from the current route + block kind + title -- not a
 * per-block database id (none exists; these are plain MDX content, not
 * a managed collection), so two untitled blocks of the SAME kind on the
 * SAME page collide onto one shared id (only the first ever earns the
 * reward) -- an accepted, low-stakes trade-off for a small reward,
 * rather than building real per-block identity machinery no other part
 * of this content system has. award()'s own hasAward de-dupe (see
 * GamificationContext) is what actually makes this first-reveal-only;
 * ExpandableDepth's onReveal itself fires on every open, by design (see
 * QA's own identical contract). */
function useDepthRevealHandler(kind: 'eli5' | 'deeper', title: string | undefined) {
  const { pathname } = useLocation();
  const { awardDepthRevealed } = useGamification();
  const id = `depth:${pathname}:${kind}:${title ?? 'untitled'}`;
  return () => awardDepthRevealed(id);
}

/** A short, plain-language on-ramp before the standard explanation gets
 * technical -- open by default, collapsible for anyone who wants to skip
 * straight to the real content. */
export function ELI5({ title, children }: { title?: string; children: ReactNode }) {
  const onReveal = useDepthRevealHandler('eli5', title);
  return (
    <ExpandableDepth kind="eli5" title={title} onReveal={onReveal}>
      {children}
    </ExpandableDepth>
  );
}

/** The expert extra beyond the standard explanation -- a fuller derivation,
 * an edge case, formal detail. Closed by default: opt-in depth, not
 * something every reader has to scroll past. */
export function GoDeeper({ title, children }: { title?: string; children: ReactNode }) {
  const onReveal = useDepthRevealHandler('deeper', title);
  return (
    <ExpandableDepth kind="deeper" title={title} defaultOpen={false} onReveal={onReveal}>
      {children}
    </ExpandableDepth>
  );
}

/** A reference implementation + reasoning, hidden until the learner asks
 * for it -- pairs with a `RunnableCode` block in `tests` mode above it.
 * Closed by default: the point is to attempt the problem against real
 * test cases first, not read the answer before trying. */
export function Solution({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <ExpandableDepth kind="solution" title={title ?? 'Show solution'} defaultOpen={false}>
      {children}
    </ExpandableDepth>
  );
}

/** One interview-cram-sheet question: the question itself is the always-
 * visible header, the answer is hidden until clicked. Closed by default
 * on purpose -- the point is to test recall against the question first,
 * not read straight down a page of answers. */
export function QA({ q, children, onReveal }: { q: string; children: ReactNode; onReveal?: () => void }) {
  return (
    <ExpandableDepth kind="qa" title={q} defaultOpen={false} onReveal={onReveal}>
      {children}
    </ExpandableDepth>
  );
}
