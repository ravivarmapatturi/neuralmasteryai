import { useEffect, useMemo, useRef, useState } from 'react';
import { ATTENTION_STAGE_EVENT } from './diagrams/TransformerBlockMap';
import { FONT_FAMILY, RADIUS, SPACING, useVizTokens } from '../theme/vizTokens';
import { SketchArrow, SketchRect } from '../components/notebook/RoughShape';
import {
  PillSelect,
  Slider,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from './primitives';
import { getConceptColor, valueColor } from './diagrams/diagramSystem';
import { hexToRgb } from './lib/colorBlend';
import {
  ATTENTION_STAGES,
  EMBED_DIMS,
  explainAttentionStep,
  makeHead,
  runAttention,
  tokenize,
  type AttentionStage,
} from './lib/attention';

const HEADS = [makeHead(1), makeHead(2), makeHead(3)];
const HEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Similar words' },
  { value: 1, label: 'Who did what' },
  { value: 2, label: 'Where it happened' },
];
/** What each example head looks for, in plain words, with an example from the preset sentences. */
const HEAD_EXPLAIN = [
  'This head links words with similar meaning, e.g. “cat” looks at “kitten”.',
  'This head links a doer to its action, e.g. “cat” looks at “sat”.',
  'This head links an action to its place, e.g. “sat” looks at “mat”.',
];

const SENTENCE_PRESETS: { label: string; text: string; focus: number }[] = [
  { label: 'cat & kitten', text: 'the cat sat by the kitten', focus: 1 },
  { label: 'cat on mat', text: 'the cat sat on the mat', focus: 1 },
  { label: 'pronoun "it"', text: 'the cat saw the mat and sat on it', focus: 8 },
];

const DEFAULT_TEXT = SENTENCE_PRESETS[0].text;
const PREDICT_OPTIONS = [
  'Gets sharper (closer to 100%)',
  'Gets flatter (more even)',
  'Stays identical',
];

function shortTok(tok: string, maxLen = 7): string {
  return tok.length > maxLen ? `${tok.slice(0, maxLen - 1)}…` : tok;
}

