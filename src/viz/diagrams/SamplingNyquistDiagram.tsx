import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchArrow } from '../../components/notebook/RoughShape';
import {
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  NYQUIST_PRESETS,
  NYQUIST_STEPS,
  WINDOW_MS,
  analyzeSampling,
  explainNyquistStep,
  type NyquistPresetId,
} from '../lib/samplingNyquist';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  '3 kHz (folded: |7 − 10|)',
  '7 kHz (unchanged)',
  '5 kHz (clamped at Nyquist)',
] as const;

function SamplingNyquistPlayground({ compact = false, outerVisible }: { compact?: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);
  const [presetId, setPresetId] = useState<NyquistPresetId | 'custom'>('aliased-7-at-10');
  const [freqKHz, setFreqKHz] = useState(7.0);
  const [sampleRateKHz, setSampleRateKHz] = useState(10.0);
  const [antiAliasFilter, setAntiAliasFilter] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(NYQUIST_STEPS.length, 2100, 3, outerVisible);
  const step = playback.step;

  const analysis = useMemo(
    () => analyzeSampling({ freqKHz, sampleRateKHz, antiAliasFilter }),
    [freqKHz, sampleRateKHz, antiAliasFilter],
  );

  // Distinct consistent colours everywhere (Blue = true tone, Green = snapshots, Purple = Nyquist limit, Red = fake alias)
  const trueColor = t.accentSecondary;
  const sampleColor = t.accentPrimary;
  const nyquistColor = t.accentPurple;
  const aliasColor = t.accentDanger;

  const applyPreset = (id: NyquistPresetId) => {
    const found = NYQUIST_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPresetId(id);
    setFreqKHz(found.freqKHz);
    setSampleRateKHz(found.sampleRateKHz);
    setAntiAliasFilter(found.antiAliasFilter);
    playback.setStep(3);
  };

  const caption = explainNyquistStep(analysis, step);
  const statusColor = analysis.filteredOut
    ? nyquistColor
    : analysis.isAliased || analysis.hitsZeroCrossings
      ? aliasColor
      : sampleColor;

  const visibleSampleCount =
    step === 0
      ? 0
      : step === 1
        ? Math.ceil(analysis.samples.length / 2)
        : analysis.samples.length;

  const workedText = analysis.filteredOut
    ? `f_Nyquist = ${sampleRateKHz.toFixed(1)} ÷ 2 = ${analysis.nyquistKHz.toFixed(1)} kHz. Since ${freqKHz.toFixed(1)} > ${analysis.nyquistKHz.toFixed(1)}, the low-pass filter blocks it before sampling (all dots = 0).`
    : analysis.isAliased
      ? `f_Nyquist = ${sampleRateKHz.toFixed(1)}/2 = ${analysis.nyquistKHz.toFixed(1)} kHz · k = round(${freqKHz.toFixed(1)}/${sampleRateKHz.toFixed(1)}) = ${analysis.foldMultiple} · f_alias = |${freqKHz.toFixed(1)} − ${analysis.foldMultiple}×${sampleRateKHz.toFixed(1)}| = ${analysis.aliasFreqKHz.toFixed(1)} kHz`
      : `f_Nyquist = ${sampleRateKHz.toFixed(1)} ÷ 2 = ${analysis.nyquistKHz.toFixed(1)} kHz. Since ${freqKHz.toFixed(1)} < ${analysis.nyquistKHz.toFixed(1)}, spacing Δt = ${analysis.sampleIntervalMs.toFixed(3)} ms captures the true ${freqKHz.toFixed(1)} kHz pitch.`;

  const renderWaveformSvg = (width: number, height: number) => {
    const padL = 54;
    const padR = 16;
    const padT = 26;
    const padB = 34;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const waveMidY = padT + plotH / 2;
    const waveAmp = plotH * 0.43;
    const clipId = `nyq-wave-clip-${width}`;

    const xTime = (timeMs: number) => padL + (timeMs / WINDOW_MS) * plotW;
    const yAmp = (val: number) => waveMidY - val * waveAmp;

    const trueWavePath = Array.from({ length: 240 }, (_, i) => {
      const tm = (i / 239) * WINDOW_MS;
      return `${i === 0 ? 'M' : 'L'}${xTime(tm).toFixed(1)},${yAmp(analysis.trueAmplitudeAt(tm)).toFixed(1)}`;
    }).join(' ');

    const reconWavePath =
      step >= 3 && !analysis.filteredOut && !analysis.hitsZeroCrossings && analysis.isAliased
        ? Array.from({ length: 240 }, (_, i) => {
            const tm = (i / 239) * WINDOW_MS;
            return `${i === 0 ? 'M' : 'L'}${xTime(tm).toFixed(1)},${yAmp(analysis.reconstructedAmplitudeAt(tm)).toFixed(1)}`;
          }).join(' ')
        : null;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <text x={padL} y={16} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Sound wave and captured snapshot dots (1.0 ms window)
        </text>
        <rect x={padL} y={padT} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={padL} y1={waveMidY} x2={padL + plotW} y2={waveMidY} stroke={t.border} strokeWidth={1.2} />
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={t.border} strokeWidth={1.2} />
        <text x={padL - 8} y={waveMidY - waveAmp + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>+1</text>
        <text x={padL - 8} y={waveMidY + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>0</text>
        <text x={padL - 8} y={waveMidY + waveAmp + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>−1</text>
        <text x={padL} y={height - 6} fontSize={14} fill={t.textMuted}>0.0 ms</text>
        <text x={padL + plotW} y={height - 6} textAnchor="end" fontSize={14} fill={t.textSecondary}>
          Time (0 → 1.0 ms) →
        </text>

        <g clipPath={`url(#${clipId})`}>
          <path
            d={trueWavePath}
            fill="none"
            stroke={trueColor}
            strokeWidth={2.2}
            strokeOpacity={analysis.filteredOut ? 0.28 : step >= 3 && analysis.isAliased ? 0.38 : 0.9}
            strokeDasharray={analysis.filteredOut ? '4 4' : undefined}
          />
          {reconWavePath && (
            <path
              d={reconWavePath}
              fill="none"
              stroke={aliasColor}
              strokeWidth={2.5}
              strokeDasharray="7 4"
            />
          )}
          {analysis.samples.slice(0, visibleSampleCount).map((pt) => {
            const sx = xTime(pt.timeMs);
            const sy = yAmp(pt.amplitude);
            return (
              <g key={pt.index}>
                <line x1={sx} y1={waveMidY} x2={sx} y2={sy} stroke={sampleColor} strokeWidth={1.2} strokeOpacity={0.55} />
                <circle cx={sx} cy={sy} r={4.5} fill={sampleColor} stroke={t.background} strokeWidth={1.2} />
              </g>
            );
          })}
        </g>
      </g>
    );
  };

  const renderSpectrumSvg = (width: number, offsetY: number, height: number) => {
    const padL = 54;
    const padR = 16;
    const plotW = width - padL - padR;
    const maxFreqScale = Math.max(20, Math.ceil(Math.max(analysis.freqKHz, analysis.sampleRateKHz) + 2));
    const xFreq = (f: number) => padL + (Math.min(maxFreqScale, Math.max(0, f)) / maxFreqScale) * plotW;

    const plotTop = offsetY + 34;
    const baseY = offsetY + height - 38;
    const clipId = `nyq-spec-clip-${width}`;

    const nyquistX = xFreq(analysis.nyquistKHz);
    const trueFreqX = xFreq(analysis.freqKHz);
    const aliasFreqX = xFreq(analysis.aliasFreqKHz);

    const tickStep = maxFreqScale <= 24 ? 4 : 8;
    const freqTicks: number[] = [];
    for (let ft = 0; ft <= maxFreqScale; ft += tickStep) freqTicks.push(ft);

    // Three staggered horizontal label tiers so True, Nyquist, and Heard labels NEVER overlap
    const nyqLabelX = Math.max(padL + 72, Math.min(width - padR - 72, nyquistX));
    const trueDotY = plotTop + 34;
    const trueLabelOnLeft = trueFreqX > width - padR - 110;
    const trueLabelX = trueLabelOnLeft ? trueFreqX - 10 : trueFreqX + 10;

    const aliasDotY = plotTop + 72;
    const aliasLabelOnLeft = aliasFreqX > width - padR - 115 || (aliasFreqX > nyquistX - 30 && aliasFreqX > padL + 110);
    const aliasLabelX = aliasLabelOnLeft ? aliasFreqX - 10 : aliasFreqX + 10;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={plotTop} width={plotW} height={baseY - plotTop} />
          </clipPath>
        </defs>
        <text x={padL} y={offsetY + 14} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Pitch ruler (kHz): frequencies above Nyquist fold back
        </text>

        <rect x={padL} y={plotTop} width={plotW} height={baseY - plotTop} fill={t.background} rx={4} />
        <line x1={padL} y1={baseY} x2={padL + plotW} y2={baseY} stroke={t.border} strokeWidth={1.3} />

        {freqTicks.map((ft) => (
          <g key={`ft-${ft}`}>
            <line x1={xFreq(ft)} y1={baseY} x2={xFreq(ft)} y2={baseY + 5} stroke={t.border} />
            <text x={xFreq(ft)} y={baseY + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {ft}
            </text>
          </g>
        ))}
        <text x={padL + plotW} y={baseY + 35} textAnchor="end" fontSize={14} fill={t.textSecondary}>
          Frequency f (kHz) →
        </text>

        <g clipPath={`url(#${clipId})`}>
          {/* Nyquist boundary wall */}
          <line x1={nyquistX} y1={plotTop} x2={nyquistX} y2={baseY} stroke={nyquistColor} strokeWidth={2} strokeDasharray="5 4" />
          {/* True pitch stem */}
          <line x1={trueFreqX} y1={baseY} x2={trueFreqX} y2={trueDotY} stroke={trueColor} strokeWidth={2.4} />
          {/* Alias pitch stem + fold arrow */}
          {step >= 3 && analysis.isAliased && !analysis.filteredOut && (
            <>
              <SketchArrow
                points={[
                  [trueFreqX, trueDotY + 10],
                  [(trueFreqX + aliasFreqX) / 2, trueDotY + 24],
                  [aliasFreqX + (trueFreqX >= aliasFreqX ? 6 : -6), aliasDotY - 8],
                ]}
                color={aliasColor}
                strokeWidth={1.8}
                roughness={0.9}
                id={`nyquist-fold-${width}`}
              />
              <line x1={aliasFreqX} y1={baseY} x2={aliasFreqX} y2={aliasDotY} stroke={aliasColor} strokeWidth={2.6} />
            </>
          )}
        </g>

        {/* Tier 1: Nyquist label above the plot */}
        <text x={nyqLabelX} y={plotTop - 4} textAnchor="middle" fontSize={14} fontWeight={700} fill={nyquistColor}>
          Nyquist f_s/2 = {analysis.nyquistKHz.toFixed(1)} kHz
        </text>

        {/* Tier 2: True pitch solid point + offset label */}
        <circle cx={trueFreqX} cy={trueDotY} r={5} fill={trueColor} stroke={t.background} strokeWidth={1.2} />
        <text
          x={trueLabelX}
          y={trueDotY + 5}
          textAnchor={trueLabelOnLeft ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={trueColor}
        >
          True: {analysis.freqKHz.toFixed(1)} kHz
        </text>

        {/* Tier 3: Heard alias solid point + offset label */}
        {step >= 3 && analysis.isAliased && !analysis.filteredOut && (
          <g>
            <circle cx={aliasFreqX} cy={aliasDotY} r={5} fill={aliasColor} stroke={t.background} strokeWidth={1.2} />
            <text
              x={aliasLabelX}
              y={aliasDotY + 5}
              textAnchor={aliasLabelOnLeft ? 'end' : 'start'}
              fontSize={14}
              fontWeight={700}
              fill={aliasColor}
            >
              Heard: {analysis.aliasFreqKHz.toFixed(1)} kHz
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!compact && (
        <>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.accentPrimary, marginBottom: 4 }}>
              Live playground
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, color: t.textPrimary }}>
              When does a fast sound pretend to be a slow sound?
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 15, color: t.textSecondary, lineHeight: 1.5 }}>
              A microphone turns sound into snapshots taken f_s times per second — if a tone vibrates faster than half the snapshot rate, those snapshots look identical to a slower fake pitch (aliasing).
            </p>
          </div>

          {/* Control Group 1: Scenarios */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="Preset audio scenarios">
            <span style={{ fontSize: 15, fontWeight: 700, color: t.textSecondary }}>Scenarios (try a sound):</span>
            {NYQUIST_PRESETS.map((p) => {
              const active = presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(p.id)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${active ? t.accentPrimary : t.border}`,
                    background: active ? t.surfaceAlt : 'transparent',
                    color: active ? t.accentPrimary : t.textPrimary,
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Control Group 2: Paired sliders + free numeric inputs + filter toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Sound pitch f (thousand cycles/s)"
                value={freqKHz}
                onChange={(v) => {
                  setPresetId('custom');
                  setFreqKHz(v);
                }}
                min={1}
                max={20}
                step={0.5}
                format={(v) => `${v.toFixed(1)} kHz`}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: t.textSecondary }}>
                <span>Exact f (kHz):</span>
                <input
                  aria-label="Exact tone frequency kHz"
                  type="number"
                  min={0.5}
                  max={25}
                  step={0.5}
                  value={freqKHz}
                  onChange={(e) => {
                    setPresetId('custom');
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setFreqKHz(Math.max(0.5, Math.min(25, v)));
                  }}
                  style={{
                    width: 82,
                    padding: '4px 8px',
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

            <div>
              <Slider
                label="Snapshot rate f_s (measurements/s)"
                value={sampleRateKHz}
                onChange={(v) => {
                  setPresetId('custom');
                  setSampleRateKHz(v);
                }}
                min={4}
                max={44.1}
                step={0.5}
                format={(v) => `${v.toFixed(1)} kHz`}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: t.textSecondary }}>
                <span>Exact f_s (kHz):</span>
                <input
                  aria-label="Exact sampling rate kHz"
                  type="number"
                  min={2}
                  max={48}
                  step={0.5}
                  value={sampleRateKHz}
                  onChange={(e) => {
                    setPresetId('custom');
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setSampleRateKHz(Math.max(2, Math.min(48, v)));
                  }}
                  style={{
                    width: 82,
                    padding: '4px 8px',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                aria-pressed={antiAliasFilter}
                onClick={() => setAntiAliasFilter((prev) => !prev)}
                style={{
                  padding: '8px 12px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${antiAliasFilter ? nyquistColor : t.border}`,
                  background: antiAliasFilter ? t.surfaceAlt : 'transparent',
                  color: antiAliasFilter ? nyquistColor : t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Anti-alias low-pass filter: {antiAliasFilter ? 'ON' : 'OFF'}
              </button>
              <div style={{ fontSize: 15, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
                Limit f_Nyquist: <strong style={{ color: nyquistColor }}>{analysis.nyquistKHz.toFixed(1)} kHz</strong> · Heard:{' '}
                <strong style={{ color: statusColor }}>
                  {analysis.reconstructedFreqKHz === null
                    ? analysis.filteredOut
                      ? 'Blocked (0)'
                      : 'Flat 0 (zero crossings)'
                    : `${analysis.reconstructedFreqKHz.toFixed(1)} kHz`}
                </strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend (consistent everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary }}
        aria-label="Signal and frequency colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: trueColor, verticalAlign: 'middle', marginRight: 6 }} />
          Real sound ({analysis.freqKHz.toFixed(1)} kHz)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: sampleColor, verticalAlign: 'middle', marginRight: 6 }} />
          Snapshot dots ({analysis.samples.length})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `3px dashed ${nyquistColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Nyquist limit ({analysis.nyquistKHz.toFixed(1)} kHz)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `3px dashed ${aliasColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Fake alias ({analysis.isAliased && !analysis.filteredOut ? `${analysis.aliasFreqKHz.toFixed(1)} kHz` : 'none'})
        </span>
      </div>

      {/* Main SVG */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 364"
            role="img"
            aria-label={`Sampling ${freqKHz.toFixed(1)} kHz tone at ${sampleRateKHz.toFixed(1)} kHz gives Nyquist limit ${analysis.nyquistKHz.toFixed(1)} kHz`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderWaveformSvg(760, 174)}
            {renderSpectrumSvg(760, 184, 178)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 380 184"
              role="img"
              aria-label={`Sound wave and ${analysis.samples.length} captured snapshot dots`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderWaveformSvg(380, 184)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 188"
              role="img"
              aria-label={`Frequency ruler showing Nyquist limit ${analysis.nyquistKHz.toFixed(1)} kHz`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderSpectrumSvg(380, 2, 184)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={analysis.isAliased ? 'Aliasing fold formula' : 'Nyquist limit'}
            latex={analysis.isAliased ? 'f_{\\text{alias}} = \\left|\\,f - \\operatorname{round}\\!\\left(\\frac{f}{f_s}\\right) f_s\\,\\right|' : 'f_{\\text{Nyquist}} = \\frac{f_s}{2}'}
            color={analysis.isAliased ? 'pink' : 'yellow'}
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{workedText}</p>
          </StickyNote>
          <StickyNote title={`Step ${step + 1} of ${NYQUIST_STEPS.length}`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Nyquist limit (clean capture rule)"
              latex="f_{\text{Nyquist}} = \frac{f_s}{2}"
              color="yellow"
              tilt={-1}
              active={!analysis.isAliased && !analysis.filteredOut}
              onSelect={() => applyPreset('clean-7-at-16')}
            >
              <p style={{ textAlign: 'center' }}>
                Snapshot rate f_s must be strictly above 2×f so dots capture every peak and trough.
              </p>
            </StickyNote>
            <StickyNote
              title="Aliasing fold (fake lower pitch)"
              latex="f_{\text{alias}} = \left|\,f - \operatorname{round}\!\left(\frac{f}{f_s}\right)\cdot f_s\,\right|"
              color="pink"
              tilt={1}
              active={analysis.isAliased && !analysis.filteredOut}
              onSelect={() => applyPreset('aliased-7-at-10')}
            >
              <p style={{ textAlign: 'center' }}>
                Any pitch f above f_s/2 folds back into [0, f_s/2] and impersonates a lower pitch.
              </p>
            </StickyNote>
            <StickyNote
              title="Pre-sampler filter (anti-aliasing)"
              latex="f > \frac{f_s}{2} \;\Rightarrow\; \text{blocked before ADC}"
              color="orange"
              tilt={-1}
              active={analysis.filteredOut}
              onSelect={() => {
                setAntiAliasFilter(true);
                playback.setStep(3);
              }}
            >
              <p style={{ textAlign: 'center' }}>
                Removes tones above Nyquist BEFORE taking dots so fake pitches cannot appear.
              </p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title="Worked out with your numbers" color="green" tilt={1}>
              <p className="nm-sticky__mono">{workedText}</p>
            </StickyNote>
            <StickyNote title={`Step ${step + 1} of ${NYQUIST_STEPS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="You record a 7 kHz tone at 10 kHz sampling rate (Nyquist limit = 5 kHz) with no pre-filter. Which pitch does the computer hear from the dots?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="|7 − 1×10| = 3 kHz — the exact same sample dots fit a 3 kHz curve."
            actionLabel="Test 7 kHz @ 10 kHz now"
            onAction={() => {
              applyPreset('aliased-7-at-10');
              playback.playFromStart();
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              1 kHz = 1,000 vibrations/s (1 cycle in this 1.0 ms window)
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function SamplingNyquistDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Sampling Rate & Nyquist Aliasing Playground"
      footer="Exact sinusoidal sampling over 1.0 ms using f_alias = |f − round(f/fs)·fs|. Matches the 7 kHz at 10 kHz speech example."
    >
      <SamplingNyquistPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
