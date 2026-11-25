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
  analyzeFourierSynthesis,
  FOURIER_MAX_WINDOW_MS,
  FOURIER_TRACE_STEPS,
  WAVEFORM_META,
  type WaveformShape,
} from '../lib/fourierSumOfSines';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'It shrinks completely down to zero',
  'It squeezes narrower toward the cliff, but stays ~9% of the jump height',
  'The entire wave flattens to a straight line',
] as const;

const SHAPE_LATEX: Record<WaveformShape, string> = {
  square: String.raw`S_N(t) = \sum_{k=1,3,5}^{N} \frac{4}{\pi k}\sin(2\pi k f_0 t)`,
  sawtooth: String.raw`S_N(t) = \sum_{k=1}^{N} \frac{2}{\pi k}\sin(2\pi k f_0 t)`,
  triangle: String.raw`S_N(t) = \sum_{k=1,3,5}^{N} \frac{8(-1)^{\frac{k-1}{2}}}{\pi^2 k^2}\sin(2\pi k f_0 t)`,
};

function FourierSumOfSinesPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipTimeId = useId();
  const clipFreqId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [shape, setShape] = useState<WaveformShape>('square');
  const [manualMaxK, setManualMaxK] = useState<number | null>(null);
  const [baseFreqHz, setBaseFreqHz] = useState<number>(100);
  const [inspectedK, setInspectedK] = useState<number | undefined>(undefined);
  const [showSingleWave, setShowSingleWave] = useState<boolean>(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(FOURIER_TRACE_STEPS.length, 1900, 3, outerVisible);
  const maxHarmonic = manualMaxK ?? FOURIER_TRACE_STEPS[playback.step] ?? 9;

  const analysis = useMemo(
    () =>
      analyzeFourierSynthesis({
        shape,
        maxHarmonic,
        baseFreqHz,
        inspectedK,
        sampleCount: 300,
      }),
    [shape, maxHarmonic, baseFreqHz, inspectedK],
  );

  const targetColor = t.textMuted;
  const sumColor = t.accentSecondary;
  const singleColor = t.accentPurple;
  const barActiveColor = t.accentPrimary;
  const overshootColor = t.accentDanger;

  const selectHarmonic = (k: number) => {
    playback.stop();
    setManualMaxK(Math.max(1, Math.min(49, Math.round(k))));
  };

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

  const renderTimePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 62;
    const plotH = 198;
    const yMin = -1.45;
    const yMax = 1.45;

    const px = (ms: number) => plotX + (ms / FOURIER_MAX_WINDOW_MS) * plotW;
    const py = (val: number) => plotY + ((yMax - val) / (yMax - yMin)) * plotH;

    const targetPath = analysis.samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${px(s.timeMs).toFixed(1)},${py(s.target).toFixed(1)}`)
      .join(' ');
    const sumPath = analysis.samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${px(s.timeMs).toFixed(1)},${py(s.reconstructed).toFixed(1)}`)
      .join(' ');
    const singlePath = analysis.samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${px(s.timeMs).toFixed(1)},${py(s.inspectedTerm).toFixed(1)}`)
      .join(' ');

    // Locate the first peak near the top for a clean non-overlapping Gibbs/peak marker
    let peakSample = analysis.samples[0];
    for (const s of analysis.samples) {
      if (s.reconstructed > peakSample.reconstructed) peakSample = s;
    }
    const peakX = px(peakSample.timeMs);
    const peakY = py(peakSample.reconstructed);
    const peakLabelLeft = peakX > plotX + plotW - 110;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Wave in time (0–10 ms, k ≤ {analysis.maxHarmonic})
        </text>
        <defs>
          <clipPath id={`${clipTimeId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={py(0)} x2={plotX + plotW} y2={py(0)} stroke={t.border} strokeWidth={1.1} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[-1, 0, 1].map((yt) => (
          <g key={`ty-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt > 0 ? `+${yt}` : yt}
            </text>
          </g>
        ))}

        {[0, 5, 10].map((xt) => (
          <g key={`tx-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt} ms
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipTimeId}-${offsetX})`}>
          <path d={targetPath} fill="none" stroke={targetColor} strokeWidth={1.6} strokeDasharray="5 4" opacity={0.75} />
          {showSingleWave && (
            <path d={singlePath} fill="none" stroke={singleColor} strokeWidth={1.8} strokeDasharray="3 3" opacity={0.85} />
          )}
          <path d={sumPath} fill="none" stroke={sumColor} strokeWidth={2.5} strokeLinejoin="round" />

          {analysis.gibbsOvershootPct > 0.5 && (
            <circle cx={peakX} cy={peakY} r={5} fill={overshootColor} stroke={t.background} strokeWidth={1.5} />
          )}
        </g>

        {analysis.gibbsOvershootPct > 0.5 && (
          <text
            x={peakLabelLeft ? peakX - 9 : peakX + 9}
            y={Math.max(plotY + 16, peakY - 6)}
            textAnchor={peakLabelLeft ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={overshootColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            peak {peakSample.reconstructed.toFixed(2)}
          </text>
        )}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Time (ms) · {analysis.activeHarmonicCount} wave{analysis.activeHarmonicCount === 1 ? '' : 's'} summed (RMS err {analysis.rmsError.toFixed(3)})
        </text>
      </g>
    );
  };

  const renderFreqPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 58;
    const plotH = 198;
    const maxAmp = Math.max(1.3, 4 / Math.PI);
    const bars = analysis.harmonics;
    const barSlot = plotW / Math.max(1, bars.length);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Wave recipe (click a bar)
        </text>
        <defs>
          <clipPath id={`${clipFreqId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 0.5, 1.0].map((yt) => {
          const yy = plotY + plotH - (yt / maxAmp) * (plotH - 12);
          return (
            <g key={`fy-${yt}`}>
              <line x1={plotX - 4} y1={yy} x2={plotX} y2={yy} stroke={t.border} />
              <text x={plotX - 8} y={yy + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
                {yt.toFixed(1)}
              </text>
            </g>
          );
        })}

        <g clipPath={`url(#${clipFreqId}-${offsetX})`}>
          {bars.map((term, i) => {
            const h = Math.max(3, (term.amplitude / maxAmp) * (plotH - 12));
            const bx = plotX + i * barSlot + barSlot * 0.14;
            const bw = Math.max(4, barSlot * 0.72);
            const by = plotY + plotH - h;
            const isInspected = term.k === analysis.inspectedK;
            const fill = isInspected ? singleColor : term.included ? barActiveColor : t.surfaceAlt;
            return (
              <rect
                key={term.k}
                x={bx}
                y={by}
                width={bw}
                height={h}
                rx={2}
                fill={fill}
                fillOpacity={term.included || isInspected ? 0.88 : 0.45}
                stroke={isInspected ? singleColor : term.included ? barActiveColor : t.border}
                strokeWidth={isInspected ? 2 : 1}
                onClick={() => {
                  setInspectedK(term.k);
                  setShowSingleWave(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <title>{`Harmonic k=${term.k} (${term.freqHz} Hz): weight ${term.signedWeight.toFixed(3)}`}</title>
              </rect>
            );
          })}
        </g>

        {bars.map((term, i) => {
          const showLabel = bars.length <= 14 ? i % 2 === 0 : i % 4 === 0 || i === bars.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={`kl-${term.k}`}
              x={plotX + i * barSlot + barSlot / 2}
              y={plotY + plotH + 20}
              textAnchor="middle"
              fontSize={14}
              fill={term.k === analysis.inspectedK ? singleColor : term.included ? t.textPrimary : t.textMuted}
            >
              {term.k}
            </text>
          );
        })}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Wave k (purple = k={analysis.inspectedK}, {analysis.inspectedK * baseFreqHz} Hz)
        </text>
      </g>
    );
  };

  const workedWeightFormula =
    shape === 'square'
      ? `4 / (π × ${analysis.newestK}) = ${analysis.newestWeight.toFixed(3)}`
      : shape === 'sawtooth'
        ? `2 / (π × ${analysis.newestK}) = ${analysis.newestWeight.toFixed(3)}`
        : `${analysis.newestWeight >= 0 ? '+' : '−'}8 / (π² × ${analysis.newestK}²) = ${analysis.newestWeight.toFixed(3)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="How simple sine waves add up into any sound shape"
                description="Sharp sounds like buzzers and speech consonants look messy as raw waveforms, so Fourier analysis breaks them into pure sine waves at multiples k · f₀ of a base pitch and adds them back one wave at a time."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualMaxK(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualMaxK(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualMaxK(null);
                  setInspectedK(undefined);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<WaveformShape>
                label="Target wave shape (what we want to build)"
                value={shape}
                onChange={(nextShape) => {
                  const s = typeof nextShape === 'function' ? nextShape(shape) : nextShape;
                  setShape(s);
                  setInspectedK(undefined);
                }}
                options={[
                  { value: 'square', label: 'Square (sharp jumps)' },
                  { value: 'sawtooth', label: 'Sawtooth (ramp + drop)' },
                  { value: 'triangle', label: 'Triangle (sharp corners)' },
                ]}
              />
            </div>
            <button
              type="button"
              aria-pressed={showSingleWave}
              onClick={() => setShowSingleWave((v) => !v)}
              style={{
                padding: '6px 12px',
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${showSingleWave ? singleColor : t.border}`,
                background: showSingleWave ? t.surfaceAlt : 'transparent',
                color: showSingleWave ? singleColor : t.textPrimary,
                fontFamily: FONT_FAMILY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Overlay single wave k={analysis.inspectedK}: {showSingleWave ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Highest harmonic k included"
              value={analysis.maxHarmonic}
              onChange={(v) => selectHarmonic(v)}
              min={1}
              max={35}
              step={shape === 'sawtooth' ? 1 : 2}
              format={(v) => `k ≤ ${v}`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact max harmonic k (1–49)</span>
              <input
                aria-label="Exact max harmonic k"
                type="number"
                min={1}
                max={49}
                step={1}
                value={analysis.maxHarmonic}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) selectHarmonic(val);
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Base pitch f₀ (50–400 Hz)</span>
              <input
                aria-label="Base pitch f0 (Hz)"
                type="number"
                min={50}
                max={400}
                step={25}
                value={baseFreqHz}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) setBaseFreqHz(Math.max(50, Math.min(400, Math.round(val))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Waveform legend">
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${targetColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Ideal target wave
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: sumColor, verticalAlign: 'middle', marginRight: 6 }} />
          Sum of {analysis.activeHarmonicCount} sine wave{analysis.activeHarmonicCount === 1 ? '' : 's'}
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${singleColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Single wave k={analysis.inspectedK} ({analysis.inspectedK * baseFreqHz} Hz)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: overshootColor, verticalAlign: 'middle', marginRight: 6 }} />
          Edge overshoot ({analysis.peakHeight.toFixed(2)})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 286"
            role="img"
            aria-label={`${WAVEFORM_META[shape].label} built from ${analysis.activeHarmonicCount} sine waves up to k=${analysis.maxHarmonic}, RMS error ${analysis.rmsError.toFixed(3)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderTimePanel(0, 442)}
            {renderFreqPanel(454, 306)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Reconstructed waveform in time" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTimePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Harmonic amplitude recipe" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderFreqPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Fourier recipe · ${WAVEFORM_META[shape].label}`} latex={SHAPE_LATEX[shape]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              k ≤ {analysis.maxHarmonic}: {analysis.activeHarmonicCount} waves · RMS error {analysis.rmsError.toFixed(3)}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${FOURIER_TRACE_STEPS.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Square wave (odd harmonics)"
              latex={SHAPE_LATEX.square}
              color="yellow"
              tilt={-1}
              active={shape === 'square'}
              onSelect={() => {
                setShape('square');
                setInspectedK(undefined);
              }}
            >
              <p style={{ textAlign: 'center' }}>{WAVEFORM_META.square.shortDesc}</p>
            </StickyNote>
            <StickyNote
              title="Sawtooth wave (all harmonics)"
              latex={SHAPE_LATEX.sawtooth}
              color="pink"
              tilt={1}
              active={shape === 'sawtooth'}
              onSelect={() => {
                setShape('sawtooth');
                setInspectedK(undefined);
              }}
            >
              <p style={{ textAlign: 'center' }}>{WAVEFORM_META.sawtooth.shortDesc}</p>
            </StickyNote>
            <StickyNote
              title="Triangle wave (1/k² weights)"
              latex={SHAPE_LATEX.triangle}
              color="orange"
              tilt={-1}
              active={shape === 'triangle'}
              onSelect={() => {
                setShape('triangle');
                setInspectedK(undefined);
              }}
            >
              <p style={{ textAlign: 'center' }}>{WAVEFORM_META.triangle.shortDesc}</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Highest wave k = ${analysis.newestK}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Newest wave weight: <strong>{workedWeightFormula}</strong> ({analysis.newestK * baseFreqHz} Hz)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Waves summed: <strong>{analysis.activeHarmonicCount}</strong> · RMS error = <strong>{analysis.rmsError.toFixed(3)}</strong> · Peak = <strong>{analysis.peakHeight.toFixed(2)}</strong>
                {analysis.gibbsOvershootPct > 0.5 ? ` (+${analysis.gibbsOvershootPct.toFixed(1)}% Gibbs overshoot)` : ' (no overshoot)'}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${FOURIER_TRACE_STEPS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="On a square wave, we jump from 5 sine waves up to 25 sine waves. What happens to the overshoot spike right next to each vertical jump?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Adding more waves squeezes the ripple closer to the cliff edge, but a ~9% Gibbs overshoot (~1.18 height) never disappears at a jump discontinuity."
            actionLabel="Test k ≤ 25 square wave now"
            onAction={() => {
              setShape('square');
              setInspectedK(undefined);
              selectHarmonic(25);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function FourierSumOfSinesDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Fourier sum-of-sines synthesizer playground"
      footer="Exact partial Fourier sums over a 10 ms window. Every vertical bar shows the exact weight of one pure sine wave at frequency k · f₀ Hz; stacking them rebuilds complex shapes."
    >
      <FourierSumOfSinesPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
