import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ITEMS = [
  { label: 'Ad A', engagement: 0.4, revenue: 0.9 },
  { label: 'Post B', engagement: 0.9, revenue: 0.1 },
  { label: 'Ad C', engagement: 0.6, revenue: 0.7 },
  { label: 'Post D', engagement: 0.75, revenue: 0.0 },
];

const WEIGHTS = [40, 15, 85, 60];

/** Drag the engagement/revenue weight and watch the ranking of the SAME
 * 4 items actually reorder -- a blended objective isn't abstract, it's a
 * literal weighted sum that changes what shows up first. */
export default function BlendedObjectiveDiagram() {
  const t = useVizTokens();
  const { value: weightIdx, stop } = useAutoCycle(WEIGHTS.length, 3000, 0);
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const revenueWeight = userWeight ?? WEIGHTS[weightIdx];
  const color = getConceptColor(t, 'attention');
  const w = revenueWeight / 100;

  const scored = ITEMS.map((item) => ({ ...item, score: item.engagement * (1 - w) + item.revenue * w })).sort((a, b) => b.score - a.score);

  return (
    <VisualizationContainer footer="Feed ranking blends engagement and revenue into ONE score, weighted by business priority -- drag the slider and watch the same 4 items actually reorder.">
      <Slider
        label={`Revenue weight: ${revenueWeight}% (engagement weight: ${100 - revenueWeight}%)`}
        min={0}
        max={100}
        step={5}
        value={revenueWeight}
        onChange={(v) => {
          stop();
          setUserWeight(v);
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
        {scored.map((item, i) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.4rem 0.7rem', borderRadius: 7, background: t.surfaceAlt, transition: 'all 0.3s ease' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: color, width: 16 }}>#{i + 1}</span>
            <span style={{ fontSize: 11.5, color: t.textPrimary, flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: 9.5, color: t.textMuted }}>engagement {item.engagement.toFixed(1)} · revenue {item.revenue.toFixed(1)}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color }}>score {item.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        score = engagement × (1 − revenue_weight) + revenue × revenue_weight
      </div>
    </VisualizationContainer>
  );
}
