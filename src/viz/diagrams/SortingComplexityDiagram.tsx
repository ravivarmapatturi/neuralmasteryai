import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { mergeSortComparisons, bubbleSortComparisons } from '../lib/algorithms';

const N_PRESETS = [100, 300, 600, 1000];

export default function SortingComplexityDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(N_PRESETS.length, 2800);
  const [userN, setUserN] = useState<number | null>(null);
  const n = userN ?? N_PRESETS[autoIdx];

  const merge = mergeSortComparisons(n);
  const bubble = bubbleSortComparisons(n);

  const width = 400, height = 180;
  const maxN = 1000;
  const maxOps = bubbleSortComparisons(maxN);
  const samples = Array.from({ length: 60 }, (_, i) => Math.round((i / 59) * maxN));
  const px = (nn: number) => (nn / maxN) * width;
  const py = (ops: number) => height - Math.min(1, ops / maxOps) * height;

  return (
    <VisualizationContainer footer={`Real worst-case comparison counts to sort n=${n} items: merge sort (O(n log n)) = ${merge.toLocaleString()}; bubble sort (O(n²)) = ${bubble.toLocaleString()} -- a real ${(bubble / merge).toFixed(1)}x gap already at this size. This is the concrete cost of "sorting retrieved documents by relevance score" or "ranking recommendations" done the naive way vs. the standard way.`}>
      <Slider label="items to sort (n)" value={n} onChange={setUserN} min={5} max={maxN} step={5} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={samples.map((nn) => `${px(nn)},${py(bubbleSortComparisons(nn))}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <polyline points={samples.map((nn) => `${px(nn)},${py(mergeSortComparisons(nn))}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(n)} y1={0} x2={px(n)} y2={height} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(n)} cy={py(bubble)} r={4} fill={t.accentDanger} />
        <circle cx={px(n)} cy={py(merge)} r={4} fill={t.accentPrimary} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> bubble sort O(n²)</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> merge sort O(n log n)</span>
      </div>
    </VisualizationContainer>
  );
}
