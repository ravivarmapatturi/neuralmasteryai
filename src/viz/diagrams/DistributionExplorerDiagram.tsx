import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { gaussianPdf, binomialPmf } from '../lib/probstat';

type Dist = 'bernoulli' | 'binomial' | 'gaussian' | 'categorical';
const DISTS: Dist[] = ['gaussian', 'bernoulli', 'binomial', 'categorical'];

export default function DistributionExplorerDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(DISTS.length, 3200);
  const [userDist, setUserDist] = useState<Dist | null>(null);
  const dist = userDist ?? DISTS[autoIdx];
  const [p, setP] = useState(0.5);
  const [n, setN] = useState(10);
  const [sigma, setSigma] = useState(1);

  const { bars, mean, variance } = useMemo(() => {
    if (dist === 'bernoulli') {
      return { bars: [{ label: '0', v: 1 - p }, { label: '1', v: p }], mean: p, variance: p * (1 - p) };
    }
    if (dist === 'binomial') {
      const bs = Array.from({ length: n + 1 }, (_, k) => ({ label: String(k), v: binomialPmf(k, n, p) }));
      return { bars: bs, mean: n * p, variance: n * p * (1 - p) };
    }
    if (dist === 'categorical') {
      const vocab = ['the', 'cat', 'sat', 'on', 'mat'];
      const weights = [0.35, 0.3, 0.15, 0.12, 0.08];
      return { bars: vocab.map((w, i) => ({ label: w, v: weights[i] })), mean: NaN, variance: NaN };
    }
    // gaussian
    const xs = Array.from({ length: 41 }, (_, i) => -4 + (i / 40) * 8);
    return { bars: xs.map((x) => ({ label: x.toFixed(1), v: gaussianPdf(x, 0, sigma) })), mean: 0, variance: sigma * sigma };
  }, [dist, p, n, sigma]);

  const maxV = Math.max(...bars.map((b) => b.v));

  return (
    <VisualizationContainer footer={dist === 'categorical'
      ? 'This is exactly what an LLM\'s output layer produces at every generation step -- a real probability distribution over every possible next token, one number per vocabulary entry.'
      : `Real computed mean = ${Number.isNaN(mean) ? '—' : mean.toFixed(3)}, variance = ${Number.isNaN(variance) ? '—' : variance.toFixed(3)}.`}>
      <PillSelect label="Distribution" value={dist} onChange={(v) => setUserDist(v as Dist)} options={[
        { value: 'bernoulli', label: 'Bernoulli' },
        { value: 'binomial', label: 'Binomial' },
        { value: 'gaussian', label: 'Gaussian' },
        { value: 'categorical', label: 'Categorical (LLM next-token)' },
      ]} />

      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {(dist === 'bernoulli' || dist === 'binomial') && <Slider label="p" value={p} onChange={setP} min={0.05} max={0.95} step={0.05} />}
        {dist === 'binomial' && <Slider label="n" value={n} onChange={setN} min={2} max={30} step={1} />}
        {dist === 'gaussian' && <Slider label="σ" value={sigma} onChange={setSigma} min={0.3} max={2.5} step={0.1} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: dist === 'gaussian' ? 1 : 6, height: 140, marginTop: 12, overflowX: 'auto' }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: dist === 'gaussian' ? 1 : '0 0 auto', minWidth: dist === 'gaussian' ? 0 : 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', height: Math.max(1, (b.v / maxV) * 120), background: t.accentPrimary, borderRadius: 2 }} />
            {dist !== 'gaussian' && <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{b.label}</div>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Real PMF/PDF values, recomputed live from the formula as you move the sliders.
      </div>
    </VisualizationContainer>
  );
}
