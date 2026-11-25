import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  buildPinnTrainingTrace,
  COLLOCATION_POINTS,
  DEFAULT_DATA_X,
  evaluatePinn,
  PINN_PRESETS,
  type PinnObjective,
} from '../lib/pinnLoss';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type PinnFormulaTab = 'data' | 'physics' | 'total';

const FORMULA_LATEX: Record<PinnFormulaTab, string> = {
  data: String.raw`\mathcal{L}_{\text{data}} = \big(\hat{y}(x_0) - y_{\text{true}}(x_0)\big)^2`,
  physics: String.raw`\mathcal{L}_{\text{phys}} = \frac{1}{M}\sum_{j=1}^{M}\left(\frac{d\hat{y}}{dx}(x_j) + \hat{y}(x_j)\right)^{\!2}`,
  total: String.raw`\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{data}} + w_{\text{phys}}\,\mathcal{L}_{\text{phys}}`,
};

const PREDICT_OPTIONS = [
  'No — data loss at x = 0.1 stays tiny (0.005) while the curve drifts wildly at x = 2.0',
  'Yes — one labeled point locks the entire curve from x = 0 to x = 3',
  'No — data loss explodes to infinity whenever b > 0',
] as const;

function NumericField({
  label,
  ariaLabel,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 0, fontSize: 15, color: t.textPrimary }}>
      <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>{label}</span>
      <input
        aria-label={ariaLabel}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 34,
          padding: '4px 8px',
          font: 'inherit',
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
          border: `1.5px solid ${t.border}`,
          borderRadius: RADIUS.sm,
          background: t.background,
          color: t.textPrimary,
        }}
      />
    </label>
  );
}

function PinnLossPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<PinnObjective>('physicsInformed');
  const [startA, setStartA] = useState<number>(1.0);
  const [startB, setStartB] = useState<number>(0.8);
  const [dataX, setDataX] = useState<number>(DEFAULT_DATA_X);
  const [physicsWeight, setPhysicsWeight] = useState<number>(1.0);
  const [activeFormula, setActiveFormula] = useState<PinnFormulaTab>('total');
  const [prediction, setPrediction] = useState<number | null>(null);

  const trace = useMemo(
    () =>
      buildPinnTrainingTrace({
        mode,
        startA,
        startB,
        dataX,
        physicsWeight,
      }),
    [mode, startA, startB, dataX, physicsWeight],
  );

  // Reduced motion shows the trained outcome (step 7) cleanly; live starts at step 0 and trains forward.
  const playback = useStepPlayback(trace.length, 1550, trace.length - 1, outerVisible);
  const activeStep = trace[playback.step] ?? trace[0];

  const analysis = useMemo(
    () =>
      evaluatePinn({
        mode,
        a: activeStep.a,
        b: activeStep.b,
        dataX,
        physicsWeight,
      }),
    [mode, activeStep.a, activeStep.b, dataX, physicsWeight],
  );

  const predColor = t.accentPrimary;
  const trueColor = t.accentPurple;
  const dataColor = t.accentWarn;
  const physColor = t.accentSecondary;

  const activePresetId =
    PINN_PRESETS.find(
      (p) =>
        Math.abs(p.a - startA) < 1e-3 &&
        Math.abs(p.b - startB) < 1e-3 &&
        p.mode === mode,
    )?.id ?? 'custom';

  const setManualParams = (nextA: number, nextB: number) => {
    setStartA(Math.round(nextA * 100) / 100);
    setStartB(Math.round(nextB * 100) / 100);
    playback.setStep(0);
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 60;
    const plotH = 198;
    const xDomain: [number, number] = [0, 3];
    const yDomain: [number, number] = [0, 1.45];

    const px = (x: number) => plotX + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotW;
    const py = (y: number) => plotY + plotH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotH;

    const truePts = analysis.samples.map((s) => `${px(s.x).toFixed(1)},${py(s.yTrue).toFixed(1)}`).join(' ');
    const predPts = analysis.samples.map((s) => `${px(s.x).toFixed(1)},${py(s.yPred).toFixed(1)}`).join(' ');

    const dataXpx = px(analysis.dataX);
    const dataYTruePx = py(analysis.yTrueAtData);
    const dataYPredPx = py(analysis.yPredAtData);

    const dataLabelRight = analysis.dataX < 2.1;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Predicted curve ŷ(x) vs true decay y = e⁻ˣ
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, 0.5, 1.0].map((yt) => (
          <g key={`py-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt.toFixed(1)}
            </text>
          </g>
        ))}

        {[0, 1, 2, 3].map((xt) => (
          <g key={`px-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          {/* True solution y = e^-x */}
          <polyline points={truePts} fill="none" stroke={trueColor} strokeWidth={2} strokeDasharray="6 4" />
          {/* Network prediction */}
          <polyline points={predPts} fill="none" stroke={predColor} strokeWidth={2.8} strokeLinejoin="round" />

          {/* Error stem at the single labeled point */}
          <line x1={dataXpx} y1={dataYTruePx} x2={dataXpx} y2={dataYPredPx} stroke={dataColor} strokeWidth={2} strokeDasharray="3 2" />
          <circle cx={dataXpx} cy={dataYTruePx} r={5.5} fill={dataColor} stroke={t.background} strokeWidth={1.5} />

          {/* 6 unlabeled physics collocation check points */}
          {analysis.checks
            .filter((c) => c.kind === 'physics')
            .map((c) => {
              const cx = px(c.x);
              const cy = py(c.yPred);
              const arrowLen = Math.min(36, c.absResidual * 42);
              return (
                <g key={`col-${c.x}`} opacity={mode === 'physicsInformed' ? 1 : 0.35}>
                  {arrowLen > 2 && mode === 'physicsInformed' && (
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx}
                      y2={c.residual > 0 ? cy + arrowLen : cy - arrowLen}
                      stroke={physColor}
                      strokeWidth={2}
                    />
                  )}
                  <circle cx={cx} cy={cy} r={4} fill={physColor} stroke={t.background} strokeWidth={1.2} />
                </g>
              );
            })}

          <text
            x={dataLabelRight ? dataXpx + 10 : dataXpx - 10}
            y={Math.max(plotY + 18, Math.min(plotY + plotH - 10, dataYTruePx - 8))}
            textAnchor={dataLabelRight ? 'start' : 'end'}
            fontSize={14}
            fontWeight={700}
            fill={dataColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            1 labeled pt (x={analysis.dataX.toFixed(1)})
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Position x · 1 labeled dot + {COLLOCATION_POINTS.length} law checks
        </text>
      </g>
    );
  };

  const renderResidualPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 12;
    const plotY = 36;
    const plotW = panelW - 22;
    const plotH = 198;

    const maxBarErr = Math.max(
      0.25,
      ...analysis.checks.map((c) => c.absResidual),
    );
    const barStart = plotX + 86;
    const barMaxW = Math.max(60, plotW - 154);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Error checked at each point
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          {analysis.checks.map((c, idx) => {
            const ry = plotY + 14 + idx * 26;
            const isData = c.kind === 'data';
            const ignored = !isData && mode === 'dataOnly';
            const col = isData ? dataColor : physColor;
            const bw = Math.max(3, (c.absResidual / maxBarErr) * barMaxW);

            return (
              <g key={`${c.kind}-${c.x}`} opacity={ignored ? 0.38 : 1}>
                <text x={plotX + 8} y={ry + 14} fontSize={14} fontWeight={isData ? 700 : 400} fill={col}>
                  {isData ? `Data x=${c.x.toFixed(1)}` : `Law x=${c.x.toFixed(1)}`}
                </text>
                <rect x={barStart} y={ry + 3} width={barMaxW} height={13} rx={3} fill={t.surfaceAlt} />
                {ignored ? (
                  <rect
                    x={barStart}
                    y={ry + 3}
                    width={bw}
                    height={13}
                    rx={3}
                    fill="none"
                    stroke={col}
                    strokeWidth={1.4}
                    strokeDasharray="3 2"
                  />
                ) : (
                  <rect x={barStart} y={ry + 3} width={bw} height={13} rx={3} fill={col} fillOpacity={0.85} />
                )}
                <text x={plotX + plotW - 8} y={ry + 14} textAnchor="end" fontSize={14} fontWeight={600} fill={ignored ? t.textMuted : t.textPrimary}>
                  {c.absResidual.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {mode === 'dataOnly' ? 'Physics checks ignored (dashed)' : `Total loss = ${analysis.totalLoss.toFixed(4)}`}
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
                title="Why knowing the physics rule beats having lots of labels"
                description="With only one labeled measurement, a data-only model can bend wildly anywhere else and still get zero data error. A physics-informed network checks the governing law dy/dx + y = 0 at unlabeled points so the curve stays accurate everywhere."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<PinnObjective>
                label="Training objective (what loss guides the fit)"
                value={mode}
                onChange={(val) => {
                  const nextMode = typeof val === 'function' ? val(mode) : val;
                  setMode(nextMode);
                  setActiveFormula(nextMode === 'dataOnly' ? 'data' : 'total');
                  setPrediction(null);
                }}
                options={[
                  { value: 'physicsInformed', label: 'Data + physics loss' },
                  { value: 'dataOnly', label: 'Data loss only' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Starting parameter guesses"
                value={activePresetId}
                onChange={(id) => {
                  const preset = PINN_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    setMode(preset.mode);
                    setActiveFormula(preset.mode === 'dataOnly' ? 'data' : 'total');
                    setStartA(preset.a);
                    setStartB(preset.b);
                    playback.setStep(0);
                    setPrediction(null);
                  }
                }}
                options={[
                  ...PINN_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom (a, b)' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Decay speed a (in e⁻ᵃˣ)"
                value={analysis.a}
                onChange={(v) => setManualParams(v, analysis.b)}
                min={0.2}
                max={2.5}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
              <input
                aria-label="Exact decay speed a"
                type="number"
                min={0.2}
                max={2.5}
                step={0.05}
                value={analysis.a}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setManualParams(Math.max(0.2, Math.min(2.5, v)), analysis.b);
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
                label="Drift knob b (in + b·x·e⁻ˣ)"
                value={analysis.b}
                onChange={(v) => setManualParams(analysis.a, v)}
                min={-1.0}
                max={1.0}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
              <input
                aria-label="Exact drift knob b"
                type="number"
                min={-1.0}
                max={1.0}
                step={0.05}
                value={analysis.b}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setManualParams(analysis.a, Math.max(-1.0, Math.min(1.0, v)));
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

            <NumericField
              label="Labeled point x₀"
              ariaLabel="Labeled data position x0"
              value={dataX}
              min={0.1}
              max={2.5}
              step={0.1}
              onChange={(v) => setDataX(Math.round(v * 10) / 10)}
            />
            <NumericField
              label="Physics weight wₚ (law penalty)"
              ariaLabel="Physics loss weight"
              value={physicsWeight}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={(v) => setPhysicsWeight(Math.round(v * 10) / 10)}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="PINN curve and point colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${trueColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          True solution y = e⁻ˣ
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: predColor, verticalAlign: 'middle', marginRight: 6 }} />
          Network output ŷ(x)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: dataColor, verticalAlign: 'middle', marginRight: 6 }} />
          1 labeled data point (x₀ = {analysis.dataX.toFixed(1)})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: physColor, verticalAlign: 'middle', marginRight: 6 }} />
          6 unlabeled physics points ({mode === 'physicsInformed' ? 'active' : 'ignored'})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 284"
            role="img"
            aria-label={`PINN prediction with a=${analysis.a.toFixed(2)}, b=${analysis.b.toFixed(2)}: data loss ${analysis.dLoss.toFixed(4)}, physics loss ${analysis.pLoss.toFixed(4)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderCurvePanel(0, 444)}
            {renderResidualPanel(456, 304)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 284" role="img" aria-label="PINN predicted curve vs true decay" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 284" role="img" aria-label="Data and physics residual bars" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderResidualPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="PINN total loss" latex={FORMULA_LATEX.total} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Data = <strong>{analysis.dLoss.toFixed(4)}</strong> · Physics = <strong>{analysis.pLoss.toFixed(4)}</strong> · Total = <strong>{analysis.totalLoss.toFixed(4)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${trace.length}`} color="blue" tilt={1} live>
            <p>{activeStep.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Data error (at 1 point)"
              latex={FORMULA_LATEX.data}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'data'}
              onSelect={() => {
                setActiveFormula('data');
                setMode('dataOnly');
              }}
            >
              <p style={{ textAlign: 'center' }}>Checks only the single labeled point x₀; blind everywhere else.</p>
            </StickyNote>
            <StickyNote
              title="2. Physics law error (unlabeled)"
              latex={FORMULA_LATEX.physics}
              color="pink"
              tilt={1}
              active={activeFormula === 'physics'}
              onSelect={() => {
                setActiveFormula('physics');
                setMode('physicsInformed');
              }}
            >
              <p style={{ textAlign: 'center' }}>Checks dy/dx + y = 0 at 6 unlabeled points—no measurements needed.</p>
            </StickyNote>
            <StickyNote
              title="3. Combined PINN loss"
              latex={FORMULA_LATEX.total}
              color="orange"
              tilt={-1}
              active={activeFormula === 'total'}
              onSelect={() => {
                setActiveFormula('total');
                setMode('physicsInformed');
              }}
            >
              <p style={{ textAlign: 'center' }}>Balances the measurement anchor against the physical law everywhere.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · a = ${analysis.a.toFixed(2)}, b = ${analysis.b.toFixed(2)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                At x₀ = {analysis.dataX.toFixed(1)}: ŷ = {analysis.yPredAtData.toFixed(3)} vs true {analysis.yTrueAtData.toFixed(3)} → Data loss = <strong>{analysis.dLoss.toFixed(4)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Physics loss = <strong>{analysis.pLoss.toFixed(4)}</strong>{mode === 'dataOnly' ? ' (ignored!)' : ` × ${analysis.physicsWeight.toFixed(1)}`} → Total = <strong>{analysis.totalLoss.toFixed(4)}</strong> · Gap at x=2: <strong>{analysis.farErrorAt2.toFixed(3)}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Keep 1 labeled point at x₀ = 0.1, set a = 1.0 and b = 0.80, and choose Data loss only. Can data loss catch the large drift out at x = 2.0?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At x₀ = 0.1, ŷ(0.1) is only 0.072 off (L_data = 0.0052), while at x = 2.0 the prediction is off by 0.217. Only physics loss catches that drift."
            actionLabel="Test Data-only drift at (a=1.0, b=0.80) now"
            onAction={() => {
              setMode('dataOnly');
              setActiveFormula('data');
              setDataX(0.1);
              setStartA(1.0);
              setStartB(0.8);
              playback.setStep(0);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function PinnLossDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Physics-informed neural network (PINN) loss playground"
      footer="Exact network curve ŷ(x) = e^(−ax) + b·x·e^(−x) tested against the governing ODE dy/dx + y = 0 at 1 labeled point and 6 unlabeled collocation points."
    >
      <PinnLossPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
