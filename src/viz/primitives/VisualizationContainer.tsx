import React, { useEffect, useId, useRef, useState } from 'react';
import { VizVisibleContext } from './vizVisibility';
import { useVizTokens, SPACING, FONT_FAMILY } from '../../theme/vizTokens';
import Watermark from '../../components/notebook/Watermark';

/**
 * The outer frame every visualization renders inside -- background, border,
 * radius, shadow, responsive width. Composes with VisualizationHeader,
 * VisualizationControls, VisualizationCanvas, etc. inside it. Matches the
 * static diagram card look (see visualize/templates/card.html.j2) so an
 * interactive component reads as native next to the site's generated charts.
 *
 * Accessibility: `footer` is, across the ~580 diagrams that pass one, always
 * a real prose description of what the diagram currently shows (values,
 * axes, what changed) -- so it doubles as the diagram's accessible
 * description for free, wired via aria-describedby, rather than requiring
 * a separate aria-label on every one of ~590 individual diagram files.
 * `title`, when a diagram does pass one, becomes the group's aria-label.
 */
export default function VisualizationContainer({
  children,
  footer,
  title,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
}) {
  const t = useVizTokens();
  const footerId = useId();
  // Live diagrams must never make the page jump: (1) they pause while off
  // screen, and (2) the frame never shrinks, it keeps the tallest height it has
  // reached, so cycling between states of different heights can't move the page.
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [minH, setMinH] = useState(0);
  const [frozenH, setFrozenH] = useState(0);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    let io: IntersectionObserver | undefined;
    let ro: ResizeObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => {
        // leaving the screen: freeze at the current height so nothing inside can move the page
        if (!e.isIntersecting) setFrozenH(Math.ceil(el.getBoundingClientRect().height));
        setVisible(e.isIntersecting);
      }, { rootMargin: '0px' });
      io.observe(el);
    }
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      ro = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        // a real width change (window resized, rotated) starts the measure afresh
        if (Math.abs(r.width - lastW) > 20) { lastW = r.width; setMinH(0); return; }
        setMinH((m) => (r.height > m + 1 ? Math.ceil(r.height) : m));
      });
      ro.observe(el);
    }
    return () => { io?.disconnect(); ro?.disconnect(); };
  }, []);

  return (
    <VizVisibleContext.Provider value={visible}>
    <div
      ref={frameRef}
      className="nm-viz-frame"
      role="group"
      aria-label={title}
      aria-describedby={footer ? footerId : undefined}
      style={{
        position: 'relative',
        background: t.surface,
        border: `1.5px solid ${t.border}`,
        borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
        padding: SPACING.md,
        margin: `${SPACING.md}px 0`,
        boxShadow: t.mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.35)' : '0 8px 24px rgba(20, 22, 26, 0.08)',
        fontFamily: FONT_FAMILY,
        color: t.textPrimary,
        maxWidth: '100%',
        boxSizing: 'border-box',
        minHeight: minH || undefined,
        // never let the browser anchor scrolling on a moving diagram; it anchors on the text
        // around it instead, so a diagram growing above the reader can't shift what they read
        overflowAnchor: 'none',
        // while off screen the frame keeps a fixed height and clips, so an
        // animation inside it can never push the page up or down
        ...(!visible && frozenH ? { height: frozenH, overflow: 'hidden' as const } : {}),
      }}
    >
      <div className="nm-viz-content" style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
      {footer && (
        <div
          id={footerId}
          className="nm-viz-footer"
          style={{
            marginTop: SPACING.sm,
            paddingTop: SPACING.sm,
            borderTop: `1px solid ${t.border}`,
            fontSize: 15,
            color: t.textSecondary,
          }}
        >
          {footer}
        </div>
      )}
      <Watermark />
    </div>
    </VizVisibleContext.Provider>
  );
}
