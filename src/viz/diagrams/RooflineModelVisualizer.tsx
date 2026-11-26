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
  analyzeRoofline,
  BATCH_SWEEP_STEPS,
  formatPerf,
  HARDWARE_PRESETS,
  PRECISION_OPTIONS,
  type HardwareId,
  type PrecisionId,
} from '../lib/roofline';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type RoofFormulaTab = 'roofline' | 'intensity' | 'knee';

const FORMULA_LATEX: Record<RoofFormulaTab, string> = {
  roofline: String.raw`P(I) = \min\!\left(P_{\text{peak}},\; I \cdot B_{\text{mem}}\right)`,
  intensity: String.raw`I = \frac{2 \times B}{b}`,
  knee: String.raw`I_{\text{knee}} = \frac{P_{\text{peak}}}{B_{\text{mem}}}`,
};

const PREDICT_OPTIONS = [
  'Speed stays at 2.04 TFLOP/s — the memory bus is already 100% saturated',
  'Decode speed doubles immediately to 4.08 TFLOP/s',
  'The knee shifts left so batch = 1 turns compute-bound',
] as const;

function NumericSpecInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
      <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>{label}</span>
      <input
        aria-label={label}
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
          border: `1.5px solid ${t.border}`,
          borderRadius: RADIUS.sm,
          background: t.background,
          color: t.textPrimary,
          fontFamily: FONT_FAMILY,
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </label>
  );
}

function RooflinePlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipPlotId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [hardwareId, setHardwareId] = useState<HardwareId>('a100');
  const [peakCompute, setPeakCompute] = useState<number>(312);
  const [bandwidthGBs, setBandwidthGBs] = useState<number>(2039);
  const [precision, setPrecision] = useState<PrecisionId>('fp16');
  const [manualBatch, setManualBatch] = useState<number | null>(null);
  const [activeFormula, setActiveFormula] = useState<RoofFormulaTab>('roofline');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(BATCH_SWEEP_STEPS.length, 1800, 0, outerVisible);
  const activeBatch = manualBatch ?? BATCH_SWEEP_STEPS[playback.step] ?? 1;

  const analysis = useMemo(
    () =>
      analyzeRoofline({
        peakComputeTflops: peakCompute,
        memoryBandwidthGBs: bandwidthGBs,
        batchSize: activeBatch,
        precision,
      }),
    [peakCompute, bandwidthGBs, activeBatch, precision],
  );

  const memColor = t.accentDanger;
  const compColor = t.accentPrimary;
  const kneeColor = t.accentPurple;
  const altColor = t.accentSecondary;

  const selectHardware = (next: HardwareId | ((curr: HardwareId) => HardwareId)) => {
    const val = typeof next === 'function' ? next(hardwareId) : next;
    const spec = HARDWARE_PRESETS.find((h) => h.id === val) ?? HARDWARE_PRESETS[1];
    setHardwareId(val);
    setPeakCompute(spec.peakComputeTflops);
    setBandwidthGBs(spec.memoryBandwidthGBs);
    setPrediction(null);
  };

  const whatHappened = analysis.isMemoryBound
    ? `Batch B = ${analysis.batchSize} (${analysis.precision.toUpperCase()}) gives intensity I = ${analysis.intensity.toFixed(1)} FLOP/B, below knee ${analysis.kneeIntensity.toFixed(0)} FLOP/B. Memory bandwidth saturates at ${formatPerf(analysis.attainableTflops)} (${analysis.computeUtilPct.toFixed(1)}% of chip peak).`
    : `Batch B = ${analysis.batchSize} (${analysis.precision.toUpperCase()}) reaches I = ${analysis.intensity.toFixed(1)} FLOP/B ≥ knee ${analysis.kneeIntensity.toFixed(0)} FLOP/B. Math cores saturate at ${formatPerf(analysis.peakComputeTflops)} (100% peak).`;

  const renderRooflinePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 246;
    const padL = 58;
    const padR = 18;
    const padT = 22;
    const padB = 42;
    const innerW = plotW - padL - padR;
    const innerH = plotH - padT - padB;

    // Log-log axis bounds following Williams et al. (2009)
    const minLogI = Math.log10(0.25);
    const maxLogI = Math.log10(2048);
    const maxP = analysis.peakComputeTflops * 1.45;
    const minP = analysis.peakComputeTflops / 1200;
    const minLogP = Math.log10(minP);
    const maxLogP = Math.log10(maxP);

    const mapX = (iVal: number) => {
      const li = Math.log10(Math.max(0.25, Math.min(2048, iVal)));
      return plotX + padL + ((li - minLogI) / (maxLogI - minLogI)) * innerW;
    };
    const mapY = (pVal: number) => {
      const lp = Math.log10(Math.max(minP, Math.min(maxP, pVal)));
      return plotY + padT + innerH - ((lp - minLogP) / (maxLogP - minLogP)) * innerH;
    };

    const clampedKneeX = Math.max(plotX + padL + 4, Math.min(plotX + padL + innerW - 4, mapX(analysis.kneeIntensity)));
    const roofY = mapY(analysis.peakComputeTflops);
    const rampStartX = mapX(0.25);
    const rampStartY = mapY(0.25 * analysis.bandwidthTBs);
    const endX = mapX(2048);
    const opX = mapX(analysis.intensity);
    const opY = mapY(analysis.attainableTflops);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Log-log roofline (Williams et al., 2009)
        </text>
        <defs>
          <clipPath id={`${clipPlotId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipPlotId}-${offsetX})`}>
          <line x1={plotX + padL} y1={plotY + padT} x2={plotX + padL} y2={plotY + padT + innerH} stroke={t.border} strokeWidth={1.3} />
          <line x1={plotX + padL} y1={plotY + padT + innerH} x2={plotX + padL + innerW} y2={plotY + padT + innerH} stroke={t.border} strokeWidth={1.3} />

          {[1, 10, 100, 1000].map((tick) => (
            <g key={`xt-${tick}`}>
              <line x1={mapX(tick)} y1={plotY + padT + innerH} x2={mapX(tick)} y2={plotY + padT + innerH + 4} stroke={t.border} />
              <text x={mapX(tick)} y={plotY + padT + innerH + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>{tick}</text>
            </g>
          ))}
          <text x={plotX + padL + innerW / 2} y={plotY + plotH - 5} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Arithmetic intensity I (FLOPs / byte, log scale)
          </text>

          <text x={plotX + padL - 6} y={roofY + 5} textAnchor="end" fontSize={14} fill={compColor} fontWeight={700}>
            {analysis.peakComputeTflops >= 1 ? analysis.peakComputeTflops.toFixed(0) : `${(analysis.peakComputeTflops * 1000).toFixed(2)}G`}
          </text>
          <text x={plotX + padL - 6} y={plotY + padT + innerH + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
            {analysis.peakComputeTflops >= 1 ? 'low' : '0'}
          </text>

          {/* Memory bandwidth slope */}
          <line x1={rampStartX} y1={rampStartY} x2={clampedKneeX} y2={roofY} stroke={memColor} strokeWidth={3} strokeLinecap="round" />
          {/* Compute ceiling */}
          <line x1={clampedKneeX} y1={roofY} x2={endX} y2={roofY} stroke={compColor} strokeWidth={3} strokeLinecap="round" />

          {/* Knee guide and dot */}
          <line x1={clampedKneeX} y1={roofY} x2={clampedKneeX} y2={plotY + padT + innerH} stroke={kneeColor} strokeWidth={1.3} strokeDasharray="4 4" />
          <circle cx={clampedKneeX} cy={roofY} r={5.5} fill={kneeColor} stroke={t.background} strokeWidth={1.5} />
          <text
            x={clampedKneeX > plotX + padL + innerW * 0.72 ? clampedKneeX - 8 : clampedKneeX + 8}
            y={roofY - 9}
            textAnchor={clampedKneeX > plotX + padL + innerW * 0.72 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={kneeColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            knee {analysis.kneeIntensity.toFixed(0)}
          </text>

          {/* Current operating point */}
          <line x1={opX} y1={plotY + padT + innerH} x2={opX} y2={opY} stroke={analysis.isMemoryBound ? memColor : compColor} strokeWidth={1.5} strokeDasharray="3 3" />
          <circle
            cx={opX}
            cy={opY}
            r={7}
            fill={analysis.isMemoryBound ? memColor : compColor}
            stroke={t.background}
            strokeWidth={1.8}
          />
          <text
            x={opX > plotX + padL + innerW * 0.65 ? opX - 10 : opX + 10}
            y={Math.min(plotY + padT + innerH - 12, opY + 18)}
            textAnchor={opX > plotX + padL + innerW * 0.65 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={analysis.isMemoryBound ? memColor : compColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            B={analysis.batchSize} ({formatPerf(analysis.attainableTflops)})
          </text>
        </g>
      </g>
    );
  };

  const renderUtilizationPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 246;
    const barW = plotW - 24;

    const meters = [
      { label: `Compute units busy (${analysis.computeUtilPct.toFixed(1)}%)`, pct: analysis.computeUtilPct, col: compColor },
      { label: `Memory bus busy (${analysis.bandwidthUtilPct.toFixed(1)}%)`, pct: analysis.bandwidthUtilPct, col: memColor },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Bottleneck &amp; 2× upgrade test
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          {meters.map((m, idx) => {
            const y = plotY + 24 + idx * 54;
            return (
              <g key={m.label}>
                <text x={plotX + 12} y={y} fontSize={14} fontWeight={700} fill={m.col}>{m.label}</text>
                <rect x={plotX + 12} y={y + 8} width={barW} height={18} rx={4} fill={t.surfaceAlt} />
                <rect x={plotX + 12} y={y + 8} width={Math.max(3, (m.pct / 100) * barW)} height={18} rx={4} fill={m.col} />
              </g>
            );
          })}

          <line x1={plotX + 12} y1={plotY + 132} x2={plotX + plotW - 12} y2={plotY + 132} stroke={t.border} strokeDasharray="4 4" />
          <text x={plotX + 12} y={plotY + 154} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            If you upgrade 1 part by 2×:
          </text>

          <text x={plotX + 12} y={plotY + 180} fontSize={14} fill={altColor}>
            2× faster math cores → <tspan fontWeight={700}>{analysis.doubleComputeSpeedup.toFixed(2)}×</tspan>
          </text>
          <rect x={plotX + 12} y={plotY + 186} width={barW} height={10} rx={3} fill={t.surfaceAlt} />
          <rect x={plotX + 12} y={plotY + 186} width={Math.max(4, (analysis.doubleComputeSpeedup / 2) * barW)} height={10} rx={3} fill={altColor} />

          <text x={plotX + 12} y={plotY + 216} fontSize={14} fill={kneeColor}>
            2× faster memory bus → <tspan fontWeight={700}>{analysis.doubleBandwidthSpeedup.toFixed(2)}×</tspan>
          </text>
          <rect x={plotX + 12} y={plotY + 222} width={barW} height={10} rx={3} fill={t.surfaceAlt} />
          <rect x={plotX + 12} y={plotY + 222} width={Math.max(4, (analysis.doubleBandwidthSpeedup / 2) * barW)} height={10} rx={3} fill={kneeColor} />
        </g>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 280px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why memory speed caps single-user chat while batching puts chip math to work"
                description="This solves why a fast GPU sits idle on one chat token: the Roofline plots whichever ceiling comes first — memory bandwidth on the left slope, or peak compute on the flat roof."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualBatch(null);
                  playback.toggle();
                }}
              >
                {playback.playing && manualBatch === null ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualBatch(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualBatch(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<HardwareId>
              label="Target hardware chip"
              value={hardwareId}
              onChange={selectHardware}
              options={HARDWARE_PRESETS.map((h) => ({ value: h.id, label: h.label }))}
            />
            <PillSelect<PrecisionId>
              label="Weight precision b (bytes per weight)"
              value={precision}
              onChange={(v) => {
                setPrecision(typeof v === 'function' ? v(precision) : v);
                setPrediction(null);
              }}
              options={PRECISION_OPTIONS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <Slider
                label="Batch size B (tokens at once)"
                value={activeBatch}
                onChange={(v) => {
                  playback.stop();
                  setManualBatch(v);
                }}
                min={1}
                max={512}
                step={1}
              />
            </div>
            <NumericSpecInput
              label="Exact batch size B"
              value={activeBatch}
              min={1}
              max={1024}
              step={1}
              onChange={(v) => {
                playback.stop();
                setManualBatch(Math.round(v));
              }}
            />
            <NumericSpecInput
              label="Peak compute (TFLOP/s)"
              value={peakCompute}
              min={0.00001}
              max={10000}
              step={10}
              onChange={(v) => {
                setPeakCompute(v);
                setPrediction(null);
              }}
            />
            <NumericSpecInput
              label="Memory speed (GB/s)"
              value={bandwidthGBs}
              min={0.1}
              max={20000}
              step={50}
              onChange={(v) => {
                setBandwidthGBs(v);
                setPrediction(null);
              }}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Roofline plot colours">
        <span><span style={{ display: 'inline-block', width: 18, height: 4, background: memColor, verticalAlign: 'middle', marginRight: 6 }} />Memory-bandwidth ramp (slope)</span>
        <span><span style={{ display: 'inline-block', width: 18, height: 4, background: compColor, verticalAlign: 'middle', marginRight: 6 }} />Compute ceiling (flat roof)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: kneeColor, verticalAlign: 'middle', marginRight: 6 }} />Ridge knee point</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`Roofline plot: batch ${analysis.batchSize} has intensity ${analysis.intensity.toFixed(1)} FLOP/B and reaches ${formatPerf(analysis.attainableTflops)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderRooflinePanel(0, 452)}
            {renderUtilizationPanel(460, 300)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Log-log roofline ceiling" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRooflinePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Chip utilization and 2x upgrade effect" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderUtilizationPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Roofline speed" latex={FORMULA_LATEX.roofline} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              I = <strong>{analysis.intensity.toFixed(1)}</strong> FLOP/B · Speed = <strong>{formatPerf(analysis.attainableTflops)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${BATCH_SWEEP_STEPS.length}`} color="blue" tilt={1} live>
            <p>{whatHappened}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Roofline ceiling"
              latex={FORMULA_LATEX.roofline}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'roofline'}
              onSelect={() => setActiveFormula('roofline')}
            >
              <p style={{ textAlign: 'center' }}>Attainable speed is the lower of compute peak and memory traffic speed.</p>
            </StickyNote>
            <StickyNote
              title="2. Arithmetic intensity"
              latex={FORMULA_LATEX.intensity}
              color="pink"
              tilt={1}
              active={activeFormula === 'intensity'}
              onSelect={() => setActiveFormula('intensity')}
            >
              <p style={{ textAlign: 'center' }}>B = tokens in batch, b = bytes per weight (2 for FP16, 1 for FP8, 0.5 for INT4).</p>
            </StickyNote>
            <StickyNote
              title="3. Ridge knee point"
              latex={FORMULA_LATEX.knee}
              color="orange"
              tilt={-1}
              active={activeFormula === 'knee'}
              onSelect={() => setActiveFormula('knee')}
            >
              <p style={{ textAlign: 'center' }}>Below the knee: memory-bound. Above the knee: compute-bound.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · B = ${analysis.batchSize}, ${analysis.precision.toUpperCase()}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                I = (2 × {analysis.batchSize}) ÷ {analysis.bytesPerWeight} = <strong>{analysis.intensity.toFixed(1)} FLOP/B</strong> · Knee = <strong>{analysis.kneeIntensity.toFixed(1)} FLOP/B</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Speed = <strong>{formatPerf(analysis.attainableTflops)}</strong> ({analysis.computeUtilPct.toFixed(1)}% of peak) ·{' '}
                <strong>{analysis.isMemoryBound ? 'Memory-bound' : 'Compute-bound'}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${BATCH_SWEEP_STEPS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{whatHappened}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="You run batch B = 1 decode in FP16 on NVIDIA A100 (I = 1.0 FLOP/B). If you double peak Tensor FLOPs from 312 to 624 TFLOP/s without changing memory bandwidth, what happens?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At I = 1.0, memory bandwidth limits speed to 1.0 × 2.039 = 2.04 TFLOP/s. Faster math units just sit idle even longer until you raise batch size or shrink weights."
            actionLabel="Test 2× A100 compute at B = 1 now"
            onAction={() => {
              setHardwareId('a100');
              setPeakCompute(624);
              setBandwidthGBs(2039);
              setPrecision('fp16');
              playback.stop();
              setManualBatch(1);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function RooflineModelVisualizer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Roofline Model & Arithmetic Intensity playground"
      footer="Exact log-log Roofline equation from Williams, Waterman & Patterson (2009) using published chip peak compute and memory bandwidth specifications."
    >
      <RooflinePlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
