import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';

/** Independent-call teaching model, not a measured production distribution. */
export default function LatencyFanoutExplorer() {
  const t = useVizTokens();
  const [calls, setCalls] = useState(100);
  const probability = .99 ** calls;
  return <VisualizationContainer footer="This calculated model assumes independent calls, each with a 99% chance of finishing within its threshold. Waiting for all 100 succeeds within that threshold only 36.6% of the time; shared failures can change the result.">
    <VisualizationHeader title="Why does fan-out make the tail visible?" description="Change how many independent calls a request must wait for. The per-call probability stays fixed." />
    <Slider label="Required downstream calls" value={calls} onChange={setCalls} min={1} max={100} />
    <svg viewBox="0 0 300 160" width="100%" role="img" aria-label={`${calls} independent calls: ${(probability*100).toFixed(1)} percent chance all meet the threshold`}>
      <text x={8} y={20} fill={t.textPrimary} fontSize={14}>Each call: 99% within threshold</text>
      <text x={8} y={55} fill={t.textPrimary} fontSize={14}>All {calls} calls: {(probability*100).toFixed(1)}%</text>
      <rect x={8} y={70} width={280} height={30} fill={t.surfaceAlt} stroke={t.border}/>
      <rect x={8} y={70} width={280*probability} height={30} fill={t.accentPrimary}/>
      <text x={8} y={124} fill={t.textSecondary} fontSize={12}>0%</text>
      <text x={288} y={124} textAnchor="end" fill={t.textSecondary} fontSize={12}>100%</text>
      <text x={8} y={150} fill={t.textPrimary} fontSize={13}>Slowest required call sets completion</text>
    </svg>
    <p role="status">{(100*(1-probability)).toFixed(1)}% of parent requests have at least one late call.</p>
  </VisualizationContainer>;
}
