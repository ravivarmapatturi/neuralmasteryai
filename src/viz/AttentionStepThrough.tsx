import { useMemo, useState } from 'react';
import { useVizTokens, SPACING, RADIUS, FONT_FAMILY } from '../theme/vizTokens';
import VisualizationContainer from './primitives/VisualizationContainer';
import VisualizationHeader from './primitives/VisualizationHeader';
import { PillSelect } from './primitives/VisualizationControls';
import { hexToRgb } from './lib/colorBlend';
import { tokenize, makeHead, runAttention, type AttentionResult } from './lib/attention';

const HEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Head 1' },
  { value: 1, label: 'Head 2' },
  { value: 2, label: 'Head 3' },
];
const HEADS = [makeHead(1), makeHead(2), makeHead(3)];
const DEFAULT_TEXT = 'the cat sat on the mat';

/** Diverging gradient cell: positive -> accent green, negative -> accent red,
 * opacity scaled by magnitude relative to the vector's own max -- the same
 * value-as-color convention transformer-explainer uses for every tensor,
 * applied here to the actual embedding/Q/K/V vectors this component
 * computes but wasn't otherwise showing. */
function TensorRow({
  label,
  vec,
  posRgb,
  negRgb,
  maxAbs,
  textColor,
  labelColor,
  cellSize = 40,
}: {
  label: string;
  vec: number[];
  posRgb: [number, number, number];
  negRgb: [number, number, number];
  maxAbs: number;
  textColor: string;
  labelColor: string;
  cellSize?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ width: 78, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0, color: labelColor }}>{label}</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {vec.map((v, i) => {
          const [r, g, b] = v >= 0 ? posRgb : negRgb;
          const op = 0.12 + Math.min(1, Math.abs(v) / maxAbs) * 0.82;
          return (
            <div
              key={i}
              title={v.toFixed(3)}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 4,
                background: `rgba(${r}, ${g}, ${b}, ${op})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
                color: textColor,
              }}
            >
              {v.toFixed(2)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AttentionStepThrough() {
  const t = useVizTokens();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [headIdx, setHeadIdx] = useState(0);
  const [focusRow, setFocusRow] = useState(0);

  const tokens = useMemo(() => tokenize(text), [text]);
  const result: AttentionResult | null = useMemo(() => {
    if (tokens.length === 0) return null;
    return runAttention(tokens, HEADS[headIdx]);
  }, [tokens, headIdx]);

  const n = tokens.length;
  const cell = n > 0 ? Math.min(56, Math.max(28, 320 / n)) : 40;
  const labelW = 90;
  const gridW = cell * n;
  const height = labelW + cell * n + 10;
  const width = labelW + gridW + 10;

  const [ar, ag, ab] = hexToRgb(t.accentPrimary);
  const posRgb = hexToRgb(t.accentPrimary);
  const negRgb = hexToRgb(t.accentDanger);
  const tensorMaxAbs = useMemo(() => {
    if (!result) return 1;
    const all = [...result.embeddings[focusRow], ...result.Q[focusRow], ...result.K[focusRow], ...result.V[focusRow]];
    return Math.max(0.05, ...all.map(Math.abs));
  }, [result, focusRow]);

  return (
    <VisualizationContainer footer="Real Q·Kᵀ/√d_k → softmax → weighted-sum-of-V math, computed on deterministic demo embeddings (see the component note for exactly what's simplified and why).">
      <VisualizationHeader eyebrow="Interactive" title="Attention Step-Through" />
      <div style={{ marginBottom: SPACING.sm }}>
        <label htmlFor="attention-step-sentence" style={{ display: 'block', fontSize: 14, color: t.textSecondary, marginBottom: 6 }}>Sentence (up to 12 tokens)</label>
        <input
          id="attention-step-sentence"
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFocusRow(0);
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: RADIUS.sm,
            border: `1px solid ${t.border}`,
            background: t.background,
            color: t.textPrimary,
            fontFamily: FONT_FAMILY,
            fontSize: 15,
          }}
        />
      </div>

      <PillSelect<number> label="Attention head" value={headIdx} onChange={setHeadIdx} options={HEAD_OPTIONS} />

      {result && (
        <div style={{ marginTop: SPACING.sm }}>
          <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 8 }}>
            Every value below is real, computed live from <strong style={{ color: t.textPrimary }}>&ldquo;{tokens[focusRow]}&rdquo;</strong> — color
            encodes sign and magnitude (green = positive, red = negative, opacity = size), the same value-as-color convention used throughout this
            walkthrough, now live instead of a fixed worked example:
          </div>
          <TensorRow label="Embedding" vec={result.embeddings[focusRow]} posRgb={posRgb} negRgb={negRgb} maxAbs={tensorMaxAbs} textColor={t.textPrimary} labelColor={t.textSecondary} />
          <TensorRow label="Query" vec={result.Q[focusRow]} posRgb={posRgb} negRgb={negRgb} maxAbs={tensorMaxAbs} textColor={t.textPrimary} labelColor={t.textSecondary} />
          <TensorRow label="Key" vec={result.K[focusRow]} posRgb={posRgb} negRgb={negRgb} maxAbs={tensorMaxAbs} textColor={t.textPrimary} labelColor={t.textSecondary} />
          <TensorRow label="Value" vec={result.V[focusRow]} posRgb={posRgb} negRgb={negRgb} maxAbs={tensorMaxAbs} textColor={t.textPrimary} labelColor={t.textSecondary} />
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', gap: SPACING.lg, flexWrap: 'wrap', marginTop: SPACING.md }}>
          <div style={{ overflowX: 'auto' }}>
            <svg width={width} height={height} style={{ display: 'block' }}>
              {tokens.map((tok, j) => (
                <text
                  key={`col-${j}`}
                  x={labelW + j * cell + cell / 2}
                  y={labelW - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={t.textSecondary}
                  transform={`rotate(-40 ${labelW + j * cell + cell / 2} ${labelW - 8})`}
                >
                  {tok}
                </text>
              ))}
              {tokens.map((rowTok, i) => (
                <g key={`row-${i}`}>
                  <text
                    x={labelW - 8}
                    y={labelW + i * cell + cell / 2 + 4}
                    textAnchor="end"
                    fontSize={12}
                    fill={i === focusRow ? t.accentPrimary : t.textSecondary}
                    fontWeight={i === focusRow ? 700 : 400}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setFocusRow(i)}
                  >
                    {rowTok}
                  </text>
                  {tokens.map((_, j) => {
                    const w = result.weights[i][j];
                    return (
                      <rect
                        key={`cell-${i}-${j}`}
                        x={labelW + j * cell}
                        y={labelW + i * cell}
                        width={cell - 2}
                        height={cell - 2}
                        rx={3}
                        fill={`rgba(${ar}, ${ag}, ${ab}, ${0.08 + w * 0.85})`}
                        stroke={i === focusRow ? t.accentPrimary : 'transparent'}
                        strokeWidth={i === focusRow ? 1.5 : 0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFocusRow(i)}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 8 }}>
              Attention from <strong style={{ color: t.textPrimary }}>&ldquo;{tokens[focusRow]}&rdquo;</strong> to every token:
            </div>
            {tokens.map((tok, j) => {
              const w = result.weights[focusRow][j];
              return (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 56, fontSize: 12, color: t.textSecondary, textAlign: 'right' }}>{tok}</div>
                  <div style={{ flex: 1, background: t.surfaceAlt, borderRadius: 4, height: 14, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${w * 100}%`,
                        height: '100%',
                        background: t.accentPrimary,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ width: 42, fontSize: 12, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{(w * 100).toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
