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
  analyzeLimeLocal,
  LIME_DOMAIN,
  LIME_RADIUS,
} from '../lib/limeLocalApprox';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'They stay negative because feature importance is global',
  'Both b₁ and b₂ flip from negative to positive on the opposite rim',
  'Both weights drop to zero everywhere',
] as const;

type LimeFormulaTab = 'kernel' | 'surrogate' | 'fit';

const FORMULA_LATEX: Record<LimeFormulaTab, string> = {
  kernel: String.raw`w_i = \exp\!\left(-\frac{\|x_i - x_0\|^2}{2\sigma^2}\right)`,
  surrogate: String.raw`\hat{y} = b_0 + b_1 x + b_2 y`,
  fit: String.raw`\min_{b} \sum_i w_i\,\big(f(x_i) - \hat{y}(x_i)\big)^2`,
};

const LOCATION_PRESETS = [
  { id: 'upper-right', label: 'Upper-right (1.0, 0.5)', x: 1.0, y: 0.5 },
  { id: 'opposite', label: 'Opposite (−1.0, −0.5)', x: -1.0, y: -0.5 },
  { id: 'center', label: 'Center (0.0, 0.0)', x: 0.0, y: 0.0 },
] as const;

function LimeLocalApproxPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipPlotId = useId();
  const clipWeightsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [instX, setInstX] = useState<number>(1.0);
  const [instY, setInstY] = useState<number>(0.5);
  const [sigma, setSigma] = useState<number>(0.3);
  const [sampleCount, setSampleCount] = useState<number>(26);
  const [activeFormula, setActiveFormula] = useState<LimeFormulaTab>('fit');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeLimeLocal({ instX, instY, sigma, sampleCount, seed: 7 }),
    [instX, instY, sigma, sampleCount],
  );

  const playback = useStepPlayback(analysis.trace.length, 2100, 3, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[3];

  const boundaryColor = t.accentSecondary;
  const approveColor = t.accentPrimary;
  const lineColor = t.accentDanger;
  const instanceColor = t.accentPurple;

  const activePresetId =
    LOCATION_PRESETS.find((p) => Math.abs(p.x - instX) < 1e-4 && Math.abs(p.y - instY) < 1e-4)?.id ?? 'custom';

  const inputStyle: React.CSSProperties = {
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
  };

  const renderBoundaryPanel = (offsetX: number, panelW: number) => {
    const size = 228;
    const plotX = offsetX + Math.round((panelW - size) / 2) + 12;
    const plotY = 34;
    const plotW = size;
    const plotH = size;

    const px = (x: number) => plotX + ((x - LIME_DOMAIN.min) / (LIME_DOMAIN.max - LIME_DOMAIN.min)) * plotW;
    const py = (y: number) => plotY + plotH - ((y - LIME_DOMAIN.min) / (LIME_DOMAIN.max - LIME_DOMAIN.min)) * plotH;
    const unitPx = plotW / (LIME_DOMAIN.max - LIME_DOMAIN.min);

    const handlePlotClick = (e: React.MouseEvent<SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const vx = ((e.clientX - rect.left) / rect.width) * vb.width;
      const vy = ((e.clientY - rect.top) / rect.height) * vb.height;
      if (vx < plotX || vx > plotX + plotW || vy < plotY || vy > plotY + plotH) return;
      const nx = LIME_DOMAIN.min + ((vx - plotX) / plotW) * (LIME_DOMAIN.max - LIME_DOMAIN.min);
      const ny = LIME_DOMAIN.max - ((vy - plotY) / plotH) * (LIME_DOMAIN.max - LIME_DOMAIN.min);
      setInstX(Number(Math.max(-1.5, Math.min(1.5, nx)).toFixed(1)));
      setInstY(Number(Math.max(-1.5, Math.min(1.5, ny)).toFixed(1)));
      playback.setStep(3);
    };

    const showPerturb = playback.step >= 1;
    const showWeights = playback.step >= 2;
    const showLine = playback.step >= 3;

    const ixPx = px(analysis.instX);
    const iyPx = py(analysis.instY);
    const placeLabelLeft = analysis.instX > 0.3;

    return (
      <g onClick={handlePlotClick} style={{ cursor: 'crosshair' }}>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Black-box circle vs. LIME straight line (click plot)
        </text>
        <defs>
          <clipPath id={`${clipPlotId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />
        <line x1={plotX} y1={py(0)} x2={plotX + plotW} y2={py(0)} stroke={t.border} strokeWidth={1} opacity={0.45} />
        <line x1={px(0)} y1={plotY} x2={px(0)} y2={plotY + plotH} stroke={t.border} strokeWidth={1} opacity={0.45} />

        {[-2, -1, 0, 1, 2].map((tick) => (
          <g key={`lt-${tick}`}>
            <text x={px(tick)} y={plotY + plotH + 17} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {tick}
            </text>
            <text x={plotX - 8} y={py(tick) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {tick}
            </text>
          </g>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Feature x
        </text>
        <text x={plotX - 34} y={plotY + plotH / 2} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          y
        </text>

        <g clipPath={`url(#${clipPlotId}-${offsetX})`}>
          {/* True circular black-box boundary */}
          <circle
            cx={px(0)}
            cy={py(0)}
            r={LIME_RADIUS * unitPx}
            fill={boundaryColor}
            fillOpacity={0.08}
            stroke={boundaryColor}
            strokeWidth={1.8}
            strokeDasharray="5 4"
          />

          {/* Kernel sigma neighborhood ring */}
          {showWeights && (
            <circle
              cx={ixPx}
              cy={iyPx}
              r={analysis.sigma * unitPx}
              fill={instanceColor}
              fillOpacity={0.07}
              stroke={instanceColor}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

          {/* Perturbed samples */}
          {showPerturb &&
            analysis.points.map((pt, i) => (
              <circle
                key={`lp-${i}`}
                cx={px(pt.x)}
                cy={py(pt.y)}
                r={showWeights ? 2.5 + pt.weight * 5.5 : 3.5}
                fill={pt.prob > 0.5 ? approveColor : t.textMuted}
                fillOpacity={showWeights ? 0.25 + pt.weight * 0.7 : 0.7}
              />
            ))}

          {/* Clipped LIME local linear boundary */}
          {showLine && analysis.boundarySegment && (
            <line
              x1={px(analysis.boundarySegment.x1)}
              y1={py(analysis.boundarySegment.y1)}
              x2={px(analysis.boundarySegment.x2)}
              y2={py(analysis.boundarySegment.y2)}
              stroke={lineColor}
              strokeWidth={2.8}
            />
          )}

          {/* Target instance */}
          <circle cx={ixPx} cy={iyPx} r={6.5} fill={instanceColor} stroke={t.background} strokeWidth={2} />
          <text
            x={placeLabelLeft ? ixPx - 10 : ixPx + 10}
            y={analysis.instY > 1.1 ? iyPx + 18 : iyPx - 10}
            textAnchor={placeLabelLeft ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={instanceColor}
            stroke={t.background}
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            instance
          </text>
        </g>
      </g>
    );
  };

  const renderWeightsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 14;
    const plotY = 34;
    const plotW = panelW - 28;
    const plotH = 232;
    const barW = plotW - 24;
    const midX = plotX + 12 + barW / 2;
    const halfW = barW / 2;

    const maxAbsCoef = Math.max(1.0, Math.abs(analysis.b1), Math.abs(analysis.b2), Math.abs(analysis.trueGradX), Math.abs(analysis.trueGradY));

    const coefRows = [
      { label: 'b₁ (weight on x)', val: analysis.b1, trueGrad: analysis.trueGradX },
      { label: 'b₂ (weight on y)', val: analysis.b2, trueGrad: analysis.trueGradY },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Local feature weights at ({analysis.instX.toFixed(1)}, {analysis.instY.toFixed(1)})
        </text>
        <defs>
          <clipPath id={`${clipWeightsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipWeightsId}-${offsetX})`}>
          {coefRows.map((row, idx) => {
            const ry = plotY + 18 + idx * 56;
            const col = row.val >= 0 ? approveColor : lineColor;
            const w = Math.min(halfW - 4, (Math.abs(row.val) / maxAbsCoef) * (halfW - 4));
            const gx = midX + (row.trueGrad / maxAbsCoef) * (halfW - 4);
            return (
              <g key={row.label} opacity={playback.step >= 3 ? 1 : 0.35}>
                <text x={plotX + 12} y={ry + 6} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {row.label}
                </text>
                <text x={plotX + plotW - 12} y={ry + 6} textAnchor="end" fontSize={14} fontWeight={700} fill={col}>
                  {row.val >= 0 ? '+' : ''}{row.val.toFixed(2)} (true {row.trueGrad >= 0 ? '+' : ''}{row.trueGrad.toFixed(2)})
                </text>
                <rect x={plotX + 12} y={ry + 14} width={barW} height={14} rx={3} fill={t.surfaceAlt} />
                <rect
                  x={row.val >= 0 ? midX : midX - w}
                  y={ry + 14}
                  width={Math.max(3, w)}
                  height={14}
                  rx={2}
                  fill={col}
                  fillOpacity={0.85}
                />
                <line x1={midX} y1={ry + 11} x2={midX} y2={ry + 31} stroke={t.border} strokeWidth={1.4} />
                <line x1={gx} y1={ry + 11} x2={gx} y2={ry + 31} stroke={boundaryColor} strokeWidth={2} strokeDasharray="3 2" />
              </g>
            );
          })}

          <line x1={plotX + 12} y1={plotY + 128} x2={plotX + plotW - 12} y2={plotY + 128} stroke={t.border} strokeWidth={1} />

          <text x={plotX + 12} y={plotY + 152} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Score at instance:
          </text>
          <text x={plotX + plotW - 12} y={plotY + 152} textAnchor="end" fontSize={14} fontWeight={700} fill={boundaryColor}>
            true {(analysis.instanceTrueProb * 100).toFixed(0)}% · fit {(analysis.instanceSurrogateProb * 100).toFixed(0)}%
          </text>

          <text x={plotX + 12} y={plotY + 186} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Local straight-line fit R²
          </text>
          <text x={plotX + plotW - 12} y={plotY + 186} textAnchor="end" fontSize={15} fontWeight={700} fill={analysis.localR2 >= 0.7 ? approveColor : t.accentWarn}>
            {(analysis.localR2 * 100).toFixed(0)}%
          </text>
          <rect x={plotX + 12} y={plotY + 195} width={barW} height={14} rx={3} fill={t.surfaceAlt} />
          <rect
            x={plotX + 12}
            y={plotY + 195}
            width={Math.max(4, analysis.localR2 * barW)}
            height={14}
            rx={3}
            fill={analysis.localR2 >= 0.7 ? approveColor : t.accentWarn}
            fillOpacity={0.85}
          />
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Dashed vertical mark = true calculus slope at (x, y)
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
                title="How LIME explains a curved black-box model with one local straight line"
                description="A complex model can bend in curves that no single straight rule explains globally. LIME zooms around one chosen point, generates nearby nudged samples weighted by distance width σ, and fits a simple local line right around that point."
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
              <PillSelect<string>
                label="Instance location presets"
                value={activePresetId}
                onChange={(id) => {
                  const found = LOCATION_PRESETS.find((p) => p.id === id);
                  if (found) {
                    setInstX(found.x);
                    setInstY(found.y);
                  }
                }}
                options={[
                  ...LOCATION_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom point' }] : []),
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Perturbed sample count N"
                value={sampleCount}
                onChange={(v) => setSampleCount(v)}
                options={[
                  { value: 14, label: '14 samples' },
                  { value: 26, label: '26 samples' },
                  { value: 48, label: '48 samples' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Instance x"
              value={instX}
              onChange={(v) => setInstX(v)}
              min={-1.5}
              max={1.5}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Instance y"
              value={instY}
              onChange={(v) => setInstY(v)}
              min={-1.5}
              max={1.5}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Neighborhood width σ (kernel radius)"
              value={sigma}
              onChange={(v) => setSigma(v)}
              min={0.2}
              max={1.6}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact width σ</span>
              <input
                aria-label="Exact kernel width sigma"
                type="number"
                min={0.2}
                max={1.6}
                step={0.1}
                value={sigma}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setSigma(Math.max(0.2, Math.min(1.6, Number(v.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="LIME plot colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${boundaryColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          True curved boundary
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 3, background: lineColor, verticalAlign: 'middle', marginRight: 6 }} />
          LIME local straight line
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: approveColor, verticalAlign: 'middle', marginRight: 6 }} />
          Samples inside (p &gt; 50%)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: instanceColor, verticalAlign: 'middle', marginRight: 6 }} />
          Target instance &amp; σ ring
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 314"
            role="img"
            aria-label={`LIME fit around (${analysis.instX.toFixed(1)}, ${analysis.instY.toFixed(1)}) with sigma=${analysis.sigma.toFixed(1)}: weights b1=${analysis.b1.toFixed(2)}, b2=${analysis.b2.toFixed(2)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderBoundaryPanel(0, 394)}
            {renderWeightsPanel(408, 352)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 314" role="img" aria-label="True circle vs LIME local line" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBoundaryPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 314" role="img" aria-label="Local linear feature weights" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderWeightsPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="LIME local linear fit" latex={FORMULA_LATEX.surrogate} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              ŷ = {analysis.b0.toFixed(2)} + ({analysis.b1.toFixed(2)})x + ({analysis.b2.toFixed(2)})y · R² = {(analysis.localR2 * 100).toFixed(0)}%
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{activeStep.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Proximity kernel weight"
              latex={FORMULA_LATEX.kernel}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'kernel'}
              onSelect={() => setActiveFormula('kernel')}
            >
              <p style={{ textAlign: 'center' }}>Nearby nudged samples get weight near 1; samples beyond σ fade toward 0.</p>
            </StickyNote>
            <StickyNote
              title="2. Local straight-line model"
              latex={FORMULA_LATEX.surrogate}
              color="pink"
              tilt={1}
              active={activeFormula === 'surrogate'}
              onSelect={() => setActiveFormula('surrogate')}
            >
              <p style={{ textAlign: 'center' }}>Simple plane whose slopes b₁, b₂ act as feature explanations right here.</p>
            </StickyNote>
            <StickyNote
              title="3. Weighted least squares"
              latex={FORMULA_LATEX.fit}
              color="orange"
              tilt={-1}
              active={activeFormula === 'fit'}
              onSelect={() => setActiveFormula('fit')}
            >
              <p style={{ textAlign: 'center' }}>Fits b₀, b₁, b₂ to match the black box f(x) weighted by w_i.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · (${analysis.instX.toFixed(1)}, ${analysis.instY.toFixed(1)}), σ = ${analysis.sigma.toFixed(1)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                ŷ = <strong>{analysis.b0.toFixed(2)}</strong> + (<strong>{analysis.b1.toFixed(2)}</strong>)x + (<strong>{analysis.b2.toFixed(2)}</strong>)y
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Black-box p = <strong>{(analysis.instanceTrueProb * 100).toFixed(1)}%</strong> vs LIME ŷ = <strong>{(analysis.instanceSurrogateProb * 100).toFixed(1)}%</strong> · Local R² = <strong>{(analysis.localR2 * 100).toFixed(0)}%</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · ${activeStep.title}`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Move the instance from the upper-right rim (1.0, 0.5) to the opposite rim (−1.0, −0.5) with tight σ = 0.3. What happens to the local weights b₁ and b₂?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because the circle slopes upward toward center from (−1.0, −0.5), LIME refits from scratch and flips both slopes from negative to positive."
            actionLabel="Move to (−1.0, −0.5) now"
            onAction={() => {
              setInstX(-1.0);
              setInstY(-0.5);
              setSigma(0.3);
              playback.setStep(3);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function LimeLocalApproxDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="LIME local linear approximation playground"
      footer="Real weighted least-squares local surrogate fit against f(x, y) = sigmoid(3·(1.5² − x² − y²)). Click anywhere on the plot or adjust x, y, σ to refit live."
    >
      <LimeLocalApproxPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
