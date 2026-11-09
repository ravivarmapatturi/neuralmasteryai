import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';

/** Illustrative allocations in milliseconds; application starts at 80 ms. */
export default function RequestLatencyBudget() {
  const t = useVizTokens();
  const [application, setApplication] = useState(80);
  const used = 60+20+application;
  return <VisualizationContainer footer="These illustrative allocations reserve 60 ms for transport, 20 ms for the gateway, and 80 ms for application and storage, leaving 40 ms inside a 200 ms total. Increasing a required stage consumes the same fixed end-to-end budget.">
    <VisualizationHeader title="Where does the 200 ms go?" description="Increase application time while holding transport and gateway allocations fixed." />
    <Slider label="Application and storage (ms)" value={application} onChange={setApplication} min={40} max={160} step={10}/>
    <svg viewBox="0 0 300 220" width="100%" role="img" aria-label={`Used ${used} ms of 200 ms; ${200-used} ms remaining`}>
      {[['Transport',60],['Gateway',20],['Application',application],['Margin',Math.max(0,200-used)]].map(([label,ms],i)=><g key={label}>
        <text x={8} y={20+i*48} fill={t.textPrimary} fontSize={14}>{label}: {ms} ms</text>
        <rect x={8} y={28+i*48} width={280} height={12} fill={t.surfaceAlt} stroke={t.border}/>
        <rect x={8} y={28+i*48} width={Number(ms)/200*280} height={12} fill={t.accentPrimary}/>
      </g>)}
      <text x={8} y={216} fill={t.textSecondary} fontSize={12}>Each bar uses a common 0–200 ms axis.</text>
    </svg>
    <p role="status">{used <= 200 ? `${200-used} ms remains within the deadline.` : `Budget exceeded by ${used-200} ms.`}</p>
  </VisualizationContainer>;
}
