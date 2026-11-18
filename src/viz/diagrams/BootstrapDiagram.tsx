import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { bootstrapResample, median } from '../lib/probstat';

const DATA = [4.2, 5.1, 3.8, 12.5, 4.9, 5.5, 4.1, 6.2, 4.7, 5.9, 3.5, 15.1, 4.4, 5.3];

const SEEDS = [1, 2, 3, 4, 5];

export default function BootstrapDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(SEEDS.length, 3000);
  const [userSeed, setUserSeed] = useState<number | null>(null);
  const seed = userSeed ?? SEEDS[autoIdx];

  const resampleMedians = useMemo(() => bootstrapResample(DATA, median, 1000, seed), [seed]);
  const realMedian = median(DATA);
  const sorted = [...resampleMedians].sort((a, b) => a - b);
  const ciLow = sorted[Math.floor(0.025 * sorted.length)];
  const ciHigh = sorted[Math.floor(0.975 * sorted.length)];

  const bins = 24;
  const minV = Math.min(...resampleMedians), maxV = Math.max(...resampleMedians);
  const hist = Array(bins).fill(0);
  resampleMedians.forEach((m) => { hist[Math.min(bins - 1, Math.floor(((m - minV) / (maxV - minV || 1)) * bins))]++; });
  const maxCount = Math.max(...hist);
  const px = (v: number) => ((v - minV) / (maxV - minV || 1)) * 100;

  return (
    <VisualizationContainer footer={`Real median of the original 14-point dataset = ${realMedian.toFixed(2)}. 1000 real bootstrap resamples (each the same size, drawn WITH replacement from the original data) give a real empirical 95% CI of [${ciLow.toFixed(2)}, ${ciHigh.toFixed(2)}] -- no formula assumed a particular shape for the median's sampling distribution; the resampling built it directly.`}>
      <div style={{ position: 'relative', height: 130, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
          {hist.map((c, i) => (
            <div key={i} style={{ flex: 1, height: Math.max(1, (c / maxCount) * 120), background: t.accentPrimary, opacity: 0.75, borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: `${px(ciLow)}%`, top: 0, bottom: 0, width: 1.5, background: t.accentWarn }} />
        <div style={{ position: 'absolute', left: `${px(ciHigh)}%`, top: 0, bottom: 0, width: 1.5, background: t.accentWarn }} />
        <div style={{ position: 'absolute', left: `${px(realMedian)}%`, top: 0, bottom: 0, width: 2, background: t.accentDanger }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentDanger }}>┃</span> observed median</span>
        <span><span style={{ color: t.accentWarn }}>┃┃</span> 95% bootstrap CI</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <VizButton onClick={() => setUserSeed((seed % 5) + 1)}>Re-run 1000 resamples (seed {seed})</VizButton>
      </div>
    </VisualizationContainer>
  );
}
