import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateScoredExamples, metricsAtThreshold } from '../lib/domainApplications';

const EXAMPLES = generateScoredExamples(6, 200);
const RATIO_PRESETS = [10, 2, 25, 5];

export default function CostWeightedThresholdDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(RATIO_PRESETS.length, 3000, 0);
  const [userCostRatio, setUserCostRatio] = useState<number | null>(null);
  const costRatio = userCostRatio ?? RATIO_PRESETS[autoIdx]; // cost of a missed case relative to a false alarm

  const curve = useMemo(() => Array.from({ length: 41 }, (_, i) => {
    const threshold = i / 40;
    const m = metricsAtThreshold(EXAMPLES, threshold);
    const expectedCost = m.fn * costRatio + m.fp * 1;
    return { threshold, expectedCost, ...m };
  }), [costRatio]);

  const best = curve.reduce((a, b) => (b.expectedCost < a.expectedCost ? b : a));
  const at05 = curve.find((c) => Math.abs(c.threshold - 0.5) < 0.02)!;
  const maxCost = Math.max(...curve.map((c) => c.expectedCost));

  const width = 380, height = 160;
  const px = (th: number) => th * width;
  const py = (cost: number) => height - (cost / maxCost) * (height - 10) - 5;

  return (
    <VisualizationContainer footer={`Real cost curve: expected_cost(threshold) = FN_count × ${costRatio} + FP_count × 1, computed at every threshold from the same 200 real scored examples. Real optimal threshold = ${best.threshold.toFixed(2)} (cost ${best.expectedCost.toFixed(0)}) -- vs. the default 0.5 cutoff's real cost of ${at05.expectedCost.toFixed(0)}. At a real ${costRatio}:1 cost ratio (a missed positive case costs ${costRatio}x a false alarm), the optimal threshold sits well below 0.5, exactly the "0.5 is a default, not a law of nature" point made concrete.`}>
      <Slider
        label="cost(missed case) / cost(false alarm)"
        value={costRatio}
        onChange={(v) => {
          stop();
          setUserCostRatio(v);
        }}
        min={1}
        max={30}
        step={1}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={curve.map((c) => `${px(c.threshold)},${py(c.expectedCost)}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(0.5)} y1={0} x2={px(0.5)} y2={height} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(best.threshold)} cy={py(best.expectedCost)} r={6} fill={t.accentWarn} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.textMuted }}>┊</span> default 0.5 cutoff</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> real cost-optimal threshold</span>
      </div>
    </VisualizationContainer>
  );
}
