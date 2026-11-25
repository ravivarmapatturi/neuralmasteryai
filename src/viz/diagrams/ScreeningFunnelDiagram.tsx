import { useEffect, useMemo, useRef, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchRect } from '../../components/notebook/RoughShape';
import {
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from '../primitives';
import {
  MAX_SCREENING_N,
  SCREENING_STAGES,
  explainScreeningStage,
  formatUsdCompact,
  generateLibraryWithHits,
  runScreeningFunnel,
  type ScreeningStage,
} from '../lib/screeningFunnel';

const BASE_LIBRARY = generateLibraryWithHits(MAX_SCREENING_N);

const PREDICT_OPTIONS = [
  'Recall plunges (~40% vs 95%) — real hits get filtered out',
  'Recall rises to 100%',
  'Passed candidate count grows',
] as const;

function ScreeningFunnelPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const innerVisible = useVizVisible();
  const visible = outerVisible && innerVisible;

  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(760);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 760;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isCompactPhone = hostWidth < 540;

  const [librarySize, setLibrarySize] = useState(200_000);
  const [threshold, setThreshold] = useState(0.7);
  const [shortlistBudget, setShortlistBudget] = useState(20);
  const [assayCostUsd, setAssayCostUsd] = useState(2_500);
  const [prediction, setPrediction] = useState<number | null>(null);

  const [stage, setStage] = useState<ScreeningStage>(() => (reducedMotion ? 3 : 0));
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setStage(3);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion) return undefined;
    const id = window.setTimeout(() => {
      setStage((curr) => ((curr + 1) % SCREENING_STAGES.length) as ScreeningStage);
    }, 2100);
    return () => window.clearTimeout(id);
  }, [playing, visible, reducedMotion, stage]);

  const res = useMemo(
    () => runScreeningFunnel({ librarySize, threshold, shortlistBudget, assayCostUsd }, BASE_LIBRARY),
    [librarySize, threshold, shortlistBudget, assayCostUsd],
  );

  // Distinct consistent colours everywhere
  const droppedColor = t.textMuted;
  const passedColor = t.accentSecondary;
  const budgetColor = t.accentPurple;
  const hitColor = t.accentPrimary;

  const caption = explainScreeningStage(stage, res);

  // ---- Left SVG Panel: Clipped AI Score Histogram with exact bin split at τ & hit share ----
  const renderHistogramPanel = (offsetX: number, panelW: number, panelH: number) => {
    const padL = offsetX + 46;
    const padR = offsetX + panelW - 14;
    const padT = 36;
    const padB = panelH - 46;
    const plotW = padR - padL;
    const plotH = padB - padT;
    const maxBin = Math.max(1, ...res.histogram.map((b) => b.totalCount));
    const colW = plotW / res.histogram.length;
    const cutX = padL + res.threshold * plotW;
    const clipId = `sf-hist-clip-${offsetX}-${panelW}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <text x={padL} y={20} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          AI score distribution (N = {res.librarySize.toLocaleString('en-US')})
        </text>
        <text x={offsetX + 4} y={padT + 10} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Count ↑
        </text>

        <rect x={padL} y={padT} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={padL} y1={padT} x2={padL} y2={padB} stroke={t.border} strokeWidth={1.3} />
        <line x1={padL} y1={padB} x2={padR} y2={padB} stroke={t.border} strokeWidth={1.3} />

        <g clipPath={`url(#${clipId})`}>
          {res.histogram.map((bin, idx) => {
            const bx = padL + idx * colW + 2;
            const bw = Math.max(8, colW - 4);
            const bh = Math.max(3, (bin.totalCount / maxBin) * plotH);
            const barTop = padB - bh;
            const hitH = bin.hitCount > 0 ? Math.max(3, (bin.hitCount / maxBin) * plotH) : 0;

            // Split straddling bin at exact cutoff fraction so dropped vs passed area agrees with passedMl
            const binSpan = bin.max - bin.min;
            const passFrac =
              res.threshold <= bin.min
                ? 1
                : res.threshold >= bin.max
                  ? 0
                  : Math.max(0, Math.min(1, (bin.max - res.threshold) / binSpan));
            const passW = bw * passFrac;
            const dropW = bw - passW;

            return (
              <g key={idx}>
                {dropW > 0.5 && (
                  <rect x={bx} y={barTop} width={dropW} height={bh} rx={2} fill={droppedColor} opacity={0.45} />
                )}
                {passW > 0.5 && (
                  <rect x={bx + dropW} y={barTop} width={passW} height={bh} rx={2} fill={passedColor} opacity={0.85} />
                )}
                {hitH > 0 && (
                  <rect x={bx} y={padB - hitH} width={bw} height={hitH} rx={1} fill={hitColor} />
                )}
              </g>
            );
          })}

          <line x1={cutX} y1={padT} x2={cutX} y2={padB} stroke={passedColor} strokeWidth={2.2} strokeDasharray="5 3" />
        </g>

        <text
          x={Math.min(padR - 42, Math.max(padL + 42, cutX))}
          y={padT + 18}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fontFamily="monospace"
          fill={passedColor}
        >
          τ={res.threshold.toFixed(2)}
        </text>

        {[0, 0.5, 1].map((tick) => (
          <text
            key={tick}
            x={padL + tick * plotW}
            y={padB + 18}
            textAnchor={tick === 0 ? 'start' : tick === 1 ? 'end' : 'middle'}
            fontSize={14}
            fontFamily={FONT_FAMILY}
            fill={t.textMuted}
          >
            {tick.toFixed(1)}
          </text>
        ))}
        <text x={(padL + padR) / 2} y={panelH - 6} textAnchor="middle" fontSize={14} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          AI predicted score (0.0 to 1.0) →
        </text>
      </g>
    );
  };

  // ---- Right SVG Panel: Real Narrowing Trapezoid Funnel (4 clickable stages) ----
  const renderFunnelPanel = (offsetX: number, panelW: number, panelH: number) => {
    const cx = offsetX + 70;
    const labelX = offsetX + 144;
    const stages = [
      {
        stageIdx: 0 as ScreeningStage,
        topW: 124,
        botW: 96,
        color: droppedColor,
        title: `1. Library: ${res.librarySize.toLocaleString('en-US')}`,
        sub: `${res.totalTrueHits.toLocaleString('en-US')} real hits (${res.baselineHitRatePct.toFixed(2)}%)`,
      },
      {
        stageIdx: 1 as ScreeningStage,
        topW: 94,
        botW: 66,
        color: passedColor,
        title: `2. Pass ≥ ${res.threshold.toFixed(2)}: ${res.passedMl.toLocaleString('en-US')}`,
        sub: `${res.recallPct.toFixed(1)}% of real hits kept`,
      },
      {
        stageIdx: 2 as ScreeningStage,
        topW: 64,
        botW: 42,
        color: budgetColor,
        title: `3. Lab top-${res.shortlistBudget}: ${res.shortlist} tested`,
        sub: `Lab cost ${formatUsdCompact(res.mlFunnelCostUsd)}`,
      },
      {
        stageIdx: 3 as ScreeningStage,
        topW: 40,
        botW: 28,
        color: hitColor,
        title: `4. Found: ${res.hitsInShortlist}/${res.shortlist} hits`,
        sub: `${res.enrichmentFactor.toFixed(1)}× better than random`,
      },
    ];

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Narrowing funnel (stage {stage + 1}/4)
        </text>
        {stages.map((s, i) => {
          const ry = 36 + i * 48;
          const h = 38;
          const active = stage === s.stageIdx;
          const polyPts = `${cx - s.topW / 2},${ry} ${cx + s.topW / 2},${ry} ${cx + s.botW / 2},${ry + h} ${cx - s.botW / 2},${ry + h}`;
          return (
            <g
              key={s.stageIdx}
              onClick={() => {
                setPlaying(false);
                setStage(s.stageIdx);
              }}
              style={{ cursor: 'pointer' }}
            >
              {active && (
                <SketchRect
                  x={offsetX + 4}
                  y={ry - 4}
                  width={panelW - 8}
                  height={h + 8}
                  color={s.color}
                  strokeWidth={2}
                  roughness={1}
                  id={`funnel-stage-${i}`}
                />
              )}
              <polygon
                points={polyPts}
                fill={s.color}
                fillOpacity={active ? 0.9 : 0.65}
                stroke={t.background}
                strokeWidth={1.2}
              />
              <text x={labelX} y={ry + 15} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
                {s.title}
              </text>
              <text x={labelX} y={ry + 33} fontSize={14} fontFamily={FONT_FAMILY} fill={s.stageIdx === 3 ? hitColor : t.textSecondary}>
                {s.sub}
              </text>
            </g>
          );
        })}
        <text x={offsetX + 8} y={panelH - 6} fontSize={14.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={hitColor}>
          Saved vs testing all {res.librarySize.toLocaleString('en-US')}: {formatUsdCompact(res.costSavedUsd)} ({res.savingsPct.toFixed(2)}%)
        </text>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How AI narrows 200,000 candidates down to 20 lab tests"
            description={
              <span style={{ fontSize: 15 }}>
                Testing every molecule or material in a physical wet lab costs thousands of dollars each. A fast AI scorer filters out weak candidates below cutoff τ so scientists spend their limited lab budget K on the top scorers most likely to work.
              </span>
            }
          />

          {/* Control Group 1: Cutoff slider + free numeric Library N, Lab budget K, Assay $/test */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ flex: '1 1 220px', minWidth: 180 }}>
              <Slider
                label="AI score cutoff τ (keep scores ≥ τ)"
                value={threshold}
                onChange={(v) => {
                  setPlaying(false);
                  setThreshold(v);
                }}
                min={0.05}
                max={0.98}
                step={0.01}
                format={(v) => v.toFixed(2)}
              />
            </div>
            <label htmlFor="sf-library-size" style={{ fontSize: 15, color: t.textSecondary }}>
              Library N:
              <input
                id="sf-library-size"
                type="number"
                min={500}
                max={MAX_SCREENING_N}
                step={1000}
                value={librarySize}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setPlaying(false);
                  setLibrarySize(Math.max(500, Math.min(MAX_SCREENING_N, Math.round(v))));
                }}
                style={{
                  width: 88,
                  marginLeft: 6,
                  minHeight: 34,
                  padding: '4px 6px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
            <label htmlFor="sf-wetlab-k" style={{ fontSize: 15, color: t.textSecondary }}>
              Wet-lab slots K:
              <input
                id="sf-wetlab-k"
                type="number"
                min={5}
                max={200}
                step={5}
                value={shortlistBudget}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setPlaying(false);
                  setShortlistBudget(Math.max(5, Math.min(200, Math.round(v))));
                }}
                style={{
                  width: 66,
                  marginLeft: 6,
                  minHeight: 34,
                  padding: '4px 6px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
            <label htmlFor="sf-assay-cost" style={{ fontSize: 15, color: t.textSecondary }}>
              Assay $/test:
              <input
                id="sf-assay-cost"
                type="number"
                min={100}
                max={50_000}
                step={100}
                value={assayCostUsd}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setPlaying(false);
                  setAssayCostUsd(Math.max(100, Math.min(50_000, Math.round(v))));
                }}
                style={{
                  width: 78,
                  marginLeft: 6,
                  minHeight: 34,
                  padding: '4px 6px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
          </div>

          {/* Control Group 2: Funnel stage selector + live metrics */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Funnel stage">
              {SCREENING_STAGES.map((st) => {
                const active = stage === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setPlaying(false);
                      setStage(st.id);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${active ? hitColor : t.border}`,
                      background: active ? hitColor : 'transparent',
                      color: active ? t.background : t.textSecondary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {st.shortLabel}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 15, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Pass: <strong style={{ color: passedColor }}>{res.passedMl.toLocaleString('en-US')}</strong> ({res.passedPct.toFixed(2)}%) · Recall:{' '}
              <strong style={{ color: t.textPrimary }}>{res.recallPct.toFixed(1)}%</strong> · Enrichment:{' '}
              <strong style={{ color: hitColor }}>{res.enrichmentFactor.toFixed(1)}×</strong>
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend (consistent everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary, marginBottom: 4 }}
        aria-label="Funnel stage colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 11, background: droppedColor, opacity: 0.6, verticalAlign: 'middle', marginRight: 6 }} />
          Filtered out (&lt; τ)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 11, background: passedColor, verticalAlign: 'middle', marginRight: 6 }} />
          Passed AI filter (≥ τ)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 11, background: budgetColor, verticalAlign: 'middle', marginRight: 6 }} />
          Top-K wet-lab shortlist
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 11, background: hitColor, verticalAlign: 'middle', marginRight: 6 }} />
          True active hits
        </span>
      </div>

      {/* Main SVG visual */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 260"
            role="img"
            aria-label={`Screening funnel: ${res.passedMl.toLocaleString('en-US')} of ${res.librarySize.toLocaleString('en-US')} candidates pass threshold ${res.threshold.toFixed(2)}, yielding ${res.hitsInShortlist} hits in top ${res.shortlist}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderHistogramPanel(0, 366, 256)}
            {renderFunnelPanel(384, 372, 256)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 232"
              role="img"
              aria-label="Long-tailed AI score distribution and cutoff line"
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderHistogramPanel(0, 380, 232)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 256"
              role="img"
              aria-label="Three-stage scientific screening funnel and wet-lab hit yield"
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderFunnelPanel(0, 380, 256)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Enrichment over random" latex={'\\text{Enrichment} = \\frac{\\text{hits}_K / K}{\\text{hits}_N / N}'} color="pink" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              ({res.hitsInShortlist}/{res.shortlist}) ÷ {res.baselineHitRatePct.toFixed(2)}% = {res.enrichmentFactor.toFixed(1)}×
            </p>
          </StickyNote>
          <StickyNote title={`Stage ${stage + 1} of 4`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Filter recall (hits kept)" latex={'\\text{Recall} = \\frac{\\text{hits with score} \\ge \\tau}{\\text{all true hits in } N}'} color="yellow" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Share of real discoveries that pass the AI filter; higher τ drops more hits.</p>
            </StickyNote>
            <StickyNote title="Hit enrichment & lab cost" latex={'\\text{Enrichment} = \\frac{\\text{hits}_K / K}{\\text{hits}_N / N}'} color="pink" tilt={1}>
              <p style={{ textAlign: 'center' }}>How much denser true hits are in the top-K lab batch than random testing.</p>
            </StickyNote>
            <StickyNote title={`Worked numbers · τ = ${res.threshold.toFixed(2)}`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                Recall = {res.hitsPassingMl.toLocaleString('en-US')}/{res.totalTrueHits.toLocaleString('en-US')} = {res.recallPct.toFixed(1)}% ({res.passedMl.toLocaleString('en-US')} passed)
              </p>
              <p className="nm-sticky__mono">
                Top-{res.shortlist}: {res.hitsInShortlist} hits ({res.enrichmentFactor.toFixed(1)}×) · Cost {formatUsdCompact(res.mlFunnelCostUsd)} vs {formatUsdCompact(res.naiveCostUsd)}
              </p>
            </StickyNote>
            <StickyNote title={`Stage ${stage + 1} of 4 · What just happened`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span style={{ color: t.textPrimary }}>
              Raise threshold τ from 0.70 to 0.93 — what happens to the share of real hits surviving the AI filter (Recall)?
            </span>
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
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border
                      }`,
                      background:
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
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
              <span role="status" style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                raising τ cuts more false alarms, but it also rejects real active hits scoring 0.70–0.92, dropping recall from ~95% to ~40%.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setThreshold(0.93);
                    setStage(1);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test τ = 0.93 now
                </button>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <VizButton onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStage((s) => ((s + 1) % SCREENING_STAGES.length) as ScreeningStage);
              }}
            >
              Step →
            </VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStage(0);
              }}
            >
              Reset
            </VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              Synthetic {res.librarySize.toLocaleString('en-US')}-candidate library (~1.3% true actives).
            </span>
          </div>
        </>
      )}
    </>
  );
}

export default function ScreeningFunnelDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Scientific Screening Funnel Playground"
      footer="Deterministic long-tailed score library (up to 200,000 candidates with rare ~1.3% true actives). ML pre-screening concentrates true hits in the top-K wet-lab budget while showing the recall trade-off."
    >
      <ScreeningFunnelPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
