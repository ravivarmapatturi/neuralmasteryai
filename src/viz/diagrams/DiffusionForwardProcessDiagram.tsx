import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect, VizButton } from '../primitives';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';
import {
  alphaBars as scheduleBars,
  makeSignal,
  seededNoise,
  diffuse,
  snrDb,
  correlation,
  firstStepBelow,
  type ScheduleKind,
  type SignalKind,
} from '../lib/diffusionForward';

const N = 32;
const FRAMES = 40;

/**
 * DDPM forward process playground. The learner picks the clean signal, the
 * noise schedule, the number of steps T and the noise seed; playback walks t
 * from 1 to T and every number (alpha-bar, SNR, correlation, each pixel) is
 * computed live from x_t = sqrt(alphaBar_t) x_0 + sqrt(1 - alphaBar_t) eps.
 */
export default function DiffusionForwardProcessDiagram() {
  const t = useVizTokens();
  const [schedule, setSchedule] = useState<ScheduleKind>('linear');
  const [signal, setSignal] = useState<SignalKind>('bump');
  const [T, setT] = useState(1000);
  const [seed, setSeed] = useState(7);
  const [pixel, setPixel] = useState(8);
  const [guess, setGuess] = useState<string | null>(null);

  const playback = usePlaygroundPlayback(FRAMES, 450);
  const step = Math.max(1, Math.round(((playback.step + 1) / FRAMES) * T));

  const bars = useMemo(() => scheduleBars(schedule, T), [schedule, T]);
  const x0 = useMemo(() => makeSignal(signal, N), [signal]);
  const eps = useMemo(() => seededNoise(N, seed), [seed]);
  const ab = bars[step - 1];
  const xt = useMemo(() => diffuse(x0, eps, ab), [x0, eps, ab]);
  const a = Math.sqrt(ab);
  const b = Math.sqrt(1 - ab);
  const corr = correlation(x0, xt);
  const snr = snrDb(ab);
  const halfway = bars[Math.floor(T / 2) - 1];
  const tenPct = firstStepBelow(bars, 0.1);

  const colorFor = (v: number) => {
    const frac = (Math.max(-2, Math.min(2, v)) + 2) / 4;
    return `color-mix(in srgb, ${t.accentPrimary} ${(frac * 100).toFixed(0)}%, ${t.surfaceAlt})`;
  };

  // ---- layout ----
  const W = 760;
  const stripX = 120;
  const cell = (W - stripX - 20) / N;
  const rowH = 30;
  const rows: { label: string; sub: string; values: number[] }[] = [
    { label: 'x₀ clean', sub: 'what we start from', values: x0 },
    { label: 'ε noise', sub: `seed ${seed}`, values: eps },
    { label: `x_t (t=${step})`, sub: 'what the model sees', values: xt },
  ];
  const chartTop = 140;
  const chartH = 120;
  const chartX = 60;
  const chartW = W - chartX - 20;
  const cx = (s: number) => chartX + (s / T) * chartW;
  const cy = (v: number) => chartTop + chartH - v * chartH;
  const path = bars.map((v, i) => `${i ? 'L' : 'M'}${cx(i + 1).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');
  const otherBars = useMemo(() => scheduleBars(schedule === 'linear' ? 'cosine' : 'linear', T), [schedule, T]);
  const otherPath = otherBars.map((v, i) => `${i ? 'L' : 'M'}${cx(i + 1).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');

  const phase = ab > 0.7 ? 'the shape is still obvious' : ab > 0.25 ? 'the shape is fading into the noise' : ab > 0.03 ? 'only a faint trace of the shape is left' : 'it is now practically pure noise';
  const caption = `t = ${step}: ᾱ = ${ab.toFixed(3)}, so x_t keeps ${(a * 100).toFixed(0)}% of x₀'s amplitude and adds ${(b * 100).toFixed(0)}% of ε; ${phase} (correlation with x₀ = ${corr.toFixed(2)}).`;

  const answer = halfway > 0.5 ? 'more' : halfway > 0.1 ? 'some' : 'almost';
  const options: [string, string][] = [['more', 'More than half'], ['some', 'Between 10% and 50%'], ['almost', 'Under 10%']];

  return (
    <VisualizationContainer footer="Exact DDPM forward formula on a 32-pixel 1-D image. Linear schedule: β from 0.0001 to 0.02 (Ho et al. 2020). Cosine schedule: Nichol & Dhariwal 2021. Real image models apply the same formula to every pixel of every channel.">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <PillSelect label="Schedule" value={schedule} onChange={setSchedule} options={[{ value: 'linear', label: 'Linear β' }, { value: 'cosine', label: 'Cosine' }]} />
        <PillSelect label="Clean signal x₀" value={signal} onChange={setSignal} options={[{ value: 'bump', label: 'Bump' }, { value: 'step', label: 'Step' }, { value: 'two-peaks', label: 'Two peaks' }]} />
        <label style={{ fontSize: 14 }}>
          Noise seed{' '}
          <input type="number" value={seed} min={1} max={9999} onChange={(e) => setSeed(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80, fontSize: 14, padding: '4px 6px', border: '1.5px solid currentColor', borderRadius: 6, background: 'transparent', color: 'inherit' }} aria-label="Noise seed" />
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 6 }}>
        <Slider label="Total steps T" value={T} onChange={(v) => setT(v)} min={50} max={2000} step={50} />
        <Slider label="Pixel to inspect (#)" value={pixel + 1} onChange={(v) => setPixel(v - 1)} min={1} max={N} step={1} />
      </div>

      <svg viewBox={`0 0 ${W} ${chartTop + chartH + 34}`} width="100%" role="img" aria-label={caption} style={{ display: 'block', marginTop: 8 }}>
        {rows.map((row, r) => (
          <g key={row.label} transform={`translate(0 ${r * (rowH + 8)})`}>
            <text x={0} y={14} fontSize={14} fontWeight={700} fill={t.textPrimary}>{row.label}</text>
            <text x={0} y={29} fontSize={13} fill={t.textMuted}>{row.sub}</text>
            {row.values.map((v, i) => (
              <rect key={i} x={stripX + i * cell} y={2} width={cell - 1} height={rowH - 4} rx={2} fill={colorFor(v)}
                stroke={i === pixel ? t.accentDanger : 'none'} strokeWidth={2} onClick={() => setPixel(i)} style={{ cursor: 'pointer' }} />
            ))}
          </g>
        ))}
        <text x={chartX} y={chartTop - 10} fontSize={14} fontWeight={700} fill={t.textPrimary}>ᾱ_t: share of the clean signal kept</text>
        <line x1={chartX} y1={cy(0)} x2={chartX + chartW} y2={cy(0)} stroke={t.border} />
        <line x1={chartX} y1={cy(0)} x2={chartX} y2={cy(1)} stroke={t.border} />
        {[0, 0.5, 1].map((v) => <text key={v} x={chartX - 8} y={cy(v) + 4} fontSize={13} textAnchor="end" fill={t.textMuted}>{v}</text>)}
        <text x={chartX + chartW} y={cy(0) + 20} fontSize={13} textAnchor="end" fill={t.textMuted}>step t → {T}</text>
        <path d={otherPath} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={cx(T * 0.62)} y={cy(scheduleBars(schedule === 'linear' ? 'cosine' : 'linear', T)[Math.floor(T * 0.62) - 1]) - 8} fontSize={13} fill={t.textMuted}>{schedule === 'linear' ? 'cosine' : 'linear'}</text>
        <path d={path} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={cx(step)} y1={cy(1)} x2={cx(step)} y2={cy(0)} stroke={t.accentDanger} strokeDasharray="3 3" />
        <circle cx={cx(step)} cy={cy(ab)} r={5} fill={t.accentDanger} />
        <text x={Math.min(cx(step) + 8, W - 150)} y={Math.max(cy(ab) - 8, chartTop + 4)} fontSize={14} fontWeight={700} fill={t.accentDanger}>ᾱ = {ab.toFixed(3)}</text>
      </svg>

      <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 4 }}>
        <strong>x_t = √ᾱ · x₀ + √(1−ᾱ) · ε</strong>{' '}
        <span style={{ color: t.textSecondary }}>for pixel #{pixel + 1}:</span>{' '}
        <span style={{ fontSize: 14 }}>
          {a.toFixed(3)} × {x0[pixel].toFixed(2)} + {b.toFixed(3)} × {eps[pixel].toFixed(2)} = {xt[pixel].toFixed(3)}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontSize: 14, marginTop: 4 }}>
        <span>SNR <strong>{Number.isFinite(snr) ? `${snr.toFixed(1)} dB` : '∞'}</strong></span>
        <span>signal kept <strong>{(ab * 100).toFixed(1)}%</strong> of the variance</span>
        <span>looks like x₀: <strong>{corr.toFixed(2)}</strong></span>
        <span>ᾱ falls below 0.1 at <strong>t = {tenPct ?? '—'}</strong></span>
      </div>
      <p style={{ margin: '6px 0', fontSize: 14, color: t.textSecondary }} aria-live="polite">{caption}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <strong style={{ color: t.accentDanger }}>Predict first:</strong>
        <span>Halfway (t = {Math.floor(T / 2)}) with the {schedule} schedule, how much of ᾱ is left?</span>
        {options.map(([k, label]) => (
          <VizButton key={k} variant={guess === k ? 'primary' : 'secondary'} onClick={() => { setGuess(k); playback.setStep(Math.floor(FRAMES / 2) - 1); }}>{label}</VizButton>
        ))}
        {guess && <span>{guess === answer ? 'Right' : 'Not quite'}: ᾱ = {halfway.toFixed(3)} at t = {Math.floor(T / 2)}.</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <VizButton variant="primary" onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
      </div>
    </VisualizationContainer>
  );
}
