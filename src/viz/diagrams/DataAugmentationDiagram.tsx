import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Aug = 'original' | 'flip' | 'rotate' | 'crop' | 'brightness' | 'cutout' | 'mixup';

const AUG_LABELS: Record<Aug, string> = {
  original: 'Original',
  flip: 'Flip',
  rotate: 'Rotate',
  crop: 'Random crop',
  brightness: 'Brightness jitter',
  cutout: 'Cutout',
  mixup: 'MixUp',
};
const AUG_EXPLAIN: Record<Aug, string> = {
  original: 'The unmodified training image and its label.',
  flip: 'Geometric: mirrors the image horizontally -- teaches the model that an object\'s identity doesn\'t depend on which way it\'s facing.',
  rotate: 'Geometric: rotates the image a few degrees -- teaches robustness to a camera (or object) not being perfectly level.',
  crop: 'Geometric: trains on a random sub-region instead of the full frame -- teaches the model to recognize an object even when it\'s not perfectly centered or fully visible.',
  brightness: 'Photometric: shifts overall brightness/contrast -- teaches robustness to lighting conditions that vary in the real world but shouldn\'t change the label.',
  cutout: 'Modern/aggressive: masks out a random square region entirely -- forces the model to not over-rely on any single part of the image to make its prediction.',
  mixup: 'Modern/aggressive: blends two images (and their labels) proportionally -- a genuinely different kind of regularization, training the model on interpolated examples that never exist as real photos.',
};

function Blob({ fill }: { fill: string }) {
  return (
    <g>
      <circle cx={70} cy={70} r={45} fill={fill} />
      <circle cx={55} cy={58} r={7} fill="#14161a" />
      <circle cx={85} cy={58} r={7} fill="#14161a" />
      <path d="M 50 88 Q 70 102 90 88" stroke="#14161a" strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

const SIZE = 140;

const AUG_KEYS: Aug[] = ['original', 'flip', 'rotate', 'crop', 'brightness', 'cutout', 'mixup'];

export default function DataAugmentationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(AUG_KEYS.length, 2800);
  const [userAug, setUserAug] = useState<Aug | null>(null);
  const aug = userAug ?? AUG_KEYS[autoIdx];
  const objColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={AUG_EXPLAIN[aug]}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {AUG_KEYS.map((k) => (
          <VizButton key={k} variant={aug === k ? 'primary' : 'secondary'} onClick={() => setUserAug(k)}>
            {AUG_LABELS[k]}
          </VizButton>
        ))}
      </div>
      <svg width={SIZE} height={SIZE} viewBox={aug === 'crop' ? '20 20 90 90' : `0 0 ${SIZE} ${SIZE}`} style={{ border: `1px solid ${t.border}`, borderRadius: 8, display: 'block' }}>
        <rect width={SIZE} height={SIZE} fill={t.surfaceAlt} />
        <g
          transform={
            aug === 'flip'
              ? `translate(${SIZE},0) scale(-1,1)`
              : aug === 'rotate'
                ? `rotate(18 ${SIZE / 2} ${SIZE / 2})`
                : undefined
          }
          opacity={aug === 'brightness' ? 0.4 : 1}
          filter={aug === 'brightness' ? 'brightness(1.6)' : undefined}
        >
          <Blob fill={objColor} />
        </g>
        {aug === 'cutout' && <rect x={45} y={45} width={45} height={45} fill={t.surface} stroke={t.textMuted} strokeDasharray="3 3" />}
        {aug === 'mixup' && (
          <g opacity={0.5} transform={`translate(30,10)`}>
            <Blob fill={t.accentSecondary} />
          </g>
        )}
      </svg>
    </VisualizationContainer>
  );
}
