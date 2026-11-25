import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { VisualizationHeader, VizButton } from '../primitives';

/** Compact header row + Play/Pause/Step/Reset transport controls. */
export function PlaygroundHeaderBar({
  eyebrow = 'Live playground',
  title,
  description,
  playing,
  onToggle,
  onNext,
  onReset,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  playing: boolean;
  onToggle: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      <div style={{ flex: '1 1 260px', minWidth: 0, marginBottom: -10 }}>
        <VisualizationHeader eyebrow={eyebrow} title={title} description={description} />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
        <VizButton onClick={onToggle}>{playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={onNext}>Step</VizButton>
        <VizButton variant="secondary" onClick={onReset}>Reset</VizButton>
      </div>
    </div>
  );
}

/** Borderless highlighter formula strip showing general formula + substituted current numbers. */
export function FormulaStrip({
  general,
  worked,
}: {
  general: string;
  worked: string;
}) {
  const t = useVizTokens();
  return (
    <div
      style={{
        marginTop: 8,
        padding: '6px 10px',
        background: t.surfaceAlt,
        borderLeft: `3px solid ${t.accentSecondary}`,
        fontSize: 14,
        lineHeight: 1.45,
        color: t.textPrimary,
      }}
    >
      <div>
        <strong style={{ color: t.accentSecondary }}>Formula:</strong>{' '}
        <span style={{ fontFamily: 'monospace' }}>{general}</span>
      </div>
      <div style={{ fontFamily: 'monospace', color: t.textPrimary }}>
        <strong style={{ fontFamily: FONT_FAMILY, color: t.textSecondary }}>Now:</strong> {worked}
      </div>
    </div>
  );
}

/** Plain-English one-line "what just happened and why" caption strip (borderless). */
export function StepCaptionStrip({
  caption,
  accentColor,
}: {
  caption: string;
  accentColor?: string;
}) {
  const t = useVizTokens();
  return (
    <div
      aria-live="polite"
      style={{
        margin: '6px 0 8px',
        padding: '6px 10px',
        background: t.surfaceAlt,
        borderLeft: `3px solid ${accentColor ?? t.accentPrimary}`,
        fontSize: 14.5,
        lineHeight: 1.4,
        color: t.textPrimary,
      }}
    >
      {caption}
    </div>
  );
}

/** Inline predict-then-run challenge (no nested card border). */
export function PredictChallenge({
  prompt,
  options,
  correctIndex,
  selected,
  onSelect,
  explanation,
  actionLabel,
  onAction,
}: {
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  selected: number | null;
  onSelect: (idx: number) => void;
  explanation: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const t = useVizTokens();
  const revealed = selected !== null;
  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: `1px dashed ${t.border}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px 10px',
        fontSize: 14,
      }}
    >
      <span style={{ fontWeight: 700, color: t.accentWarn }}>Predict first:</span>
      <span style={{ color: t.textPrimary }}>{prompt}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt, idx) => {
          const picked = selected === idx;
          const correct = idx === correctIndex;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(idx)}
              style={{
                padding: '4px 10px',
                borderRadius: RADIUS.sm,
                border: `1px solid ${
                  revealed && correct
                    ? t.accentPrimary
                    : revealed && picked
                      ? t.accentDanger
                      : t.border
                }`,
                background:
                  revealed && correct
                    ? t.accentPrimary
                    : revealed && picked
                      ? t.accentDanger
                      : 'transparent',
                color: revealed && (correct || picked) ? t.background : t.textPrimary,
                fontFamily: FONT_FAMILY,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && (
        <span role="status" style={{ color: selected === correctIndex ? t.accentPrimary : t.accentWarn, fontSize: 14 }}>
          {selected === correctIndex ? 'Right — ' : 'Try it — '}
          {explanation}{' '}
          <button
            type="button"
            onClick={onAction}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: t.accentSecondary,
              textDecoration: 'underline',
              fontFamily: FONT_FAMILY,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {actionLabel}
          </button>
        </span>
      )}
    </div>
  );
}
