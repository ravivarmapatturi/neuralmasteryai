import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider, PillSelect, useAutoCycle } from '../primitives';

const INSTANCES_CYCLE = [6, 4, 2, 8];

/** Illustrative capacities, requests/s: independent app 1000, shared storage 3000. */
export default function ScalingBottleneckExplorer() {
  const t = useVizTokens();
  const { value: cycleIdx, stop } = useAutoCycle(INSTANCES_CYCLE.length, 3000, 0);
  const [userInstances, setUserInstances] = useState<number | null>(null);
  const instances = userInstances ?? INSTANCES_CYCLE[cycleIdx];
  const [size, setSize] = useState<'small'|'large'>('small');
  const app = instances * (size === 'small' ? 1000 : 2000);
  const endToEnd = Math.min(app, 3000);

  return (
    <VisualizationContainer footer="The calculated ceiling is the smaller of application capacity and the shared store's illustrative 3,000 requests/s limit. Adding application replicas beyond that boundary does not increase completions; it can increase waiting.">
      <VisualizationHeader title="Which stage does scaling actually enlarge?" description="Change replica count or double each replica's capacity while holding shared storage fixed." />
      <Slider
        label="Application replicas"
        value={instances}
        onChange={(v) => {
          stop();
          setUserInstances(v);
        }}
        min={1}
        max={8}
      />
      <PillSelect
        label="Per-replica capacity"
        value={size}
        onChange={(val) => {
          stop();
          setSize(val);
        }}
        options={[{value:'small',label:'1,000 requests/s'},{value:'large',label:'2,000 requests/s'}]}
      />
      <svg viewBox="0 0 300 205" width="100%" role="img" aria-label={`App capacity ${app}, storage 3000, end-to-end ceiling ${endToEnd} requests per second`}>
        {[['Application',app],['Shared store',3000],['End-to-end',endToEnd]].map(([label,n],i)=><g key={label}>
          <text x={8} y={22+i*65} fill={t.textPrimary} fontSize={14}>{label}: {Number(n).toLocaleString()} requests/s</text>
          <rect x={8} y={32+i*65} width={280} height={18} fill={t.surfaceAlt} stroke={t.border}/>
          <rect x={8} y={32+i*65} width={Number(n)/16000*280} height={18} fill={t.accentPrimary} style={{ transition: 'width 0.4s ease' }}/>
        </g>)}
        <text x={288} y={202} textAnchor="end" fill={t.textSecondary} fontSize={12}>Common axis: 0–16,000 requests/s</text>
      </svg>
      <p role="status">{endToEnd.toLocaleString()} requests/s ceiling · {app > 3000 ? 'Shared store limits growth' : app < 3000 ? 'Application limits growth' : 'Both stages at the same ceiling'}</p>
    </VisualizationContainer>
  );
}
