import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateGroups, permutationTest } from '../lib/probstat';

const EFFECT_PRESETS = [0.05, 0.25, 0.55, 0.90];

export default function PermutationPValueDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(EFFECT_PRESETS.length, 3000);
  const [userEffect, setUserEffect] = useState<number | null>(null);
  const effect = userEffect ?? EFFECT_PRESETS[autoIdx];

  const { pValue, observed, permutedDiffs } = useMemo(() => {
    const { groupA, groupB } = generateGroups(11, 40, 40, 0, effect, 1);
    return permutationTest(groupA, groupB, 500, 22);
  }, [effect]);

  const bins = 30;
  const maxAbs = Math.max(...permutedDiffs.map(Math.abs), Math.abs(observed), 0.1);
  const hist = Array(bins).fill(0);
  permutedDiffs.forEach((d) => { const idx = Math.min(bins - 1, Math.max(0, Math.floor(((d + maxAbs) / (2 * maxAbs)) * bins))); hist[idx]++; });
  const maxCount = Math.max(...hist);
  const px = (d: number) => ((d + maxAbs) / (2 * maxAbs)) * 100;

  return (
    <VisualizationContainer footer={`Real observed difference in means = ${observed.toFixed(3)}. 500 real permutations (shuffling group labels, recomputing the difference each time) build the histogram below -- the REAL empirical null distribution, no Gaussian assumption. p-value = fraction of permuted differences at least as extreme as observed = ${pValue.toFixed(3)}. This is the exact mechanism, not a formula plugged into a table.`}>
      <Slider label="real underlying effect size" value={effect} onChange={setUserEffect} min={0} max={1} step={0.02} />

      <div style={{ position: 'relative', height: 140, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
          {hist.map((c, i) => (
            <div key={i} style={{ flex: 1, height: Math.max(1, (c / maxCount) * 130), background: t.textMuted, opacity: 0.5, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: `${px(observed)}%`, top: 0, bottom: 0, width: 2, background: t.accentDanger }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Gray histogram: 500 real "what if there were no real effect" simulated differences. Red line: the real observed difference. p-value asks how far into the tail that red line sits.
      </div>
    </VisualizationContainer>
  );
}
