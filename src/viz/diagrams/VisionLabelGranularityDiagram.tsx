import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';

const LEVELS = [
  { name: 'image label', cost: 1, output: 'one class' },
  { name: 'box', cost: 4, output: 'location + class' },
  { name: 'keypoints', cost: 7, output: 'structured landmarks' },
  { name: 'pixel mask', cost: 10, output: 'every pixel' },
];

export default function VisionLabelGranularityDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(LEVELS.length, 2600);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const level = userLevel ?? autoIdx;
  const item = LEVELS[level];

  return (
    <VisualizationContainer footer={`${item.name}: ${item.output}. Annotation cost rises with detail, so collect the cheapest label that supports the decision.`}>
      <Slider label={`label detail: ${item.name}`} min={0} max={3} step={1} value={level} onChange={setUserLevel}/>
      <div style={{ display: 'flex', alignItems: 'end', height: 124, gap: 14, padding: '8px 12px' }}>
        {LEVELS.map((x, i) => (
          <div key={x.name} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: x.cost * 9, background: i === level ? t.accentPrimary : t.surfaceAlt, border: `1px solid ${i === level ? t.accentPrimary : t.border}`, borderRadius: '6px 6px 0 0' }}/>
            <div style={{ fontSize: 10, color: i === level ? t.accentPrimary : t.textSecondary, marginTop: 6, fontWeight: i === level ? 700 : 400 }}>
              {x.name}
            </div>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
