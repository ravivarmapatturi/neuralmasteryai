import { useState } from 'react';
import { useVizTokens, SPACING } from '../../theme/vizTokens';

/**
 * A small "predict, then reveal" widget -- pick an answer before you touch
 * the Studio above, then check yourself. No scoring/progress tracking, just
 * the single mechanic both internal and external gap reports flagged as the
 * highest-leverage curiosity driver: commit to a prediction before running
 * the experiment that proves or breaks it.
 */
export default function PredictFirst({
  question,
  options,
  correctIndex,
  explanation,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const t = useVizTokens();
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div
      style={{
        border: `1.5px solid ${t.border}`,
        borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
        padding: SPACING.md,
        margin: `${SPACING.md}px 0`,
        background: t.surfaceAlt,
        fontFamily: "'Kalam', cursive",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Kalam', cursive",
          color: t.accentWarn,
          marginBottom: 6,
        }}
      >
        Predict first
      </div>
      <div style={{ fontSize: 16, color: t.textPrimary, marginBottom: 12, lineHeight: 1.5 }}>{question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex;
          const isSelected = i === selected;
          let bg = t.surface;
          let border = t.border;
          let color = t.textPrimary;
          if (revealed && isCorrect) {
            bg = t.accentPrimary;
            border = t.accentPrimary;
            color = t.background;
          } else if (revealed && isSelected && !isCorrect) {
            bg = t.accentDanger;
            border = t.accentDanger;
            color = t.background;
          }
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setSelected(i)}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                border: `1.5px solid ${border}`,
                background: bg,
                color,
                fontSize: 14.5,
                fontFamily: "'Kalam', cursive",
                cursor: revealed ? 'default' : 'pointer',
                fontWeight: revealed && isCorrect ? 700 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ marginTop: 10, fontSize: 13, color: t.textSecondary, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
          <strong style={{ color: selected === correctIndex ? t.accentPrimary : t.accentDanger }}>
            {selected === correctIndex ? 'Correct. ' : 'Not quite. '}
          </strong>
          {explanation}
        </div>
      )}
    </div>
  );
}
