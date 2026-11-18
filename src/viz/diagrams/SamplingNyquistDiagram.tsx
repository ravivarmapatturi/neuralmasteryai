import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TRUE_FREQ = 6; // cycles across the window -- the "real" tone being sampled
const WIDTH = 560;
const HEIGHT = 200;
const PAD = 30;

function sample(freqCycles: number, t: number): number {
  return Math.sin(2 * Math.PI * freqCycles * t);
}

function toXY(t: number, y: number): [number, number] {
  const x = PAD + t * (WIDTH - 2 * PAD);
  const py = HEIGHT / 2 - y * (HEIGHT / 2 - 20);
  return [x, py];
}

/** Aliasing: a signal sampled at rate fs (samples per window here) can only
 * faithfully represent frequencies up to fs/2. Above that, the true
 * frequency folds back to an apparent lower frequency -- computed here via
 * the standard fold formula, not just illustrated. */
function aliasedFrequency(trueFreq: number, samplesPerWindow: number): number {
  const fs = samplesPerWindow;
  let folded = trueFreq % fs;
  if (folded > fs / 2) folded = fs - folded;
  return folded;
}

const SAMPLE_PRESETS = [24, 16, 12, 8, 6];

export default function SamplingNyquistDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(SAMPLE_PRESETS.length, 2800);
  const [userSamples, setUserSamples] = useState<number | null>(null);
  const samplesPerWindow = userSamples ?? SAMPLE_PRESETS[autoIdx];

  const nyquistRate = 2 * TRUE_FREQ;
  const aliased = samplesPerWindow < nyquistRate;
  const aliasFreq = aliasedFrequency(TRUE_FREQ, samplesPerWindow);

  const truePath = Array.from({ length: 300 }, (_, i) => {
    const tt = i / 299;
    const [x, y] = toXY(tt, sample(TRUE_FREQ, tt));
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  const aliasPath = aliased
    ? Array.from({ length: 300 }, (_, i) => {
        const tt = i / 299;
        // Reconstructed low-frequency curve: same phase convention, folded frequency.
        const [x, y] = toXY(tt, sample(aliasFreq, tt));
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
      }).join(' ')
    : null;

  const samples = Array.from({ length: samplesPerWindow }, (_, i) => {
    const tt = samplesPerWindow === 1 ? 0 : i / (samplesPerWindow - 1);
    return toXY(tt, sample(TRUE_FREQ, tt));
  });

  const signalColor = getConceptColor(t, 'token');
  const sampleColor = t.accentSecondary;
  const aliasColor = t.accentDanger;

  return (
    <VisualizationContainer
      footer={
        aliased ? (
          <>
            <strong style={{ color: aliasColor }}>Aliasing:</strong> at {samplesPerWindow} samples/window (below the Nyquist rate of {nyquistRate}), the true {TRUE_FREQ}-cycle tone is indistinguishable from a {aliasFreq.toFixed(1)}-cycle tone through these sample points — the red curve is what gets reconstructed.
          </>
        ) : (
          <>Sampling at {samplesPerWindow} samples/window ({'≥'} the Nyquist rate of {nyquistRate}) captures the true tone faithfully — every sample lands exactly on the real waveform, with no lower-frequency curve that also fits.</>
        )
      }
    >
      <Slider label="Sampling rate (samples per window)" value={samplesPerWindow} onChange={setUserSamples} min={3} max={40} format={(v) => `${v}`} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={PAD} y1={HEIGHT / 2} x2={WIDTH - PAD} y2={HEIGHT / 2} stroke={t.border} strokeWidth={1} />
        <path d={truePath} fill="none" stroke={signalColor} strokeWidth={1.5} strokeOpacity={0.5} />
        {aliasPath && <path d={aliasPath} fill="none" stroke={aliasColor} strokeWidth={2} strokeDasharray="6 3" />}
        {samples.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill={sampleColor} stroke={t.surface} strokeWidth={1} />
        ))}
        <text x={PAD} y={16} fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={signalColor}>true signal ({TRUE_FREQ} cycles)</text>
        <text x={WIDTH - PAD} y={16} textAnchor="end" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={sampleColor}>● samples</text>
      </svg>
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <VisualizationMath latex="f_{\text{alias}} = \left| f - k \cdot f_s \right| \text{, folded into } [0, f_s/2]" />
      </div>
    </VisualizationContainer>
  );
}
