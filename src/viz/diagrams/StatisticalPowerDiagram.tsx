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
  analyzeStatisticalPower,
  POWER_PRESETS,
  type AlphaLevel,
} from '../lib/statisticalPower';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type PowerFormulaTab = 'se' | 'zEffect' | 'power';

const FORMULA_LATEX: Record<PowerFormulaTab, string> = {
  se: String.raw`\text{SE} = \sqrt{\frac{2\,\bar{p}\,(1-\bar{p})}{n}}`,
  zEffect: String.raw`z_{\text{effect}} = \frac{|p_2 - p_1|}{\text{SE}}`,
  power: String.raw`\text{Power} = \Phi(z_{\text{effect}} - z_{\alpha/2})`,
};

const PREDICT_OPTIONS = [
  'Under 10% — random coin-flip noise hides a +5 pt gain at n = 20',
  'About 50% — half of small 20-example studies detect it',
  'Over 80% — 20 examples per side is enough for a 5 pt gain',
] as const;

function StatisticalPowerPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipBellId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [baseline, setBaseline] = useState<number>(0.5);
  const [effectSize, setEffectSize] = useState<number>(0.05);
  const [alpha, setAlpha] = useState<AlphaLevel>(0.05);
  const [manualN, setManualN] = useState<number | null>(null);
  const [activeFormula, setActiveFormula] = useState<PowerFormulaTab>('power');
  const [prediction, setPrediction] = useState<number | null>(null);

  // Compute playback sample sizes tailored to the current baseline/effect/alpha.
  const basePlan = useMemo(
    () => analyzeStatisticalPower({ baseline, effectSize, n: 20, alpha }),
    [baseline, effectSize, alpha],
  );
  const playback = useStepPlayback(basePlan.playbackNs.length, 1850, 0, outerVisible);
  const activeN = manualN ?? basePlan.playbackNs[playback.step] ?? 20;

  const analysis = useMemo(
    () => analyzeStatisticalPower({ baseline, effectSize, n: activeN, alpha }),
    [baseline, effectSize, activeN, alpha],
  );

  const h0Color = t.accentSecondary;
  const powerColor = t.accentPrimary;
  const missColor = t.accentDanger;
  const markerColor = t.accentWarn;

  const activePresetId =
    POWER_PRESETS.find(
      (p) =>
        Math.abs(p.baseline - baseline) < 1e-3 &&
        Math.abs(p.effectSize - effectSize) < 1e-3 &&
        p.n === analysis.n,
    )?.id ?? 'custom';

  const selectN = (nextN: number) => {
    playback.stop();
    setManualN(Math.max(5, Math.min(3000, Math.round(nextN))));
  };

  const renderBellPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 24;
    const plotY = 36;
    const plotW = panelW - 38;
    const plotH = 198;

    const maxDensity = Math.max(1, ...analysis.bellCurve.flatMap((pt) => [pt.h0, pt.h1]));
    const px = (x: number) =>
      plotX + ((x - analysis.domainMin) / (analysis.domainMax - analysis.domainMin)) * plotW;
    const py = (d: number) => plotY + plotH - (d / (maxDensity * 1.24)) * plotH;

    const h0Path = analysis.bellCurve
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${px(pt.x).toFixed(1)},${py(pt.h0).toFixed(1)}`)
      .join(' ');
    const h1Path = analysis.bellCurve
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${px(pt.x).toFixed(1)},${py(pt.h1).toFixed(1)}`)
      .join(' ');

    const cutX = px(analysis.cutoffDiff);
    const yBase = py(0);

    // Build filled polygon areas under H1 left and right of cutoffDiff
    const powerPts = analysis.bellCurve.filter((pt) => pt.x >= analysis.cutoffDiff);
    const missPts = analysis.bellCurve.filter((pt) => pt.x <= analysis.cutoffDiff);

    const buildArea = (pts: typeof analysis.bellCurve, clampSide: 'left' | 'right') => {
      if (pts.length === 0) return '';
      const edgeX = clampSide === 'right' ? px(Math.max(analysis.cutoffDiff, analysis.domainMin)) : px(Math.min(analysis.cutoffDiff, analysis.domainMax));
      const startY = py(pts[0].h1);
      const endY = py(pts[pts.length - 1].h1);
      const body = pts.map((pt) => `${px(pt.x).toFixed(1)},${py(pt.h1).toFixed(1)}`).join(' L');
      if (clampSide === 'right') {
        return `M${edgeX.toFixed(1)},${yBase.toFixed(1)} L${edgeX.toFixed(1)},${startY.toFixed(1)} L${body} L${px(pts[pts.length - 1].x).toFixed(1)},${yBase.toFixed(1)} Z`;
      }
      return `M${px(pts[0].x).toFixed(1)},${yBase.toFixed(1)} L${body} L${edgeX.toFixed(1)},${endY.toFixed(1)} L${edgeX.toFixed(1)},${yBase.toFixed(1)} Z`;
    };

    const h0PeakX = px(0);
    const h1PeakX = px(analysis.effectSize);
    const peakLabelY = plotY + 20;
    const tooClose = Math.abs(h1PeakX - h0PeakX) < 110;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Noise (H₀) vs real +{(analysis.effectSize * 100).toFixed(1)} pt gain (H₁)
        </text>
        <defs>
          <clipPath id={`${clipBellId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[-0.1, 0, 0.1, 0.2, 0.3]
          .filter((xt) => xt >= analysis.domainMin + 0.01 && xt <= analysis.domainMax - 0.01)
          .map((xt) => (
            <g key={`bx-${xt}`}>
              <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
              <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
                {xt === 0 ? '0' : `${xt > 0 ? '+' : ''}${Math.round(xt * 100)}`}
              </text>
            </g>
          ))}

        <g clipPath={`url(#${clipBellId}-${offsetX})`}>
          {missPts.length > 1 && <path d={buildArea(missPts, 'left')} fill={missColor} fillOpacity={0.22} />}
          {powerPts.length > 1 && <path d={buildArea(powerPts, 'right')} fill={powerColor} fillOpacity={0.32} />}

          <path d={h0Path} fill="none" stroke={h0Color} strokeWidth={2} strokeDasharray="5 4" />
          <path d={h1Path} fill="none" stroke={powerColor} strokeWidth={2.5} />

          {/* Significance cutoff line */}
          <line x1={cutX} y1={plotY + 26} x2={cutX} y2={plotY + plotH} stroke={markerColor} strokeWidth={2} strokeDasharray="4 3" />
          <text
            x={Math.min(plotX + plotW - 6, Math.max(plotX + 6, cutX + (cutX > plotX + plotW * 0.68 ? -6 : 6)))}
            y={plotY + 42}
            textAnchor={cutX > plotX + plotW * 0.68 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={markerColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            Need ≥ +{(analysis.cutoffDiff * 100).toFixed(1)} pts
          </text>

          <text
            x={Math.max(plotX + 44, tooClose ? h0PeakX - 18 : h0PeakX)}
            y={peakLabelY}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={h0Color}
            stroke={t.background}
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            No gain (0)
          </text>
          <text
            x={Math.min(plotX + plotW - 54, tooClose ? Math.max(h0PeakX + 86, h1PeakX + 12) : h1PeakX)}
            y={peakLabelY}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={powerColor}
            stroke={t.background}
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            Real (+{(analysis.effectSize * 100).toFixed(1)})
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Measured win-rate gap (pts) · SE = ±{(analysis.se * 100).toFixed(1)} pts
        </text>
      </g>
    );
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 60;
    const plotH = 198;

    const px = (nn: number) => plotX + (nn / analysis.chartMaxN) * plotW;
    const py = (pw: number) => plotY + plotH - pw * (plotH - 12);

    const pts = analysis.powerCurve
      .map((pt) => `${px(pt.n).toFixed(1)},${py(pt.power).toFixed(1)}`)
      .join(' ');
    const curX = px(analysis.n);
    const curY = py(analysis.power);
    const nTicks = [0, Math.round(analysis.chartMaxN / 2), analysis.chartMaxN];
    const reqNVisible = analysis.requiredN80 <= analysis.chartMaxN;
    const dotLabelLeft = curX > plotX + plotW - 108;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Detection power vs sample size n
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, 0.5, 0.8, 1.0].map((yt) => (
          <g key={`py-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={yt === 0.8 ? t.textPrimary : t.textMuted}>
              {Math.round(yt * 100)}%
            </text>
          </g>
        ))}

        {nTicks.map((nt) => (
          <g key={`pn-${nt}`}>
            <line x1={px(nt)} y1={plotY + plotH} x2={px(nt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(nt)} y={plotY + plotH + 20} textAnchor={nt === analysis.chartMaxN ? 'end' : 'middle'} fontSize={14} fill={t.textMuted}>
              {nt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          {/* 80% reliability goal line */}
          <line x1={plotX} y1={py(0.8)} x2={plotX + plotW} y2={py(0.8)} stroke={t.textSecondary} strokeWidth={1.3} strokeDasharray="4 3" />
          <text x={plotX + 8} y={py(0.8) - 6} fontSize={14} fontWeight={700} fill={t.textSecondary}>
            80% goal
          </text>

          {/* Vertical marker for required n80 */}
          {reqNVisible && (
            <line
              x1={px(analysis.requiredN80)}
              y1={py(0.8)}
              x2={px(analysis.requiredN80)}
              y2={plotY + plotH}
              stroke={powerColor}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={0.7}
            />
          )}

          {/* Power curve */}
          <polyline points={pts} fill="none" stroke={powerColor} strokeWidth={2.6} strokeLinejoin="round" />

          {/* Current n marker */}
          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={markerColor} strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={curX} cy={curY} r={5.5} fill={markerColor} stroke={t.background} strokeWidth={1.5} />

          <text
            x={dotLabelLeft ? curX - 10 : curX + 10}
            y={Math.max(plotY + 20, Math.min(plotY + plotH - 12, curY - 10))}
            textAnchor={dotLabelLeft ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={markerColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            {(analysis.power * 100).toFixed(1)}% (n={analysis.n})
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Need n ≈ {analysis.requiredN80.toLocaleString('en-US')} per group for 80% power
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
                title="Why a 20-example eval hides real model improvements"
                description="When you test two models on only 20 examples, random coin-flip luck is huge—so a genuine +5 point improvement gets buried in noise. Compute statistical power before running a human eval to see how many samples you actually need."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualN(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualN(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualN(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Study presets"
                value={activePresetId}
                onChange={(id) => {
                  const found = POWER_PRESETS.find((p) => p.id === id);
                  if (found) {
                    setBaseline(found.baseline);
                    setEffectSize(found.effectSize);
                    selectN(found.n);
                    setPrediction(null);
                  }
                }}
                options={[
                  ...POWER_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom study' }] : []),
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<AlphaLevel>
                label="False-alarm bar α (significance)"
                value={alpha}
                onChange={(val) => setAlpha(val)}
                options={[
                  { value: 0.1, label: 'α = 0.10' },
                  { value: 0.05, label: 'α = 0.05 (std)' },
                  { value: 0.01, label: 'α = 0.01' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="True gain Δ = p₂ − p₁ (win-rate lift)"
                value={effectSize * 100}
                onChange={(pts) => setEffectSize(Math.round(pts * 2) / 200)}
                min={1}
                max={20}
                step={0.5}
                format={(pts) => `+${pts.toFixed(1)} pts`}
              />
              <input
                aria-label="Exact true effect size in percentage points"
                type="number"
                min={1}
                max={25}
                step={0.5}
                value={Number((effectSize * 100).toFixed(1))}
                onChange={(e) => {
                  const pts = Number(e.target.value);
                  if (Number.isFinite(pts)) setEffectSize(Math.max(0.01, Math.min(0.25, pts / 100)));
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
                label="Sample size n (raters per group)"
                value={analysis.n}
                onChange={selectN}
                min={5}
                max={2500}
                step={5}
                format={(v) => `${v}`}
              />
              <input
                aria-label="Exact sample size n per group"
                type="number"
                min={5}
                max={3000}
                step={5}
                value={analysis.n}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) selectN(v);
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
              label="Baseline win rate p₁"
              value={baseline}
              onChange={(v) => setBaseline(Math.round(v * 20) / 20)}
              min={0.1}
              max={0.8}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}% vs ${Math.round(Math.min(0.99, v + effectSize) * 100)}%`}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Statistical power colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${h0Color}`, verticalAlign: 'middle', marginRight: 6 }} />
          No real difference (H₀)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 12, background: powerColor, opacity: 0.6, verticalAlign: 'middle', marginRight: 6 }} />
          Power = {(analysis.power * 100).toFixed(1)}% (detected!)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 12, background: missColor, opacity: 0.45, verticalAlign: 'middle', marginRight: 6 }} />
          Missed real gain β = {(analysis.missRate * 100).toFixed(1)}%
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: markerColor, verticalAlign: 'middle', marginRight: 6 }} />
          Your study (n = {analysis.n})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 286"
            role="img"
            aria-label={`Statistical power at n=${analysis.n} and effect +${(analysis.effectSize * 100).toFixed(1)} pts is ${(analysis.power * 100).toFixed(1)}%`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderBellPanel(0, 392)}
            {renderCurvePanel(404, 356)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Null vs alternative sampling distributions" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBellPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Statistical power curve over sample size n" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Statistical power (1 − β)" latex={FORMULA_LATEX.power} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              n = <strong>{analysis.n}</strong> · Power = <strong>{(analysis.power * 100).toFixed(1)}%</strong> · Need n ≈ <strong>{analysis.requiredN80.toLocaleString('en-US')}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.playbackNs.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Sampling noise (SE)"
              latex={FORMULA_LATEX.se}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'se'}
              onSelect={() => setActiveFormula('se')}
            >
              <p style={{ textAlign: 'center' }}>Spread of random luck shrinks like 1/√n—to halve noise, collect 4× more examples.</p>
            </StickyNote>
            <StickyNote
              title="2. Signal-to-noise ratio"
              latex={FORMULA_LATEX.zEffect}
              color="pink"
              tilt={1}
              active={activeFormula === 'zEffect'}
              onSelect={() => setActiveFormula('zEffect')}
            >
              <p style={{ textAlign: 'center' }}>Measures how many standard errors wide the real win-rate gap is.</p>
            </StickyNote>
            <StickyNote
              title="3. Detection power (1 − β)"
              latex={FORMULA_LATEX.power}
              color="orange"
              tilt={-1}
              active={activeFormula === 'power'}
              onSelect={() => setActiveFormula('power')}
            >
              <p style={{ textAlign: 'center' }}>Share of the real-gain bell that clears the false-alarm bar z.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · n = ${analysis.n} per side (${Math.round(analysis.baseline * 100)}% vs ${Math.round(analysis.target * 100)}%)`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Noise SE = <strong>±{(analysis.se * 100).toFixed(2)} pts</strong> · Signal/noise z = <strong>{analysis.zEffect.toFixed(2)}</strong> · Cutoff = <strong>+{(analysis.cutoffDiff * 100).toFixed(1)} pts</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Power = <strong>{(analysis.power * 100).toFixed(1)}%</strong> (miss β = {(analysis.missRate * 100).toFixed(1)}%) · 80% goal needs <strong>n = {analysis.requiredN80.toLocaleString('en-US')}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.playbackNs.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Model B truly improves win rate from 50% to 55% (+5.0 pts). You run a study with only n = 20 examples per side. Roughly what chance do you have of detecting it?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At n = 20, SE = ±15.8 pts, so you need a +31 pt fluke to pass α = 0.05. Real power is only 6.1%—missing a true 5 pt improvement 94% of the time."
            actionLabel="Test +5.0 pts at n = 20 now"
            onAction={() => {
              setBaseline(0.5);
              setEffectSize(0.05);
              setAlpha(0.05);
              selectN(20);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function StatisticalPowerDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Evaluation statistical power playground"
      footer="Exact two-proportion z-test power and required n₈₀ calculation. Smaller real gains require quadratically larger evaluation suites (halving Δ requires 4× more samples)."
    >
      <StatisticalPowerPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
