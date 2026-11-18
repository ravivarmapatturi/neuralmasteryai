import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';

const PAGES = [
  { title: 'Fundamentals', detail: 'Pixels, filters, morphology, edges, and augmentation.', href: '/docs/computer-vision/vision-fundamentals' },
  { title: 'Tasks & models', detail: 'Match a product problem to classification, boxes, masks, tracks, depth, or flow.', href: '/docs/computer-vision/vision-tasks-and-models' },
  { title: 'Modern & multimodal', detail: 'Extend vision into Transformers, language, video, and 3D.', href: '/docs/computer-vision/modern-vision-and-multimodal' },
];

export default function VisionSectionMapDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(PAGES.length, 2800);
  const [userActive, setUserActive] = useState<number | null>(null);
  const active = userActive ?? autoIdx;

  return (
    <VisualizationContainer footer={PAGES[active].detail}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        {PAGES.map((p, i) => (
          <a
            key={p.title}
            href={p.href}
            onMouseEnter={() => setUserActive(i)}
            style={{
              textDecoration: 'none',
              padding: 12,
              border: `2px solid ${i === active ? t.accentPrimary : t.border}`,
              borderRadius: 8,
              background: i === active ? `${t.accentPrimary}18` : t.surfaceAlt,
              color: i === active ? t.accentPrimary : t.textPrimary,
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {p.title}
          </a>
        ))}
      </div>
      <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', marginTop: 10 }}>
        Autocycles across sections; click to continue the learning path.
      </div>
    </VisualizationContainer>
  );
}
