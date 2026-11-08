import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider, PillSelect } from '../primitives';

/** Calculated teaching model: 6,000 requests/s, 1,000 requests/s per instance. */
export default function SoftwareCapacityExplorer() {
  const t = useVizTokens();
  const [instances, setInstances] = useState(10);
  const [failure, setFailure] = useState<'healthy' | 'zone'>('zone');
  const survivors = failure === 'zone' ? instances - Math.ceil(instances / 3) : instances;
  const utilization = 6000 / (survivors * 1000);
  return <VisualizationContainer footer="This calculated model assumes even routing and 1,000 requests/s per instance. Losing the largest of three zones leaves six of ten instances at 100% utilization, with no spare capacity for bursts.">
    <VisualizationHeader title="Does capacity survive a zone failure?" description="Start at ten instances, then add enough to stay below 70% utilization after a zone disappears." />
    <Slider label="Instances across three zones" value={instances} onChange={setInstances} min={6} max={18} />
    <PillSelect label="Failure state" value={failure} onChange={setFailure} options={[{value:'healthy',label:'Healthy'},{value:'zone',label:'Lose largest zone'}]} />
    <svg viewBox="0 0 300 155" width="100%" role="img" aria-label={`${survivors} surviving instances; utilization ${(utilization * 100).toFixed(0)} percent`}>
      {[0,1,2].map(zone => {
        const count = Math.floor(instances / 3) + (zone < instances % 3 ? 1 : 0);
        const lost = failure === 'zone' && zone === 0;
        return <g key={zone}><text x={zone * 100 + 50} y={18} textAnchor="middle" fill={t.textPrimary} fontSize={14}>Zone {zone + 1}</text>
          {Array.from({length:count},(_,i)=><rect key={i} x={zone*100+22} y={30+i*16} width={56} height={11} fill={lost?t.surfaceAlt:t.accentPrimary} stroke={t.border} />)}
          <text x={zone*100+50} y={147} textAnchor="middle" fill={t.textPrimary} fontSize={13}>{lost?'Unavailable':`${count} instances`}</text></g>;
      })}
    </svg>
    <p role="status">{survivors} survivors · {(utilization*100).toFixed(1)}% utilization · {utilization <= .7 ? 'Within 70% target' : 'Above 70% target'}</p>
  </VisualizationContainer>;
}
