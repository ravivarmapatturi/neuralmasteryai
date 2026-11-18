import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { trueQuality, proxyReward, argmaxProxyLength } from '../lib/alignment';

const BETA_PRESETS = [0.3, 0.05, 0.8, 0.5];

export default function RewardHackingSimulationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(BETA_PRESETS.length, 3000, 0);
  const [userBeta, setUserBeta] = useState<number | null>(null);
  const beta = userBeta ?? BETA_PRESETS[autoIdx];

  const optimalLength = useMemo(() => argmaxProxyLength(beta), [beta]);
  const trueAtOptimum = trueQuality(optimalLength);
  const proxyAtOptimum = proxyReward(optimalLength, beta);

  const width = 460;
  const height = 220;
  const px = (len: number) => (len / 400) * width;
  const py = (v: number) => height - (v / 12) * height;

  const samples = Array.from({ length: 81 }, (_, i) => i * 5);
  const truePts = samples.map((len) => [px(len), py(trueQuality(len))]);
  const proxyPts = samples.map((len) => [px(len), py(proxyReward(len, beta))]);

  return (
    <VisualizationContainer footer={`Optimizing the proxy reward (length-correlated) picks length=${optimalLength} words -- its real quality there is only ${trueAtOptimum.toFixed(2)}/10, even though the reward model claims ${proxyAtOptimum.toFixed(2)}. At β=0 the two curves' peaks coincide (length=150, true optimum); push β up and the optimizer chases length instead of quality, dragging real quality down with it.`}>
      <Slider label="how strongly reward model score correlates with length (β)" value={beta} onChange={(v) => { stop(); setUserBeta(v); }} min={0} max={1} step={0.05} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={truePts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentSecondary} strokeWidth={2} strokeDasharray="5 3" />
        <polyline points={proxyPts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />

        <line x1={px(optimalLength)} y1={0} x2={px(optimalLength)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(optimalLength)} cy={py(proxyAtOptimum)} r={5} fill={t.accentDanger} />
        <circle cx={px(optimalLength)} cy={py(trueAtOptimum)} r={5} fill={t.accentSecondary} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.accentSecondary }}>┈</span> true quality(length)</span>
        <span><span style={{ color: t.accentDanger }}>⬤</span> reward model score(length)</span>
        <span><span style={{ color: t.accentWarn }}>┊</span> length the optimizer actually picks</span>
      </div>
    </VisualizationContainer>
  );
}
