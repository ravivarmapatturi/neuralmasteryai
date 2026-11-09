import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
export default function AutoscalingBacklogExplorer() {
  const t = useVizTokens();
  const [delay,setDelay]=useState(90);
  const peak=2000*delay;
  const x=(seconds:number)=>40+seconds;
  const y=(jobs:number)=>165-jobs/240000*120;
  return <VisualizationContainer footer="In this calculated constant-rate model, 6,000 jobs/s arrive while 4,000/s finish during startup. Capacity then rises to 8,000/s, so the 2,000/s spare capacity takes as long to drain the queue as startup took to create it.">
    <VisualizationHeader title="Capacity arrives after the queue does" description="Change useful startup delay. The graph shows accepted backlog, not a measured production latency distribution."/>
    <Slider label="Useful startup delay (seconds)" value={delay} onChange={setDelay} min={30} max={120} step={10}/>
    <svg viewBox="0 0 300 225" width="100%" role="img" aria-label={`${peak} queued jobs after ${delay} seconds; queue drains at ${2*delay} seconds`}>
      <text x={8} y={18} fill={t.textPrimary} fontSize={13}>Queued jobs (0–240,000)</text>
      <path d="M40 35 V165 H280" fill="none" stroke={t.border}/>
      <path d={`M40 165 L${x(delay)} ${y(peak)} L${x(2*delay)} 165`} fill="none" stroke={t.accentPrimary} strokeWidth={3}/>
      <text x={150} y={35} textAnchor="middle" fill={t.textPrimary} fontSize={13}>Peak: {peak.toLocaleString('en-US')} jobs</text>
      <text x={40} y={188} fill={t.textSecondary} fontSize={12}>0 s</text>
      <text x={280} y={188} textAnchor="end" fill={t.textSecondary} fontSize={12}>240 s</text>
      <text x={150} y={215} textAnchor="middle" fill={t.textPrimary} fontSize={13}>Elapsed time (seconds)</text>
    </svg>
    <p role="status">Startup {delay}s · backlog {peak.toLocaleString('en-US')} · drain {delay}s · recovered at {2*delay}s</p>
  </VisualizationContainer>;
}
