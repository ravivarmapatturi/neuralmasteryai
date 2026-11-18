import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { cltSampleMeans } from '../lib/probstat';

const BATCH_PRESETS = [1, 5, 20, 60, 100];

export default function CltDemoDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(BATCH_PRESETS.length, 2800);
  const [userBatchSize, setUserBatchSize] = useState<number | null>(null);
  const batchSize = userBatchSize ?? BATCH_PRESETS[autoIdx];

  const means = useMemo(() => cltSampleMeans(batchSize, 2000, 42), [batchSize]);
  const bins = 30;
  const maxVal = Math.max(...means);
  const hist = useMemo(() => {
    const counts = Array(bins).fill(0);
    means.forEach((m) => { counts[Math.min(bins - 1, Math.floor((m / (maxVal || 1)) * bins))]++; });
    return counts;
  }, [means, maxVal]);
  const maxCount = Math.max(...hist);

  return (
    <VisualizationContainer footer={`2000 real batches drawn from a genuinely skewed source distribution (exponential-like, heavily right-tailed), each batch of size ${batchSize} averaged. At batch size 1, the histogram IS the skewed source. Increase batch size and watch the histogram of batch MEANS become visibly bell-shaped -- the real Central Limit Theorem, happening live, not asserted.`}>
      <Slider label="batch size (n averaged per sample)" value={batchSize} onChange={setUserBatchSize} min={1} max={100} step={1} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140, marginTop: 12 }}>
        {hist.map((c, i) => (
          <div key={i} style={{ flex: 1, height: Math.max(1, (c / maxCount) * 130), background: t.accentPrimary, opacity: 0.75, borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        This is why so much of statistics gets to assume normality even when individual data points clearly aren't Gaussian -- averaging (which is exactly what a mean, a mini-batch loss, or an evaluation metric does) launders non-normal noise into approximately-normal noise.
      </div>
    </VisualizationContainer>
  );
}
