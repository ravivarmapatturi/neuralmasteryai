/**
 * The Neural Mastery mark that sits inside every visual (owner, 18 Nov 2026):
 * a screenshot or saved image of any drawing, worksheet or widget carries it.
 * It is part of the frame's own layout (its own row, not an overlay), so it
 * never covers content and survives cropping to the frame.
 */
export const WATERMARK_TEXT = '@NeuralMasteryAI';

export default function Watermark() {
  return (
    <div
      className="nm-watermark"
      aria-hidden="true"
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: 8,
        fontFamily: "'Kalam', cursive",
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--nm-text-muted)',
        opacity: 0.75,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {WATERMARK_TEXT}
    </div>
  );
}
