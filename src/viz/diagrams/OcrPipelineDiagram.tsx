import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Stage = 'raw' | 'detect' | 'crop' | 'recognize';
const STAGES: { key: Stage; label: string }[] = [
  { key: 'raw', label: '1. Raw image' },
  { key: 'detect', label: '2. Detect text regions' },
  { key: 'crop', label: '3. Crop each region' },
  { key: 'recognize', label: '4. Recognize characters' },
];

const STAGE_KEYS: Stage[] = ['raw', 'detect', 'crop', 'recognize'];

const WIDTH = 460;
const HEIGHT = 160;

export default function OcrPipelineDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(STAGE_KEYS.length, 2600);
  const [userStage, setUserStage] = useState<Stage | null>(null);
  const stage = userStage ?? STAGE_KEYS[autoIdx];
  const boxColor = getConceptColor(t, 'attention');

  const explain: Record<Stage, string> = {
    raw: 'The pipeline starts with just pixels -- no notion yet of where text is or what it says.',
    detect: 'Text detection locates candidate text regions as bounding boxes -- a specialized object detector, but detecting "text-shaped" regions rather than named object classes.',
    crop: 'Each detected region is cropped out and handed to the recognition stage independently -- detection and recognition are separate models solving separate problems.',
    recognize: 'Text recognition decodes the actual character sequence from each cropped region -- historically CNN+CTC, increasingly a Transformer treating this as image-to-text generation directly.',
  };

  return (
    <VisualizationContainer footer={explain[stage]}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {STAGES.map((s) => (
          <VizButton key={s.key} variant={stage === s.key ? 'primary' : 'secondary'} onClick={() => setUserStage(s.key)}>
            {s.label}
          </VizButton>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', border: `1px solid ${t.border}`, borderRadius: 8 }}>
        <rect width={WIDTH} height={HEIGHT} fill={t.surfaceAlt} />
        {/* a few lines of "text" as simple rects standing in for glyphs */}
        {[30, 55, 95].map((y, li) => (
          <g key={li}>
            {Array.from({ length: li === 1 ? 16 : 10 }, (_, i) => (
              <rect key={i} x={30 + i * 12} y={y} width={8} height={li === 1 ? 14 : 10} fill={t.textMuted} opacity={0.6} />
            ))}
          </g>
        ))}
        {(stage === 'detect' || stage === 'crop' || stage === 'recognize') && (
          <rect x={26} y={48} width={16 * 12 + 8} height={26} fill="none" stroke={boxColor} strokeWidth={2} strokeDasharray={stage === 'detect' ? '4 3' : undefined} />
        )}
        {stage === 'crop' && (
          <g transform="translate(0, 120)">
            <rect x={26} y={0} width={16 * 12 + 8} height={26} fill={t.surface} stroke={boxColor} strokeWidth={1.5} />
          </g>
        )}
        {stage === 'recognize' && (
          <text x={30} y={140} fontSize={16} fontFamily="monospace" fontWeight={700} fill={boxColor}>
            "Neural Mastery"
          </text>
        )}
      </svg>
    </VisualizationContainer>
  );
}
