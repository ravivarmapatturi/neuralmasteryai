import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const WIDTH = 560;
const WAVE_H = 160;
const BAR_H = 90;
const PAD = 30;
const HARMONIC_OPTIONS = [1, 3, 5, 9, 15, 25] as const;

/** Square-wave Fourier series: sum of odd harmonics k, amplitude 4/(k*pi).
 * Real computation, not a canned illustration -- more harmonics genuinely
 * converges toward a square wave (with the Gibbs-phenomenon ringing at the
 * edges left visible, not smoothed away). */
function partialSum(maxK: number, t: number): number {
  let sum = 0;
  for (let k = 1; k <= maxK; k += 2) {
    sum += (4 / (k * Math.PI)) * Math.sin(2 * Math.PI * k * t);
  }
  return sum;
}

function toXY(t: number, y: number, height: number): [number, number] {
  const x = PAD + t * (WIDTH - 2 * PAD);
  const py = height / 2 - (y / 1.3) * (height / 2 - 16);
  return [x, py];
}

export default function FourierSumOfSinesDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(HARMONIC_OPTIONS.length, 2500);
  const [userHarmonics, setUserHarmonics] = useState<number | null>(null);
  const maxK = userHarmonics ?? HARMONIC_OPTIONS[autoIdx];

  const N = 400;
  const wavePath = Array.from({ length: N }, (_, i) => {
    const tt = i / (N - 1);
    const [x, y] = toXY(tt, partialSum(maxK, tt), WAVE_H);
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  const harmonics = [];
  for (let k = 1; k <= 25; k += 2) harmonics.push(k);
  const maxAmp = 4 / Math.PI;
  const barW = (WIDTH - 2 * PAD) / harmonics.length;

  const waveColor = getConceptColor(t, 'output');
  const barActiveColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Every added harmonic is a pure sine wave at a higher frequency, weighted 4/(k·π) -- summing more of them converges toward a square wave, with the persistent overshoot at each edge (Gibbs phenomenon) never fully disappearing no matter how many harmonics are added. This is literally what the Fourier transform decomposes a signal back into, run in reverse.">
      <PillSelect<number> label="Harmonics included (odd k = 1..N)" value={maxK} onChange={(k) => setUserHarmonics(Number(k))} options={HARMONIC_OPTIONS.map((k) => ({ value: k, label: `k ≤ ${k}` }))} />

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 8, marginBottom: 2 }}>Time domain: the reconstructed wave</div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${WAVE_H}`} style={{ display: 'block' }}>
        <line x1={PAD} y1={WAVE_H / 2} x2={WIDTH - PAD} y2={WAVE_H / 2} stroke={t.border} strokeWidth={1} />
        <path d={wavePath} fill="none" stroke={waveColor} strokeWidth={2} />
      </svg>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 10, marginBottom: 2 }}>Frequency domain: amplitude of each harmonic</div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${BAR_H}`} style={{ display: 'block' }}>
        {harmonics.map((k, i) => {
          const amp = 4 / (k * Math.PI);
          const h = (amp / maxAmp) * (BAR_H - 24);
          const x = PAD + i * barW;
          const active = k <= maxK;
          return (
            <g key={k}>
              <rect x={x + barW * 0.15} y={BAR_H - 18 - h} width={barW * 0.7} height={h} fill={active ? barActiveColor : t.surfaceAlt} stroke={active ? barActiveColor : t.border} strokeWidth={1} opacity={active ? 0.85 : 0.4} />
              <text x={x + barW / 2} y={BAR_H - 4} textAnchor="middle" fontSize={9} fill={active ? t.textPrimary : t.textMuted}>{k}</text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
