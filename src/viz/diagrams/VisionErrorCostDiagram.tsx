import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';

const CASES = {
  quality: { label: 'factory defect', fn: 'A missed defect reaches a customer.', fp: 'A false reject costs rework.', review: 'tune threshold to review capacity' },
  safety: { label: 'pedestrian alert', fn: 'A missed pedestrian can cause harm.', fp: 'Too many alarms lead to alert fatigue.', review: 'high recall + fail-safe' },
  photos: { label: 'photo tag', fn: 'A missing tag can be fixed later.', fp: 'An extra tag is mildly annoying.', review: 'low threshold; automated' },
};

const CASE_KEYS = ['quality', 'safety', 'photos'] as (keyof typeof CASES)[];

export default function VisionErrorCostDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(CASE_KEYS.length, 3200);
  const [userK, setUserK] = useState<(keyof typeof CASES) | null>(null);
  const k = userK ?? CASE_KEYS[autoIdx];
  const c = CASES[k];

  return (
    <VisualizationContainer footer={`${c.label}: ${c.review}. A model threshold is a product and operations decision, not a universal 0.5.`}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {CASE_KEYS.map(x => (
          <VizButton key={x} variant={k === x ? 'primary' : 'secondary'} onClick={() => setUserK(x)}>
            {CASES[x].label}
          </VizButton>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: 10, border: `1px solid ${t.accentDanger}`, borderRadius: 8 }}>
          <b style={{ color: t.accentDanger }}>False negative</b><br/>
          <span style={{ fontSize: 12 }}>{c.fn}</span>
        </div>
        <div style={{ padding: 10, border: `1px solid ${t.accentWarn}`, borderRadius: 8 }}>
          <b style={{ color: t.accentWarn }}>False positive</b><br/>
          <span style={{ fontSize: 12 }}>{c.fp}</span>
        </div>
      </div>
    </VisualizationContainer>
  );
}
