import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

export default function LoadAssignmentExplorer() {
  const t = useVizTokens();
  const [layer, setLayer] = useState<'l4'|'l7'>('l4');
  const loads = layer==='l4'?[101,2]:[52,51];
  return <VisualizationContainer footer="Four illustrative connections carry 100, 1, 1, and 1 requests/s. Alternating connections yields 101 versus 2 requests/s; alternating individual requests yields counts of 52 and 51 over one second when requests have equal cost.">
    <VisualizationHeader title="Equal connections, unequal work" description="Switch the assignment unit while leaving the client workload fixed."/>
    <PillSelect label="Assignment unit" value={layer} onChange={setLayer} options={[{value:'l4',label:'L4 connections'},{value:'l7',label:'L7 requests'}]}/>
    <svg viewBox="0 0 300 175" width="100%" role="img" aria-label={`Backend A ${loads[0]}, backend B ${loads[1]} requests per second`}>
      <text x={8} y={20} fill={t.textPrimary} fontSize={13}>Connection rates: 100, 1, 1, 1</text>
      {loads.map((n,i)=><g key={i}>
        <text x={8} y={55+i*55} fill={t.textPrimary} fontSize={14}>Backend {i===0?'A':'B'}: {n} requests/s</text>
        <rect x={8} y={65+i*55} width={280} height={20} fill={t.surfaceAlt} stroke={t.border}/>
        <rect x={8} y={65+i*55} width={280*n/103} height={20} fill={t.accentPrimary}/>
      </g>)}
      <text x={8} y={168} fill={t.textSecondary} fontSize={12}>Common axis: 0–103 requests/s</text>
    </svg>
    <p role="status">{layer==='l4'?'Two connections each, but A receives 50.5× the work.':'Request counts differ by one under equal-cost assignment.'}</p>
  </VisualizationContainer>;
}
