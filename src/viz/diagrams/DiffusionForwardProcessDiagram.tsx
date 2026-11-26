import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  alphaBarAtStep,
  alphaBars as scheduleBars,
  buildDiffusionCheckpoints,
  correlation,
  diffuse,
  explainDiffusionStep,
  firstStepBelow,
  makeSignal,
  seededNoise,
  snrDb,
  type ScheduleKind,
  type SignalKind,
} from '../lib/diffusionForward';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const N_PIXELS = 32;
const CHECKPOINT_FRAMES = 21;

const PREDICT_OPTIONS = [
  'Under 10% (about 7.9% — mostly static already)',
  'Exactly 50% (halfway means half signal)',
  'Over 80% (noise only catches up near step 950)',
] as const;

function DiffusionForwardPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipWaveId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [schedule, setSchedule] = useState<ScheduleKind>('linear');
  const [signal, setSignal] = useState<SignalKind>('bump');
  const [totalSteps, setTotalSteps] = useState(1000);
  const [seed, setSeed] = useState(7);
  const [pixel, setPixel] = useState(7);
  const [manualStep, setManualStep] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const checkpoints = useMemo(
    () => buildDiffusionCheckpoints(totalSteps, CHECKPOINT_FRAMES),
    [totalSteps],
  );
  // Start reduced-motion viewers at frame 5 (~25% of T) where both shape and static are visible.
  const playback = useStepPlayback(checkpoints.length, 650, 5, outerVisible);
  const step = manualStep !== null ? Math.min(totalSteps, Math.max(0, manualStep)) : (checkpoints[playback.step] ?? 0);

  const bars = useMemo(() => scheduleBars(schedule, totalSteps), [schedule, totalSteps]);
  const otherSchedule: ScheduleKind = schedule === 'linear' ? 'cosine' : 'linear';
  const otherBars = useMemo(() => scheduleBars(otherSchedule, totalSteps), [otherSchedule, totalSteps]);
  const x0 = useMemo(() => makeSignal(signal, N_PIXELS), [signal]);
  const eps = useMemo(() => seededNoise(N_PIXELS, seed), [seed]);

  const ab = alphaBarAtStep(bars, step);
  const xt = useMemo(() => diffuse(x0, eps, ab), [x0, eps, ab]);
  const signalWeight = Math.sqrt(ab);
  const noiseWeight = Math.sqrt(1 - ab);
  const corr = useMemo(() => correlation(x0, xt), [x0, xt]);
  const snr = snrDb(ab);
  const tenPctStep = firstStepBelow(bars, 0.1);
  const caption = explainDiffusionStep(step, totalSteps, ab, corr, schedule);

  const cleanColor = t.accentSecondary;
  const noiseColor = t.accentPurple;
  const mixedColor = t.accentPrimary;
  const cursorColor = t.accentDanger;

  const chooseSchedule = (next: ScheduleKind) => {
    setSchedule(next);
    setPrediction(null);
  };

  const setUserStep = (nextStep: number) => {
    playback.stop();
    setManualStep(Math.max(0, Math.min(totalSteps, Math.round(nextStep))));
  };

  const shadeFor = (v: number) => {
    const frac = (Math.max(-2, Math.min(2, v)) + 2) / 4;
    return `color-mix(in srgb, ${cleanColor} ${(frac * 100).toFixed(0)}%, ${t.surfaceAlt})`;
  };

  const renderSignalPanel = (offsetX: number, panelW: number) => {
    const stripX = offsetX + 104;
    const stripW = panelW - 116;
    const cellW = stripW / N_PIXELS;
    const rows: { label: string; values: number[]; col: string }[] = [
      { label: 'x₀ (clean)', values: x0, col: cleanColor },
      { label: 'ε (static)', values: eps, col: noiseColor },
      { label: `x_t (t=${step})`, values: xt, col: mixedColor },
    ];

    const plotX = offsetX + 42;
    const plotY = 136;
    const plotW = panelW - 56;
    const plotH = 134;
    const wx = (i: number) => plotX + (i / (N_PIXELS - 1)) * plotW;
    const wy = (v: number) => plotY + plotH - ((Math.max(-2.2, Math.min(2.2, v)) + 2.2) / 4.4) * plotH;

    const cleanPts = x0.map((v, i) => `${wx(i).toFixed(1)},${wy(v).toFixed(1)}`).join(' ');
    const noisyPts = xt.map((v, i) => `${wx(i).toFixed(1)},${wy(v).toFixed(1)}`).join(' ');
    const px = wx(pixel);
    const py = wy(xt[pixel]);

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          1. Pixels &amp; shape at step t = {step}
        </text>
        {rows.map((row, rIdx) => {
          const ry = 36 + rIdx * 28;
          return (
            <g key={row.label}>
              <text x={offsetX + 8} y={ry + 17} fontSize={14} fontWeight={700} fill={row.col}>
                {row.label}
              </text>
              {row.values.map((v, i) => (
                <rect
                  key={i}
                  x={stripX + i * cellW}
                  y={ry + 2}
                  width={Math.max(2, cellW - 1)}
                  height={20}
                  rx={2}
                  fill={shadeFor(v)}
                  stroke={i === pixel ? cursorColor : 'none'}
                  strokeWidth={2}
                  onClick={() => setPixel(i)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </g>
          );
        })}

        <defs>
          <clipPath id={`${clipWaveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />
        {[-1, 0, 1].map((yt) => (
          <text key={yt} x={plotX - 6} y={wy(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
            {yt}
          </text>
        ))}

        <g clipPath={`url(#${clipWaveId}-${offsetX})`}>
          <line x1={plotX} y1={wy(0)} x2={plotX + plotW} y2={wy(0)} stroke={t.border} strokeDasharray="3 3" />
          <line x1={px} y1={plotY} x2={px} y2={plotY + plotH} stroke={cursorColor} strokeWidth={1.4} strokeDasharray="3 3" />
          <polyline points={cleanPts} fill="none" stroke={cleanColor} strokeWidth={2} strokeDasharray="5 4" />
          <polyline points={noisyPts} fill="none" stroke={mixedColor} strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={px} cy={py} r={4.5} fill={cursorColor} stroke={t.background} strokeWidth={1.4} />
          <text
            x={pixel > 20 ? px - 8 : px + 8}
            y={Math.max(plotY + 18, Math.min(plotY + plotH - 8, py - 8))}
            textAnchor={pixel > 20 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={cursorColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            pixel #{pixel + 1}: {xt[pixel].toFixed(2)}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 24} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          32 pixels across (click any pixel to inspect)
        </text>
      </g>
    );
  };

  const renderSchedulePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 38;
    const plotW = panelW - 60;
    const plotH = 148;
    const cx = (s: number) => plotX + (s / totalSteps) * plotW;
    const cy = (v: number) => plotY + plotH - v * plotH;

    const activePts = [`${cx(0).toFixed(1)},${cy(1).toFixed(1)}`].concat(
      bars.map((v, i) => `${cx(i + 1).toFixed(1)},${cy(v).toFixed(1)}`),
    ).join(' ');
    const otherPts = [`${cx(0).toFixed(1)},${cy(1).toFixed(1)}`].concat(
      otherBars.map((v, i) => `${cx(i + 1).toFixed(1)},${cy(v).toFixed(1)}`),
    ).join(' ');

    const dotX = cx(step);
    const dotY = cy(ab);
    const labelRight = step < totalSteps * 0.52;

    const mixX = offsetX + 14;
    const mixBarX = offsetX + 128;
    const mixBarW = panelW - 202;

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          2. Signal variance kept (ᾱ_t) &amp; mix weights
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        {[0, 0.5, 1].map((tick) => (
          <text key={tick} x={plotX - 8} y={cy(tick) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
            {tick.toFixed(1)}
          </text>
        ))}
        {[0, Math.round(totalSteps / 2), totalSteps].map((tick) => (
          <text key={tick} x={cx(tick)} y={plotY + plotH + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>
            {tick}
          </text>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          <polyline points={otherPts} fill="none" stroke={t.textMuted} strokeWidth={1.8} strokeDasharray="5 4" />
          <polyline points={activePts} fill="none" stroke={mixedColor} strokeWidth={2.6} />
          <line x1={dotX} y1={plotY} x2={dotX} y2={plotY + plotH} stroke={cursorColor} strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={dotX} cy={dotY} r={5} fill={cursorColor} stroke={t.background} strokeWidth={1.4} />
          <text
            x={labelRight ? dotX + 8 : dotX - 8}
            y={Math.max(plotY + 20, Math.min(plotY + plotH - 10, dotY - 8))}
            textAnchor={labelRight ? 'start' : 'end'}
            fontSize={14}
            fontWeight={700}
            fill={cursorColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            t={step}, ᾱ={ab.toFixed(3)}
          </text>
          <text x={plotX + plotW - 6} y={plotY + 18} textAnchor="end" fontSize={14} fill={t.textMuted}>
            dashed: {otherSchedule}
          </text>
        </g>

        <text x={mixX} y={242} fontSize={14} fontWeight={700} fill={cleanColor}>
          Signal √ᾱ
        </text>
        <rect x={mixBarX} y={228} width={mixBarW} height={16} rx={4} fill={t.surfaceAlt} />
        <rect x={mixBarX} y={228} width={Math.max(3, signalWeight * mixBarW)} height={16} rx={4} fill={cleanColor} />
        <text x={offsetX + panelW - 8} y={242} textAnchor="end" fontSize={14} fontWeight={700} fill={cleanColor}>
          {signalWeight.toFixed(3)}
        </text>

        <text x={mixX} y={274} fontSize={14} fontWeight={700} fill={noiseColor}>
          Noise √(1−ᾱ)
        </text>
        <rect x={mixBarX} y={260} width={mixBarW} height={16} rx={4} fill={t.surfaceAlt} />
        <rect x={mixBarX} y={260} width={Math.max(3, noiseWeight * mixBarW)} height={16} rx={4} fill={noiseColor} />
        <text x={offsetX + panelW - 8} y={274} textAnchor="end" fontSize={14} fontWeight={700} fill={noiseColor}>
          {noiseWeight.toFixed(3)}
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
            title="How a clean signal turns into pure static in one jump"
            description="To teach a diffusion model to turn static into a picture, we first add Gaussian noise ε over T steps—and this closed-form formula lets training jump straight to any step t."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <PillSelect<ScheduleKind>
                label="Noise schedule (how fast static takes over)"
                value={schedule}
                onChange={(v) => chooseSchedule(typeof v === 'function' ? v(schedule) : v)}
                options={[
                  { value: 'linear', label: 'Linear β (DDPM)' },
                  { value: 'cosine', label: 'Cosine schedule' },
                ]}
              />
              <PillSelect<SignalKind>
                label="Clean picture x₀ (32 pixels)"
                value={signal}
                onChange={(v) => setSignal(typeof v === 'function' ? v(signal) : v)}
                options={[
                  { value: 'bump', label: 'Smooth hill' },
                  { value: 'step', label: 'Sharp step' },
                  { value: 'two-peaks', label: 'Two peaks' },
                ]}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton
                onClick={() => {
                  setManualStep(null);
                  playback.toggle();
                }}
              >
                {playback.playing && manualStep === null ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualStep(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualStep(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 8 }}>
            <Slider
              label="Current step t (0 = clean, T = static)"
              value={step}
              onChange={setUserStep}
              min={0}
              max={totalSteps}
              step={Math.max(1, Math.round(totalSteps / 100))}
              format={(v) => `${v} / ${totalSteps}`}
            />
            <Slider
              label="Total diffusion steps T"
              value={totalSteps}
              onChange={(v) => {
                setTotalSteps(v);
                setManualStep(null);
              }}
              min={100}
              max={2000}
              step={50}
              format={(v) => `${v} steps`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 10 }}>
            <NumericField
              label="Step t"
              hint={`0 to ${totalSteps}`}
              value={step}
              min={0}
              max={totalSteps}
              step={10}
              onChange={setUserStep}
            />
            <NumericField
              label="Total steps T"
              hint="100 to 2,000"
              value={totalSteps}
              min={100}
              max={2000}
              step={50}
              onChange={(v) => {
                setTotalSteps(v);
                setManualStep(null);
              }}
            />
            <NumericField
              label="Noise seed"
              hint="repeatable static ε"
              value={seed}
              min={1}
              max={9999}
              step={1}
              onChange={setSeed}
            />
            <NumericField
              label="Inspect pixel #"
              hint="1 to 32 (or click strip)"
              value={pixel + 1}
              min={1}
              max={N_PIXELS}
              step={1}
              onChange={(v) => setPixel(v - 1)}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }} aria-label="Diffusion colour legend">
        <span style={{ color: cleanColor }}>● Clean signal x₀ &amp; weight √ᾱ</span>
        <span style={{ color: noiseColor }}>● Random static ε &amp; weight √(1−ᾱ)</span>
        <span style={{ color: mixedColor }}>● Noisy mix x_t &amp; active schedule ᾱ</span>
        <span style={{ color: cursorColor }}>● Current step t &amp; pixel #{pixel + 1}</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 302"
            role="img"
            aria-label={caption}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderSignalPanel(0, 404)}
            <line x1={412} y1={14} x2={412} y2={288} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderSchedulePanel(420, 340)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 380 302" role="img" aria-label="Clean, noise, and noised 32-pixel waveform" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSignalPanel(0, 380)}
            </svg>
            <svg width="100%" viewBox="0 0 380 292" role="img" aria-label="Alpha-bar schedule and signal-noise mix weights" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSchedulePanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Closed-form noising jump"
            latex={String.raw`x_t = \sqrt{\bar{\alpha}_t}\,x_0 + \sqrt{1 - \bar{\alpha}_t}\,\epsilon`}
            color="orange"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              √ᾱ = <strong>{signalWeight.toFixed(3)}</strong> · √(1−ᾱ) = <strong>{noiseWeight.toFixed(3)}</strong> · SNR ={' '}
              <strong>{Number.isFinite(snr) ? `${snr.toFixed(1)} dB` : '∞'}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${step} of ${totalSteps}`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Linear β schedule (DDPM)"
              latex={String.raw`\bar{\alpha}_t = \prod_{s=1}^{t}(1 - \beta_s)`}
              color="yellow"
              tilt={-1}
              active={schedule === 'linear'}
              onSelect={() => chooseSchedule('linear')}
            >
              <p>Each step multiplies by (1−β_s); noise grows fast and ᾱ drops below 0.1 at t = {firstStepBelow(scheduleBars('linear', totalSteps), 0.1) ?? '—'}.</p>
            </StickyNote>
            <StickyNote
              title="2. Cosine schedule"
              latex={String.raw`\bar{\alpha}_t = \frac{\cos^2\!\left(\frac{t/T + s}{1 + s}\frac{\pi}{2}\right)}{\cos^2\!\left(\frac{s}{1 + s}\frac{\pi}{2}\right)}`}
              color="pink"
              tilt={1}
              active={schedule === 'cosine'}
              onSelect={() => chooseSchedule('cosine')}
            >
              <p>Slows down early noise so structure survives past t = T/2 (falls below 0.1 at t = {firstStepBelow(scheduleBars('cosine', totalSteps), 0.1) ?? '—'}).</p>
            </StickyNote>
            <StickyNote
              title="3. Closed-form jump (any step t)"
              latex={String.raw`x_t = \sqrt{\bar{\alpha}_t}\,x_0 + \sqrt{1 - \bar{\alpha}_t}\,\epsilon`}
              color="orange"
              tilt={-1}
            >
              <p>Square roots ensure (√ᾱ)² + (√(1−ᾱ))² = 1 so pixel variance stays steady instead of shrinking.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · pixel #${pixel + 1} at t = ${step}`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                {signalWeight.toFixed(3)} × {x0[pixel].toFixed(2)} + {noiseWeight.toFixed(3)} × {eps[pixel].toFixed(2)} ={' '}
                <strong>{xt[pixel].toFixed(3)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Signal share ᾱ = <strong>{(ab * 100).toFixed(1)}%</strong> · SNR ={' '}
                <strong>{Number.isFinite(snr) ? `${snr.toFixed(1)} dB` : '∞'}</strong> · &lt;0.1 at t = {tenPctStep ?? '—'}
              </p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${step} of ${totalSteps}`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Halfway through (t = 500 of 1,000 steps) using the Linear β schedule, how much of the clean signal's variance ᾱ is still left?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because (1 − β_s) compounds across 500 steps, Linear β already leaves only ᾱ = 0.079 (7.9% variance, amplitude weight √ᾱ = 0.280) at t = 500."
            actionLabel="Jump to t = 500 (Linear) now"
            onAction={() => {
              setSchedule('linear');
              setTotalSteps(1000);
              playback.stop();
              setManualStep(500);
            }}
          />
        </>
      )}
    </>
  );
}

export default function DiffusionForwardProcessDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Diffusion forward process playground"
      footer={
        compact
          ? undefined
          : 'Exact DDPM closed-form forward process on a 32-pixel 1-D signal: linear β schedule (Ho et al., 2020) vs. cosine schedule (Nichol & Dhariwal, 2021). Every pixel and curve value is calculated live.'
      }
    >
      <DiffusionForwardPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
