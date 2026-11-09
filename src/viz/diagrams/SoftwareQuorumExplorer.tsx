import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';

export default function SoftwareQuorumExplorer() {
  const t = useVizTokens();
  const [reachable, setReachable] = useState(3);
  return <VisualizationContainer footer="A five-voter group requires three votes. This is a quorum availability model, not a Raft implementation: elections and commits also require term and log-safety rules.">
    <VisualizationHeader title="Can the leader reach a majority?" />
    <Slider label="Reachable voters, including leader" min={1} max={5} value={reachable} onChange={setReachable}/>
    <svg viewBox="0 0 300 100" width="100%" role="img" aria-label={`${reachable} of five voters reachable; ${reachable >= 3 ? 'majority available' : 'writes unavailable'}`}>
      {[0,1,2,3,4].map(i=><g key={i}><circle cx={30+i*60} cy={35} r={20} fill={i<reachable?t.accentPrimary:t.surfaceAlt} stroke={t.border}/><text x={30+i*60} y={80} textAnchor="middle" fill={t.textPrimary} fontSize={13}>Voter {i+1}</text></g>)}
    </svg><p role="status">{reachable >= 3 ? 'Majority reachable: progress may be possible' : 'No majority: do not acknowledge new commits'}</p>
  </VisualizationContainer>;
}
