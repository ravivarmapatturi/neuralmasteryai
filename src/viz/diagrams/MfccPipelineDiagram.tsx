import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

// One illustrative frame's Mel-band energies -- a plausible voiced-speech
// spectral envelope (energy concentrated in the low-to-mid bands, tailing
// off at high Mel bands), not measured audio.
const MEL_ENERGIES = [0.9, 1.4, 2.8, 4.1, 3.6, 2.4, 1.5, 0.9, 0.6, 0.45, 0.35, 0.28];
const N = MEL_ENERGIES.length;
const KEEP = 8;

function dctII(x: number[]): number[] {
  const out: number[] = [];
  for (let k = 0; k < x.length; k++) {
    let sum = 0;
    for (let n = 0; n < x.length; n++) {
      sum += x[n] * Math.cos((Math.PI / x.length) * (n + 0.5) * k);
    }
    out.push(sum);
  }
  return out;
}

type Stage = 'mel' | 'log' | 'dct' | 'keep';
const STAGES: { key: Stage; label: string }[] = [
  { key: 'mel', label: '1. Mel spectrogram' },
  { key: 'log', label: '2. Log' },
  { key: 'dct', label: '3. DCT' },
  { key: 'keep', label: '4. Keep first 8' },
];

const WIDTH = 560;
const HEIGHT = 190;
const PAD = 30;

export default function MfccPipelineDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(STAGES.length, 3000);
  const [userStage, setUserStage] = useState<Stage | null>(null);
  const stage = userStage ?? STAGES[autoIdx].key;

  const logMel = MEL_ENERGIES.map((v) => Math.log(v + 1e-3));
  const coeffs = dctII(logMel);

  const values = stage === 'mel' ? MEL_ENERGIES : stage === 'log' ? logMel : coeffs;
  const maxAbs = Math.max(...values.map(Math.abs));
  const barW = (WIDTH - 2 * PAD) / N;
  const zeroY = HEIGHT / 2;

  const barColor = getConceptColor(t, 'value');

  const descriptions: Record<Stage, string> = {
    mel: 'The Mel spectrogram\'s 12 band energies for one frame -- already perceptually warped, but still highly correlated band-to-band (neighboring bands rise and fall together).',
    log: 'Taking the log compresses the dynamic range -- the same relative loudness change matters whether the signal is quiet or loud, which raw linear energy does not represent evenly.',
    dct: 'The Discrete Cosine Transform decorrelates the log-Mel bands into coefficients ordered from coarse (low index, overall spectral shape) to fine (high index, rapid band-to-band detail) -- most of the signal\'s energy compacts into the first few coefficients.',
    keep: `Keeping just the first ${KEEP} of ${N} coefficients discards the noisiest, least informative fine detail while keeping almost all the useful shape -- the compact feature vector classical (pre-deep-learning) speech recognition was built on.`,
  };

  return (
    <VisualizationContainer footer={descriptions[stage]}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STAGES.map((s) => (
          <VizButton key={s.key} variant={stage === s.key ? 'primary' : 'secondary'} onClick={() => setUserStage(s.key)}>
            {s.label}
          </VizButton>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block' }}>
        <line x1={PAD} y1={stage === 'mel' ? HEIGHT - 20 : zeroY} x2={WIDTH - PAD} y2={stage === 'mel' ? HEIGHT - 20 : zeroY} stroke={t.border} strokeWidth={1} />
        {values.map((v, i) => {
          const kept = stage !== 'keep' || i < KEEP;
          const baseline = stage === 'mel' ? HEIGHT - 20 : zeroY;
          const h = (Math.abs(v) / maxAbs) * (HEIGHT / 2 - 30);
          const x = PAD + i * barW;
          const y = v >= 0 ? baseline - h : baseline;
          const barH = Math.max(1, h);
          return (
            <g key={i} opacity={kept ? 1 : 0.25}>
              <rect x={x + barW * 0.15} y={y} width={barW * 0.7} height={barH} fill={barColor} stroke={barColor} strokeWidth={1} />
              <text x={x + barW / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={9} fill={t.textMuted}>{i}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, textAlign: 'center', marginTop: 2 }}>
        {stage === 'dct' || stage === 'keep' ? 'DCT coefficient index (low = coarse shape, high = fine detail)' : 'Mel band index (low = low frequency)'}
      </div>
    </VisualizationContainer>
  );
}
