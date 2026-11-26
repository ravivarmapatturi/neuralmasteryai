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
  analyzeDistribution,
  DEFAULT_CATEGORICAL_WORDS,
  type CategoricalWordInput,
  type DistributionFamily,
} from '../lib/distributionExplorer';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const FORMULA_LATEX: Record<DistributionFamily, string> = {
  bernoulli: String.raw`P(X=1)=p,\; \sigma^2=p(1-p)`,
  binomial: String.raw`P(k)=\binom{n}{k}p^k(1-p)^{n-k}`,
  gaussian: String.raw`f(x)=\frac{1}{\sigma\sqrt{2\pi}}e^{-(x-\mu)^2/(2\sigma^2)}`,
  categorical: String.raw`p_i=\frac{e^{z_i/T}}{\sum_j e^{z_j/T}}`,
};

const PREDICT_OPTIONS = [
  'Variance doubles too (from 2.50 to 5.00), making the count curve wider',
  'Variance drops in half (from 2.50 to 1.25)',
  'Variance stays frozen at 2.50 no matter how many flips you do',
] as const;

function NumericInputField({
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
  onChange: (v: number) => void;
}) {
  const t = useVizTokens();
  return (
    <input
      aria-label={ariaLabel || label}
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
  );
}

function DistributionExplorerPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipLeftId = useId();
  const clipRightId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [family, setFamily] = useState<DistributionFamily>('binomial');
  const [p, setP] = useState<number>(0.5);
  const [n, setN] = useState<number>(10);
  const [mu, setMu] = useState<number>(0.0);
  const [sigma, setSigma] = useState<number>(1.0);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [catWords, setCatWords] = useState<CategoricalWordInput[]>(() =>
    DEFAULT_CATEGORICAL_WORDS.map((w) => ({ ...w })),
  );
  const [prediction, setPrediction] = useState<number | null>(null);

  const stepCount = family === 'bernoulli' ? 2 : 5;
  const playback = useStepPlayback(stepCount, 1850, family === 'bernoulli' ? 1 : 2, outerVisible);

  const analysis = useMemo(
    () =>
      analyzeDistribution({
        family,
        p,
        n,
        mu,
        sigma,
        temperature,
        categoricalWords: catWords,
        probeStep: playback.step,
      }),
    [family, p, n, mu, sigma, temperature, catWords, playback.step],
  );

  const barColor = t.accentSecondary;
  const activeColor = t.accentPrimary;
  const meanColor = t.accentPurple;
  const spreadColor = t.accentWarn;

  const selectFamily = (nextFamily: DistributionFamily) => {
    setFamily(nextFamily);
    playback.setStep(nextFamily === 'bernoulli' ? 1 : 2);
  };

  const updateLogit = (idx: number, val: number) => {
    const clamped = Math.max(-3, Math.min(4, Math.round(val * 100) / 100));
    setCatWords((prev) => prev.map((item, i) => (i === idx ? { ...item, logit: clamped } : item)));
  };

  const renderShapePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 48;
    const plotY = 34;
    const plotW = panelW - 60;
    const plotH = 194;

    if (analysis.isContinuous) {
      const xMin = -4.5;
      const xMax = 4.5;
      const maxPdf = Math.max(0.45, ...analysis.curve.map((pt) => pt.pdf)) * 1.15;
      const px = (x: number) => plotX + ((x - xMin) / (xMax - xMin)) * plotW;
      const py = (d: number) => plotY + plotH - (d / maxPdf) * (plotH - 10);
      const yBase = py(0);

      const curvePath = analysis.curve
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${px(pt.x).toFixed(1)},${py(pt.pdf).toFixed(1)}`)
        .join(' ');
      const fullAreaPath = `${curvePath} L${px(xMax).toFixed(1)},${yBase.toFixed(1)} L${px(xMin).toFixed(1)},${yBase.toFixed(1)} Z`;

      const shadePts = analysis.curve.filter((pt) => pt.x <= analysis.probeValue);
      const shadeAreaPath =
        shadePts.length > 0
          ? `M${px(shadePts[0].x).toFixed(1)},${yBase.toFixed(1)} ` +
            shadePts.map((pt) => `L${px(pt.x).toFixed(1)},${py(pt.pdf).toFixed(1)}`).join(' ') +
            ` L${px(analysis.probeValue).toFixed(1)},${py(analysis.probeProbOrDensity).toFixed(1)} L${px(analysis.probeValue).toFixed(1)},${yBase.toFixed(1)} Z`
          : '';

      const muX = px(analysis.mean ?? 0);
      const sdLeftX = px((analysis.mean ?? 0) - (analysis.stdDev ?? 1));
      const sdRightX = px((analysis.mean ?? 0) + (analysis.stdDev ?? 1));
      const probeX = px(analysis.probeValue);
      const probeY = py(analysis.probeProbOrDensity);

      return (
        <g>
          <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
            1. Bell density f(x) (shaded = {(analysis.probeCdf * 100).toFixed(1)}%)
          </text>
          <defs>
            <clipPath id={`${clipLeftId}-${offsetX}`}>
              <rect x={plotX} y={plotY} width={plotW} height={plotH} />
            </clipPath>
          </defs>
          <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

          {[0, maxPdf * 0.45, maxPdf * 0.9].map((yt, idx) => (
            <g key={`gy-${idx}`}>
              <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
              <text x={plotX - 7} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
                {yt.toFixed(2)}
              </text>
            </g>
          ))}
          {[-4, -2, 0, 2, 4].map((xt) => (
            <g key={`gx-${xt}`}>
              <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
              <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
                {xt}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipLeftId}-${offsetX})`}>
            <path d={fullAreaPath} fill={barColor} fillOpacity={0.14} />
            {shadeAreaPath && <path d={shadeAreaPath} fill={activeColor} fillOpacity={0.32} />}
            <path d={curvePath} fill="none" stroke={barColor} strokeWidth={2.5} />

            {/* ±1σ spread bracket */}
            <line x1={sdLeftX} y1={plotY + 22} x2={sdRightX} y2={plotY + 22} stroke={spreadColor} strokeWidth={2.2} />
            <line x1={sdLeftX} y1={plotY + 17} x2={sdLeftX} y2={plotY + 27} stroke={spreadColor} strokeWidth={2} />
            <line x1={sdRightX} y1={plotY + 17} x2={sdRightX} y2={plotY + 27} stroke={spreadColor} strokeWidth={2} />
            <text x={(sdLeftX + sdRightX) / 2} y={plotY + 15} textAnchor="middle" fontSize={14} fontWeight={700} fill={spreadColor}>
              ±1σ
            </text>

            {/* Mean μ dashed line */}
            <line x1={muX} y1={plotY + 28} x2={muX} y2={yBase} stroke={meanColor} strokeWidth={1.8} strokeDasharray="4 3" />

            {/* Current probe cutoff */}
            <line x1={probeX} y1={probeY} x2={probeX} y2={yBase} stroke={activeColor} strokeWidth={2} />
            <circle cx={probeX} cy={probeY} r={5} fill={activeColor} stroke={t.background} strokeWidth={1.5} />
          </g>

          <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Value x · Mean μ = {analysis.mean?.toFixed(1)} · Spread σ = {analysis.stdDev?.toFixed(1)}
          </text>
        </g>
      );
    }

    // Discrete distribution (Bernoulli, Binomial, Categorical)
    const count = analysis.bars.length;
    const maxProb = Math.max(0.15, ...analysis.bars.map((b) => b.prob)) * 1.15;
    const py = (prob: number) => plotY + plotH - (prob / maxProb) * (plotH - 12);
    const slotW = plotW / Math.max(1, count);
    const barW = Math.max(6, Math.min(44, slotW * 0.68));
    const showTick = (idx: number) => {
      if (count <= 8) return true;
      const step = Math.ceil(count / 5);
      if (idx === 0 || idx === count - 1) return true;
      return idx % step === 0 && count - 1 - idx >= Math.ceil(step * 0.6);
    };

    const meanPx =
      analysis.mean !== null && count > 1
        ? plotX + ((analysis.mean + 0.5) / count) * plotW
        : null;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Outcome probabilities (click a bar)
        </text>
        <defs>
          <clipPath id={`${clipLeftId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, maxProb * 0.45, maxProb * 0.9].map((yt, idx) => (
          <g key={`dy-${idx}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 7} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {Math.round(yt * 100)}%
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipLeftId}-${offsetX})`}>
          {analysis.bars.map((bar, idx) => {
            const cx = plotX + (idx + 0.5) * slotW;
            const bx = cx - barW / 2;
            const by = py(bar.prob);
            const bh = Math.max(2, plotY + plotH - by);
            const isHighlighted =
              analysis.family === 'categorical'
                ? idx === analysis.probeIndex
                : idx <= analysis.probeIndex;
            const isExactProbe = idx === analysis.probeIndex;
            const fill = isExactProbe ? activeColor : isHighlighted ? activeColor : barColor;

            return (
              <g
                key={bar.label}
                onClick={() => playback.setStep(idx)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={bx}
                  y={by}
                  width={barW}
                  height={bh}
                  rx={3}
                  fill={fill}
                  fillOpacity={isExactProbe ? 0.92 : isHighlighted ? 0.55 : 0.78}
                  stroke={isExactProbe ? t.textPrimary : 'none'}
                  strokeWidth={isExactProbe ? 1.5 : 0}
                />
              </g>
            );
          })}

          {meanPx !== null && (
            <>
              <line x1={meanPx} y1={plotY + 22} x2={meanPx} y2={plotY + plotH} stroke={meanColor} strokeWidth={2} strokeDasharray="4 3" />
              <text
                x={Math.min(plotX + plotW - 26, Math.max(plotX + 26, meanPx))}
                y={plotY + 17}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fill={meanColor}
              >
                μ = {analysis.mean?.toFixed(1)}
              </text>
            </>
          )}
        </g>

        {analysis.bars.map((bar, idx) =>
          showTick(idx) ? (
            <text
              key={`xt-${bar.label}`}
              x={plotX + (idx + 0.5) * slotW}
              y={plotY + plotH + 20}
              textAnchor="middle"
              fontSize={14}
              fontWeight={idx === analysis.probeIndex ? 700 : 400}
              fill={idx === analysis.probeIndex ? activeColor : t.textMuted}
            >
              {bar.label}
            </text>
          ) : null,
        )}

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.family === 'categorical'
            ? `Candidate next words · Sum = ${analysis.totalMass.toFixed(2)}`
            : `Outcomes · Sum = ${analysis.totalMass.toFixed(2)}`}
        </text>
      </g>
    );
  };

  const renderCumulativePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 48;
    const plotY = 34;
    const plotW = panelW - 60;
    const plotH = 194;

    if (analysis.family === 'categorical') {
      const barMaxW = Math.max(70, plotW - 126);
      return (
        <g>
          <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
            2. Next-word odds &amp; cumulative share
          </text>
          <defs>
            <clipPath id={`${clipRightId}-${offsetX}`}>
              <rect x={plotX} y={plotY} width={plotW} height={plotH} />
            </clipPath>
          </defs>
          <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

          <g clipPath={`url(#${clipRightId}-${offsetX})`}>
            {analysis.bars.map((bar, idx) => {
              const ry = plotY + 14 + idx * 35;
              const isFocus = idx === analysis.probeIndex;
              const col = isFocus ? activeColor : barColor;
              return (
                <g key={`cw-${bar.label}`} onClick={() => playback.setStep(idx)} style={{ cursor: 'pointer' }}>
                  <text x={plotX + 8} y={ry + 18} fontSize={14} fontWeight={700} fill={isFocus ? activeColor : t.textPrimary}>
                    “{bar.label}”
                  </text>
                  <rect x={plotX + 58} y={ry + 6} width={barMaxW} height={14} rx={3} fill={t.surfaceAlt} />
                  <rect x={plotX + 58} y={ry + 6} width={Math.max(3, bar.prob * barMaxW)} height={14} rx={3} fill={col} fillOpacity={0.85} />
                  <text x={plotX + plotW - 8} y={ry + 18} textAnchor="end" fontSize={14} fontWeight={700} fill={col}>
                    {(bar.prob * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </g>

          <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Temp T = {temperature.toFixed(1)} · Entropy = {analysis.entropyBits.toFixed(2)} bits
          </text>
        </g>
      );
    }

    // Numeric CDF curve P(X <= x)
    const xMin = analysis.isContinuous ? -4.5 : -0.5;
    const xMax = analysis.isContinuous ? 4.5 : analysis.bars.length - 0.5;
    const px = (x: number) => plotX + ((x - xMin) / (xMax - xMin)) * plotW;
    const py = (cdf: number) => plotY + plotH - cdf * (plotH - 12);

    const cdfPoints = analysis.isContinuous
      ? analysis.curve.map((pt) => `${px(pt.x).toFixed(1)},${py(pt.cdf).toFixed(1)}`).join(' ')
      : analysis.bars
          .map((b, idx) => {
            const xL = px(idx - 0.5);
            const xR = px(idx + 0.5);
            const yP = py(idx === 0 ? 0 : analysis.bars[idx - 1].cdf);
            const yC = py(b.cdf);
            return `${xL.toFixed(1)},${yP.toFixed(1)} ${xL.toFixed(1)},${yC.toFixed(1)} ${xR.toFixed(1)},${yC.toFixed(1)}`;
          })
          .join(' ');

    const probeX = px(analysis.probeValue);
    const probeY = py(analysis.probeCdf);
    const pctLabel = `${(analysis.probeCdf * 100).toFixed(1)}%`;
    const labelLeft = probeX > plotX + plotW - 95;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Cumulative chance P(X ≤ x)
        </text>
        <defs>
          <clipPath id={`${clipRightId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, 0.5, 1.0].map((yt) => (
          <g key={`cy-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 7} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {Math.round(yt * 100)}%
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipRightId}-${offsetX})`}>
          <line x1={plotX} y1={py(0.5)} x2={plotX + plotW} y2={py(0.5)} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
          <polyline points={cdfPoints} fill="none" stroke={activeColor} strokeWidth={2.6} strokeLinejoin="round" />
          <line x1={probeX} y1={probeY} x2={probeX} y2={plotY + plotH} stroke={activeColor} strokeWidth={1.5} strokeDasharray="3 3" />
          <line x1={plotX} y1={probeY} x2={probeX} y2={probeY} stroke={activeColor} strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={probeX} cy={probeY} r={5.5} fill={activeColor} stroke={t.background} strokeWidth={1.5} />
          <text
            x={labelLeft ? probeX - 10 : probeX + 10}
            y={Math.max(plotY + 20, Math.min(plotY + plotH - 12, probeY - 10))}
            textAnchor={labelLeft ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={activeColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            {pctLabel}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          P(X ≤ {analysis.isContinuous ? analysis.probeValue.toFixed(1) : analysis.probeValue}) = {pctLabel}
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
                title="How AI probability distributions describe uncertainty"
                description="Instead of one rigid answer, models output a spread of probabilities. Switch between a single coin flip (Bernoulli), repeated hits (Binomial), a bell curve (Gaussian), and an LLM's next-word choices (Categorical)."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ marginBottom: -4 }}>
            <PillSelect<DistributionFamily>
              label="Distribution family (what kind of randomness)"
              value={family}
              onChange={(val) => selectFamily(typeof val === 'function' ? val(family) : val)}
              options={[
                { value: 'bernoulli', label: 'Bernoulli (1 flip)' },
                { value: 'binomial', label: 'Binomial (n flips)' },
                { value: 'gaussian', label: 'Gaussian (bell curve)' },
                { value: 'categorical', label: 'Categorical (LLM next word)' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
            {(family === 'bernoulli' || family === 'binomial') && (
              <div>
                <Slider
                  label="Hit chance p (probability of 1)"
                  value={p}
                  onChange={setP}
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  format={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <NumericInputField
                  label="Exact chance p"
                  ariaLabel="Exact hit probability p"
                  value={p}
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  onChange={setP}
                />
              </div>
            )}

            {family === 'binomial' && (
              <div>
                <Slider
                  label="Number of trials n (flips)"
                  value={n}
                  onChange={setN}
                  min={2}
                  max={24}
                  step={1}
                  format={(v) => `${v} flips`}
                />
                <NumericInputField
                  label="Exact number of trials n"
                  ariaLabel="Exact trial count n"
                  value={n}
                  min={2}
                  max={24}
                  step={1}
                  onChange={setN}
                />
              </div>
            )}

            {family === 'gaussian' && (
              <>
                <div>
                  <Slider
                    label="Center μ (mean)"
                    value={mu}
                    onChange={setMu}
                    min={-2.0}
                    max={2.0}
                    step={0.1}
                    format={(v) => v.toFixed(1)}
                  />
                  <NumericInputField
                    label="Exact mean mu"
                    ariaLabel="Exact Gaussian mean mu"
                    value={mu}
                    min={-2.0}
                    max={2.0}
                    step={0.1}
                    onChange={setMu}
                  />
                </div>
                <div>
                  <Slider
                    label="Spread σ (standard deviation)"
                    value={sigma}
                    onChange={setSigma}
                    min={0.4}
                    max={2.2}
                    step={0.1}
                    format={(v) => v.toFixed(1)}
                  />
                  <NumericInputField
                    label="Exact spread sigma"
                    ariaLabel="Exact Gaussian std dev sigma"
                    value={sigma}
                    min={0.4}
                    max={2.2}
                    step={0.1}
                    onChange={setSigma}
                  />
                </div>
              </>
            )}

            {family === 'categorical' && (
              <>
                <div>
                  <Slider
                    label="Temperature T (sharp vs flat)"
                    value={temperature}
                    onChange={setTemperature}
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    format={(v) => v.toFixed(1)}
                  />
                  <NumericInputField
                    label="Exact temperature T"
                    ariaLabel="Exact softmax temperature T"
                    value={temperature}
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    onChange={setTemperature}
                  />
                </div>
                {catWords.slice(0, 3).map((cw, idx) => (
                  <label key={cw.word} style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
                    <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                      Word “{cw.word}” score z
                    </span>
                    <NumericInputField
                      label={`Score for ${cw.word}`}
                      ariaLabel={`Logit score for ${cw.word}`}
                      value={cw.logit}
                      min={-3}
                      max={4}
                      step={0.1}
                      onChange={(v) => updateLogit(idx, v)}
                    />
                  </label>
                ))}
              </>
            )}
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Distribution colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: activeColor, verticalAlign: 'middle', marginRight: 6 }} />
          Highlighted / cumulative P(X ≤ x)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: barColor, verticalAlign: 'middle', marginRight: 6 }} />
          Full probability shape
        </span>
        {analysis.mean !== null && (
          <span>
            <span style={{ display: 'inline-block', width: 16, borderTop: `2.5px dashed ${meanColor}`, verticalAlign: 'middle', marginRight: 6 }} />
            Mean μ ({analysis.mean.toFixed(2)})
          </span>
        )}
        {analysis.stdDev !== null && (
          <span>
            <span style={{ display: 'inline-block', width: 16, borderTop: `2.5px solid ${spreadColor}`, verticalAlign: 'middle', marginRight: 6 }} />
            Spread σ ({analysis.stdDev.toFixed(2)})
          </span>
        )}
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 292"
            role="img"
            aria-label={`${family} distribution: probe ${analysis.probeLabel}, probability ${(analysis.probeProbOrDensity * 100).toFixed(1)}%`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderShapePanel(0, 414)}
            {renderCumulativePanel(424, 336)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Distribution probability shape" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderShapePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Cumulative probability or next-word ranking" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCumulativePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Formula · ${family}`} latex={FORMULA_LATEX[family]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {analysis.mean !== null
                ? `Mean μ = ${analysis.mean.toFixed(2)} · Var σ² = ${analysis.variance?.toFixed(2)}`
                : `Top word: ${analysis.bars[0]?.label} (${(analysis.bars[0]?.prob * 100).toFixed(1)}%)`}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.probeStepCount}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Bernoulli (1 flip)"
              latex={FORMULA_LATEX.bernoulli}
              color="yellow"
              tilt={-1}
              active={family === 'bernoulli'}
              onSelect={() => selectFamily('bernoulli')}
            >
              <p style={{ textAlign: 'center' }}>p = chance of Hit (1); σ² = variance (spread).</p>
            </StickyNote>
            <StickyNote
              title="2. Binomial (n flips)"
              latex={FORMULA_LATEX.binomial}
              color="pink"
              tilt={1}
              active={family === 'binomial'}
              onSelect={() => selectFamily('binomial')}
            >
              <p style={{ textAlign: 'center' }}>n = flips, k = hits, p = Hit chance per flip.</p>
            </StickyNote>
            <StickyNote
              title="3. Gaussian (bell)"
              latex={FORMULA_LATEX.gaussian}
              color="orange"
              tilt={-1}
              active={family === 'gaussian'}
              onSelect={() => selectFamily('gaussian')}
            >
              <p style={{ textAlign: 'center' }}>μ = center (peak), σ = spread (std dev).</p>
            </StickyNote>
            <StickyNote
              title="4. Categorical (LLM)"
              latex={FORMULA_LATEX.categorical}
              color="yellow"
              tilt={1}
              active={family === 'categorical'}
              onSelect={() => selectFamily('categorical')}
            >
              <p style={{ textAlign: 'center' }}>z_i = word score, T = temp (low sharpens).</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${family}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                {analysis.mean !== null
                  ? <>Mean μ = <strong>{analysis.mean.toFixed(2)}</strong> · Variance σ² = <strong>{analysis.variance?.toFixed(2)}</strong> · Spread σ = <strong>{analysis.stdDev?.toFixed(2)}</strong></>
                  : <>5-word probabilities sum to <strong>{analysis.totalMass.toFixed(3)}</strong> · Entropy = <strong>{analysis.entropyBits.toFixed(2)} bits</strong></>}
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                At {analysis.probeLabel}: {analysis.isContinuous ? 'density' : 'chance'} = <strong>{analysis.probeProbOrDensity.toFixed(3)}</strong> · Cumulative = <strong>{(analysis.probeCdf * 100).toFixed(1)}%</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.probeStepCount} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Set Binomial with n = 10 coin flips and p = 0.50 (variance σ² = n·p·(1−p) = 2.50). If you double n to 20 flips, what happens to the variance?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because each independent flip adds p(1−p) = 0.25 variance, doubling n from 10 to 20 doubles σ² from 2.50 to 5.00 (and widens σ from 1.58 to 2.24)."
            actionLabel="Test Binomial n = 20, p = 0.50 now"
            onAction={() => {
              selectFamily('binomial');
              setP(0.5);
              setN(20);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function DistributionExplorerDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Probability distribution explorer playground"
      footer="Exact PMF/PDF, cumulative probability P(X ≤ x), mean μ, variance σ², and softmax temperature calculations computed live from the analytical formulas."
    >
      <DistributionExplorerPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
