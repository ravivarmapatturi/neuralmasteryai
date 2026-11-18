import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const SAMPLE_RATE = 16000; // Hz, standard for speech
const WINDOW_MS = 25;
const HOP_MS = 10;

function frameCount(durationS: number): number {
  const durationMs = durationS * 1000;
  return Math.max(1, Math.floor((durationMs - WINDOW_MS) / HOP_MS) + 1);
}

const WIDTH = 460;
const HEIGHT = 160;
const PAD_L = 120;

const DURATION_PRESETS = [1, 3, 5, 8];

export default function RawAudioCompressionDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(DURATION_PRESETS.length, 2800);
  const [userDuration, setUserDuration] = useState<number | null>(null);
  const duration = userDuration ?? DURATION_PRESETS[autoIdx];

  const rawSamples = duration * SAMPLE_RATE;
  const frames = frameCount(duration);
  const reduction = rawSamples / frames;

  const maxVal = rawSamples;
  const barW = (v: number) => (Math.log(v + 1) / Math.log(maxVal + 1)) * (WIDTH - PAD_L - 20);

  const rawColor = getConceptColor(t, 'token');
  const frameColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={`${duration}s of audio at ${(SAMPLE_RATE / 1000).toFixed(0)}kHz is ${rawSamples.toLocaleString()} raw amplitude samples -- far too long and low-level a sequence to feed a Transformer directly. Framing it into ${WINDOW_MS}ms windows every ${HOP_MS}ms (the same STFT framing from Audio Fundamentals) collapses that down to ${frames.toLocaleString()} frames -- a ${reduction.toFixed(0)}x reduction, and the actual reason a spectrogram (not the raw waveform) is what gets modeled.`}>
      <Slider label={`Audio duration`} value={duration} onChange={setUserDuration} min={1} max={10} format={(v) => `${v}s`} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <text x={PAD_L - 10} y={44} textAnchor="end" fontSize={11} fill={t.textSecondary}>Raw samples</text>
        <rect x={PAD_L} y={30} width={barW(rawSamples)} height={24} fill={rawColor} rx={3} />
        <text x={PAD_L + barW(rawSamples) + 8} y={47} fontSize={11} fontFamily="monospace" fill={rawColor}>{rawSamples.toLocaleString()}</text>

        <text x={PAD_L - 10} y={104} textAnchor="end" fontSize={11} fill={t.textSecondary}>STFT frames</text>
        <rect x={PAD_L} y={90} width={barW(frames)} height={24} fill={frameColor} rx={3} />
        <text x={PAD_L + barW(frames) + 8} y={107} fontSize={11} fontFamily="monospace" fill={frameColor}>{frames.toLocaleString()}</text>
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, textAlign: 'center' }}>
        Bar length is log-scaled -- the raw sample count is genuinely {reduction.toFixed(0)}x longer, not just visually longer.
      </div>
    </VisualizationContainer>
  );
}