export default function AttentionStepThrough() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const visible = useVizVisible();

  const [text, setText] = useState(DEFAULT_TEXT);
  const [headIdx, setHeadIdx] = useState(0);
  const [focusRowManual, setFocusRowManual] = useState(1);
  const [stage, setStage] = useState<AttentionStage>(reducedMotion ? 2 : 0);
  // Let the architecture map beside the tool follow the current step.

  const [useScale, setUseScale] = useState(true);
  const [causalMask, setCausalMask] = useState(false);
  // Let the architecture map beside the tool follow the current step and mask.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(ATTENTION_STAGE_EVENT, { detail: { stage, masked: causalMask } }));
  }, [stage, causalMask]);
  const [temperature, setTemperature] = useState(1.0);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [autoAdvanceTokens, setAutoAdvanceTokens] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const svgHostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(700);

  useEffect(() => {
    const el = svgHostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 700;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tokens = useMemo(() => tokenize(text), [text]);
  const n = tokens.length;
  const focusRow = n > 0 ? Math.min(focusRowManual, n - 1) : 0;

  const result = useMemo(() => {
    if (n === 0) return null;
    return runAttention(tokens, HEADS[headIdx], { useScale, causalMask, temperature });
  }, [tokens, n, headIdx, useScale, causalMask, temperature]);

  // Autoplay loop: walks stages 0 -> 3, then advances query token when autoAdvanceTokens is active.
  // Automatically pauses whenever off-screen (visible === false) or prefers-reduced-motion is set.
  useEffect(() => {
    if (!reducedMotion) return;
    setPlaying(false);
    setAutoAdvanceTokens(false);
    setStage(2);
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion || n === 0) return undefined;
    const id = window.setInterval(() => {
      setStage((prev) => {
        if (prev < 3) return (prev + 1) as AttentionStage;
        if (autoAdvanceTokens && n > 1) {
          setFocusRowManual((r) => (r + 1) % n);
        }
        return 0;
      });
    }, 1900);
    return () => window.clearInterval(id);
  }, [playing, visible, reducedMotion, n, autoAdvanceTokens]);

  const stopAuto = () => {
    setPlaying(false);
    setAutoAdvanceTokens(false);
  };

  const handleStepForward = () => {
    stopAuto();
    setStage((prev) => {
      if (prev < 3) return (prev + 1) as AttentionStage;
      if (n > 1) setFocusRowManual((r) => (r + 1) % n);
      return 0;
    });
  };

  const handleReset = () => {
    setPlaying(false);
    setAutoAdvanceTokens(false);
    setStage(0);
    setFocusRowManual(tokens.length > 1 ? 1 : 0);
  };

  const queryColor = getConceptColor(t, 'query');
  const keyColor = getConceptColor(t, 'key');
  const valueColorInk = getConceptColor(t, 'value');
  const attnColor = getConceptColor(t, 'attention');
  const [ar, ag, ab] = hexToRgb(attnColor);

  const caption = useMemo(
    () => (result ? explainAttentionStep(tokens, result, focusRow, stage) : 'Type words above to compute attention live.'),
    [tokens, result, focusRow, stage],
  );

  // Live quantitative readout for active query token
  const summaryStats = useMemo(() => {
    if (!result || n === 0) return null;
    const rowWeights = result.weights[focusRow];
    let topJ = 0;
    for (let j = 1; j < n; j++) {
      if (rowWeights[j] > rowWeights[topJ]) topJ = j;
    }
    const others = tokens.map((_, j) => j).filter((j) => j !== focusRow && !(causalMask && j > focusRow));
    let bestOtherJ = others[0] ?? focusRow;
    for (const j of others) {
      if (result.rawScores[focusRow][j] > result.rawScores[focusRow][bestOtherJ]) bestOtherJ = j;
    }
    return {
      topToken: tokens[topJ],
      topPct: Math.round(rowWeights[topJ] * 100),
      bestOtherToken: tokens[bestOtherJ],
      bestCosine: result.rawScores[focusRow][bestOtherJ] / Math.max(1e-9, ...result.rawScores[focusRow].map(Math.abs)),
      bestRaw: result.rawScores[focusRow][bestOtherJ],
      entropy: result.entropy[focusRow],
    };
  }, [result, n, focusRow, tokens, causalMask]);

  const isCompactPhone = hostWidth < 540;

  // Render matrix cell string for the current pipeline stage
  const cellText = (i: number, j: number): string => {
    if (!result) return '';
    if (causalMask && j > i) return stage >= 2 ? '0%' : '−∞';
    if (stage === 0) return result.rawScores[i][j].toFixed(1);
    if (stage === 1) return result.scores[i][j].toFixed(1);
    return `${Math.round(result.weights[i][j] * 100)}%`;
  };

  const cellIntensity = (i: number, j: number): number => {
    if (!result) return 0;
    if (causalMask && j > i) return 0;
    if (stage === 0) {
      const maxR = Math.max(0.5, ...result.rawScores.flat().map(Math.abs));
      return Math.max(0, result.rawScores[i][j] / maxR);
    }
    if (stage === 1) {
      const finite = result.scores.flat().filter(Number.isFinite);
      const maxS = Math.max(0.5, ...finite.map(Math.abs));
      return Math.max(0, result.scores[i][j] / maxS);
    }
    return result.weights[i][j];
  };

  // Matrix geometry inside 700x232 desktop viewBox (or 340x232 phone viewBox)
  const renderMatrixSvgContent = (offsetX: number, panelW: number, panelH: number) => {
    if (!result || n === 0) return null;
    const labelColW = 72;
    const topH = 54;
    const availW = panelW - labelColW - 8;
    const availH = panelH - topH - 12;
    const cellW = Math.min(40, Math.floor(availW / n));
    const cellH = Math.min(28, Math.floor(availH / n));
    const gridW = cellW * n;
    const showCellNums = cellW >= 26 && cellH >= 20;

    return (
      <g transform={`translate(${offsetX}, 0)`}>
        <text x={labelColW + gridW / 2} y={14} textAnchor="middle" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={keyColor}>
          Key words (what each offers →)
        </text>
        <text x={6} y={topH - 10} textAnchor="start" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={queryColor}>
          Query ↓
        </text>

        {tokens.map((tok, j) => {
          const cx = labelColW + j * cellW + cellW / 2;
          const rotate = n > 6;
          return (
            <text
              key={`col-${j}`}
              x={cx}
              y={rotate ? topH - 10 : topH - 8}
              textAnchor={rotate ? 'start' : 'middle'}
              fontSize={13}
              fontWeight={j === focusRow ? 700 : 500}
              fontFamily={FONT_FAMILY}
              fill={t.textSecondary}
              transform={rotate ? `rotate(-25 ${cx} ${topH - 10})` : undefined}
            >
              {shortTok(tok, n > 7 ? 4 : 6)}
            </text>
          );
        })}

        {tokens.map((rowTok, i) => {
          const isFocus = i === focusRow;
          const ry = topH + i * cellH;
          const showRowLabel = n <= 8 || isFocus || i % 2 === 0;
          return (
            <g key={`row-${i}`}>
              {showRowLabel && (
                <text
                  x={labelColW - 8}
                  y={ry + cellH / 2 + 4}
                  textAnchor="end"
                  fontSize={13.5}
                  fontWeight={isFocus ? 700 : 500}
                  fontFamily={FONT_FAMILY}
                  fill={isFocus ? queryColor : t.textPrimary}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    stopAuto();
                    setFocusRowManual(i);
                  }}
                >
                  {shortTok(rowTok, 7)}
                </text>
              )}

              {tokens.map((colTok, j) => {
                const cx = labelColW + j * cellW;
                const intensity = cellIntensity(i, j);
                const masked = causalMask && j > i;
                const isHigh = !masked && intensity > 0.55;
                const fillColor = masked
                  ? t.surfaceAlt
                  : `rgba(${ar}, ${ag}, ${ab}, ${0.08 + intensity * 0.84})`;

                return (
                  <g
                    key={`cell-${i}-${j}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      stopAuto();
                      setFocusRowManual(i);
                    }}
                  >
                    <title>{`Query "${rowTok}" → Key "${colTok}": ${cellText(i, j)}`}</title>
                    <rect
                      x={cx}
                      y={ry}
                      width={cellW - 2}
                      height={cellH - 2}
                      rx={3}
                      fill={fillColor}
                    />
                    {showCellNums && (
                      <text
                        x={cx + (cellW - 2) / 2}
                        y={ry + (cellH - 2) / 2 + 4}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={isFocus ? 700 : 500}
                       
                        fill={masked ? t.textMuted : isHigh ? t.background : t.textPrimary}
                      >
                        {cellText(i, j)}
                      </text>
                    )}
                  </g>
                );
              })}

              {isFocus && (
                <SketchRect
                  x={labelColW - 1}
                  y={ry - 1}
                  width={gridW}
                  height={cellH}
                  color={queryColor}
                  strokeWidth={2}
                  roughness={1.1}
                  id={`attn-focus-row-${i}`}
                />
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // Detail panel inside SVG (shows real vector numbers, cosine/score/weight bars, and colour legend)
  const renderDetailSvgContent = (offsetX: number, panelW: number) => {
    if (!result || n === 0) return null;
    const qTok = tokens[focusRow];
    const barTokens = tokens.slice(0, 6);
    const maxScore = Math.max(0.5, ...result.rawScores[focusRow].map(Math.abs));
    const qVec = result.Q[focusRow];
    const outVec = result.output[focusRow];
    const bestOtherJ = summaryStats
      ? tokens.indexOf(summaryStats.bestOtherToken)
      : focusRow;
    const kVec = result.K[Math.max(0, bestOtherJ)];

    return (
      <g transform={`translate(${offsetX}, 0)`}>
        <text x={0} y={14} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          {stage === 0 && `How "${shortTok(qTok, 9)}" matches "${shortTok(tokens[Math.max(0, bestOtherJ)], 9)}"`}
          {stage === 1 && `Scores for "${shortTok(qTok, 9)}" ${useScale ? 'divided by √dₖ = 2' : '(not divided)'}`}
          {stage === 2 && `Softmax attention weights for "${shortTok(qTok, 9)}"`}
          {stage === 3 && `Output for "${shortTok(qTok, 9)}" = Σ weight × V`}
        </text>

        {/* Colour legend */}
        <g transform="translate(0, 25)">
          <circle cx={6} cy={6} r={5} fill={queryColor} />
          <text x={15} y={10} fontSize={13} fontFamily={FONT_FAMILY} fill={t.textSecondary}>Query</text>
          <circle cx={72} cy={6} r={5} fill={keyColor} />
          <text x={81} y={10} fontSize={13} fontFamily={FONT_FAMILY} fill={t.textSecondary}>Key</text>
          <circle cx={124} cy={6} r={5} fill={valueColorInk} />
          <text x={133} y={10} fontSize={13} fontFamily={FONT_FAMILY} fill={t.textSecondary}>Value</text>
          <circle cx={190} cy={6} r={5} fill={attnColor} />
          <text x={199} y={10} fontSize={13} fontFamily={FONT_FAMILY} fill={t.textSecondary}>Weight / Output</text>
        </g>

        {stage === 0 && (
          <g transform="translate(0, 56)">
            {EMBED_DIMS.map((dim, d) => (
              <text key={dim} x={88 + d * 60 + 26} y={12} textAnchor="middle" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textMuted}>
                {dim}
              </text>
            ))}

            {/* Q vector row */}
            <text x={80} y={42} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={queryColor}>
              Q({shortTok(qTok, 5)})
            </text>
            {qVec.map((v, d) => {
              const bx = 88 + d * 60;
              return (
                <g key={`q-${d}`}>
                  <rect x={bx} y={22} width={54} height={28} rx={4} fill={valueColor(t, 'query', Math.min(1, Math.abs(v) / 2))} />
                  <SketchRect x={bx} y={22} width={54} height={28} color={queryColor} strokeWidth={1.3} roughness={1} id={`qv-${d}`} />
                  <text x={bx + 27} y={41} textAnchor="middle" fontSize={13} fontWeight={700} fill={Math.abs(v) > 1.1 ? t.background : t.textPrimary}>
                    {v.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* K vector row */}
            <text x={80} y={84} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={keyColor}>
              K({shortTok(tokens[Math.max(0, bestOtherJ)], 5)})
            </text>
            {kVec.map((v, d) => {
              const bx = 88 + d * 60;
              return (
                <g key={`k-${d}`}>
                  <rect x={bx} y={64} width={54} height={28} rx={4} fill={valueColor(t, 'key', Math.min(1, Math.abs(v) / 2))} />
                  <SketchRect x={bx} y={64} width={54} height={28} color={keyColor} strokeWidth={1.3} roughness={1} id={`kv-${d}`} />
                  <text x={bx + 27} y={83} textAnchor="middle" fontSize={13} fontWeight={700} fill={Math.abs(v) > 1.1 ? t.background : t.textPrimary}>
                    {v.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Cosine match gauge */}
            <text x={0} y={124} fontSize={13.5} fontFamily={FONT_FAMILY} fontWeight={700} fill={t.textPrimary}>
              Match score Q·Kᵀ (dot product):
            </text>
            <rect x={0} y={134} width={panelW - 88} height={18} rx={5} fill={t.surfaceAlt} />
            <rect
              x={0}
              y={134}
              width={Math.max(4, Math.max(0, summaryStats?.bestCosine ?? 0) * (panelW - 88))}
              height={18}
              rx={5}
              fill={attnColor}
            />
            <text x={panelW - 80} y={148} fontSize={14} fontWeight={700} fill={attnColor}>
              {(summaryStats?.bestRaw ?? 0).toFixed(2)}
            </text>
          </g>
        )}

        {(stage === 1 || stage === 2) && (
          <g transform="translate(0, 52)">
            {barTokens.map((tok, j) => {
              const y = j * 29;
              const masked = causalMask && j > focusRow;
              const w = result.weights[focusRow][j];
              const raw = result.rawScores[focusRow][j];
              const scaled = result.scores[focusRow][j];
              const frac = stage === 1
                ? (masked ? 0 : Math.max(0, Math.abs(scaled) / maxScore))
                : w;
              const barMax = Math.max(82, panelW - 196);
              const labelStr = stage === 1
                ? (masked ? 'masked −∞' : `${raw.toFixed(1)} → ${scaled.toFixed(2)}`)
                : `${Math.round(w * 100)}%`;

              return (
                <g key={`bar-${j}`} transform={`translate(0, ${y})`}>
                  <text x={68} y={17} textAnchor="end" fontSize={13.5} fontFamily={FONT_FAMILY} fontWeight={j === focusRow ? 700 : 500} fill={j === focusRow ? queryColor : t.textPrimary}>
                    {shortTok(tok, 7)}
                  </text>
                  <rect x={76} y={4} width={barMax} height={18} rx={4} fill={t.surfaceAlt} />
                  {!masked && (
                    <rect
                      x={76}
                      y={4}
                      width={Math.max(4, frac * barMax)}
                      height={18}
                      rx={4}
                      fill={stage === 1 ? keyColor : attnColor}
                    />
                  )}
                  <text x={76 + barMax + 8} y={18} fontSize={13} fontWeight={700} fill={masked ? t.textMuted : t.textPrimary}>
                    {labelStr}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {stage === 3 && (
          <g transform="translate(0, 56)">
            <text x={0} y={12} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
              Weighted blend of Value vectors (top weights first):
            </text>
            {tokens
              .map((tok, j) => ({ tok, j, w: result.weights[focusRow][j] }))
              .sort((a, b) => b.w - a.w)
              .slice(0, 2)
              .map((item, idx) => (
                <g key={item.j} transform={`translate(0, ${22 + idx * 34})`}>
                  <text x={82} y={20} textAnchor="end" fontSize={13} fontWeight={700} fill={valueColorInk}>
                    {Math.round(item.w * 100)}%·V({shortTok(item.tok, 4)})
                  </text>
                  {result.V[item.j].map((v, d) => {
                    const bx = 90 + d * 60;
                    return (
                      <g key={d}>
                        <rect x={bx} y={2} width={54} height={26} rx={4} fill={valueColor(t, 'value', Math.min(1, Math.abs(v) / 1.5))} />
                        <text x={bx + 27} y={20} textAnchor="middle" fontSize={13} fontWeight={600} fill={t.textPrimary}>
                          {v.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ))}

            <g transform="translate(0, 102)">
              {EMBED_DIMS.map((dim, d) => (
                <text key={dim} x={90 + d * 60 + 27} y={10} textAnchor="middle" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textMuted}>
                  {dim}
                </text>
              ))}
              <text x={82} y={36} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={attnColor}>
                Out({shortTok(qTok, 4)})
              </text>
              {outVec.map((v, d) => {
                const bx = 90 + d * 60;
                return (
                  <g key={`out-${d}`}>
                    <rect x={bx} y={16} width={54} height={28} rx={4} fill={valueColor(t, 'output', Math.min(1, Math.abs(v) / 1.5))} />
                    <SketchRect x={bx} y={16} width={54} height={28} color={attnColor} strokeWidth={1.6} roughness={1} id={`ov-${d}`} />
                    <text x={bx + 27} y={35} textAnchor="middle" fontSize={13} fontWeight={700} fill={Math.abs(v) > 0.8 ? t.background : t.textPrimary}>
                      {v.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        )}
      </g>
    );
  };

  return (
    <VisualizationContainer
      title="Attention Step-Through Explorer"
      footer="Real Q·Kᵀ / √dₖ → softmax → weighted-sum-of-V computation on 4D concept vectors (whitespace tokenization; demo weights illustrate each head's role)."
    >
      {/* Header + inline transport so total height stays compact for the home showcase */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <div style={{ marginBottom: -14 }}>
          <VisualizationHeader title="Attention Step-Through" />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <VizButton
            onClick={() => {
              if (!playing) setAutoAdvanceTokens(true);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </VizButton>
          <VizButton variant="secondary" onClick={handleStepForward}>
            Step
          </VizButton>
          <VizButton variant="secondary" onClick={handleReset}>
            Reset
          </VizButton>
        </div>
      </div>

      {/* Control Row 1: Free text input + quick presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <label htmlFor="attention-step-sentence" style={{ fontSize: 14, color: t.textSecondary, fontWeight: 600 }}>
          Sentence:
        </label>
        <input
          id="attention-step-sentence"
          type="text"
          value={text}
          placeholder="Type any sentence (up to 12 words)"
          onChange={(e) => {
            stopAuto();
            setText(e.target.value);
            setFocusRowManual(0);
          }}
          style={{
            flex: '1 1 200px',
            minWidth: 0,
            padding: '6px 10px',
            borderRadius: RADIUS.sm,
            border: `1.5px solid ${t.border}`,
            background: t.background,
            color: t.textPrimary,
            fontFamily: FONT_FAMILY,
            fontSize: 15,
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SENTENCE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                stopAuto();
                setText(p.text);
                setFocusRowManual(p.focus);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: RADIUS.sm,
                border: `1px solid ${text === p.text ? t.accentPrimary : t.border}`,
                background: text === p.text ? t.surfaceAlt : 'transparent',
                color: text === p.text ? t.accentPrimary : t.textSecondary,
                fontFamily: FONT_FAMILY,
                fontSize: 13.5,
                fontWeight: text === p.text ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Control Row 2: Head, Scale toggle, Causal mask toggle, Temperature slider */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<number>
            label="Attention head (what it looks for)"
            value={headIdx}
            onChange={(v) => {
              stopAuto();
              setHeadIdx(v);
            }}
            options={HEAD_OPTIONS}
          />
        </div>
        <p style={{ flexBasis: '100%', margin: '2px 0 4px', fontSize: 15, color: t.textSecondary }}>
          A transformer runs several attention <strong>heads</strong> side by side; each one learns to look for a different kind of link between words. {HEAD_EXPLAIN[headIdx]} (These three are hand-set examples.)
        </p>
        <button
          type="button"
          aria-pressed={useScale}
          onClick={() => {
            stopAuto();
            setUseScale((s) => !s);
          }}
          style={{
            padding: '6px 10px',
            borderRadius: RADIUS.sm,
            border: `1px solid ${useScale ? t.accentPrimary : t.accentWarn}`,
            background: useScale ? 'transparent' : t.surfaceAlt,
            color: useScale ? t.accentPrimary : t.accentWarn,
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ÷√dₖ: {useScale ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          aria-pressed={causalMask}
          onClick={() => {
            stopAuto();
            setCausalMask((m) => !m);
          }}
          style={{
            padding: '6px 10px',
            borderRadius: RADIUS.sm,
            border: `1px solid ${causalMask ? t.accentSecondary : t.border}`,
            background: causalMask ? t.surfaceAlt : 'transparent',
            color: causalMask ? t.accentSecondary : t.textPrimary,
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Causal mask: {causalMask ? 'ON' : 'OFF'}
        </button>
        <div style={{ minWidth: 140, flex: '0 1 170px' }}>
          <Slider
            label="Temp T"
            value={temperature}
            onChange={(v) => {
              stopAuto();
              setTemperature(v);
            }}
            min={0.3}
            max={2.0}
            step={0.1}
            format={(v) => v.toFixed(1)}
          />
        </div>
      </div>

      {/* Stage pills + Live readout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ATTENTION_STAGES.map((st) => {
            const active = stage === st.id;
            return (
              <button
                key={st.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  stopAuto();
                  setStage(st.id);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${active ? t.accentPrimary : t.border}`,
                  background: active ? t.accentPrimary : 'transparent',
                  color: active ? t.background : t.textSecondary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {st.shortLabel}
              </button>
            );
          })}
        </div>
        {summaryStats && (
          <div style={{ fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
            Query <strong style={{ color: queryColor }}>&ldquo;{tokens[focusRow]}&rdquo;</strong> · Top:{' '}
            <strong style={{ color: attnColor }}>{summaryStats.topPct}% → &ldquo;{summaryStats.topToken}&rdquo;</strong> ·{' '}
            Entropy: <strong style={{ color: t.textPrimary }}>{summaryStats.entropy.toFixed(2)} b</strong>
          </div>
        )}
      </div>

      {/* One-line plain-English "What just happened & why" caption (highlighter strip, no border box) */}
      <div
        style={{
          padding: '6px 10px',
          marginBottom: 8,
          background: t.surfaceAlt,
          borderLeft: `3px solid ${attnColor}`,
          fontSize: 14.5,
          lineHeight: 1.4,
          color: t.textPrimary,
        }}
        aria-live="polite"
      >
        {caption}
      </div>

      {/* Main SVG stage (no inner card border) */}
      <div ref={svgHostRef} style={{ width: '100%' }}>
        {!result ? (
          <div style={{ padding: SPACING.md, color: t.textSecondary, fontSize: 15 }}>
            Type at least one word above to see Q, K, V, and attention weights compute live.
          </div>
        ) : !isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 700 232"
            role="img"
            aria-label={`Self-attention matrix and live ${ATTENTION_STAGES[stage].label} breakdown for query ${tokens[focusRow]}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {renderMatrixSvgContent(0, 336, 232)}
            <SketchArrow
              points={[
                [334, 54 + focusRow * Math.min(28, Math.floor(166 / n)) + 12],
                [356, 108],
              ]}
              color={queryColor}
              strokeWidth={1.8}
              roughness={1.2}
              id="attn-bridge-arrow"
            />
            {renderDetailSvgContent(364, 336)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 340 232"
              role="img"
              aria-label={`Self-attention matrix for ${tokens.join(' ')}`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderMatrixSvgContent(0, 340, 232)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 340 210"
              role="img"
              aria-label={`Detailed step values for query ${tokens[focusRow]}`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderDetailSvgContent(0, 340)}
            </svg>
          </div>
        )}
      </div>

      {/* Compact inline Predict-then-run challenge (no nested card border) */}
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
        <span style={{ color: t.textPrimary }}>Turn OFF ÷√dₖ — what happens to the top weight?</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PREDICT_OPTIONS.map((opt, idx) => {
            const picked = prediction === idx;
            const correct = idx === 0;
            const revealed = prediction !== null;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setPrediction(idx)}
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
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {prediction !== null && (
          <span style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 13.5 }}>
            {prediction === 0 ? 'Right — ' : 'Try it — '}
            without ÷√4 = 2, raw scores double and softmax crowds onto the top match.{' '}
            <button
              type="button"
              onClick={() => {
                stopAuto();
                setUseScale(false);
                setStage(2);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: t.accentSecondary,
                textDecoration: 'underline',
                fontFamily: FONT_FAMILY,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Test ÷√dₖ OFF now
            </button>
          </span>
        )}
      </div>
    </VisualizationContainer>
  );
}
