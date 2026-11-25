import { useEffect, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';

/** Fired by AttentionStepThrough whenever its step (0..3) or causal mask changes. */
export const ATTENTION_STAGE_EVENT = 'nm-attention-stage';
export type AttentionStageDetail = { stage: number; masked: boolean };

// Colour convention of the original Transformer paper (Vaswani et al., 2017, Fig. 1),
// as translucent fills so they work on light and dark paper.
const C = {
  embed: 'rgba(244, 114, 182, 0.28)',
  attn: 'rgba(251, 146, 60, 0.32)',
  norm: 'rgba(234, 225, 90, 0.42)',
  ffn: 'rgba(56, 189, 248, 0.30)',
  linear: 'rgba(129, 140, 248, 0.30)',
  soft: 'rgba(74, 222, 128, 0.32)',
};

/**
 * The full Transformer (encoder left, decoder right) drawn with the paper's
 * conventions, plus the paper's "scaled dot-product attention" zoom-in. The
 * attention block the playground is computing is outlined, and the step it is
 * on is lit in the zoom-in.
 */
export default function TransformerBlockMap() {
  const t = useVizTokens();
  const [{ stage, masked }, setDetail] = useState<AttentionStageDetail>({ stage: 0, masked: false });
  useEffect(() => {
    const on = (e: Event) => setDetail((e as CustomEvent<AttentionStageDetail>).detail);
    window.addEventListener(ATTENTION_STAGE_EVENT, on);
    return () => window.removeEventListener(ATTENTION_STAGE_EVENT, on);
  }, []);

  const ink = t.textPrimary;
  const accent = t.accentDanger;
  const BW = 150;
  const encX = 110;
  const decX = 300;

  const block = (cx: number, y: number, h: number, fill: string, lines: string[], key: string, hot = false) => (
    <g key={key}>
      <rect x={cx - BW / 2} y={y} width={BW} height={h} rx={6} fill={fill} stroke={hot ? accent : ink} strokeWidth={hot ? 3.2 : 1.6} />
      {lines.map((l, i) => (
        <text key={l} x={cx} y={y + h / 2 + 5 + (i - (lines.length - 1) / 2) * 16} textAnchor="middle" fontSize={14} fill={ink}>{l}</text>
      ))}
    </g>
  );
  const up = (x: number, y1: number, y2: number, key: string) => (
    <g key={key} stroke={ink} strokeWidth={1.6} fill="none">
      <line x1={x} y1={y1} x2={x} y2={y2 + 5} />
      <path d={`M${x - 4} ${y2 + 9} L${x} ${y2 + 1} L${x + 4} ${y2 + 9}`} />
    </g>
  );
  // Residual: from below a sub-layer, around its side, into its Add & Norm.
  const residual = (cx: number, side: 1 | -1, yFrom: number, yTo: number, key: string) => {
    const x = cx + side * (BW / 2 + 12);
    const xe = cx + side * (BW / 2);
    return (
      <g key={key} stroke={ink} strokeWidth={1.3} fill="none">
        <path d={`M${cx} ${yFrom} H${x} V${yTo} H${xe + side * 4}`} />
        <path d={`M${xe + side * 9} ${yTo - 4} L${xe + side * 1} ${yTo} L${xe + side * 9} ${yTo + 4}`} />
      </g>
    );
  };
  const posEnc = (cx: number, y: number, side: 1 | -1, key: string) => (
    <g key={key} stroke={ink} strokeWidth={1.5} fill="none">
      <circle cx={cx} cy={y} r={9} fill={t.surface} />
      <line x1={cx - 5} y1={y} x2={cx + 5} y2={y} />
      <line x1={cx} y1={y - 5} x2={cx} y2={y + 5} />
      <line x1={cx + side * 9} y1={y} x2={cx + side * 22} y2={y} />
      <circle cx={cx + side * 36} cy={y} r={14} fill={t.surface} />
      <path d={`M${cx + side * 36 - 9} ${y + 2} q 4.5 -10 9 0 q 4.5 10 9 0`} />
      <text x={cx + side * 56} y={y - 3} textAnchor={side > 0 ? 'start' : 'end'} fontSize={12.5} fill={t.textSecondary} stroke="none">positional</text>
      <text x={cx + side * 56} y={y + 12} textAnchor={side > 0 ? 'start' : 'end'} fontSize={12.5} fill={t.textSecondary} stroke="none">encoding</text>
    </g>
  );

  // Zoom-in: scaled dot-product attention (paper Fig. 2), bottom to top.
  const zoom = [
    { label: 'MatMul  Q·Kᵀ', note: 'match scores', s: 0 },
    { label: 'Scale  ÷ √dₖ', note: 'keep them small', s: 1 },
    { label: 'Mask (decoder only)', note: 'hide future words', s: masked ? 1.5 : -1 },
    { label: 'SoftMax', note: 'scores → weights', s: 2 },
    { label: 'MatMul  × V', note: 'weighted sum of V', s: 3 },
  ];

  return (
    <figure className="nm-tblock" aria-label="Where attention sits inside the Transformer">
      <figcaption>Where this happens in the Transformer</figcaption>
      <svg viewBox="-40 0 500 700" width="100%" role="img" aria-label={`Transformer architecture; the ${masked ? 'decoder masked' : 'encoder'} multi-head attention block is highlighted`}>
        {/* output head */}
        <text x={decX} y={18} textAnchor="middle" fontSize={14} fill={ink}>Output probabilities</text>
        {up(decX, 46, 24, 'o1')}
        {block(decX, 46, 26, C.soft, ['Softmax'], 'soft')}
        {up(decX, 92, 72, 'o2')}
        {block(decX, 92, 26, C.linear, ['Linear'], 'lin')}
        {up(decX, 134, 118, 'o3')}

        {/* decoder stack */}
        <rect x={decX - BW / 2 - 24} y={134} width={BW + 48} height={436} rx={14} fill={t.surfaceAlt} fillOpacity={0.5} stroke={ink} strokeWidth={1.6} />
        <text x={decX + BW / 2 + 32} y={350} fontSize={15} fill={ink}>N×</text>
        {block(decX, 146, 24, C.norm, ['Add & Norm'], 'dn3')}
        {up(decX, 182, 170, 'd1')}
        {block(decX, 182, 40, C.ffn, ['Feed', 'Forward'], 'dffn')}
        {residual(decX, 1, 236, 158, 'dr3')}
        {up(decX, 236, 222, 'd2')}
        {block(decX, 250, 24, C.norm, ['Add & Norm'], 'dn2')}
        {up(decX, 286, 274, 'd3')}
        {block(decX, 286, 40, C.attn, ['Multi-Head', 'Attention'], 'dcross')}
        {residual(decX, 1, 344, 262, 'dr2')}
        {up(decX, 360, 326, 'd4')}
        {block(decX, 372, 24, C.norm, ['Add & Norm'], 'dn1')}
        {up(decX, 408, 396, 'd5')}
        {block(decX, 408, 56, C.attn, ['Masked', 'Multi-Head', 'Attention'], 'dmask', masked)}
        {residual(decX, 1, 486, 384, 'dr1')}
        {up(decX, 556, 464, 'd6')}

        {/* encoder stack */}
        <rect x={encX - BW / 2 - 24} y={330} width={BW + 48} height={240} rx={14} fill={t.surfaceAlt} fillOpacity={0.5} stroke={ink} strokeWidth={1.6} />
        <text x={encX - BW / 2 - 50} y={455} fontSize={15} fill={ink}>N×</text>
        {block(encX, 342, 24, C.norm, ['Add & Norm'], 'en2')}
        {up(encX, 378, 366, 'e1')}
        {block(encX, 378, 40, C.ffn, ['Feed', 'Forward'], 'effn')}
        {residual(encX, -1, 430, 354, 'er2')}
        {up(encX, 430, 418, 'e2')}
        {block(encX, 444, 24, C.norm, ['Add & Norm'], 'en1')}
        {up(encX, 480, 468, 'e3')}
        {block(encX, 480, 40, C.attn, ['Multi-Head', 'Attention'], 'eattn', !masked)}
        {residual(encX, -1, 546, 456, 'er1')}
        {up(encX, 556, 520, 'e4')}
        {/* encoder output -> decoder cross-attention (K and V) */}
        <path d={`M${encX} 342 V318 H${decX - 40} V340`} fill="none" stroke={ink} strokeWidth={1.6} />
        <path d={`M${decX - 44} 334 L${decX - 40} 342 L${decX - 36} 334`} fill="none" stroke={ink} strokeWidth={1.6} />
        <text x={(encX + decX) / 2 - 10} y={312} textAnchor="middle" fontSize={12.5} fill={t.textSecondary}>K, V from encoder</text>

        {/* inputs */}
        {posEnc(encX, 590, -1, 'pe1')}
        {posEnc(decX, 590, 1, 'pe2')}
        {up(encX, 618, 599, 'i1')}
        {up(decX, 618, 599, 'i2')}
        {block(encX, 618, 36, C.embed, ['Input', 'Embedding'], 'iemb')}
        {block(decX, 618, 36, C.embed, ['Output', 'Embedding'], 'oemb')}
        <text x={encX} y={676} textAnchor="middle" fontSize={14} fill={ink}>Inputs</text>
        <text x={decX} y={676} textAnchor="middle" fontSize={14} fill={ink}>Outputs</text>
        <text x={decX} y={693} textAnchor="middle" fontSize={12.5} fill={t.textSecondary}>(shifted right)</text>
      </svg>

      <figcaption className="nm-tblock__zoom-title">
        Inside the <span style={{ color: accent }}>outlined</span> block: scaled dot-product attention
      </figcaption>
      <svg viewBox="0 0 420 300" width="100%" role="img" aria-label="Scaled dot-product attention steps, current step highlighted">
        {zoom.map((z, i) => {
          const y = 236 - i * 52;
          const on = z.s === stage || (z.s === 1.5 && stage === 1 && masked);
          const off = z.s === -1;
          return (
            <g key={z.label} opacity={off ? 0.45 : 1}>
              <rect x={60} y={y} width={300} height={38} rx={6} fill={i === 3 ? C.soft : i === 2 ? C.embed : C.linear} stroke={on ? accent : ink} strokeWidth={on ? 3.2 : 1.4} strokeDasharray={off ? '5 4' : undefined} />
              <text x={74} y={y + 24} fontSize={14.5} fontWeight={700} fill={ink}>{z.label}</text>
              <text x={346} y={y + 24} textAnchor="end" fontSize={13} fill={t.textSecondary}>{z.note}</text>
              {i < zoom.length - 1 && up(210, y, y - 14, `z${i}`)}
            </g>
          );
        })}
        <text x={210} y={294} textAnchor="middle" fontSize={14} fill={ink}>Q        K                         V ↗</text>
        <text x={210} y={18} textAnchor="middle" fontSize={13} fill={t.textSecondary}>output for each word ↑</text>
      </svg>
    </figure>
  );
}
