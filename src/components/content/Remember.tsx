import type { ReactNode } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';

/**
 * The one-sentence takeaway a reader should actually retain from a concept
 * section -- always visible (not collapsible like ELI5/GoDeeper, which are
 * optional depth layers), visually distinct from a regular paragraph so it
 * reads as a landmark while scanning/skimming, not just more prose.
 *
 * Deliberately its own color (accentWarn/amber) -- ELI5 already owns teal,
 * GoDeeper already owns purple, so this needed a third, unclaimed color to
 * stay visually distinguishable at a glance from either.
 */
export function Remember({ children }: { children: ReactNode }) {
  const t = useVizTokens();
  return (
    <div
      role="note"
      aria-label="Key takeaway"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: SPACING.xs,
        margin: `${SPACING.sm}px 0`,
        padding: `${SPACING.xs}px ${SPACING.sm}px`,
        borderRadius: RADIUS.sm,
        border: `1px solid ${t.accentWarn}`,
        background: `${t.accentWarn}14`,
      }}
    >
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: t.textPrimary }}>{children}</div>
    </div>
  );
}
