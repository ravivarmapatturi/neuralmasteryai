import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';

const FACTORS = [
  { name: 'lighting', ignore: true, why: 'The same product under brighter illumination is still the same product.' },
  { name: 'crop', ignore: true, why: 'Small position changes should not change an object label.' },
  { name: 'text stroke', ignore: false, why: 'A one-pixel stroke can distinguish characters such as O and 0.' },
  { name: 'boundary', ignore: false, why: 'A segmentation system must preserve the edge it is asked to locate.' },
];

export default function VisionInvarianceDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(FACTORS.length, 3000);
  const [userActive, setUserActive] = useState<number | null>(null);
  const active = userActive ?? autoIdx;
  const f = FACTORS[active];

  return (
    <VisualizationContainer footer={f.why}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 9 }}>Should this change be ignored or preserved?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
        {FACTORS.map((x, i) => (
          <VizButton key={x.name} variant={active === i ? 'primary' : 'secondary'} onClick={() => setUserActive(i)}>
            {x.name} → {x.ignore ? 'ignore' : 'preserve'}
          </VizButton>
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 86, height: 52, border: `2px solid ${f.ignore ? t.accentPrimary : t.accentWarn}`, borderRadius: 8, background: t.surfaceAlt, display: 'grid', placeItems: 'center', fontSize: 11 }}>
          {f.name}
        </div>
        <span style={{ color: t.textMuted }}>→</span>
        <div style={{ fontSize: 13, fontWeight: 700, color: f.ignore ? t.accentPrimary : t.accentWarn }}>
          {f.ignore ? 'augment / make robust' : 'keep as task signal'}
        </div>
      </div>
    </VisualizationContainer>
  );
}
