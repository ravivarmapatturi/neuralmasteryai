import React from 'react';
import { useVizTokens, SPACING } from '../../theme/vizTokens';

function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed === trimmed.toUpperCase()) {
    return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export default function VisualizationHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title?: string;
  description?: React.ReactNode;
}) {
  const t = useVizTokens();
  return (
    <div style={{ marginBottom: SPACING.sm }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: "'Kalam', cursive",
            fontSize: 15,
            fontWeight: 700,
            color: t.accentPrimary,
            marginBottom: 4,
          }}
        >
          {toSentenceCase(eyebrow)}
        </div>
      )}
      {title && <div style={{ fontSize: 20, fontWeight: 700, marginBottom: description ? 6 : 0 }}>{title}</div>}
      {description && <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{description}</div>}
    </div>
  );
}
