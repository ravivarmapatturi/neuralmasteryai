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
  analyzeLasso,
  LAMBDA_MAX,
  LASSO_FEATURE_META,
  LASSO_PLAYBACK_LAMBDAS,
  separateLabelPositions,
} from './lib/lassoExplorer';
import { PredictChallenge } from './diagrams/playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './diagrams/useStepPlayback';

type LassoFormulaTab = 'objective' | 'softThreshold' | 'kkt';

const FORMULA_LATEX: Record<LassoFormulaTab, string> = {
  objective: String.raw`J_{\text{lasso}}(w) = \frac{1}{2n}\,\text{SSE}(w) + \lambda\sum_{j=1}^{d} |w_j|`,
  softThreshold: String.raw`S(\rho,\tau) = \operatorname{sign}(\rho)\max(|\rho| - \tau,\, 0)`,
  kkt: String.raw`|\rho_j| \le \tfrac{n}{2}\lambda \;\implies\; w_j = 0`,
};

const PREDICT_OPTIONS = [
  'x₃ hits exact zero early and stays dropped from the model',
  'x₃ shrinks smoothly toward zero but never reaches 0.000',
  'x₃ grows larger to compensate for x₁ and x₂',
] as const;

function LassoPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipPathId = useId();
  const clipFeeId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [seed, setSeed] = useState<number>(5);
  const [correlation, setCorrelation] = useState<number>(0.9);
  const [noise, setNoise] = useState<number>(1.5);
  const [manualLambda, setManualLambda] = useState<number | null>(null);
  const [activeFormula, setActiveFormula] = useState<LassoFormulaTab>('kkt');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(LASSO_PLAYBACK_LAMBDAS.length, 1750, 6, outerVisible);
  const lambda = manualLambda ?? LASSO_PLAYBACK_LAMBDAS[playback.step] ?? 1.25;

  const analysis = useMemo(
    () => analyzeLasso({ correlation, noise, seed, lambda }),
    [correlation, noise, seed, lambda],
  );

  // Same 4 distinct feature colors as Ridge (blue, purple, amber, green).
  const featureColors = [t.accentSecondary, t.accentPurple, t.accentWarn, t.accentPrimary];

  const selectLambda = (val: number) => {
    const clamped = Math.max(0, Math.min(LAMBDA_MAX, Math.round(val * 20) / 20));
    playback.stop();
    setManualLambda(clamped);
    setActiveFormula(clamped < 0.02 ? 'objective' : 'kkt');
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
      LASSO_FEATURE_META.map((m, j) => ({
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
          1. Weights snap to exact 0 as λ rises
        </text>
        <defs>
          <clipPath id={`${clipPathId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {yTicks.map((yt) => (
          <g key={`ly-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt}
            </text>
          </g>
        ))}

        {[0, 1, 2, 3].map((xt) => (
          <g key={`lx-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipPathId}-${offsetX})`}>
          {yMin <= 0 && yMax >= 0 && (
            <line x1={plotX} y1={py(0)} x2={plotX + plotW} y2={py(0)} stroke={t.border} strokeWidth={1.3} strokeDasharray="4 3" />
          )}

          {LASSO_FEATURE_META.map((meta, j) => {
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
              key={`ldot-${j}`}
              cx={px(analysis.lambda)}
              cy={py(v)}
              r={v === 0 ? 5.5 : 4.5}
              fill={v === 0 ? t.background : featureColors[j]}
              stroke={featureColors[j]}
              strokeWidth={v === 0 ? 2.4 : 1.5}
            />
          ))}
        </g>

        {endLabels.map((lbl) => (
          <g key={`llbl-${lbl.idx}`}>
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
              {lbl.label} {analysis.currentWeights[lbl.idx] === 0 ? '0!' : analysis.currentWeights[lbl.idx].toFixed(1)}
            </text>
          </g>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Penalty strength λ (current λ = {analysis.lambda.toFixed(2)})
        </text>
      </g>
    );
  };

  const renderEntryFeePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 42;
    const plotY = 36;
    const plotW = panelW - 56;
    const plotH = 198;

    const maxSignal = Math.max(70, analysis.scaledFee * 1.18, ...analysis.features.map((f) => f.absRho * 1.15));
    const slotW = plotW / analysis.features.length;
    const barW = Math.min(36, slotW * 0.56);
    const py = (val: number) => plotY + plotH - (Math.min(maxSignal, val) / maxSignal) * (plotH - 18);
    const feeY = py(analysis.scaledFee);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Feature signal |ρⱼ| vs L1 entry fee
        </text>
        <defs>
          <clipPath id={`${clipFeeId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, Math.round(maxSignal * 0.5), Math.round(maxSignal)].map((yt) => (
          <text key={`fy-${yt}`} x={plotX - 6} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
            {yt}
          </text>
        ))}

        <g clipPath={`url(#${clipFeeId}-${offsetX})`}>
          {(() => {
            const feeLabelY = feeY > plotY + 28 ? feeY - 7 : feeY + 17;
            return (
              <>
                {analysis.features.map((f, idx) => {
                  const bx = plotX + idx * slotW + (slotW - barW) / 2;
                  const by = py(f.absRho);
                  const bh = Math.max(3, plotY + plotH - by);
                  const col = featureColors[idx];
                  let labelY = Math.max(plotY + 18, by - 6);
                  if (idx >= 2 && Math.abs(labelY - feeLabelY) < 16) {
                    labelY = by + 16 <= plotY + plotH - 6 ? by + 16 : Math.max(plotY + 18, feeLabelY - 18);
                  }

                  return (
                    <g key={f.name} opacity={f.dropped ? 0.5 : 1}>
                      {f.dropped ? (
                        <rect
                          x={bx}
                          y={by}
                          width={barW}
                          height={bh}
                          rx={3}
                          fill={col}
                          fillOpacity={0.18}
                          stroke={col}
                          strokeWidth={1.6}
                          strokeDasharray="3 2"
                        />
                      ) : (
                        <rect x={bx} y={by} width={barW} height={bh} rx={3} fill={col} fillOpacity={0.85} />
                      )}
                      <text
                        x={bx + barW / 2}
                        y={labelY}
                        textAnchor="middle"
                        fontSize={14}
                        fontWeight={700}
                        fill={f.dropped ? t.accentDanger : col}
                        stroke={t.background}
                        strokeWidth={3.5}
                        paintOrder="stroke"
                      >
                        {f.dropped ? '0!' : f.weight.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Horizontal entry fee threshold line */}
                <line x1={plotX} y1={feeY} x2={plotX + plotW} y2={feeY} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="5 3" />
                <text
                  x={plotX + 6}
                  y={feeLabelY}
                  textAnchor="start"
                  fontSize={14}
                  fontWeight={700}
                  fill={t.accentDanger}
                  stroke={t.background}
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  Fee = {analysis.scaledFee.toFixed(0)}
                </text>
              </>
            );
          })()}
        </g>

        {analysis.features.map((f, idx) => (
          <text
            key={`fx-${f.name}`}
            x={plotX + idx * slotW + slotW / 2}
            y={plotY + plotH + 18}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={f.dropped ? t.textMuted : featureColors[idx]}
          >
            {f.short}
          </text>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Below the red line → exactly 0 ({analysis.zeroedCount} of 4)
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
                title="Why Lasso drops weak features all the way to exact zero"
                description="While Ridge shrinks every weight smoothly, Lasso charges a fixed entry fee per unit of |w|. Any feature whose residual signal cannot beat that fee is snapped to exact 0 and removed from the model."
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
                label="Penalty strength λ (L1 entry fee)"
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Lasso feature colours">
        {analysis.features.map((f, j) => (
          <span key={f.name} style={{ color: f.dropped ? t.textMuted : t.textPrimary }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: featureColors[j], verticalAlign: 'middle', marginRight: 6 }} />
            {f.plain}: <strong>{f.weight.toFixed(3)}</strong>
            {f.dropped ? ' (dropped)' : ''}
          </span>
        ))}
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 286"
            role="img"
            aria-label={`Lasso regularization path at lambda=${analysis.lambda.toFixed(2)}: ${analysis.zeroedCount} of 4 features zeroed out, MSE=${analysis.currentMse.toFixed(3)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPathPanel(0, 444)}
            {renderEntryFeePanel(456, 304)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Lasso weight regularization path" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderPathPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Feature signal vs L1 entry fee" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderEntryFeePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Lasso KKT drop condition" latex={FORMULA_LATEX.kkt} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              λ = <strong>{analysis.lambda.toFixed(2)}</strong> · Dropped: <strong>{analysis.zeroedCount} of 4</strong> · MSE = <strong>{analysis.currentMse.toFixed(3)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${LASSO_PLAYBACK_LAMBDAS.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Lasso L1 objective"
              latex={FORMULA_LATEX.objective}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'objective'}
              onSelect={() => selectLambda(0)}
            >
              <p style={{ textAlign: 'center' }}>Replaces squared w² with |w|, charging a steady slope all the way to zero.</p>
            </StickyNote>
            <StickyNote
              title="2. Soft-thresholding"
              latex={FORMULA_LATEX.softThreshold}
              color="pink"
              tilt={1}
              active={activeFormula === 'softThreshold'}
              onSelect={() => selectLambda(analysis.lambda < 0.1 ? 1.25 : analysis.lambda)}
            >
              <p style={{ textAlign: 'center' }}>Subtracts the entry fee τ from each feature signal, clamping weak ones to 0.</p>
            </StickyNote>
            <StickyNote
              title="3. Exact zero rule (KKT)"
              latex={FORMULA_LATEX.kkt}
              color="orange"
              tilt={-1}
              active={activeFormula === 'kkt'}
              onSelect={() => selectLambda(2.5)}
            >
              <p style={{ textAlign: 'center' }}>Any feature whose residual dot product |ρⱼ| sits below (n/2)λ becomes exact 0.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · λ = ${analysis.lambda.toFixed(2)} (${analysis.zeroedCount} of 4 dropped)`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Entry fee (n/2)λ = <strong>{analysis.scaledFee.toFixed(1)}</strong> · MSE = <strong>{analysis.currentMse.toFixed(3)}</strong> · ‖w‖₁ = <strong>{analysis.l1Penalty.toFixed(2)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                {analysis.features.map((f) => `${f.short}=${f.weight.toFixed(2)}`).join(' · ')}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${LASSO_PLAYBACK_LAMBDAS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="On this correlated dataset (ρ = 0.90), what happens to the irrelevant noise feature x₃ (true weight 0) as you raise λ from 0?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because x₃ carries only random noise, its correlation |ρ₃| falls below the entry fee early—snapping x₃ to exact 0 by λ = 0.15 while x₁, x₂, x₄ stay active."
            actionLabel="Jump to λ = 0.25 and see x₃ dropped"
            onAction={() => {
              setSeed(5);
              setCorrelation(0.9);
              setNoise(1.5);
              selectLambda(0.25);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function LassoRegressionStudio({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Lasso regression L1 feature-selection playground"
      footer="Exact coordinate-descent Lasso solve on the same 40-row synthetic dataset as Ridge Studio. Watch weak signals drop cleanly to 0 while correlated twins compete."
    >
      <LassoPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
