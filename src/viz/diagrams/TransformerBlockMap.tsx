import { useEffect, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';

/** Fired by AttentionStepThrough whenever its step changes (0..3). */
export const ATTENTION_STAGE_EVENT = 'nm-attention-stage';

const INNER = [
  { label: 'Q·Kᵀ', note: 'match scores' },
  { label: '÷ √dₖ', note: 'keep scores small' },
  { label: 'softmax', note: 'scores → weights' },
  { label: '× V', note: 'weighted sum of values' },
];

/**
 * Where the attention playground sits inside a (decoder-only) transformer:
 * one block, repeated N times. The attention box is opened up into the four
 * steps the playground animates, and the step it is on is highlighted.
 */
export default function TransformerBlockMap() {
  const t = useVizTokens();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setStage((e as CustomEvent<number>).detail);
    window.addEventListener(ATTENTION_STAGE_EVENT, on);
    return () => window.removeEventListener(ATTENTION_STAGE_EVENT, on);
  }, []);

  const W = 300;
  const cx = W / 2;
  const box = (y: number, h: number, label: string, sub: string, fill: string, stroke: string, key: string) => (
    <g key={key}>
      <rect x={30} y={y} width={W - 60} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <text x={cx} y={y + (sub ? h / 2 - 2 : h / 2 + 5)} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>{label}</text>
      {sub && <text x={cx} y={y + h / 2 + 15} textAnchor="middle" fontSize={13} fill={t.textSecondary}>{sub}</text>}
    </g>
  );
  const arrow = (y1: number, y2: number, key: string) => (
    <g key={key}>
      <line x1={cx} y1={y1} x2={cx} y2={y2 - 6} stroke={t.textMuted} strokeWidth={1.6} />
      <path d={`M${cx - 5} ${y2 - 9} L${cx} ${y2 - 1} L${cx + 5} ${y2 - 9}`} fill="none" stroke={t.textMuted} strokeWidth={1.6} />
    </g>
  );

  // Layout, bottom (input) to top (output), drawn top-down for SVG.
  const yOut = 10, yLin = 70, yN2 = 136, yFfn = 186, yN1 = 246, yAttn = 296, attnH = 250, yEmb = 580;
  const blockTop = yN2 - 14, blockBottom = yAttn + attnH + 12;
  const accent = t.accentPrimary;

  return (
    <figure className="nm-tblock" aria-label="Where attention sits inside a transformer block">
      <figcaption>Where this happens in a transformer</figcaption>
      <svg viewBox={`0 0 ${W} 640`} width="100%" role="img">
        {box(yOut, 40, 'Next-token probabilities', '', t.surfaceAlt, t.border, 'out')}
        {arrow(yLin, yOut + 40, 'a0')}
        {box(yLin, 44, 'Linear + softmax', 'over the vocabulary', t.surfaceAlt, t.border, 'lin')}
        {arrow(blockTop, yLin + 44, 'a1')}

        {/* the repeated block */}
        <rect x={12} y={blockTop} width={W - 24} height={blockBottom - blockTop} rx={12} fill="none" stroke={t.textMuted} strokeDasharray="6 5" strokeWidth={1.5} />
        <rect x={18} y={blockTop - 11} width={92} height={22} rx={4} fill={t.surface} />
        <text x={24} y={blockTop + 5} fontSize={14} fontWeight={700} fill={t.textSecondary}>repeat × N</text>
        {box(yN2, 36, 'Add & Norm', '', t.surface, t.border, 'n2')}
        {arrow(yFfn, yN2 + 36, 'a2')}
        {box(yFfn, 46, 'Feed-forward', 'each word on its own', t.surface, t.border, 'ffn')}
        {arrow(yN1, yFfn + 46, 'a3')}
        {box(yN1, 36, 'Add & Norm', '', t.surface, t.border, 'n1')}
        {arrow(yAttn, yN1 + 36, 'a4')}

        {/* attention, opened up */}
        <rect x={30} y={yAttn} width={W - 60} height={attnH} rx={10} fill={`${accent}12`} stroke={accent} strokeWidth={2.4} />
        <text x={cx} y={yAttn + 22} textAnchor="middle" fontSize={15} fontWeight={700} fill={accent}>Masked self-attention</text>
        <text x={cx} y={yAttn + 40} textAnchor="middle" fontSize={13} fill={t.textSecondary}>this playground ↓</text>
        {INNER.map((s, i) => {
          const y = yAttn + 172 - i * 44;
          const on = i === stage;
          return (
            <g key={s.label}>
              <rect x={52} y={y} width={W - 104} height={38} rx={6} fill={on ? accent : t.surface} stroke={on ? accent : t.border} strokeWidth={on ? 2.2 : 1.2} />
              <text x={64} y={y + 24} fontSize={15} fontWeight={700} fill={on ? t.surface : t.textPrimary}>{i + 1}. {s.label}</text>
              <text x={W - 64} y={y + 24} textAnchor="end" fontSize={13} fill={on ? t.surface : t.textSecondary}>{s.note}</text>
              {i < INNER.length - 1 && <line x1={cx} y1={y} x2={cx} y2={y - 12} stroke={t.textMuted} strokeWidth={1.4} />}
            </g>
          );
        })}
        <text x={cx} y={yAttn + attnH - 30} textAnchor="middle" fontSize={13} fill={t.textSecondary}>Q, K, V: three learned</text>
        <text x={cx} y={yAttn + attnH - 13} textAnchor="middle" fontSize={13} fill={t.textSecondary}>projections of each word</text>

        {arrow(yEmb, blockBottom, 'a5')}
        {box(yEmb, 46, 'Word embeddings', '+ positions', t.surfaceAlt, t.border, 'emb')}
      </svg>
    </figure>
  );
}
