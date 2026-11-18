import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { toySignal, fixedNoise, alphaBarSchedule, forwardDiffuse } from '../lib/generativeModels';

const N = 24;
const T = 100;

/** The real DDPM forward process, closed-form: x_t = sqrt(alpha_bar_t) x0 +
 * sqrt(1-alpha_bar_t) epsilon, evaluated at whatever t the slider picks,
 * against a real linear beta schedule's cumulative alpha_bar_t. A fixed
 * "structured" toy signal (not an actual image, but the same mechanism)
 * visibly dissolves into the same fixed noise draw as t increases. */
export default function DiffusionForwardProcessDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(T, 80);
  const step = cycle.value + 1;
  const setStep = (value: number) => cycle.pick(value - 1);

  const x0 = useMemo(() => toySignal(N), []);
  const noise = useMemo(() => fixedNoise(N), []);
  const alphaBars = useMemo(() => alphaBarSchedule(T), []);
  const alphaBarT = alphaBars[step - 1];
  const xt = useMemo(() => forwardDiffuse(x0, noise, alphaBarT), [x0, noise, alphaBarT]);

  const cell = 12;
  const colorFor = (v: number) => {
    const clamped = Math.max(-1.5, Math.min(1.5, v));
    const frac = (clamped + 1.5) / 3;
    return `color-mix(in srgb, ${t.accentDanger} ${((1 - frac) * 100).toFixed(0)}%, ${t.accentPrimary} ${(frac * 100).toFixed(0)}%)`;
  };

  const width = 420, height = 100;
  const px = (s: number) => (s / T) * width;
  const py = (a: number) => height - a * (height - 10) - 5;
  const schedulePath = alphaBars.map((a, i) => `${px(i + 1)},${py(a)}`).join(' ');

  return (
    <VisualizationContainer footer={`Real linear beta schedule (beta: 1e-4 -> 0.02 over ${T} steps), real cumulative alpha_bar_t = ${alphaBarT.toFixed(3)} at t = ${step}, real forward formula x_t = sqrt(alpha_bar_t)*x0 + sqrt(1-alpha_bar_t)*epsilon applied to a fixed toy signal and a fixed noise draw. By t ~= ${T}, alpha_bar_t is near 0 -- almost no original signal left, matching how DDPM's forward process ends at pure noise regardless of the input image.`}>
      <Slider label={`t = ${step} / ${T}`} value={step} onChange={setStep} min={1} max={T} step={1} />

      <div style={{ display: 'flex', gap: 1, marginTop: 10, justifyContent: 'center' }}>
        {xt.map((v, i) => (
          <div key={i} style={{ width: cell, height: cell * 2.2, background: colorFor(v), borderRadius: 1.5 }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        x_t: structure at low t, indistinguishable from noise as t → {T}
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 10 }}>
        <line x1={0} y1={py(0)} x2={width} y2={py(0)} stroke={t.border} strokeWidth={1} />
        <polyline points={schedulePath} fill="none" stroke={t.accentPrimary} strokeWidth={2} />
        <line x1={px(step)} y1={0} x2={px(step)} y2={height} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(step)} cy={py(alphaBarT)} r={3.5} fill={t.accentPrimary} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        alpha_bar_t (fraction of original signal retained) vs. t
      </div>
    </VisualizationContainer>
  );
}
