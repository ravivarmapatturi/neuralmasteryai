import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
export default function PartitionDecisionExplorer() {
  const t=useVizTokens();
  const [policy,setPolicy]=useState<'progress'|'linearizable'>('progress');
  return <VisualizationContainer footer="The illustrated write of 8 completed at A before a read begins at disconnected B, whose local value remains 7. Returning 7 breaks this linearizable history; refusing or waiting gives up successful completion for that read during the partition.">
    <VisualizationHeader title="What may B promise without the missing message?" description="Compare a local stale read with a read that requires unavailable coordination."/>
    <PillSelect label="Partition-time read policy" value={policy} onChange={setPolicy} options={[{value:'progress',label:'Return local value'},{value:'linearizable',label:'Require linearizable read'}]}/>
    <svg viewBox="0 0 300 235" width="100%" role="img" aria-label={policy==='progress'?'A acknowledged 8; B returns 7 after the write, violating linearizability':'A acknowledged 8; B cannot complete the read without required coordination'}>
      <text x={8} y={20} fill={t.textPrimary} fontSize={13}>A writes 8 and acknowledges it.</text>
      {[['A','8'],['B','7']].map(([name,value],i)=><g key={name}>
        <rect x={8+i*172} y={45} width={112} height={65} fill={t.surfaceAlt} stroke={t.border}/>
        <text x={64+i*172} y={70} textAnchor="middle" fill={t.textPrimary} fontSize={14}>Side {name}</text>
        <text x={64+i*172} y={94} textAnchor="middle" fill={t.textPrimary} fontSize={14}>Value {value}</text>
      </g>)}
      <path d="M150 40 V130" stroke={t.border} strokeDasharray="5 4"/>
      <text x={150} y={150} textAnchor="middle" fill={t.textSecondary} fontSize={13}>No messages across the cut</text>
      <text x={8} y={184} fill={t.textPrimary} fontSize={13}>{policy==='progress'?'B answers 7.':'B waits or refuses.'}</text>
    <text x={8} y={208} fill={t.textPrimary} fontSize={13}>{policy==='progress'?'Completed write is not observed.':'Requested read remains incomplete.'}</text>
    </svg>
    <p role="status">{policy==='progress'?'Local progress uses a weaker read contract.':'Preserving the strong read contract can deny progress.'}</p>
  </VisualizationContainer>;
}
