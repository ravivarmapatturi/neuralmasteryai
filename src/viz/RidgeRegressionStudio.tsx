import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import {
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from './primitives';
import {
  analyzeRidge,
  LAMBDA_MAX,
  RIDGE_FEATURE_META,
  RIDGE_PLAYBACK_LAMBDAS,
  separateLabelPositions,
} from './lib/ridgeExplorer';
import { PredictChallenge } from './diagrams/playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './diagrams/useStepPlayback';

type RidgeFormulaTab = 'ols' | 'ridge' | 'closedForm';

const FORMULA_LATEX: Record<RidgeFormulaTab, string> = {
  ols: String.raw`J_{\text{OLS}}(w) = \sum_{i=1}^{n} (\hat{y}_i - y_i)^2`,
  ridge: String.raw`J_{\text{ridge}}(w) = \text{SSE}(w) + \lambda\sum_{j=1}^{d} w_j^2`,
  closedForm: String.raw`\hat{w} = (X^T X + \lambda P)^{-1} X^T y`,
};

const PREDICT_OPTIONS = [
  'They swing apart in opposite directions while w₁ + w₂ stays near 6',
  'Both shrink straight to 0 immediately',
  'Both lock cleanly onto 3.0 and 3.0',
] as const;

function RidgePlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipPathId = useId();
  const clipBallId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [seed, setSeed] = useState<number>(5);
  const [correlation, setCorrelation] = useState<number>(0.9);
  const [noise, setNoise] = useState<number>(1.5);
  const [manualLambda, setManualLambda] = useState<number | null>(null);
  const [activeFormula, setActiveFormula] = useState<RidgeFormulaTab>('ridge');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(RIDGE_PLAYBACK_LAMBDAS.length, 1750, 5, outerVisible);
  const lambda = manualLambda ?? RIDGE_PLAYBACK_LAMBDAS[playback.step] ?? 1.0;

  const analysis = useMemo(
    () => analyzeRidge({ correlation, noise, seed, lambda }),
    [correlation, noise, seed, lambda],
  );

  // Distinct per-feature colors (blue, purple, amber, green) — never two similar reds/oranges.
  const featureColors = [t.accentSecondary, t.accentPurple, t.accentWarn, t.accentPrimary];

  const selectLambda = (val: number) => {
    const clamped = Math.max(0, Math.min(LAMBDA_MAX, Math.round(val * 20) / 20));
    playback.stop();
    setManualLambda(clamped);
    setActiveFormula(clamped < 0.02 ? 'ols' : 'ridge');
  };

  const renderPathPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 44;
    const plotY = 36;
    const plotW = panelW - 116;
    const plotH = 198;

    let minW = -0.5;
    let maxW = 5.0;
    for (const pt of analysis.path) {
      for (const v of pt.w) {
        if (v < minW) minW = v;
        if (v > maxW) maxW = v;
      }
    }
    const pad = Math.max(0.4, (maxW - minW) * 0.12);
    const yMin = minW - pad;
    const yMax = maxW + pad;

    const px = (lam: number) => plotX + (lam / LAMBDA_MAX) * plotW;
    const py = (w: number) => plotY + plotH - ((w - yMin) / (yMax - yMin)) * plotH;

    const yTicks = [-2, 0, 2, 4, 6].filter((v) => v >= yMin && v <= yMax);
    const endPt = analysis.path[analysis.path.length - 1];
    const endLabels = separateLabelPositions(
      RIDGE_FEATURE_META.map((m, j) => ({
        idx: j,
        rawY: py(endPt.w[j]) + 4,
        label: m.short,
        color: featureColors[j],
      })),
      plotY + 14,
      plotY + plotH - 6,
      18,
    );

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Weights wⱼ as penalty λ increases
        </text>
        <defs>
          <clipPath id={`${clipPathId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {yTicks.map((yt) => (
          <g key={`ry-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt}
            </text>
          </g>
        ))}

        {[0, 1, 2, 3, 4].map((xt) => (
          <g key={`rx-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipPathId}-${offsetX})`}>
          {yMin <= 0 && yMax >= 0 && (
            <line x1={plotX} y1={py(0)} x2={plotX + plotW} y2={py(0)} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
          )}

          {RIDGE_FEATURE_META.map((meta, j) => {
            const pts = analysis.path.map((p) => `${px(p.lambda).toFixed(1)},${py(p.w[j]).toFixed(1)}`).join(' ');
            return (
              <polyline
                key={meta.name}
                points={pts}
                fill="none"
                stroke={featureColors[j]}
                strokeWidth={2.4}
                strokeLinejoin="round"
              />
            );
          })}

          <line
            x1={px(analysis.lambda)}
            y1={plotY}
            x2={px(analysis.lambda)}
            y2={plotY + plotH}
            stroke={t.textPrimary}
            strokeWidth={1.6}
            strokeDasharray="4 3"
          />

          {analysis.currentWeights.map((v, j) => (
            <circle
              key={`dot-${j}`}
              cx={px(analysis.lambda)}
              cy={py(v)}
              r={4.5}
              fill={featureColors[j]}
              stroke={t.background}
              strokeWidth={1.5}
            />
          ))}
        </g>

        {endLabels.map((lbl) => (
          <g key={`lbl-${lbl.idx}`}>
            <line
              x1={plotX + plotW}
              y1={Math.max(plotY + 6, Math.min(plotY + plotH - 6, lbl.rawY - 4))}
              x2={plotX + plotW + 8}
              y2={lbl.y - 4}
              stroke={lbl.color}
              strokeWidth={1}
              opacity={0.7}
            />
            <text x={plotX + plotW + 10} y={lbl.y} fontSize={14} fontWeight={700} fill={lbl.color}>
              {lbl.label} {analysis.currentWeights[lbl.idx].toFixed(1)}
            </text>
          </g>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Penalty strength λ (current λ = {analysis.lambda.toFixed(2)})
        </text>
      </g>
    );
  };

  const renderTwinSpacePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 42;
    const plotY = 36;
    const plotW = panelW - 56;
    const plotH = 198;

    const allW12 = [
      0,
      analysis.olsWeights[0],
      analysis.olsWeights[1],
      analysis.currentWeights[0],
      analysis.currentWeights[1],
      analysis.sliceCenter[0],
      analysis.sliceCenter[1],
    ];
    const domMin = Math.min(-0.8, ...allW12) - 0.4;
    const domMax = Math.max(5.5, ...allW12) + 0.6;
    const span = domMax - domMin;
    const scale = Math.min(plotW / span, plotH / span);
    const midDom = (domMin + domMax) / 2;
    const cx0 = plotX + plotW / 2;
    const cy0 = plotY + plotH / 2;
    const px = (w1: number) => cx0 + (w1 - midDom) * scale;
    const py = (w2: number) => cy0 - (w2 - midDom) * scale;

    const trajPts = analysis.path
      .map((p) => `${px(p.w[0]).toFixed(1)},${py(p.w[1]).toFixed(1)}`)
      .join(' ');
    const curX = px(analysis.currentWeights[0]);
    const curY = py(analysis.currentWeights[1]);
    const olsX = px(analysis.olsWeights[0]);
    const olsY = py(analysis.olsWeights[1]);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. L2 circle pulls twins (w₁, w₂) together
        </text>
        <defs>
          <clipPath id={`${clipBallId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, 2, 4].filter((v) => v >= domMin && v <= domMax).map((tick) => (
          <g key={`tw-${tick}`}>
            <text x={px(tick)} y={plotY + plotH + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {tick}
            </text>
            <text x={plotX - 6} y={py(tick) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {tick}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipBallId}-${offsetX})`}>
          {/* Zero axes */}
          <line x1={plotX} y1={py(0)} x2={plotX + plotW} y2={py(0)} stroke={t.border} strokeWidth={1} strokeOpacity={0.5} />
          <line x1={px(0)} y1={plotY} x2={px(0)} y2={plotY + plotH} stroke={t.border} strokeWidth={1} strokeOpacity={0.5} />

          {/* Equal-split diagonal w1 = w2 */}
          <line
            x1={px(domMin)}
            y1={py(domMin)}
            x2={px(domMax)}
            y2={py(domMax)}
            stroke={t.accentPrimary}
            strokeWidth={1.3}
            strokeDasharray="4 4"
            opacity={0.75}
          />
          <text x={plotX + plotW - 8} y={plotY + 18} textAnchor="end" fontSize={14} fill={t.accentPrimary}>
            w₁ = w₂ (equal split)
          </text>

          {/* Conditional SSE error contours */}
          {analysis.contours.map((c) => (
            <polyline
              key={c.levelLabel}
              points={c.points.map(([w1, w2]) => `${px(w1).toFixed(1)},${py(w2).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={t.textMuted}
              strokeWidth={1.1}
              strokeDasharray="2 3"
              opacity={0.65}
            />
          ))}

          {/* L2 budget circle around (0, 0) touching current Ridge point */}
          <circle
            cx={px(0)}
            cy={py(0)}
            r={Math.max(2, analysis.l2Radius * scale)}
            fill={t.accentWarn}
            fillOpacity={0.08}
            stroke={t.accentWarn}
            strokeWidth={1.8}
          />

          {/* Path of (w1, w2) from OLS to lambda_max */}
          <polyline points={trajPts} fill="none" stroke={t.accentSecondary} strokeWidth={2.2} />

          {/* OLS start marker */}
          <circle cx={olsX} cy={olsY} r={4.5} fill={t.background} stroke={t.accentDanger} strokeWidth={2} />
          <text
            x={Math.max(plotX + 36, Math.min(plotX + plotW - 36, olsX))}
            y={Math.max(plotY + 34, Math.min(plotY + plotH - 8, olsY + 16))}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={t.accentDanger}
            stroke={t.background}
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            OLS
          </text>

          {/* Current Ridge point */}
          <circle cx={curX} cy={curY} r={5.5} fill={t.accentPrimary} stroke={t.background} strokeWidth={1.6} />
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Twin A weight w₁ (vertical axis = w₂)
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why correlated features make plain regression weights swing wildly"
                description="When two inputs (x₁ and x₂) rise and fall together, ordinary least squares cannot tell them apart—so their weights explode in opposite directions. Ridge adds an L2 size penalty λ that gently pulls twins toward sharing the credit."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualLambda(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualLambda(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualLambda(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Penalty strength λ (L2 size rule)"
                value={analysis.lambda}
                onChange={selectLambda}
                min={0}
                max={LAMBDA_MAX}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
              <input
                aria-label="Exact penalty lambda"
                type="number"
                min={0}
                max={LAMBDA_MAX}
                step={0.05}
                value={analysis.lambda}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) selectLambda(v);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 32,
                  padding: '3px 7px',
                  font: 'inherit',
                  fontSize: 15,
                  fontVariantNumeric: 'tabular-nums',
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div>
              <Slider
                label="Twin overlap ρ (correlation x₁, x₂)"
                value={correlation}
                onChange={(v) => setCorrelation(Math.round(v * 100) / 100)}
                min={0}
                max={0.98}
                step={0.02}
                format={(v) => v.toFixed(2)}
              />
              <input
                aria-label="Exact twin correlation rho"
                type="number"
                min={0}
                max={0.98}
                step={0.02}
                value={correlation}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setCorrelation(Math.max(0, Math.min(0.98, Math.round(v * 100) / 100)));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 32,
                  padding: '3px 7px',
                  font: 'inherit',
                  fontSize: 15,
                  fontVariantNumeric: 'tabular-nums',
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </div>

            <Slider
              label="Measurement noise σ"
              value={noise}
              onChange={(v) => setNoise(Math.round(v * 10) / 10)}
              min={0.2}
              max={4.0}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, color: t.textSecondary }}>Dataset sample (seed #{seed})</span>
              <VizButton variant="secondary" onClick={() => setSeed((s) => s + 1)}>
                New dataset
              </VizButton>
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Ridge feature colours">
        {RIDGE_FEATURE_META.map((meta, j) => (
          <span key={meta.name}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: featureColors[j], verticalAlign: 'middle', marginRight: 6 }} />
            {meta.plain}: <strong>{analysis.currentWeights[j].toFixed(2)}</strong>
          </span>
        ))}
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 286"
            role="img"
            aria-label={`Ridge regularization path at lambda=${analysis.lambda.toFixed(2)}: x1=${analysis.currentWeights[0].toFixed(2)}, x2=${analysis.currentWeights[1].toFixed(2)}, MSE=${analysis.currentMse.toFixed(3)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPathPanel(0, 444)}
            {renderTwinSpacePanel(456, 304)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Ridge weight regularization path" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderPathPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="L2 circle pulling twin weights together" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTwinSpacePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Ridge objective (L2 size rule)" latex={FORMULA_LATEX.ridge} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              λ = <strong>{analysis.lambda.toFixed(2)}</strong> · x₁+x₂ = <strong>{analysis.twinSum.toFixed(2)}</strong> · MSE = <strong>{analysis.currentMse.toFixed(3)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${RIDGE_PLAYBACK_LAMBDAS.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Plain OLS (λ = 0)"
              latex={FORMULA_LATEX.ols}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'ols'}
              onSelect={() => selectLambda(0)}
            >
              <p style={{ textAlign: 'center' }}>Minimizes training error only; correlated twin weights explode in opposite directions.</p>
            </StickyNote>
            <StickyNote
              title="2. Ridge penalty (error + L2)"
              latex={FORMULA_LATEX.ridge}
              color="pink"
              tilt={1}
              active={activeFormula === 'ridge'}
              onSelect={() => selectLambda(analysis.lambda < 0.05 ? 2.0 : analysis.lambda)}
            >
              <p style={{ textAlign: 'center' }}>Charges λ·w² per weight, preferring two calm 3.0 weights over (1, 5).</p>
            </StickyNote>
            <StickyNote
              title="3. Closed-form Ridge solve"
              latex={FORMULA_LATEX.closedForm}
              color="orange"
              tilt={-1}
              active={activeFormula === 'closedForm'}
              onSelect={() => {
                setActiveFormula('closedForm');
                playback.stop();
                setManualLambda(4.0);
              }}
            >
              <p style={{ textAlign: 'center' }}>Adds λ down the diagonal so XᵀX + λP is always invertible and stable.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · λ = ${analysis.lambda.toFixed(2)} (ρ = ${analysis.correlation.toFixed(2)})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Twins: x₁ = <strong>{analysis.currentWeights[0].toFixed(2)}</strong>, x₂ = <strong>{analysis.currentWeights[1].toFixed(2)}</strong> · Sum = <strong>{analysis.twinSum.toFixed(2)}</strong> (true ≈ 6.0)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                MSE = <strong>{analysis.currentMse.toFixed(3)}</strong> (OLS {analysis.olsMse.toFixed(3)}) · L2 size ‖w‖² = <strong>{analysis.l2Penalty.toFixed(2)}</strong> · VIF = <strong>{analysis.vif.toFixed(1)}×</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${RIDGE_PLAYBACK_LAMBDAS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Push twin correlation to ρ = 0.98 and set λ = 0 (plain OLS). What happens to the weights of x₁ and x₂?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At ρ = 0.98, variance inflation hits 25.3×: OLS gives x₁ = 1.20 and x₂ = 4.76 (a 3.56 split!) while their sum stays 5.96. Raising λ pulls them back together."
            actionLabel="Test ρ = 0.98 at λ = 0 now"
            onAction={() => {
              setSeed(5);
              setNoise(1.5);
              setCorrelation(0.98);
              selectLambda(0);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function RidgeRegressionStudio({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Ridge regression L2 regularization playground"
      footer="Exact closed-form Ridge solve w(λ) = (XᵀX + λP)⁻¹Xᵀy on a 40-row correlated dataset. Same dataset and features as the Lasso studio so the two paths compare directly."
    >
      <RidgePlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
