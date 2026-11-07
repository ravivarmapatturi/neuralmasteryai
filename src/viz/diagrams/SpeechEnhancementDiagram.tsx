import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const N = 200;

function cleanSignal(i: number): number {
  const x = i / N;
  return Math.sin(x * Math.PI * 14) * Math.exp(-((x - 0.5) ** 2) * 6) * 0.8;
}
// Deterministic pseudo-noise (not Math.random) -- reproducible on every render.
function noiseAt(i: number): number {
  return Math.sin(i * 12.9898) * 43758.5453 % 1 - 0.5;
}

const WIDTH = 460;
const ROW_H = 90;

export default function SpeechEnhancementDiagram() {
  const t = useVizTokens();
  const [noiseLevel, setNoiseLevel] = useState(0.4);

  const cleanColor = getConceptColor(t, 'attention');
  const noisyColor = t.accentDanger;

  const pathFor = (fn: (i: number) => number) =>
    Array.from({ length: N }, (_, i) => {
      const x = (i / (N - 1)) * WIDTH;
      const y = ROW_H / 2 - fn(i) * (ROW_H / 2 - 8);
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');

  const noisy = (i: number) => cleanSignal(i) + noiseAt(i) * noiseLevel;

  return (
    <VisualizationContainer footer="Speech enhancement is trained as exactly this mapping: given the noisy waveform (or its spectrogram), predict the clean one. The training pairs are synthetic on purpose -- take real clean speech, mix in real or synthetic noise at a controlled level, and train the model to recover the (known) clean original -- which is why the noise slider above changes the difficulty of the reconstruction the model has to learn.">
      <Slider label="Noise level" value={noiseLevel} onChange={setNoiseLevel} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} />

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '8px 0 2px' }}>Noisy input</div>
      <svg width={WIDTH} height={ROW_H} viewBox={`0 0 ${WIDTH} ${ROW_H}`} className="nm-fit-svg" style={{ display: 'block', border: `1px solid ${t.border}`, borderRadius: 6 }}>
        <line x1={0} y1={ROW_H / 2} x2={WIDTH} y2={ROW_H / 2} stroke={t.border} strokeWidth={1} />
        <path d={pathFor(noisy)} fill="none" stroke={noisyColor} strokeWidth={1} />
      </svg>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '8px 0 2px' }}>Enhanced output (recovered clean signal)</div>
      <svg width={WIDTH} height={ROW_H} viewBox={`0 0 ${WIDTH} ${ROW_H}`} className="nm-fit-svg" style={{ display: 'block', border: `1px solid ${t.border}`, borderRadius: 6 }}>
        <line x1={0} y1={ROW_H / 2} x2={WIDTH} y2={ROW_H / 2} stroke={t.border} strokeWidth={1} />
        <path d={pathFor(cleanSignal)} fill="none" stroke={cleanColor} strokeWidth={1.5} />
      </svg>
    </VisualizationContainer>
  );
}
