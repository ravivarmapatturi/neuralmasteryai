import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { memberConfidenceSamples, classificationRatesAtThreshold } from '../lib/aisecurity';

const MEMBERSHIP_PRESETS = [
  { noise: 0, threshold: 0.55 },
  { noise: 0.15, threshold: 0.55 },
  { noise: 0.30, threshold: 0.55 },
  { noise: 0, threshold: 0.75 },
];

export default function MembershipInferenceDiagram() {
  const t = useVizTokens();
  const { value: presetIdx, stop } = useAutoCycle(MEMBERSHIP_PRESETS.length, 3200, 0);
  const [userNoise, setUserNoise] = useState<number | null>(null);
  const [userThreshold, setUserThreshold] = useState<number | null>(null);
  const noise = userNoise ?? MEMBERSHIP_PRESETS[presetIdx].noise;
  const threshold = userThreshold ?? MEMBERSHIP_PRESETS[presetIdx].threshold;

  const { member, nonMember } = useMemo(() => memberConfidenceSamples(200, 5, 0.35, noise), [noise]);
  const { tpr, fpr } = useMemo(() => classificationRatesAtThreshold(member, nonMember, threshold), [member, nonMember, threshold]);

  const width = 420;
  const height = 140;
  const bins = 20;
  const hist = (data: number[]) => {
    const counts = Array(bins).fill(0);
    data.forEach((v) => { counts[Math.min(bins - 1, Math.floor(v * bins))]++; });
    return counts;
  };
  const memberHist = hist(member);
  const nonMemberHist = hist(nonMember);
  const maxCount = Math.max(...memberHist, ...nonMemberHist, 1);
  const barW = width / bins;

  return (
    <VisualizationContainer footer={`At threshold ${threshold.toFixed(2)}: real true-positive rate (correctly flags a training member) = ${(tpr * 100).toFixed(1)}%, real false-positive rate (wrongly flags a non-member) = ${(fpr * 100).toFixed(1)}%. This gap between the two real histograms below IS the membership-inference attack -- the more they overlap, the less an attacker can tell "trained on this" from "never seen this" by confidence alone.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label="differential-privacy noise added during training" value={noise} onChange={(v) => { stop(); setUserNoise(v); }} min={0} max={0.35} step={0.01} />
        <Slider label="attacker's confidence threshold" value={threshold} onChange={(v) => { stop(); setUserThreshold(v); }} min={0.1} max={0.9} step={0.01} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {nonMemberHist.map((c, i) => (
          <rect key={`nm${i}`} x={i * barW} y={height - (c / maxCount) * height} width={barW - 1} height={(c / maxCount) * height} fill={t.textMuted} fillOpacity={0.5} />
        ))}
        {memberHist.map((c, i) => (
          <rect key={`m${i}`} x={i * barW} y={height - (c / maxCount) * height} width={barW - 1} height={(c / maxCount) * height} fill={t.accentDanger} fillOpacity={0.55} />
        ))}
        <line x1={threshold * width} y1={0} x2={threshold * width} y2={height} stroke={t.accentPrimary} strokeWidth={2} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> confidence on real training members</span>
        <span><span style={{ color: t.textMuted }}>⬤</span> confidence on real non-members</span>
        <span><span style={{ color: t.accentPrimary }}>┃</span> attacker's threshold</span>
      </div>
    </VisualizationContainer>
  );
}
