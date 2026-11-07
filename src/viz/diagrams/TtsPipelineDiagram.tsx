import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Stage = 'text' | 'phonemes' | 'mel' | 'waveform';
const STAGES: { key: Stage; label: string }[] = [
  { key: 'text', label: '1. Text' },
  { key: 'phonemes', label: '2. Phonemes' },
  { key: 'mel', label: '3. Mel spectrogram' },
  { key: 'waveform', label: '4. Waveform' },
];
const EXPLAIN: Record<Stage, string> = {
  text: 'Raw input text -- what the user actually typed or a system wants spoken aloud.',
  phonemes: 'Text is converted to phonemes, the distinct units of sound in a language -- "hello" becomes something closer to HH AH L OW (ARPAbet notation), resolving spelling ambiguities (how "read" sounds depends on tense) before any audio modeling happens.',
  mel: "The acoustic model predicts a Mel spectrogram from the phoneme sequence -- essentially 'what should this sound like,' in spectrogram form, without yet producing playable audio.",
  waveform: 'The vocoder converts that spectrogram into an actual raw waveform -- reconstructing the phase information a spectrogram discards, the genuinely hard part of the whole pipeline.',
};

const WIDTH = 380;
const HEIGHT = 110;

export default function TtsPipelineDiagram() {
  const t = useVizTokens();
  const [stage, setStage] = useState<Stage>('text');
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={EXPLAIN[stage]}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {STAGES.map((s) => (
          <VizButton key={s.key} variant={stage === s.key ? 'primary' : 'secondary'} onClick={() => setStage(s.key)}>
            {s.label}
          </VizButton>
        ))}
      </div>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="nm-fit-svg" style={{ display: 'block', border: `1px solid ${t.border}`, borderRadius: 8 }}>
        <rect width={WIDTH} height={HEIGHT} fill={t.surfaceAlt} />
        {stage === 'text' && (
          <text x={WIDTH / 2} y={HEIGHT / 2 + 6} textAnchor="middle" fontSize={18} fontFamily="monospace" fill={t.textPrimary}>
            "hello there"
          </text>
        )}
        {stage === 'phonemes' && (
          <text x={WIDTH / 2} y={HEIGHT / 2 + 6} textAnchor="middle" fontSize={16} fontFamily="monospace" fill={color}>
            HH AH L OW · DH EH R
          </text>
        )}
        {stage === 'mel' && (
          <g>
            {Array.from({ length: 24 }, (_, c) =>
              Array.from({ length: 8 }, (_, r) => {
                const v = 0.15 + 0.5 * Math.abs(Math.sin(c * 0.5 + r * 0.7)) * Math.exp(-((r - 4) ** 2) / 20);
                return <rect key={`${r}-${c}`} x={10 + c * 15} y={10 + r * 11} width={14} height={10} fill={color} opacity={v} />;
              }),
            )}
          </g>
        )}
        {stage === 'waveform' && (
          <path
            d={Array.from({ length: 120 }, (_, i) => {
              const x = 10 + i * 3;
              const y = HEIGHT / 2 + Math.sin(i * 0.5) * 20 * Math.exp(-((i - 60) ** 2) / 3000) * (1 + Math.sin(i * 0.15));
              return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
        )}
      </svg>
    </VisualizationContainer>
  );
}
