import React, { useId } from 'react';
import { useVizTokens, RADIUS, SPACING, FONT_FAMILY } from '../../theme/vizTokens';

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

  return (
    <div
      role="group"
      aria-label={title}
      aria-describedby={footer ? footerId : undefined}
      style={{
        position: 'relative',
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        margin: `${SPACING.md}px 0`,
        boxShadow: t.mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.35)' : '0 8px 24px rgba(20, 22, 26, 0.08)',
        fontFamily: FONT_FAMILY,
        color: t.textPrimary,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div className="nm-viz-content" style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
      {footer && (
        <div
          id={footerId}
          style={{
            marginTop: SPACING.sm,
            paddingTop: SPACING.sm,
            borderTop: `1px solid ${t.border}`,
            fontSize: 13,
            color: t.textSecondary,
          }}
        >
          {footer}
        </div>
      )}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 10,
          fontSize: 9,
          letterSpacing: '0.02em',
          color: t.textMuted,
          opacity: 0.35,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Neural Mastery
      </span>
    </div>
  );
}
